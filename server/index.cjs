const path = require("node:path");
const { createApp, text, HttpError } = require("./http.cjs");
function buildServer({
  database = path.join(__dirname, "../.data/demo.sqlite"),
} = {}) {
  return createApp({
    workspace: require("./workspace.cjs"),
    root: path.join(__dirname, "../public"),
    database,
    resources: {
      teams: {
        validate: (body) => ({ name: text(body.name, "Team name", 80) }),
      },
      tasks: {
        validate(body) {
          if (!["todo", "doing", "done"].includes(body.status || "todo"))
            throw new HttpError(400, "Choose a valid task status.");
          return {
            title: text(body.title, "Task title", 200),
            team: text(body.team, "Team name", 80),
            status: body.status || "todo",
          };
        },
      },
    },
  });
}
if (require.main === module)
  buildServer().listen(Number(process.env.PORT || 4000), "127.0.0.1", () =>
    console.log("TeamPulse: http://localhost:4000"),
  );
module.exports = { buildServer };
