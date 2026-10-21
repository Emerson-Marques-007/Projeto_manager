import { db } from './_lib/db.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ erro: 'Método não permitido.' });
  }

  try {
    const sql = db();
    const result = await sql`SELECT 1 AS ok`;
    return response.status(200).json({ ok: result[0]?.ok === 1 });
  } catch (error) {
    return response.status(500).json({ ok: false, erro: error.message });
  }
}