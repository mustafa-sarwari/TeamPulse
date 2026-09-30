module.exports = {
  ...{ resource: "tasks", invalid: {}, patch: { status: "done" } },
  body: async (url, cookie) => {
    await fetch(url + "/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Platform" }),
    });
    return { title: "Build API", team: "Platform", status: "todo" };
  },
};
