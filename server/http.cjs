const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const {
  randomUUID,
  randomBytes,
  createHash,
  scrypt,
  timingSafeEqual,
} = require("node:crypto");
const { promisify } = require("node:util");
const derive = promisify(scrypt);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function text(value, label, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new HttpError(400, `${label} must contain 1–${max} characters.`);
  return value.trim();
}
async function readBody(req, limit = 32768) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, "Request too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function readJson(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || ""))
    throw new HttpError(415, "Use application/json.");
  try {
    const body = JSON.parse((await readBody(req)).toString("utf8"));
    if (!body || Array.isArray(body) || typeof body !== "object")
      throw new Error();
    return body;
  } catch (error) {
    if (error.status) throw error;
    throw new HttpError(400, "Invalid JSON object.");
  }
}
function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}
const digest = (value) => createHash("sha256").update(value).digest("hex");
const visibleUser = (user) =>
  user
    ? { id: user.id, name: user.name, email: user.email, role: user.role }
    : null;

function createApp({
  root,
  resources = {},
  database = ":memory:",
  extraRoute,
  allowedOrigins = [],
  spaFallback = false,
  workspace = {},
  secureCookies = process.env.COOKIE_SECURE === "true",
  rateLimit = true,
}) {
  resources = Object.fromEntries(
    Object.entries({ ...resources, ...workspace.resources }).map(
      ([key, value]) => [key, { ...resources[key], ...value }],
    ),
  );
  if (database !== ":memory:")
    fs.mkdirSync(path.dirname(database), { recursive: true });
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, resource TEXT NOT NULL, owner TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
    CREATE INDEX IF NOT EXISTS records_owner ON records(resource, owner);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, actor TEXT NOT NULL, resource TEXT NOT NULL, record_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS activity_actor ON activity(actor, created_at);
    CREATE TABLE IF NOT EXISTS idempotency (owner TEXT NOT NULL, resource TEXT NOT NULL, key TEXT NOT NULL, fingerprint TEXT NOT NULL, record_id TEXT NOT NULL, PRIMARY KEY(owner, resource, key));`);
  if (
    !db
      .prepare("PRAGMA table_info(records)")
      .all()
      .some((column) => column.name === "version")
  )
    db.exec(
      "ALTER TABLE records ADD COLUMN version INTEGER NOT NULL DEFAULT 1",
    );
  const present = (row) => ({
    ...JSON.parse(row.data),
    id: row.id,
    createdAt: row.created_at,
    version: row.version,
  });
  const getRecord = (resource, id, owner) =>
    db
      .prepare("SELECT * FROM records WHERE resource=? AND id=? AND owner=?")
      .get(resource, id, owner);
  const rowsFor = (resource, owner) =>
    db
      .prepare(
        "SELECT * FROM records WHERE resource=? AND owner=? ORDER BY created_at DESC, id DESC LIMIT 500",
      )
      .all(resource, owner)
      .map(present);
  const audit = (actor, resource, id, action) =>
    db
      .prepare("INSERT INTO activity VALUES (?,?,?,?,?,?)")
      .run(randomUUID(), actor, resource, id, action, new Date().toISOString());
  const saveRecord = (resource, body, owner, actor = owner) => {
    const id = randomUUID(),
      createdAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO records (id,resource,owner,data,created_at) VALUES (?,?,?,?,?)",
    ).run(id, resource, owner, JSON.stringify(body), createdAt);
    audit(actor, resource, id, "created");
    return { ...body, id, createdAt, version: 1 };
  };
  db.exec(
    "CREATE TABLE IF NOT EXISTS seed_history (resource TEXT PRIMARY KEY)",
  );
  for (const [key, rows] of Object.entries(workspace.seed || {})) {
    if (
      db.prepare("SELECT resource FROM seed_history WHERE resource=?").get(key)
    )
      continue;
    db.exec("BEGIN IMMEDIATE");
    try {
      if (
        !db.prepare("SELECT id FROM records WHERE resource=? LIMIT 1").get(key)
      )
        for (const row of rows) saveRecord(key, row, "public", "seed");
      db.prepare("INSERT INTO seed_history VALUES (?)").run(key);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  const buckets = new Map();
  function throttle(req, key, limit, res) {
    if (!rateLimit) return;
    const now = Date.now(),
      token = `${req.socket.remoteAddress}:${key}`;
    let bucket = buckets.get(token);
    if (!bucket || bucket.until <= now) {
      bucket = { count: 0, until: now + 60000 };
      buckets.set(token, bucket);
    }
    if (++bucket.count > limit) {
      res.setHeader("Retry-After", Math.ceil((bucket.until - now) / 1000));
      throw new HttpError(429, "Too many requests. Try again in a minute.");
    }
    if (buckets.size > 1000)
      for (const [id, value] of buckets)
        if (value.until <= now) buckets.delete(id);
  }
  function cookie(res, token, maxAge = 604800) {
    res.setHeader(
      "Set-Cookie",
      `portfolio_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secureCookies ? "; Secure" : ""}`,
    );
  }
  function session(req, res) {
    const token = req.headers.cookie?.match(
      /(?:^|;\s*)portfolio_session=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    if (!token) return { user: null, token: null };
    const row = db
      .prepare(
        "SELECT users.*, sessions.expires_at FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?",
      )
      .get(digest(token), Date.now());
    if (row)
      cookie(res, token, Math.floor((row.expires_at - Date.now()) / 1000));
    return { user: row || null, token };
  }
  function signIn(res, user) {
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
      digest(token),
      user.id,
      Date.now() + 604800000,
    );
    cookie(res, token);
    return visibleUser(user);
  }
  const uiRoot = path.join(__dirname, "ui");
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    try {
      const url = new URL(req.url, "http://localhost");
      const { user, token } = session(req, res);
      const requireUser = (admin = false) => {
        if (!user) throw new HttpError(401, "Sign in to use your workspace.");
        if (admin && user.role !== "admin")
          throw new HttpError(403, "Workspace owner access required.");
        return visibleUser(user);
      };
      const context = {
        db,
        send,
        readJson,
        readBody,
        HttpError,
        user: visibleUser(user),
        requireUser,
        rowsFor,
        saveRecord,
        audit,
        present,
        getRecord,
      };
      if (url.pathname.startsWith("/api/"))
        throttle(
          req,
          req.method === "GET" ? "read" : "write",
          req.method === "GET" ? 180 : 60,
          res,
        );
      if (!["GET", "HEAD"].includes(req.method) && req.headers.origin) {
        let origin;
        try {
          origin = new URL(req.headers.origin);
        } catch {
          throw new HttpError(403, "Invalid request origin.");
        }
        if (
          !["http:", "https:"].includes(origin.protocol) ||
          (origin.host !== req.headers.host &&
            !allowedOrigins.includes(origin.origin))
        )
          throw new HttpError(403, "Cross-origin writes are not allowed.");
      }
      if (url.pathname === "/api/health" && req.method === "GET")
        return send(res, 200, { status: "ok" });
      if (url.pathname === "/api/auth/me" && req.method === "GET")
        return send(res, 200, { user: visibleUser(user) });
      if (
        ["/api/auth/register", "/api/auth/login"].includes(url.pathname) &&
        req.method === "POST"
      ) {
        throttle(req, "credentials", 8, res);
        const body = await readJson(req),
          email = text(body.email, "Email", 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new HttpError(400, "Enter a valid email.");
        if (
          typeof body.password !== "string" ||
          body.password.length < 12 ||
          body.password.length > 128
        )
          throw new HttpError(400, "Use a password of 12–128 characters.");
        if (url.pathname.endsWith("register")) {
          const name = text(body.name, "Name", 80),
            salt = randomBytes(16).toString("hex");
          const hash = (await derive(body.password, salt, 64)).toString("hex");
          const account = {
            id: randomUUID(),
            name,
            email,
            salt,
            password_hash: hash,
            role:
              db.prepare("SELECT count(*) AS n FROM users").get().n === 0
                ? "admin"
                : "member",
          };
          try {
            db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?)").run(
              account.id,
              name,
              email,
              salt,
              hash,
              account.role,
              new Date().toISOString(),
            );
          } catch (error) {
            if (error.code?.startsWith("ERR_SQLITE"))
              throw new HttpError(409, "An account already uses that email.");
            throw error;
          }
          if (token)
            db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
              digest(token),
            );
          return send(res, 201, { user: signIn(res, account) });
        }
        const account = db
          .prepare("SELECT * FROM users WHERE email=?")
          .get(email);
        const calculated = await derive(
          body.password,
          account?.salt || "invalid-account-timing-salt",
          64,
        );
        if (
          !account ||
          !timingSafeEqual(
            calculated,
            Buffer.from(account.password_hash, "hex"),
          )
        )
          throw new HttpError(401, "Email or password is incorrect.");
        if (token)
          db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
            digest(token),
          );
        return send(res, 200, { user: signIn(res, account) });
      }
      if (url.pathname === "/api/auth/logout" && req.method === "POST") {
        if (token)
          db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
            digest(token),
          );
        cookie(res, "", 0);
        return send(res, 200, { signedOut: true });
      }
      if (url.pathname === "/api/auth/sessions" && req.method === "DELETE") {
        requireUser();
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
        cookie(res, "", 0);
        return send(res, 200, { signedOut: true });
      }
      if (url.pathname === "/api/workspace" && req.method === "GET") {
        requireUser();
        return send(res, 200, {
          title: workspace.title || "My workspace",
          user: visibleUser(user),
          resources: Object.entries(resources)
            .filter(
              ([, r]) => !r.hidden && (!r.adminOnly || user.role === "admin"),
            )
            .map(([key, r]) => ({
              key,
              label: r.label || key,
              fields: r.fields || [],
              writable: !r.noCreate && !r.hideForm,
              editable: !r.writeOnly && !r.readOnly,
              shared: !!r.shared,
              submissions: !!r.writeOnly,
              description: r.description || "",
              actions: r.actions || [],
            })),
        });
      }
      if (url.pathname === "/api/activity" && req.method === "GET") {
        requireUser();
        return send(
          res,
          200,
          db
            .prepare(
              "SELECT resource,record_id AS recordId,action,created_at AS createdAt FROM activity WHERE actor=? ORDER BY created_at DESC LIMIT 50",
            )
            .all(user.id),
        );
      }
      if (url.pathname === "/api/account/submissions" && req.method === "GET") {
        requireUser();
        const resource = url.searchParams.get("resource");
        if (!resources[resource]?.writeOnly)
          throw new HttpError(404, "Submission type not found.");
        return send(res, 200, rowsFor(resource, user.id));
      }
      if (url.pathname === "/api/admin/inbox" && req.method === "GET") {
        requireUser(true);
        const keys = Object.keys(resources).filter(
          (key) => resources[key].writeOnly,
        );
        const rows = db
          .prepare("SELECT * FROM records ORDER BY created_at DESC LIMIT 500")
          .all()
          .filter((row) => keys.includes(row.resource));
        return send(
          res,
          200,
          rows.map((row) => ({ ...present(row), resource: row.resource })),
        );
      }
      if (
        url.pathname.startsWith("/api/admin/inbox/") &&
        req.method === "PATCH"
      ) {
        requireUser(true);
        const id = url.pathname.split("/").pop(),
          body = await readJson(req);
        if (!["received", "reviewing", "closed"].includes(body.status))
          throw new HttpError(400, "Choose a valid request status.");
        const row = db.prepare("SELECT * FROM records WHERE id=?").get(id);
        if (!row || !resources[row.resource]?.writeOnly)
          throw new HttpError(404, "Request not found.");
        const data = { ...JSON.parse(row.data), status: body.status };
        db.prepare(
          "UPDATE records SET data=?,version=version+1 WHERE id=?",
        ).run(JSON.stringify(data), id);
        audit(user.id, row.resource, id, "status changed");
        return send(res, 200, {
          ...data,
          id,
          version: row.version + 1,
          createdAt: row.created_at,
        });
      }
      if (
        workspace.extraRoute &&
        (await workspace.extraRoute(req, res, url, context))
      )
        return;
      if (extraRoute && (await extraRoute(req, res, url, context))) return;
      if (url.pathname.startsWith("/api/")) {
        const match = url.pathname.match(
            /^\/api\/([a-z-]+)(?:\/([a-zA-Z0-9-]+))?$/,
          ),
          key = match?.[1],
          resource = resources[key],
          id = match?.[2];
        if (!resource) throw new HttpError(404, "API route not found.");
        if (
          resource.adminOnly &&
          !(req.method === "GET" && resource.publicRead)
        )
          requireUser(true);
        else if (
          !(
            (req.method === "GET" && resource.publicRead) ||
            (req.method === "POST" && resource.writeOnly)
          )
        )
          requireUser();
        let guest = req.headers.cookie?.match(
          /(?:^|;\s*)demo_session=([a-f0-9-]{36})(?:;|$)/,
        )?.[1];
        if (!user && !guest) {
          guest = randomUUID();
          res.setHeader(
            "Set-Cookie",
            `demo_session=${guest}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${secureCookies ? "; Secure" : ""}`,
          );
        }
        const owner = resource.shared ? "public" : user?.id || guest;
        if (req.method === "GET") {
          if (resource.writeOnly)
            throw new HttpError(
              405,
              "Use the protected submissions or inbox view.",
            );
          if (id) {
            const row = getRecord(key, id, owner);
            if (!row) throw new HttpError(404, "Record not found.");
            res.setHeader("ETag", `"${row.version}"`);
            return send(res, 200, present(row));
          }
          const limit = Number(url.searchParams.get("limit") || 20),
            page = Number(url.searchParams.get("page") || 1);
          if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 100 ||
            !Number.isInteger(page) ||
            page < 1 ||
            page > 10000
          )
            throw new HttpError(400, "Invalid page or limit.");
          const query = (url.searchParams.get("q") || "").trim().toLowerCase();
          if (query.length > 200)
            throw new HttpError(400, "Search is too long.");
          const filter = `resource=? AND owner=?${query ? " AND lower(data) LIKE ? ESCAPE '\\'" : ""}`;
          const args = [key, owner];
          if (query) args.push("%" + query.replace(/[\\%_]/g, "\\$&") + "%");
          if (
            !url.searchParams.has("page") &&
            !url.searchParams.has("limit") &&
            !query
          )
            return send(res, 200, rowsFor(key, owner));
          const total = db
            .prepare("SELECT count(*) AS n FROM records WHERE " + filter)
            .get(...args).n;
          const items = db
            .prepare(
              "SELECT * FROM records WHERE " +
                filter +
                " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
            )
            .all(...args, limit, (page - 1) * limit)
            .map(present);
          return send(res, 200, {
            items,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          });
        }
        if (req.method === "POST" && !id) {
          if (resource.noCreate)
            throw new HttpError(
              405,
              "This resource is generated by its workflow.",
            );
          const input = await readJson(req);
          const idem = req.headers["idempotency-key"],
            fingerprint = digest(JSON.stringify(input));
          if (idem && !/^[A-Za-z0-9:_-]{8,128}$/.test(idem))
            throw new HttpError(400, "Invalid idempotency key.");
          if (idem) {
            const previous = db
              .prepare(
                "SELECT * FROM idempotency WHERE owner=? AND resource=? AND key=?",
              )
              .get(owner, key, idem);
            if (previous) {
              if (previous.fingerprint !== fingerprint)
                throw new HttpError(
                  409,
                  "This idempotency key was used for different input.",
                );
              const row = getRecord(key, previous.record_id, owner);
              if (!row)
                throw new HttpError(
                  409,
                  "The previous record no longer exists.",
                );
              return send(
                res,
                200,
                resource.writeOnly
                  ? { id: row.id, status: JSON.parse(row.data).status }
                  : present(row),
              );
            }
          }
          let record;
          db.exec("BEGIN IMMEDIATE");
          try {
            const body = resource.validate(input, context);
            if (resource.writeOnly) body.status = "received";
            if (
              resource.uniqueField &&
              db
                .prepare(
                  "SELECT id FROM records WHERE resource=? AND owner=? AND json_extract(data,?)=?",
                )
                .get(
                  key,
                  owner,
                  "$." + resource.uniqueField,
                  body[resource.uniqueField],
                )
            )
              throw new HttpError(409, "This item is already saved.");
            record = saveRecord(key, body, owner, user?.id || owner);
            if (idem)
              db.prepare("INSERT INTO idempotency VALUES (?,?,?,?,?)").run(
                owner,
                key,
                idem,
                fingerprint,
                record.id,
              );
            db.exec("COMMIT");
          } catch (error) {
            db.exec("ROLLBACK");
            throw error;
          }
          res.setHeader("Location", `/api/${key}/${record.id}`);
          res.setHeader("ETag", '"1"');
          return send(
            res,
            201,
            resource.writeOnly
              ? { id: record.id, status: record.status }
              : record,
          );
        }
        if (resource.writeOnly || resource.readOnly)
          throw new HttpError(405, "Method not allowed.");
        const row = id && getRecord(key, id, owner);
        if (!row) throw new HttpError(404, "Record not found.");
        const expected = req.headers["if-match"];
        if (expected && expected !== `"${row.version}"`)
          throw new HttpError(
            409,
            "This record changed. Reload before saving.",
          );
        if (req.method === "PATCH") {
          const input = await readJson(req);
          let body;
          db.exec("BEGIN IMMEDIATE");
          try {
            body = resource.validate(
              { ...JSON.parse(row.data), ...input },
              { ...context, recordId: id },
            );
            if (
              resource.uniqueField &&
              db
                .prepare(
                  "SELECT id FROM records WHERE resource=? AND owner=? AND id<>? AND json_extract(data,?)=?",
                )
                .get(
                  key,
                  owner,
                  id,
                  "$." + resource.uniqueField,
                  body[resource.uniqueField],
                )
            )
              throw new HttpError(409, "This item is already saved.");
            if (resource.beforeUpdate)
              resource.beforeUpdate(present(row), body, context);
            const result = db
              .prepare(
                "UPDATE records SET data=?,version=version+1 WHERE resource=? AND owner=? AND id=? AND version=?",
              )
              .run(JSON.stringify(body), key, owner, id, row.version);
            if (!result.changes)
              throw new HttpError(
                409,
                "This record changed. Reload before saving.",
              );
            audit(user.id, key, id, "updated");
            db.exec("COMMIT");
          } catch (error) {
            db.exec("ROLLBACK");
            throw error;
          }
          res.setHeader("ETag", `"${row.version + 1}"`);
          return send(res, 200, {
            ...body,
            id,
            createdAt: row.created_at,
            version: row.version + 1,
          });
        }
        if (req.method === "DELETE") {
          if (resource.beforeDelete)
            resource.beforeDelete(present(row), context);
          const result = db
            .prepare(
              "DELETE FROM records WHERE resource=? AND owner=? AND id=? AND version=?",
            )
            .run(key, owner, id, row.version);
          if (!result.changes)
            throw new HttpError(
              409,
              "This record changed. Reload before deleting.",
            );
          audit(user.id, key, id, "deleted");
          return send(res, 200, { deleted: true });
        }
        throw new HttpError(405, "Method not allowed.");
      }
      if (!["GET", "HEAD"].includes(req.method))
        throw new HttpError(405, "Method not allowed.");
      let target;
      const ui = {
        "/account": "account.html",
        "/account.js": "auth.js",
        "/workspace.js": "workspace.js",
        "/workspace.css": "workspace.css",
      };
      // Public account assets are explicitly mapped, never discovered from server paths.
      if (ui[url.pathname]) target = path.join(uiRoot, ui[url.pathname]);
      else {
        let decoded;
        try {
          decoded = decodeURIComponent(url.pathname);
        } catch {
          throw new HttpError(400, "Invalid path.");
        }
        if (
          decoded
            .split("/")
            .some(
              (part) =>
                part.startsWith(".") ||
                [
                  "server",
                  "node_modules",
                  "test",
                  "docs",
                  "scripts",
                  "config",
                ].includes(part),
            ) ||
          /\.(cjs|mjs|sqlite|env|md|yml|py)$/i.test(decoded) ||
          ["/package.json", "/package-lock.json"].includes(decoded)
        )
          throw new HttpError(404, "File not found.");
        target = path.resolve(root, "." + decoded);
        if (
          !target.startsWith(path.resolve(root) + path.sep) &&
          target !== path.resolve(root)
        )
          throw new HttpError(404, "File not found.");
        if (fs.existsSync(target) && fs.statSync(target).isDirectory())
          target = path.join(target, "index.html");
        if (!fs.existsSync(target) && spaFallback && !path.extname(decoded))
          target = path.join(root, "index.html");
        if (!fs.existsSync(target)) throw new HttpError(404, "File not found.");
        if (
          !fs.realpathSync(target).startsWith(fs.realpathSync(root) + path.sep)
        )
          throw new HttpError(404, "File not found.");
      }
      if (!fs.existsSync(target)) throw new HttpError(404, "File not found.");
      const types = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4",
        ".ico": "image/x-icon",
      };
      const mime = types[path.extname(target)] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type":
          mime +
          (/^(text\/|application\/json)/.test(mime) ? "; charset=utf-8" : ""),
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(target)
        .on("error", () => res.destroy())
        .pipe(res);
    } catch (error) {
      if (res.headersSent) return res.destroy();
      send(res, error.status || 500, {
        error: error.status
          ? error.message
          : "An unexpected server error occurred.",
      });
    }
  });
  server.on("close", () => db.close());
  server.requestTimeout = 20000;
  return server;
}
module.exports = { createApp, text, HttpError, readJson, readBody, send };
