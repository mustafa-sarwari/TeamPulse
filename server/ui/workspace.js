(async () => {
  const $ = (id) => document.getElementById(id);
  let views = [],
    view,
    page = 1,
    query = "",
    editing = null,
    busy = false,
    loadSequence = 0;
  const request = async (url, options = {}) => {
    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch {
      throw Error("The server returned an invalid response.");
    }
    if (!response.ok)
      throw Error(data.error || "Unable to complete this request.");
    return data;
  };
  const json = (method, body, headers = {}) => ({
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const announce = (message) => {
    $("record-status").textContent = message;
  };
  const node = (tag, text) =>
    Object.assign(document.createElement(tag), { textContent: text });
  function fields() {
    const container = $("fields");
    container.replaceChildren();
    for (const field of view.fields) {
      const label = node("label", field.label),
        input = document.createElement(
          field.options || field.source
            ? "select"
            : field.type === "textarea"
              ? "textarea"
              : "input",
        );
      input.name = field.key;
      input.id = "field-" + field.key;
      if (field.options)
        for (const choice of field.options) {
          const option = node("option", choice);
          option.value = choice;
          input.append(option);
        }
      else if (field.source) {
        request("/api/" + field.source)
          .then((data) => {
            const rows = Array.isArray(data) ? data : data.items;
            for (const row of rows) {
              const option = node(
                "option",
                row[field.labelField] || row.title || row.name || row.id,
              );
              option.value = row[field.valueField || "id"];
              input.append(option);
            }
            if (editing) input.value = editing[field.key];
          })
          .catch((e) => announce(e.message));
      } else {
        input.type = field.type || "text";
        if (field.maxLength) input.maxLength = field.maxLength;
        if (field.min !== undefined) input.min = field.min;
        if (field.max !== undefined) input.max = field.max;
      }
      input.required = field.required !== false;
      label.append(input);
      container.append(label);
    }
  }
  function cancelEdit() {
    editing = null;
    $("record-form").reset();
    $("record-form").querySelector("h3").textContent = "Add a record";
    $("cancel-edit").hidden = true;
  }
  async function activity() {
    try {
      const rows = await request("/api/activity");
      $("activity").replaceChildren(
        ...rows.map((row) =>
          node(
            "li",
            `${row.action} · ${views.find((v) => v.key === row.resource)?.label || row.resource} · ${new Date(row.createdAt).toLocaleString()}`,
          ),
        ),
      );
      if (!rows.length)
        $("activity").append(
          node("li", "Your saved changes will appear here."),
        );
    } catch {
      $("activity").textContent = "Activity is temporarily unavailable.";
    }
  }
  async function load() {
    const sequence = ++loadSequence;
    $("records").setAttribute("aria-busy", "true");
    announce("Loading…");
    try {
      let data;
      if (view.key === "inbox") data = await request("/api/admin/inbox");
      else if (view.submissions)
        data = await request(
          "/api/account/submissions?resource=" + encodeURIComponent(view.key),
        );
      else
        data = await request(
          `/api/${view.key}?page=${page}&limit=12&q=${encodeURIComponent(query)}`,
        );
      if (sequence !== loadSequence) return;
      if (Array.isArray(data)) {
        const all = data.filter(
          (row) =>
            !query ||
            JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
        );
        data = {
          items: all.slice((page - 1) * 12, page * 12),
          total: all.length,
          pages: Math.ceil(all.length / 12),
        };
      }
      $("records").replaceChildren();
      for (const record of data.items) {
        const card = node("article", "");
        card.className = "record";
        card.append(
          node(
            "h3",
            record.title ||
              record.name ||
              record.order ||
              record.label ||
              record.id.slice(0, 8),
          ),
        );
        const list = document.createElement("dl");
        for (const [key, value] of Object.entries(record)) {
          if (["id", "version", "createdAt"].includes(key)) continue;
          list.append(
            node("dt", view.fields.find((f) => f.key === key)?.label || key),
            node(
              "dd",
              typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value),
            ),
          );
        }
        card.append(
          list,
          node("p", new Date(record.createdAt).toLocaleString()),
        );
        const actions = node("div", "");
        actions.className = "record-actions";
        if (view.key === "inbox") {
          const select = document.createElement("select");
          select.setAttribute("aria-label", "Status for " + record.id);
          for (const status of ["received", "reviewing", "closed"]) {
            const option = node("option", status);
            option.value = status;
            select.append(option);
          }
          select.value = record.status || "received";
          select.addEventListener("change", async () => {
            select.disabled = true;
            try {
              await request(
                "/api/admin/inbox/" + record.id,
                json("PATCH", { status: select.value }),
              );
              announce("Request status saved.");
              await activity();
            } catch (e) {
              announce(e.message);
            } finally {
              select.disabled = false;
            }
          });
          actions.append(select);
        }
        if (view.editable) {
          const edit = node("button", "Edit");
          edit.type = "button";
          edit.addEventListener("click", () => {
            editing = record;
            for (const field of view.fields) {
              const input = $("record-form").elements[field.key];
              input.value = String(record[field.key] ?? "");
            }
            $("record-form").querySelector("h3").textContent = "Edit record";
            $("cancel-edit").hidden = false;
            $("record-form").scrollIntoView({
              block: "center",
              behavior: "smooth",
            });
          });
          const remove = node("button", "Delete");
          remove.type = "button";
          remove.addEventListener("click", async () => {
            if (!confirm("Delete this record?")) return;
            remove.disabled = true;
            try {
              await request("/api/" + view.key + "/" + record.id, {
                method: "DELETE",
                headers: { "If-Match": `"${record.version}"` },
              });
              await load();
              await activity();
            } catch (e) {
              announce(e.message);
              remove.disabled = false;
            }
          });
          actions.append(edit, remove);
        }
        card.append(actions);
        $("records").append(card);
      }
      if (!data.items.length)
        $("records").append(node("p", "No saved records in this view."));
      $("page-info").textContent = `Page ${page} · ${data.total} records`;
      $("previous").disabled = page === 1;
      $("next").disabled = page >= data.pages;
      announce("");
    } catch (error) {
      if (sequence === loadSequence) announce(error.message);
    } finally {
      if (sequence === loadSequence) $("records").removeAttribute("aria-busy");
    }
  }
  function choose(next) {
    view = next;
    page = 1;
    query = "";
    $("query").value = "";
    cancelEdit();
    $("resource-title").textContent = view.label;
    $("description").textContent = view.description;
    $("record-section").hidden = false;
    fields();
    $("record-form").hidden = !view.writable || !view.fields.length;
    for (const button of $("resources").children)
      button.setAttribute("aria-current", button.dataset.key === view.key);
    load();
  }
  $("record-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const submit = $("record-form").querySelector("[type=submit]");
    submit.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget));
      for (const field of view.fields) {
        if (field.type === "number") body[field.key] = Number(body[field.key]);
        if (field.type === "boolean")
          body[field.key] = body[field.key] === "true";
      }
      const url = "/api/" + view.key + (editing ? "/" + editing.id : "");
      await request(
        url,
        json(
          editing ? "PATCH" : "POST",
          body,
          editing
            ? { "If-Match": `"${editing.version}"` }
            : { "Idempotency-Key": crypto.randomUUID() },
        ),
      );
      cancelEdit();
      await load();
      await activity();
      announce("Record saved.");
    } catch (error) {
      announce(error.message);
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });
  $("search").addEventListener("submit", (event) => {
    event.preventDefault();
    query = $("query").value;
    page = 1;
    load();
  });
  $("cancel-edit").addEventListener("click", cancelEdit);
  $("previous").addEventListener("click", () => {
    page--;
    load();
  });
  $("next").addEventListener("click", () => {
    page++;
    load();
  });
  $("sign-out").addEventListener("click", async () => {
    try {
      await request("/api/auth/logout", { method: "POST" });
      location.href = "/";
    } catch (e) {
      $("account-status").textContent = e.message;
    }
  });
  try {
    const data = await request("/api/workspace");
    $("title").textContent = data.title;
    document.title = data.title;
    $("account-status").textContent =
      `Signed in as ${data.user.name}${data.user.role === "admin" ? " · Workspace owner" : ""}`;
    views = data.resources;
    if (data.user.role === "admin" && views.some((v) => v.submissions))
      views.push({
        key: "inbox",
        label: "Request inbox",
        description: "Review all submitted requests. No email is sent.",
        fields: [],
        writable: false,
        editable: false,
      });
    for (const next of views) {
      const button = node("button", next.label);
      button.type = "button";
      button.dataset.key = next.key;
      button.addEventListener("click", () => choose(next));
      $("resources").append(button);
    }
    if (views.length) choose(views[0]);
    await activity();
  } catch (e) {
    $("account-status").textContent =
      e.message + " Use the Account button to sign in.";
    $("sign-out").hidden = true;
  }
})();
