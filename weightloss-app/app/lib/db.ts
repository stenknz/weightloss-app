import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
}

export const pool: Pool = global.__pgPool ?? makePool();
if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function ensureSchema(): Promise<void> {
  // The schema is also loaded by the postgres image's initdb hooks.
  // This is a safety net for environments where the init script did not run
  // (e.g. the db bind mount was already populated from a previous deploy).
  const { readFileSync } = await import('fs');
  const { join } = await import('path');
  const schemaPath = join(process.cwd(), 'lib', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}
