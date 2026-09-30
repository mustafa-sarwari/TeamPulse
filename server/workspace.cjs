const d = require("./domain.cjs");
const { text, HttpError } = require("./http.cjs");
module.exports = {
  title: "TeamPulse task board",
  resources: {
    teams: {
      label: "Teams",
      uniqueField: "name",
      fields: [d.field("name", "Team name")],
      beforeUpdate(previous, body, ctx) {
        if (previous.name === body.name) return;
        const rows = ctx.db
          .prepare(
            "SELECT * FROM records WHERE resource='tasks' AND owner=? AND json_extract(data,'$.team')=?",
          )
          .all(ctx.user.id, previous.name);
        for (const row of rows) {
          ctx.db
            .prepare("UPDATE records SET data=?,version=version+1 WHERE id=?")
            .run(
              JSON.stringify({ ...JSON.parse(row.data), team: body.name }),
              row.id,
            );
          ctx.audit(ctx.user.id, "tasks", row.id, "team renamed");
        }
      },
      beforeDelete(previous, ctx) {
        if (
          ctx.db
            .prepare(
              "SELECT id FROM records WHERE resource='tasks' AND owner=? AND json_extract(data,'$.team')=? LIMIT 1",
            )
            .get(ctx.user.id, previous.name)
        )
          throw new HttpError(
            409,
            "Move or delete this team’s tasks before deleting the team.",
          );
      },
    },
    tasks: {
      label: "Team tasks",
      fields: [
        d.field("title", "Task title"),
        d.field("team", "Team", "text", {
          source: "teams",
          labelField: "name",
          valueField: "name",
        }),
        d.field("status", "Status", "text", {
          options: ["todo", "doing", "done"],
        }),
        d.field("priority", "Priority", "text", {
          options: ["normal", "high", "low"],
        }),
        d.field("dueDate", "Due date", "date", { required: false }),
      ],
      validate(b, ctx) {
        if (
          !ctx
            .rowsFor("teams", ctx.user.id)
            .some((team) => team.name === b.team)
        )
          throw new HttpError(400, "Choose one of your teams.");
        return {
          title: text(b.title, "Task", 200),
          team: b.team,
          status: d.choice(b.status, ["todo", "doing", "done"], "todo"),
          priority: d.choice(b.priority, ["normal", "high", "low"], "normal"),
          dueDate: d.date(b.dueDate),
        };
      },
    },
  },
};
