const status = document.querySelector("#status");
const clientId = crypto.randomUUID();
let teams = [],
  tasks = [],
  busy = false,
  draggingTaskId = null;
async function request(resource, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = {
    ...(method !== "GET" && method !== "HEAD"
      ? { "Content-Type": "application/json", "X-Client-Id": clientId }
      : {}),
    ...(options.headers || {}),
  };
  const response = await fetch("/api/" + resource, { ...options, headers });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}
function toast(message) {
  let container = document.querySelector("#toast");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast";
    container.className = "toast";
    document.body.append(container);
  }
  container.textContent = message;
  container.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    container.hidden = true;
  }, 2600);
}
function render() {
  const select = document.querySelector("#task-team"),
    selected = select.value;
  select.replaceChildren();
  const filter = document.querySelector("#team-filter"),
    filtered = filter.value;
  filter.replaceChildren(new Option("All teams", ""));
  for (const team of teams) {
    select.add(new Option(team.name, team.name));
    filter.add(new Option(team.name, team.name));
  }
  select.value = teams.some((team) => team.name === selected)
    ? selected
    : teams[0]?.name || "";
  filter.value = filtered;
  const board = document.querySelector("#board");
  board.replaceChildren();
  for (const [state, title] of [
    ["todo", "To Do"],
    ["doing", "In Progress"],
    ["done", "Done"],
  ]) {
    const column = document.createElement("section");
    column.className = "column";
    column.dataset.status = state;
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("drop-target");
    });
    column.addEventListener("dragleave", () => column.classList.remove("drop-target"));
    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      column.classList.remove("drop-target");
      if (!draggingTaskId) return;
      await moveTask(draggingTaskId, state);
      draggingTaskId = null;
    });
    const heading = document.createElement("h3");
    heading.textContent = title;
    column.append(heading);
    const rows = tasks.filter(
      (task) => task.status === state && (!filtered || task.team === filtered),
    );
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.textContent = "No tasks";
      column.append(empty);
    }
    for (const task of rows) {
      const card = document.createElement("article");
      card.draggable = true;
      card.addEventListener("dragstart", () => {
        draggingTaskId = task.id;
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        draggingTaskId = null;
      });
      const name = document.createElement("h3");
      name.textContent = task.title;
      const team = document.createElement("p");
      team.textContent = task.team;
      const remove = document.createElement("button");
      remove.textContent = "Delete task";
      remove.type = "button";
      remove.addEventListener("click", () =>
        mutate(async () => {
          await request("tasks/" + task.id, { method: "DELETE" });
          tasks = tasks.filter((row) => row.id !== task.id);
        }),
      );
      card.append(name, team, remove);
      column.append(card);
    }
    board.append(column);
  }
}
async function moveTask(taskId, nextStatus) {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index < 0) return;
  const previous = tasks[index];
  if (previous.status === nextStatus) return;
  tasks[index] = { ...previous, status: nextStatus };
  render();
  try {
    const updated = await request(`tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    tasks[index] = updated;
    status.textContent = "Saved.";
  } catch (error) {
    tasks[index] = previous;
    render();
    status.textContent = error.message;
    toast(error.message);
  }
}
function applyEvent(event) {
  if (event.type === "task.created" && event.task)
    tasks = [event.task, ...tasks.filter((task) => task.id !== event.task.id)];
  else if (event.type === "task.updated" && event.task)
    tasks = tasks.map((task) => (task.id === event.task.id ? event.task : task));
  else if (event.type === "task.deleted" && event.taskId)
    tasks = tasks.filter((task) => task.id !== event.taskId);
  else return;
  render();
}
function connectEvents() {
  const stream = new EventSource("/api/events?client=" + encodeURIComponent(clientId));
  stream.onmessage = (message) => {
    try {
      applyEvent(JSON.parse(message.data));
    } catch {}
  };
  stream.onerror = () => {
    status.textContent = "Live sync reconnecting…";
  };
}
async function mutate(action) {
  if (busy) return;
  busy = true;
  document.querySelectorAll("button").forEach((button) => (button.disabled = true));
  try {
    await action();
    status.textContent = "Saved.";
  } catch (error) {
    status.textContent = error.message;
    toast(error.message);
  } finally {
    busy = false;
    render();
    document.querySelectorAll("button").forEach((button) => (button.disabled = false));
  }
}
document.querySelector("#team-form").addEventListener("submit", (event) => {
  event.preventDefault();
  mutate(async () => {
    const input = document.querySelector("#team-name");
    const row = await request("teams", {
      method: "POST",
      body: JSON.stringify({ name: input.value }),
    });
    teams.unshift(row);
    input.value = "";
  });
});
document.querySelector("#task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  mutate(async () => {
    const input = document.querySelector("#task-title");
    const row = await request("tasks", {
      method: "POST",
      body: JSON.stringify({
        title: input.value,
        team: document.querySelector("#task-team").value,
        status: "todo",
      }),
    });
    tasks.unshift(row);
    input.value = "";
  });
});
document.querySelector("#team-filter").addEventListener("change", render);
(async () => {
  try {
    teams = await request("teams");
    tasks = await request("tasks");
    status.textContent = "Connected.";
    connectEvents();
  } catch (error) {
    status.textContent = error.message;
  }
  render();
})();
