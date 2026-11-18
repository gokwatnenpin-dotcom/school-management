import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;
const neonConnection = config.db.connectionString
  ? new URL(config.db.connectionString)
  : null;

export const pool = new Pool({
  ...(config.db.connectionString
    ? {
        host: neonConnection.hostname,
        port: Number(neonConnection.port || 5432),
        user: decodeURIComponent(neonConnection.username),
        password: decodeURIComponent(neonConnection.password),
        database: neonConnection.pathname.slice(1),
        ssl: { rejectUnauthorized: true },
      }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
      }),
  max: 10,
});

pool.on('error', (error) => {
  console.error('Unexpected database pool error:', error);
});

export const query = (text, params) => pool.query(text, params);

export async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] ?? null;
}

export async function withTransaction(handler) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
