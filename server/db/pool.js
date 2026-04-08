import dns from 'dns';
import pg from 'pg';

// Heroku dynos often cannot reach DB hosts over IPv6; prefer A records when both exist.
dns.setDefaultResultOrder('ipv4first');

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
