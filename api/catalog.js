import { db } from './_lib/db.js';

const entityQueries = {
  leagues: (sql) => sql`
    SELECT id, name AS nome, country AS pais, season AS temporada,
      logo_url AS logo, official_site AS site, source
    FROM leagues
    ORDER BY country NULLS LAST, name
  `,
  clubs: (sql) => sql`
    SELECT id, league_id AS "ligaId", name AS nome, country AS pais, season AS temporada,
      crest_url AS escudo, transfer_budget AS "orcamentoTransferencias",
      wage_budget AS "orcamentoSalarial", squad_value AS "valorElenco",
      debt AS divida, reputation AS "reputacao", board_objective AS meta,
      financial_profile AS "perfilFinanceiro", source
    FROM clubs
    ORDER BY name
  `,
  competitions: (sql) => sql`
    SELECT id, name, competition_type AS type, country, logo_url AS logo
    FROM competitions
    ORDER BY name
  `,
  stadiums: (sql) => sql`
    SELECT id, club_id AS "clubId", name, capacity, city, country, image_url AS logo
    FROM stadiums
    ORDER BY name
  `,
  managers: (sql) => sql`
    SELECT id, first_name AS "firstName", last_name AS "lastName", image_url AS image
    FROM managers
    ORDER BY last_name NULLS LAST, first_name
  `
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ erro: 'Método não permitido.' });
  }

  try {
    const sql = db();
    const entity = new URL(request.url, 'http://localhost').searchParams.get('entity');

    if (entity) {
      const query = entityQueries[entity];
      if (!query) return response.status(400).json({ erro: 'Entidade inválida.' });
      return response.status(200).json({ ok: true, [entity]: await query(sql) });
    }

    const [leagues, clubs, competitions, stadiums, managers] = await Promise.all([
      entityQueries.leagues(sql),
      entityQueries.clubs(sql),
      entityQueries.competitions(sql),
      entityQueries.stadiums(sql),
      entityQueries.managers(sql)
    ]);

    return response.status(200).json({ ok: true, leagues, clubs, competitions, stadiums, managers });
  } catch (error) {
    return response.status(500).json({ ok: false, erro: error.message });
  }
}