import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import express from 'express';

const scrypt = promisify(scryptCallback);
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const COOKIE_NAME = 'bookclub_admin';
const HASH_PATTERN = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/;
const DUMMY_HASH = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password, encodedHash) {
  const parts = HASH_PATTERN.exec(encodedHash || '');
  if (typeof password !== 'string' || !parts) return false;
  const actual = await scrypt(password, parts[1], 64, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(actual, Buffer.from(parts[2], 'hex'));
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function sessionToken(req) {
  const raw = req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  return /^[a-f0-9]{64}$/.test(raw || '') ? raw : null;
}

export function createAdminAuth(database, {
  production = process.env.NODE_ENV === 'production',
  origin = process.env.ADMIN_ORIGIN || (production ? 'https://book-club.edia-company.com' : null),
  loginLimit = 12,
  now = () => Date.now(),
} = {}) {
  const router = express.Router();
  const attempts = new Map();
  let totalAttempts = { count: 0, until: 0 };
  const cookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: 'strict',
    path: '/',
  };

  function sameOrigin(req, res, next) {
    const requestOrigin = req.get('Origin');
    const expectedOrigin = origin || `${req.protocol}://${req.get('host')}`;
    const allowedDevOrigin = !production && requestOrigin === 'http://localhost:5173';
    if (req.get('Sec-Fetch-Site') === 'cross-site' ||
        (requestOrigin && requestOrigin !== expectedOrigin && !allowedDevOrigin)) {
      return res.status(403).json({ error: 'Richiesta non autorizzata da questa origine.' });
    }
    next();
  }

  async function currentAdmin(req) {
    const token = sessionToken(req);
    if (!token) return null;
    const { rows } = await database.query(
      `SELECT a.id, a.username FROM admin_sessions s
       JOIN admin_users a ON a.id = s.admin_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [tokenHash(token)],
    );
    return rows[0] || null;
  }

  async function requireAdmin(req, res, next) {
    res.set('Cache-Control', 'no-store');
    try {
      const admin = await currentAdmin(req);
      if (!admin) {
        res.clearCookie(COOKIE_NAME, cookieOptions);
        return res.status(401).json({ error: 'Accedi come amministratore per continuare.' });
      }
      req.admin = admin;
      return sameOrigin(req, res, next);
    } catch (error) {
      console.error('Errore nella verifica della sessione amministratore:', error);
      return res.status(500).json({ error: 'Impossibile verificare la sessione.' });
    }
  }

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/session', async (req, res) => {
    try {
      const admin = await currentAdmin(req);
      res.json(admin ? { authenticated: true, username: admin.username } : { authenticated: false });
    } catch (error) {
      console.error('Errore nel recupero della sessione amministratore:', error);
      res.status(500).json({ error: 'Impossibile verificare la sessione.' });
    }
  });

  router.post('/login', sameOrigin, async (req, res) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Invia le credenziali in formato JSON.' });
    }
    const timestamp = now();
    for (const [key, value] of attempts) {
      if (value.until <= timestamp) attempts.delete(key);
    }
    if (totalAttempts.until <= timestamp) totalAttempts = { count: 0, until: timestamp + 15 * 60 * 1000 };
    const clientKey = req.ip;
    const attempt = attempts.get(clientKey) || { count: 0, until: timestamp + 15 * 60 * 1000 };
    if (attempt.count >= loginLimit || totalAttempts.count >= 120) {
      res.set('Retry-After', String(Math.max(1, Math.ceil(((attempt.count >= loginLimit ? attempt.until : totalAttempts.until) - timestamp) / 1000))));
      return res.status(429).json({ error: 'Troppi tentativi di accesso. Riprova tra 15 minuti.' });
    }
    attempt.count += 1;
    attempts.set(clientKey, attempt);
    totalAttempts.count += 1;

    const { username, password } = req.body || {};
    if (typeof username !== 'string' || !username.trim() || username.length > 100 ||
        typeof password !== 'string' || !password || password.length > 1024) {
      return res.status(400).json({ error: 'Inserisci nome utente e password validi.' });
    }
    try {
      const { rows } = await database.query('SELECT id, username, password_hash FROM admin_users WHERE username = $1', [username.trim()]);
      const admin = rows[0];
      const matches = await verifyPassword(password, admin?.password_hash || DUMMY_HASH);
      if (!admin || !matches) {
        return res.status(401).json({ error: 'Nome utente o password non corretti.' });
      }
      await database.query('DELETE FROM admin_sessions WHERE expires_at <= NOW()');
      const previousToken = sessionToken(req);
      if (previousToken) await database.query('DELETE FROM admin_sessions WHERE token_hash = $1', [tokenHash(previousToken)]);
      const token = randomBytes(32).toString('hex');
      await database.query(
        'INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES ($1, $2, $3)',
        [tokenHash(token), admin.id, new Date(timestamp + SESSION_DURATION_MS)],
      );
      attempts.delete(clientKey);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_DURATION_MS });
      res.json({ authenticated: true, username: admin.username });
    } catch (error) {
      console.error('Errore durante l’accesso amministratore:', error);
      res.status(500).json({ error: 'Impossibile effettuare l’accesso. Riprova.' });
    }
  });

  router.post('/logout', sameOrigin, async (req, res) => {
    try {
      const token = sessionToken(req);
      if (token) await database.query('DELETE FROM admin_sessions WHERE token_hash = $1', [tokenHash(token)]);
      res.clearCookie(COOKIE_NAME, cookieOptions);
      res.status(204).end();
    } catch (error) {
      console.error('Errore durante l’uscita amministratore:', error);
      res.status(500).json({ error: 'Impossibile terminare la sessione. Riprova.' });
    }
  });

  async function initialize({ username = process.env.ADMIN_USERNAME, passwordHash = process.env.ADMIN_PASSWORD_HASH } = {}) {
    await database.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
    `);
    if (username && passwordHash) {
      if (typeof username !== 'string' || username.trim().length > 100 || !username.trim() || !HASH_PATTERN.test(passwordHash)) {
        throw new Error('Configurazione delle credenziali amministratore non valida.');
      }
      await database.query(
        'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
        [username.trim(), passwordHash],
      );
    }
    const { rows } = await database.query('SELECT COUNT(*)::int AS count FROM admin_users');
    if (production && rows[0].count === 0) {
      throw new Error('Configura ADMIN_USERNAME e ADMIN_PASSWORD_HASH prima di avviare il servizio.');
    }
  }

  return { router, requireAdmin, initialize };
}
