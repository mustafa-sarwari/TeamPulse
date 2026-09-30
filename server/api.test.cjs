const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { buildServer } = require("./index.cjs");
const fixture = require("./fixture.cjs");
const json = (method, body, cookie, extra = {}) => ({
  method,
  headers: { "Content-Type": "application/json", Cookie: cookie, ...extra },
  body: JSON.stringify(body),
});
test("domain workflow validates input, enforces access, and handles retries", async () => {
  const server = buildServer({ database: ":memory:", rateLimit: false });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  const signup = async (email) => {
    const response = await fetch(
      url + "/api/auth/register",
      json(
        "POST",
        { name: "Sample", email, password: "A long test password 123!" },
        "",
      ),
    );
    assert.equal(response.status, 201);
    return response.headers.get("set-cookie").split(";")[0];
  };
  try {
    const cookie = await signup("owner@example.org"),
      other = await signup("other@example.org");
    const data = await fixture.body(url, cookie);
    const route = "/api/" + fixture.resource;
    if (fixture.invalid)
      assert.equal(
        (await fetch(url + route, json("POST", fixture.invalid, cookie)))
          .status,
        400,
      );
    const key = "test-idempotency-12345",
      created = await fetch(
        url + route,
        json("POST", data, cookie, { "Idempotency-Key": key }),
      );
    assert.equal(created.status, 201);
    const row = await created.json();
    assert.ok(row.id);
    const repeated = await fetch(
      url + route,
      json("POST", data, cookie, { "Idempotency-Key": key }),
    );
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).id, row.id);
    const conflict = await fetch(
      url + route,
      json("POST", { ...data, extra: "changed" }, cookie, {
        "Idempotency-Key": key,
      }),
    );
    assert.equal(conflict.status, 409);
    if (fixture.submission) {
      const own = await (
        await fetch(
          url + "/api/account/submissions?resource=" + fixture.resource,
          { headers: { Cookie: cookie } },
        )
      ).json();
      assert.equal(own.length, 1);
      assert.equal(
        (
          await (
            await fetch(
              url + "/api/account/submissions?resource=" + fixture.resource,
              { headers: { Cookie: other } },
            )
          ).json()
        ).length,
        0,
      );
      assert.equal(
        (await fetch(url + "/api/admin/inbox", { headers: { Cookie: other } }))
          .status,
        403,
      );
      const inbox = await (
        await fetch(url + "/api/admin/inbox", { headers: { Cookie: cookie } })
      ).json();
      assert.equal(inbox.length, 1);
      assert.equal(
        (
          await fetch(
            url + "/api/admin/inbox/" + row.id,
            json("PATCH", { status: "reviewing" }, cookie),
          )
        ).status,
        200,
      );
    } else {
      const read = await fetch(url + route + "/" + row.id, {
        headers: { Cookie: cookie },
      });
      assert.equal(read.status, 200);
      const paged = await (
        await fetch(url + route + "?page=1&limit=1", {
          headers: { Cookie: cookie },
        })
      ).json();
      assert.equal(paged.items.length, 1);
      assert.ok(paged.total >= 1);
      assert.equal(
        (
          await fetch(url + route + "?limit=1000", {
            headers: { Cookie: cookie },
          })
        ).status,
        400,
      );
      if (!fixture.shared)
        assert.equal(
          (
            await fetch(url + route + "/" + row.id, {
              headers: { Cookie: other },
            })
          ).status,
          404,
        );
      else if (fixture.adminOnly)
        assert.equal(
          (
            await fetch(url + route + "/" + row.id, {
              headers: { Cookie: other },
            })
          ).status,
          403,
        );
      if (fixture.patch) {
        const edit = await fetch(
          url + route + "/" + row.id,
          json("PATCH", fixture.patch, cookie, { "If-Match": '"1"' }),
        );
        assert.equal(edit.status, 200);
        assert.equal((await edit.json()).version, 2);
        assert.equal(
          (
            await fetch(
              url + route + "/" + row.id,
              json("PATCH", fixture.patch, cookie, { "If-Match": '"1"' }),
            )
          ).status,
          409,
        );
      }
    }
    const activity = await (
      await fetch(url + "/api/activity", { headers: { Cookie: cookie } })
    ).json();
    assert.ok(activity.length >= 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
