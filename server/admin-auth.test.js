import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { createAdminAuth, hashPassword, verifyPassword } from './admin-auth.js';

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

function fakeDatabase(admin) {
  const sessions = new Map();
  return {
    sessions,
    async query(sql, values = []) {
      if (sql.startsWith('SELECT id, username, password_hash')) {
        return { rows: values[0] === admin.username ? [admin] : [] };
      }
      if (sql.startsWith('INSERT INTO admin_sessions')) {
        sessions.set(values[0], { adminId: values[1], expiresAt: values[2] });
      }
      if (sql.startsWith('SELECT a.id, a.username')) {
        const session = sessions.get(values[0]);
        return { rows: session?.expiresAt > new Date() ? [{ id: admin.id, username: admin.username }] : [] };
      }
      if (sql.startsWith('DELETE FROM admin_sessions WHERE token_hash')) sessions.delete(values[0]);
      if (sql.startsWith('DELETE FROM admin_sessions WHERE expires_at')) {
        for (const [key, value] of sessions) if (value.expiresAt <= new Date()) sessions.delete(key);
      }
      return { rows: [] };
    },
  };
}

function authApp(database, options = {}) {
  const app = express();
  app.use(express.json());
  const auth = createAdminAuth(database, { production: true, origin: 'https://book-club.edia-company.com', ...options });
  app.use('/api/admin', auth.router);
  let deleted = 0;
  app.delete('/api/books/:id', auth.requireAdmin, (req, res) => {
    deleted += 1;
    res.status(204).end();
  });
  return { app, deleted: () => deleted };
}

const loginHeaders = { 'Content-Type': 'application/json', Origin: 'https://book-club.edia-company.com' };
const credentials = { username: 'admin', password: 'a-long-local-test-password' };

// A new salt makes equal passwords distinct; verification never accepts a malformed hash.
test('scrypt passwords have independent salts and reject wrong passwords or invalid encodings', async () => {
  const first = await hashPassword(credentials.password);
  const second = await hashPassword(credentials.password);
  assert.notEqual(first, second);
  assert.match(first, /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal(await verifyPassword(credentials.password, first), true);
  assert.equal(await verifyPassword('incorrect', first), false);
  assert.equal(await verifyPassword(credentials.password, 'scrypt:broken'), false);
});

test('login stores only a token hash, authenticates deletion, rotates sessions and revokes on logout', async () => {
  const database = fakeDatabase({ id: 1, username: credentials.username, password_hash: await hashPassword(credentials.password) });
  const { app, deleted } = authApp(database);
  await withServer(app, async (base) => {
    let response = await fetch(`${base}/api/books/book`, { method: 'DELETE' });
    assert.equal(response.status, 401);
    assert.equal(deleted(), 0);
    response = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: loginHeaders, body: JSON.stringify({ ...credentials, password: 'wrong' }) });
    assert.equal(response.status, 401);
    response = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: loginHeaders, body: JSON.stringify(credentials) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { authenticated: true, username: 'admin' });
    const cookieHeader = response.headers.get('set-cookie');
    assert.match(cookieHeader, /HttpOnly/);
    assert.match(cookieHeader, /Secure/);
    assert.match(cookieHeader, /SameSite=Strict/);
    const cookie = cookieHeader.split(';')[0];
    const token = cookie.split('=')[1];
    assert.equal(database.sessions.has(token), false);
    assert.equal(database.sessions.has(createHash('sha256').update(token).digest('hex')), true);
    response = await fetch(`${base}/api/admin/session`, { headers: { Cookie: cookie } });
    assert.deepEqual(await response.json(), { authenticated: true, username: 'admin' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    response = await fetch(`${base}/api/books/book`, { method: 'DELETE', headers: { Cookie: cookie, Origin: loginHeaders.Origin } });
    assert.equal(response.status, 204);
    assert.equal(deleted(), 1);
    response = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { ...loginHeaders, Cookie: cookie }, body: JSON.stringify(credentials) });
    assert.equal(response.status, 200);
    const newCookie = response.headers.get('set-cookie').split(';')[0];
    assert.notEqual(cookie, newCookie);
    response = await fetch(`${base}/api/books/book`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(response.status, 401);
    response = await fetch(`${base}/api/admin/logout`, { method: 'POST', headers: { Cookie: newCookie, Origin: loginHeaders.Origin } });
    assert.equal(response.status, 204);
    response = await fetch(`${base}/api/books/book`, { method: 'DELETE', headers: { Cookie: newCookie } });
    assert.equal(response.status, 401);
    assert.equal(deleted(), 1);
  });
});

