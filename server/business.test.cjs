const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { buildServer } = require("./index.cjs");
const type = process.env.RELATIONSHIP_TEST || require("./fixture.cjs").resource;
test("domain relationships remain valid through the lifecycle", async () => {
  const server = buildServer({ database: ":memory:" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = "http://127.0.0.1:" + server.address().port;
  let cookie = "";
  const call = (route, method = "GET", body) =>
    fetch(url + route, {
      method,
      headers: { "Content-Type": "application/json", Cookie: cookie },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    const signup = await call("/api/auth/register", "POST", {
      name: "Owner",
      email: "owner@example.org",
      password: "A long secure password 123!",
    });
    cookie = signup.headers.get("set-cookie").split(";")[0];
    if (type === "loans") {
      const [book] = await (await call("/api/catalog")).json();
      const body = { bookId: book.id, returned: false },
        response = await call("/api/loans", "POST", body);
      assert.equal(response.status, 201);
      const row = await response.json();
      assert.equal((await call("/api/loans", "POST", body)).status, 409);
      assert.equal(
        (await call("/api/loans/" + row.id, "PATCH", { returned: true }))
          .status,
        200,
      );
      assert.equal((await call("/api/loans", "POST", body)).status, 201);
    } else {
      const team = await (
          await call("/api/teams", "POST", { name: "Platform" })
        ).json(),
        task = await (
          await call("/api/tasks", "POST", {
            title: "Review API",
            team: "Platform",
          })
        ).json();
      assert.equal(
        (await call("/api/teams/" + team.id, "PATCH", { name: "Backend" }))
          .status,
        200,
      );
      assert.equal(
        (await (await call("/api/tasks/" + task.id)).json()).team,
        "Backend",
      );
      assert.equal((await call("/api/teams/" + team.id, "DELETE")).status, 409);
      assert.equal((await call("/api/tasks/" + task.id, "DELETE")).status, 200);
      assert.equal((await call("/api/teams/" + team.id, "DELETE")).status, 200);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
