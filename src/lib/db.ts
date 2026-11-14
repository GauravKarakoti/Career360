import { PrismaClient } from '@prisma/client';
import { existsSync } from 'node:fs';

const globalDb = globalThis as unknown as { prisma?: PrismaClient };
function connection() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (existsSync('/var/run/postgresql/.s.PGSQL.5432')) return 'postgresql://ubuntu@localhost/app?host=/var/run/postgresql';
  throw new Error('DATABASE_URL is required. Configure PostgreSQL in Settings > Vault.');
}
export function db() {
  globalDb.prisma ??= new PrismaClient({ datasourceUrl: connection() });
  return globalDb.prisma;
}
