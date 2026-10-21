import { createHash, randomBytes, randomInt } from 'node:crypto';
import { db } from './_lib/db.js';

const codeLifetimeMs = 10 * 60 * 1000;
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function emailValue(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
    throw new Error('E-mail inválido.');
  }
  return email;
}

async function sendCode(email, code) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    throw new Error('RESEND_API_KEY e MAIL_FROM precisam ser configuradas.');
  }

  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      subject: 'Seu acesso ao Projeto Manager',
      text: `Seu código de acesso é ${code}. Ele expira em 10 minutos.`
    })
  });

  if (!result.ok) throw new Error('Não foi possível enviar o código de acesso.');
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ erro: 'Método não permitido.' });
  }

  try {
    const body = request.body || {};
    const sql = db();
    const action = String(body.action || '');
    const email = emailValue(body.email);
    const users = await sql`
      INSERT INTO users (email) VALUES (${email})
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id, email
    `;
    const user = users[0];

    if (action === 'send') {
      const code = String(randomInt(0, 1000000)).padStart(6, '0');
      await sql`
        INSERT INTO auth_codes (user_id, code_hash, expires_at)
        VALUES (${user.id}, ${hash(code)}, ${new Date(Date.now() + codeLifetimeMs).toISOString()})
      `;
      await sendCode(email, code);
      return response.status(200).json({ ok: true });
    }

    if (action === 'verify') {
      const code = String(body.code || '').trim();
      if (!/^\d{6}$/.test(code)) throw new Error('Código inválido.');
      const rows = await sql`
        SELECT id FROM auth_codes
        WHERE user_id = ${user.id} AND used_at IS NULL
          AND expires_at > now() AND attempts < 5
        ORDER BY created_at DESC LIMIT 1
      `;
      if (!rows[0]) throw new Error('Código expirado ou inexistente.');
      const match = await sql`
        UPDATE auth_codes SET used_at = now()
        WHERE id = ${rows[0].id} AND code_hash = ${hash(code)}
        RETURNING id
      `;
      if (!match[0]) {
        await sql`UPDATE auth_codes SET attempts = attempts + 1 WHERE id = ${rows[0].id}`;
        throw new Error('Código incorreto.');
      }
      const token = randomBytes(32).toString('hex');
      await sql`
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${hash(token)}, ${new Date(Date.now() + sessionLifetimeMs).toISOString()})
      `;
      return response.status(200).json({ ok: true, token, email: user.email });
    }

    throw new Error('Ação de autenticação inválida.');
  } catch (error) {
    return response.status(400).json({ ok: false, erro: error.message });
  }
}