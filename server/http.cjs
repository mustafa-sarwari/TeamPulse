// Shared local-demo API foundation. Each project configures only its own resources.
const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `${label} must contain 1–${max} characters.`);
  }
  return value.trim();
}
async function readJson(req) {
  if (!req.headers['content-type']?.includes('application/json')) throw new HttpError(415, 'Use application/json.');
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 32768) throw new HttpError(413, 'Request too large.');
  }
  try {
    const parsed = JSON.parse(body);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
    return parsed;
  } catch { throw new HttpError(400, 'Invalid JSON object.'); }
}
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function createApp({ root, resources, database = ':memory:', extraRoute, allowedOrigins = [], spaFallback = false }) {
  if (database !== ':memory:') fs.mkdirSync(path.dirname(database), { recursive: true });
  const db = new DatabaseSync(database);
  db.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, resource TEXT NOT NULL, owner TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS records_owner ON records(resource, owner);');
  const list = db.prepare('SELECT id, data, created_at FROM records WHERE resource = ? AND owner = ? ORDER BY created_at DESC LIMIT 500');
  const get = db.prepare('SELECT id, data, created_at FROM records WHERE resource = ? AND owner = ? AND id = ?');
  const insert = db.prepare('INSERT INTO records VALUES (?, ?, ?, ?, ?)');
  const update = db.prepare('UPDATE records SET data = ? WHERE resource = ? AND owner = ? AND id = ?');
  const remove = db.prepare('DELETE FROM records WHERE resource = ? AND owner = ? AND id = ?');
  const present = row => ({ ...JSON.parse(row.data), id: row.id, createdAt: row.created_at });
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/health' && req.method === 'GET') return send(res, 200, { status: 'ok' });
      // Reject cross-site writes. Frontend dev servers use a same-origin proxy.
      if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin) {
        const origin = new URL(req.headers.origin);
        if (origin.host !== req.headers.host && !allowedOrigins.includes(origin.origin)) throw new HttpError(403, 'Cross-origin writes are not allowed.');
      }
      if (extraRoute && await extraRoute(req, res, url, { send, readJson, HttpError })) return;
      if (url.pathname.startsWith('/api/')) {
        const match = url.pathname.match(/^\/api\/([a-z-]+)(?:\/([a-zA-Z0-9-]+))?$/);
        const resource = match && resources[match[1]];
        if (!resource) throw new HttpError(404, 'API route not found.');
        const cookie = req.headers.cookie?.match(/(?:^|;\s*)demo_session=([a-f0-9-]{36})(?:;|$)/);
        const session = cookie ? cookie[1] : randomUUID();
        if (!cookie) res.setHeader('Set-Cookie', `demo_session=${session}; HttpOnly; SameSite=Lax; Path=/`);
        const owner = resource.shared ? 'public' : session;
        const id = match[2];
        if (req.method === 'GET') {
          if (resource.writeOnly) throw new HttpError(405, 'This endpoint accepts submissions only.');
          if (!id) return send(res, 200, list.all(match[1], owner).map(present));
          const row = get.get(match[1], owner, id);
          if (!row) throw new HttpError(404, 'Record not found.');
          return send(res, 200, present(row));
        }
        if (req.method === 'POST' && !id) {
          const body = resource.validate(await readJson(req));
          const record = { ...body, id: randomUUID(), createdAt: new Date().toISOString() };
          insert.run(record.id, match[1], owner, JSON.stringify(body), record.createdAt);
          return send(res, 201, resource.writeOnly ? { id: record.id, status: 'received' } : record);
        }
        if (resource.writeOnly || resource.readOnly) throw new HttpError(405, 'Method not allowed.');
        const existing = id && get.get(match[1], owner, id);
        if (!existing) throw new HttpError(404, 'Record not found.');
        if (req.method === 'PATCH') {
          const body = resource.validate({ ...JSON.parse(existing.data), ...await readJson(req) });
          update.run(JSON.stringify(body), match[1], owner, id);
          return send(res, 200, { ...body, id, createdAt: existing.created_at });
        }
        if (req.method === 'DELETE') { remove.run(match[1], owner, id); return send(res, 200, { deleted: true }); }
        throw new HttpError(405, 'Method not allowed.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, 'Method not allowed.');
      const decoded = decodeURIComponent(url.pathname);
      if (decoded.startsWith('/api/')) throw new HttpError(404, 'API route not found.');
      const parts = decoded.split('/');
      if (parts.some(part => part.startsWith('.') || ['server', 'node_modules', 'test'].includes(part)) || /\.(cjs|mjs|sqlite|env|json|md|yml)$/i.test(decoded)) throw new HttpError(404, 'File not found.');
      let target = path.resolve(root, '.' + decoded);
      if (!target.startsWith(path.resolve(root) + path.sep) && target !== path.resolve(root)) throw new HttpError(404, 'File not found.');
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      if (!fs.existsSync(target) && spaFallback && !path.extname(decoded)) target = path.join(root, 'index.html');
      if (!fs.existsSync(target)) throw new HttpError(404, 'File not found.');
      const real = fs.realpathSync(target);
      if (!real.startsWith(fs.realpathSync(root) + path.sep)) throw new HttpError(404, 'File not found.');
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };
      res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(target).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (res.headersSent) return res.destroy();
      send(res, error.status || 500, { error: error.status ? error.message : 'An unexpected server error occurred.' });
    }
  });
  server.on('close', () => db.close());
  server.requestTimeout = 15000;
  return server;
}
module.exports = { createApp, text, HttpError };
