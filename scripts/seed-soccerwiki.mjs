import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const file = process.argv[2] || 'SoccerWiki_2026-10-21_1792541584.json';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada.');
}

const sql = neon(process.env.DATABASE_URL);
const data = JSON.parse(await readFile(file, 'utf8'));

function text(value) {
  return value == null ? null : String(value).trim() || null;
}

async function seedLeagues() {
  const payload = JSON.stringify(data.LeagueData || []);
  await sql`
    INSERT INTO leagues (id, name, logo_url, source, source_payload)
    SELECT item->>'ID', COALESCE(NULLIF(item->>'Name', ''), 'Liga sem nome'), NULLIF(item->>'ImageURL', ''), 'soccerwiki', item
    FROM jsonb_array_elements(${payload}::jsonb) AS item
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      logo_url = EXCLUDED.logo_url,
      source_payload = EXCLUDED.source_payload
  `;
}

async function seedClubs() {
  const payload = JSON.stringify(data.ClubData || []);
  await sql`
    INSERT INTO clubs (id, name, crest_url, source, source_payload)
    SELECT item->>'ID', COALESCE(NULLIF(item->>'Name', ''), 'Clube sem nome'), NULLIF(item->>'ImageURL', ''), 'soccerwiki', item
    FROM jsonb_array_elements(${payload}::jsonb) AS item
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      crest_url = EXCLUDED.crest_url,
      source_payload = EXCLUDED.source_payload
  `;
}

async function seedPlayers() {
  const payload = JSON.stringify(data.PlayerData || []);
  await sql`
    INSERT INTO players (id, first_name, last_name, image_url, source, source_payload)
    SELECT item->>'ID', COALESCE(NULLIF(item->>'Forename', ''), 'Jogador'), NULLIF(item->>'Surname', ''), NULLIF(item->>'ImageURL', ''), 'soccerwiki', item
    FROM jsonb_array_elements(${payload}::jsonb) AS item
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      image_url = EXCLUDED.image_url,
      source_payload = EXCLUDED.source_payload
  `;
}

async function seedManagers() {
  const payload = JSON.stringify(data.ManagerData || []);
  await sql`
    INSERT INTO managers (id, first_name, last_name, image_url, source, source_payload)
    SELECT item->>'ID', COALESCE(NULLIF(item->>'Forename', ''), 'Dirigente'), NULLIF(item->>'Surname', ''), NULLIF(item->>'ImageURL', ''), 'soccerwiki', item
    FROM jsonb_array_elements(${payload}::jsonb) AS item
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      image_url = EXCLUDED.image_url,
      source_payload = EXCLUDED.source_payload
  `;
}

async function seedCompetitions() {
  const payload = JSON.stringify(data.CupData || []);
  await sql`
    INSERT INTO competitions (id, name, competition_type, logo_url, source, source_payload)
    SELECT item->>'ID', COALESCE(NULLIF(item->>'Name', ''), 'Taça sem nome'), 'cup', NULLIF(item->>'ImageURL', ''), 'soccerwiki', item
    FROM jsonb_array_elements(${payload}::jsonb) AS item
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      logo_url = EXCLUDED.logo_url,
      source_payload = EXCLUDED.source_payload
  `;
}

async function seedStadiums() {
  const payload = JSON.stringify(data.StadiumData || []);
  await sql`
    INSERT INTO stadiums (id, name, source_payload)
    SELECT item->>'ID', COALESCE(NULLIF(item->>'Name', ''), 'Estádio sem nome'), item
    FROM jsonb_array_elements(${payload}::jsonb) AS item
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      source_payload = EXCLUDED.source_payload
  `;
}

await seedLeagues();
await seedClubs();
await seedPlayers();
await seedManagers();
await seedCompetitions();
await seedStadiums();

console.log('Carga inicial do SoccerWiki concluída em 6 operações de lote.');