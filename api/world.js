import { db } from './_lib/db.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ erro: 'Método não permitido.' });
  }

  try {
    const url = new URL(request.url, 'http://localhost');
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500);
    const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
    const search = url.searchParams.get('search')?.trim() || '';
    const sql = db();
    const players = await sql`
      SELECT id, first_name AS "firstName", last_name AS "lastName",
        nationality, image_url AS image, source_payload AS source
      FROM players
      WHERE (${search} = '' OR first_name ILIKE ${'%' + search + '%'} OR last_name ILIKE ${'%' + search + '%'})
      ORDER BY last_name NULLS LAST, first_name
      LIMIT ${limit} OFFSET ${offset}
    `;
    return response.status(200).json({ ok: true, players, limit, offset });
  } catch (error) {
    return response.status(500).json({ ok: false, erro: error.message });
  }
}