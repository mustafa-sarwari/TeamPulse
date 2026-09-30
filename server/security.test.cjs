const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { buildServer } = require("./index.cjs");
const json = (body, cookie = "") => ({
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify(body),
});
async function register(url, email = "owner@example.org") {
  const response = await fetch(
    url + "/api/auth/register",
    json({ name: "Test User", email, password: "Correct horse battery 42!" }),
  );
  assert.equal(response.status, 201);
  return {
    cookie: response.headers.get("set-cookie").split(";")[0],
    user: (await response.json()).user,
    headers: response.headers,
  };
}
async function running(options = {}) {
  const server = buildServer({
    database: ":memory:",
    rateLimit: false,
    ...options,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
test("accounts use hashed credentials, rotated sessions, roles, and persistent login", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-auth-")),
    database = path.join(directory, "test.sqlite");
  let { server, url } = await running({ database });
  try {
    const owner = await register(url);
    assert.equal(owner.user.role, "admin");
    assert.match(owner.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
    assert.equal((await fetch(url + "/api/workspace")).status, 401);
    const member = await register(url, "member@example.org");
    assert.equal(member.user.role, "member");
    assert.equal(
      (
        await fetch(url + "/api/admin/inbox", {
          headers: { Cookie: member.cookie },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(
          url + "/api/auth/login",
          json({
            email: "owner@example.org",
            password: "A completely wrong password",
          }),
        )
      ).status,
      401,
    );
    const denied = await fetch(url + "/api/auth/logout", {
      method: "POST",
      headers: { Cookie: owner.cookie, Origin: "https://untrusted.example" },
    });
    assert.equal(denied.status, 403);
    const login = await fetch(
      url + "/api/auth/login",
      json(
        { email: "owner@example.org", password: "Correct horse battery 42!" },
        owner.cookie,
      ),
    );
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    assert.notEqual(cookie, owner.cookie);
    assert.equal(
      (
        await (
          await fetch(url + "/api/auth/me", {
            headers: { Cookie: owner.cookie },
          })
        ).json()
      ).user,
      null,
    );
    const db = new DatabaseSync(database);
    const stored = db
      .prepare("SELECT password_hash FROM users WHERE id=?")
      .get(owner.user.id).password_hash;
    assert.notEqual(stored, "Correct horse battery 42!");
    assert.equal(stored.length, 128);
    assert.equal(
      db
        .prepare("SELECT token_hash FROM sessions WHERE user_id=?")
        .get(owner.user.id).token_hash.length,
      64,
    );
    db.close();
    await new Promise((resolve) => server.close(resolve));
    ({ server, url } = await running({ database }));
    assert.equal(
      (
        await (
          await fetch(url + "/api/auth/me", { headers: { Cookie: cookie } })
        ).json()
      ).user.id,
      owner.user.id,
    );
    for (const file of [
      "/server/http.cjs",
      "/.git/config",
      "/.env",
      "/package.json",
    ])
      assert.equal((await fetch(url + file)).status, 404);
    assert.equal(
      (
        await fetch(url + "/api/auth/logout", {
          method: "POST",
          headers: { Cookie: cookie },
        })
      ).status,
      200,
    );
    assert.equal(
      (await fetch(url + "/api/workspace", { headers: { Cookie: cookie } }))
        .status,
      401,
    );
    const expired = new DatabaseSync(database);
    expired
      .prepare("UPDATE sessions SET expires_at=? WHERE user_id=?")
      .run(Date.now() - 1, member.user.id);
    expired.close();
    assert.equal(
      (
        await fetch(url + "/api/workspace", {
          headers: { Cookie: member.cookie },
        })
      ).status,
      401,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test("rate limits reject repeated credential attempts", async () => {
  const { server, url } = await running({ rateLimit: true });
  try {
    for (let i = 0; i < 8; i++)
      assert.equal(
        (
          await fetch(
            url + "/api/auth/login",
            json({
              email: "invalid@example.org",
              password: "long-enough-password!",
            }),
          )
        ).status,
        401,
      );
    const response = await fetch(
      url + "/api/auth/login",
      json({ email: "invalid@example.org", password: "long-enough-password!" }),
    );
    assert.equal(response.status, 429);
    assert.ok(response.headers.get("retry-after"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
module.exports = { running, register, json };
