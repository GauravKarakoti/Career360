// Authorized re-verification job. Run with CRON_SECRET and BASE_URL set:
//   CRON_SECRET=... BASE_URL=http://localhost:3000 node scripts/reverify-job.mjs
const secret = process.env.CRON_SECRET;
const base = process.env.BASE_URL ?? 'http://localhost:3000';
if (!secret) {
  console.error('CRON_SECRET is required');
  process.exit(1);
}

const response = await fetch(`${base}/api/jobs/reverify`, {
  headers: { authorization: `Bearer ${secret}` }
});
const body = await response.json().catch(() => ({}));
console.log(response.status, JSON.stringify(body, null, 2));
process.exit(response.ok ? 0 : 1);
