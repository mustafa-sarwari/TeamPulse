const { text, HttpError } = require("./http.cjs");
function email(value, required = true) {
  if (!required && !value) return "";
  const result = text(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    throw new HttpError(400, "Enter a valid email.");
  return result;
}
function integer(value, label, min = 1, max = 100000) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new HttpError(
      400,
      `${label} must be an integer from ${min} to ${max}.`,
    );
  return value;
}
function choice(value, options, fallback) {
  value = value ?? fallback;
  if (!options.includes(value))
    throw new HttpError(400, "Choose a valid option.");
  return value;
}
function boolean(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean")
    throw new HttpError(400, "Use true or false.");
  return value;
}
function date(value, required = false) {
  if (!value && !required) return "";
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(new Date(value).getTime()) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new HttpError(400, "Enter a valid date.");
  return value;
}
function url(value) {
  let parsed;
  try {
    parsed = new URL(text(value, "URL", 500));
  } catch {
    throw new HttpError(400, "Enter a valid HTTPS URL.");
  }
  if (parsed.protocol !== "https:")
    throw new HttpError(400, "Use an HTTPS URL.");
  return parsed.href;
}
const field = (key, label, type = "text", extra = {}) => ({
  key,
  label,
  type,
  ...extra,
});
const messageFields = [
  field("name", "Name", "text", { maxLength: 80 }),
  field("email", "Email", "email"),
  field("message", "Message", "textarea", { maxLength: 2000 }),
];
const message = (body) => ({
  name: text(body.name, "Name", 80),
  email: email(body.email),
  message: text(body.message, "Message", 2000),
});
const priority = field("priority", "Priority", "text", {
  options: ["normal", "high", "low"],
});
const dueDate = field("dueDate", "Due date", "date", { required: false });
const tasks = {
  label: "Tasks",
  fields: [
    field("title", "Task title"),
    field("completed", "Completed", "boolean", { options: ["false", "true"] }),
    priority,
    dueDate,
  ],
  validate: (b) => ({
    title: text(b.title, "Task", 500),
    completed: boolean(b.completed),
    priority: choice(b.priority, ["normal", "high", "low"], "normal"),
    dueDate: date(b.dueDate),
  }),
};
const employees = {
  label: "Staff directory",
  fields: [
    field("name", "Full name"),
    field("role", "Role"),
    field("department", "Department", "text", { required: false }),
    field("email", "Work email", "email", { required: false }),
  ],
  validate: (b) => ({
    name: text(b.name, "Name", 80),
    role: text(b.role, "Role", 80),
    department: b.department ? text(b.department, "Department", 80) : "General",
    email: email(b.email, false),
    img:
      typeof b.img === "string" && /^(https:\/\/|\/photo\/)/.test(b.img)
        ? b.img.slice(0, 500)
        : "/photo/img (1).jpg",
  }),
};
const projects = {
  label: "Project catalogue",
  adminOnly: true,
  shared: true,
  publicRead: true,
  fields: [
    field("title", "Project title"),
    field("stack", "Technology stack"),
    field("description", "Description", "textarea"),
    field("url", "Project URL", "url"),
  ],
  validate: (b) => ({
    title: text(b.title, "Title", 100),
    stack: text(b.stack, "Stack", 200),
    description: text(b.description, "Description", 1000),
    url: url(b.url),
  }),
};
const menu = {
  label: "Menu",
  adminOnly: true,
  shared: true,
  publicRead: true,
  fields: [
    field("name", "Item name"),
    field("category", "Category"),
    field("priceCents", "Price in cents", "number", { min: 1, max: 100000 }),
  ],
  validate: (b) => ({
    name: text(b.name, "Item name", 80),
    category: text(b.category, "Category", 40),
    priceCents: integer(b.priceCents, "Price", 1, 100000),
  }),
};
const orders = {
  label: "Order history",
  readOnly: true,
  fields: [
    field("menuItemId", "Menu item", "text", {
      source: "menu",
      labelField: "name",
    }),
    field("quantity", "Quantity", "number", { min: 1, max: 20 }),
  ],
  validate(b, ctx) {
    const item = ctx
      .rowsFor("menu", "public")
      .find((item) => item.id === b.menuItemId);
    if (!item) throw new HttpError(400, "Choose an item from the menu.");
    const quantity = integer(b.quantity, "Quantity", 1, 20);
    return {
      menuItemId: item.id,
      name: item.name,
      quantity,
      unitPriceCents: item.priceCents,
      totalCents: item.priceCents * quantity,
      status: "placed",
    };
  },
};
const reservations = {
  label: "Table reservations",
  writeOnly: false,
  fields: [
    field("name", "Guest name"),
    field("email", "Email", "email"),
    field("date", "Date", "date"),
    field("time", "Time", "text", {
      options: ["12:00", "13:00", "18:00", "19:00", "20:00"],
    }),
    field("guests", "Guests", "number", { min: 1, max: 8 }),
    field("message", "Notes", "textarea", { required: false }),
    field("status", "Status", "text", { options: ["confirmed", "cancelled"] }),
  ],
  validate(b, ctx) {
    const day = date(b.date, true);
    if (day < new Date().toISOString().slice(0, 10))
      throw new HttpError(400, "Choose today or a future date.");
    const time = choice(b.time, ["12:00", "13:00", "18:00", "19:00", "20:00"]);
    const guests = integer(b.guests, "Guests", 1, 8),
      status = choice(b.status, ["confirmed", "cancelled"], "confirmed");
    if (status === "confirmed") {
      const reserved = ctx.db
        .prepare(
          "SELECT data FROM records WHERE resource='reservations' AND id<>?",
        )
        .all(ctx.recordId || "")
        .map((row) => JSON.parse(row.data))
        .filter(
          (row) =>
            row.date === day && row.time === time && row.status === "confirmed",
        )
        .reduce((n, row) => n + row.guests, 0);
      if (reserved + guests > 20)
        throw new HttpError(
          409,
          "This time is fully booked. Choose another time.",
        );
    }
    return {
      name: text(b.name, "Name", 80),
      email: email(b.email),
      date: day,
      time,
      guests,
      message: b.message ? text(b.message, "Notes", 1000) : "",
      status,
    };
  },
};
const navigation = {
  label: "Navigation links",
  adminOnly: true,
  shared: true,
  publicRead: true,
  fields: [field("label", "Link label"), field("href", "Destination path")],
  validate(b) {
    const href = text(b.href, "Destination", 200);
    if (!/^(\/(?!\/)|#[A-Za-z])[A-Za-z0-9_/#?.=-]*$/.test(href))
      throw new HttpError(400, "Use a local path or section anchor.");
    return { label: text(b.label, "Label", 40), href };
  },
};
module.exports = {
  field,
  email,
  integer,
  choice,
  boolean,
  date,
  url,
  messageFields,
  message,
  tasks,
  employees,
  projects,
  menu,
  orders,
  reservations,
  navigation,
};
