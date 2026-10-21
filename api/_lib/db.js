import { neon } from '@neondatabase/serverless';

let sql;

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada.');
  }

  sql ||= neon(process.env.DATABASE_URL);
  return sql;
}