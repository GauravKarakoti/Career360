// Job boards and Unstop return "tags"/"filters" that are NOT skills: work mode
// (Remote, Online), employment type, and eligibility/audience (Undergraduate, All, ...).
// Treating them as required capabilities produced bogus "gaps to bridge".

const WORK_MODE = new Set([
  'remote', 'online', 'offline', 'hybrid', 'onsite', 'on site', 'in person', 'work from home', 'wfh',
  'worldwide', 'anywhere', 'global', 'full time', 'part time', 'contract', 'temporary', 'permanent',
  'internship', 'job', 'jobs', 'hackathon', 'hackathons', 'event', 'events',
]);

const AUDIENCE = new Set([
  'all', 'everyone', 'open for all', 'open to all', 'any', 'anyone', 'students', 'student',
  'school students', 'college students', 'undergraduate', 'undergraduates', 'postgraduate',
  'postgraduates', 'graduate', 'graduates', 'freshers', 'fresher', 'professionals',
  'working professionals', 'engineering students',
]);

// Unstop "stream" eligibility filters. "Management" is only an audience there; in a job
// listing it can be a genuine skill, so it is excluded only for Unstop-sourced rows.
const UNSTOP_STREAMS = /^(management|arts,? commerce,? sciences?( & others)?|others?)$/i;

const norm = (s: string) => s.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

export function isSkillTerm(term: string, opts?: { unstop?: boolean }): boolean {
  const n = norm(term);
  if (n.length < 2) return false;
  if (WORK_MODE.has(n) || AUDIENCE.has(n)) return false;
  if (opts?.unstop && UNSTOP_STREAMS.test(n)) return false;
  return true;
}

export function cleanRequirements(terms: string[], opts?: { unstop?: boolean }): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of terms) {
    const t = term.trim();
    const key = norm(t);
    if (!isSkillTerm(t, opts) || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export const isUnstopUrl = (url: string | null | undefined) => Boolean(url && /(^|\.)unstop\.com\b/i.test(url));
