import { spawnSync } from 'node:child_process';
import "dotenv/config";
process.env.DATABASE_URL ||= 'postgresql://ubuntu@localhost/app?host=/var/run/postgresql';
const args = process.argv[2] === 'seed' ? ['prisma/seed.mjs'] : ['node_modules/prisma/build/index.js', 'migrate', 'deploy'];
const result = spawnSync(process.execPath, args, { env: process.env, stdio: 'inherit' });
process.exit(result.status ?? 1);