test('cross-origin and form login are rejected; brute force is limited', async () => {
  const database = fakeDatabase({ id: 1, username: credentials.username, password_hash: await hashPassword(credentials.password) });
  const { app } = authApp(database, { loginLimit: 2 });
  await withServer(app, async (base) => {
    let response = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { ...loginHeaders, Origin: 'https://attacker.invalid' }, body: JSON.stringify(credentials) });
    assert.equal(response.status, 403);
    response = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=admin&password=guess' });
    assert.equal(response.status, 415);
    for (let i = 0; i < 2; i += 1) {
      response = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: loginHeaders, body: JSON.stringify({ ...credentials, password: 'wrong' }) });
      assert.equal(response.status, 401);
    }
    response = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: loginHeaders, body: JSON.stringify(credentials) });
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get('retry-after')) > 0);
  });
});

test('expired sessions and cross-origin destructive requests never reach deletion', async () => {
  const database = fakeDatabase({ id: 1, username: credentials.username, password_hash: await hashPassword(credentials.password) });
  const { app, deleted } = authApp(database);
  await withServer(app, async (base) => {
    const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: loginHeaders, body: JSON.stringify(credentials) });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    let response = await fetch(`${base}/api/books/book`, { method: 'DELETE', headers: { Cookie: cookie, Origin: 'https://attacker.invalid' } });
    assert.equal(response.status, 403);
    for (const session of database.sessions.values()) session.expiresAt = new Date(0);
    response = await fetch(`${base}/api/books/book`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(response.status, 401);
    assert.equal(deleted(), 0);
  });
});

test('real application delete route rejects anonymous requests before reaching PostgreSQL', async () => {
  const { app } = await import('./server.js');
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/api/books/existing-book`, { method: 'DELETE' });
    assert.equal(response.status, 401);
  });
});

test('PostgreSQL bootstrap preserves credentials and sessions survive auth instance restart', { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const { default: pg } = await import('pg');
  const schema = `auth_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const control = new pg.Pool({ connectionString: process.env.TEST_POSTGRES_URL });
  await control.query(`CREATE SCHEMA ${schema}`);
  const database = new pg.Pool({ connectionString: process.env.TEST_POSTGRES_URL, options: `-c search_path=${schema}` });
  try {
    const initialHash = await hashPassword(credentials.password);
    const first = createAdminAuth(database, { production: true, origin: loginHeaders.Origin });
    await first.initialize({ username: 'admin', passwordHash: initialHash });
    await first.initialize({ username: 'admin', passwordHash: await hashPassword('replacement-must-not-overwrite') });
    const saved = await database.query('SELECT username, password_hash FROM admin_users');
    assert.deepEqual(saved.rows, [{ username: 'admin', password_hash: initialHash }]);
    const app = express();
    app.use(express.json());
    app.use('/api/admin', first.router);
    let cookie;
    await withServer(app, async (base) => {
      const response = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: loginHeaders, body: JSON.stringify(credentials) });
      assert.equal(response.status, 200);
      cookie = response.headers.get('set-cookie').split(';')[0];
    });
    const restarted = createAdminAuth(database, { production: true, origin: loginHeaders.Origin });
    await restarted.initialize({});
    const restartedApp = express();
    restartedApp.use(express.json());
    restartedApp.use('/api/admin', restarted.router);
    restartedApp.delete('/api/books/:id', restarted.requireAdmin, (req, res) => res.status(204).end());
    await withServer(restartedApp, async (base) => {
      let response = await fetch(`${base}/api/admin/session`, { headers: { Cookie: cookie } });
      assert.deepEqual(await response.json(), { authenticated: true, username: 'admin' });
      response = await fetch(`${base}/api/books/book`, { method: 'DELETE', headers: { Cookie: cookie } });
      assert.equal(response.status, 204);
      await database.query("UPDATE admin_sessions SET expires_at = NOW() - INTERVAL '1 second'");
      response = await fetch(`${base}/api/books/book`, { method: 'DELETE', headers: { Cookie: cookie } });
      assert.equal(response.status, 401);
    });
  } finally {
    await database.end();
    await control.query(`DROP SCHEMA ${schema} CASCADE`);
    await control.end();
  }
});
