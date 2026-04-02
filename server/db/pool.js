import pg from 'pg';

const { Pool } = pg;

let pool = null;

/**
 * Postgres Pool singleton.
 * @returns {import('pg').Pool | null}
 */
export function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}
