// Groq OpenAI-compatible client for LLM structured outputs and embeddings.
// Configure with GROQ_API_KEY (or LLM_API_KEY) and optional GROQ_MODEL, GROQ_EMBED_MODEL, GROQ_BASE_URL.
import { ApiError } from './session';

const baseUrl = (
  process.env.GROQ_BASE_URL ||
  'https://api.groq.com/openai/v1'
).replace(/\/+$/, '');

// openai/gpt-oss-20b and openai/gpt-oss-120b natively support strict json_schema on Groq.
const model =
  process.env.GROQ_MODEL ||
  'openai/gpt-oss-120b';

const embedModel =
  process.env.GROQ_EMBED_MODEL ||
  'nomic-embed-text-v1_5';

const apiKey = process.env.GROQ_API_KEY;

export function aiAvailable() {
  return Boolean(apiKey);
}

function assertAvailable() {
  if (!apiKey) {
    throw new ApiError('AI features are not configured on this deployment (set GROQ_API_KEY).', 503);
  }
}

type ChatMessage = { role: 'system' | 'user'; content: string };

export async function chatJson<T>(
  messages: ChatMessage[],
  schemaName: string,
  schema: Record<string, unknown>,
  opts?: { model?: string; lowReasoning?: boolean }
): Promise<T> {
  assertAvailable();
  const useModel = opts?.model || model;

  const requestChat = (useStrictSchema: boolean) => {
    const formattedMessages = useStrictSchema
      ? messages
      : [
          {
            role: 'system' as const,
            content: `Return ONLY a valid JSON object conforming to this JSON Schema (${schemaName}): ${JSON.stringify(schema)}`
          },
          ...messages
        ];

    return fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: useModel,
        messages: formattedMessages,
        temperature: 0.1,
        // gpt-oss models spend tokens on hidden reasoning; keep it short for mechanical tasks.
        ...(opts?.lowReasoning && useModel.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
        response_format: useStrictSchema
          ? { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } }
          : { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(45000)
    });
  };

  let response = await requestChat(true);

  // Fallback to json_object mode if the configured Groq model (e.g. llama-3.3-70b-versatile)
  // does not support strict json_schema constrained decoding.
  if (response.status === 400) {
    response = await requestChat(false);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Groq chat error', response.status, detail.slice(0, 300));
    if (response.status === 429) {
      throw new ApiError('The AI provider is rate limited right now. Try again shortly.', 429);
    }
    throw new ApiError(`The AI provider did not respond (HTTP ${response.status}). Try again in a moment.`, 502);
  }

  let payload: { choices: { message: { content: string } }[] };
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('The AI provider returned an unusable response. Try again or publish the listing manually.', 502);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content || content.trim().toUpperCase() === 'OK') {
    throw new ApiError('The AI provider returned an unusable response. Try again or publish the listing manually.', 502);
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new ApiError('The AI response was not valid JSON. Try again.', 502);
  }
}

export async function embed(texts: string[]): Promise<number[][]> {
  assertAvailable();
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: embedModel,
      input: texts,
      encoding_format: 'float'
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Groq embed error', response.status, detail.slice(0, 300));
    throw new ApiError('The embedding provider did not respond. Try again in a moment.', 502);
  }

  let payload: { data: { embedding: number[] }[] };
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('The embedding provider returned an unusable response.', 502);
  }

  if (!payload.data?.length) {
    throw new ApiError('The embedding provider returned no vectors.', 502);
  }
  return payload.data.map((item) => item.embedding);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

// JSON schema for structured outputs. strict:true requires every key and allOf-free types.
export function schemaOf(properties: Record<string, unknown>, required: string[]) {
  return { type: 'object', properties, required, additionalProperties: false };
}