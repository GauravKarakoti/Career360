// OpenAI-compatible client for configurable LLM/embedding providers.
// Configure with LLM_API_KEY (+ optional LLM_BASE_URL, LLM_MODEL, EMBED_MODEL).
// Falls back to the Vault GitHub token via GitHub Models.
import { ApiError } from './session';

const baseUrl = process.env.LLM_BASE_URL || 'https://models.github.ai/inference';
const model = process.env.LLM_MODEL || 'openai/gpt-4.1-mini';
const embedModel = process.env.EMBED_MODEL || 'openai/text-embedding-3-small';
const apiKey = process.env.LLM_API_KEY || process.env.GITHUB_TOKEN;

export function aiAvailable() { return Boolean(apiKey); }

function assertAvailable() {
  if (!apiKey) throw new ApiError('AI features are not configured on this deployment (set LLM_API_KEY).', 503);
}

type ChatMessage = { role: 'system' | 'user'; content: string };

export async function chatJson<T>(messages: ChatMessage[], schemaName: string, schema: Record<string, unknown>): Promise<T> {
  assertAvailable();
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, messages, temperature: 0.1,
      response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } }
    }),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('LLM chat error', response.status, detail.slice(0, 300));
    throw new ApiError('The AI provider did not respond. Try again in a moment.', 502);
  }
  let payload: { choices: { message: { content: string } }[] };
  try { payload = await response.json(); } catch { throw new ApiError('The AI provider returned an unusable response. Try again or publish the listing manually.', 502); }
  const content = payload.choices?.[0]?.message?.content;
  if (!content || content.trim().toUpperCase() === 'OK') throw new ApiError('The AI provider returned an unusable response. Try again or publish the listing manually.', 502);
  try { return JSON.parse(content) as T; } catch { throw new ApiError('The AI response was not valid JSON. Try again.', 502); }
}

export async function embed(texts: string[]): Promise<number[][]> {
  assertAvailable();
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: embedModel, input: texts }),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('LLM embed error', response.status, detail.slice(0, 300));
    throw new ApiError('The embedding provider did not respond. Try again in a moment.', 502);
  }
  let payload: { data: { embedding: number[] }[] };
  try { payload = await response.json(); } catch { throw new ApiError('The embedding provider returned an unusable response.', 502); }
  if (!payload.data?.length) throw new ApiError('The embedding provider returned no vectors.', 502);
  return payload.data.map(item => item.embedding);
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] ** 2; normB += b[i] ** 2; }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

// JSON schema for structured outputs. strict:true requires every key and allOf-free types.
export function schemaOf(properties: Record<string, unknown>, required: string[]) {
  return { type: 'object', properties, required, additionalProperties: false };
}
