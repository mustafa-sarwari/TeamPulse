# Backend implementation

## Request and storage flow

The frontend sends same-origin JSON requests. `server/http.cjs` authenticates the session, checks access, validates a resource through `server/workspace.cjs` / `server/domain.cjs`, and reads or writes SQLite using parameterized SQL. Domain-specific routes live in `server/index.cjs` or the integration modules described in the README. `server/ui/` provides the connected account workspace.

| Storage | Purpose |
| --- | --- |
| `users` | Account identity, unique normalized email, salted scrypt password hash, and owner/member role |
| `sessions` | Hashed random session token, account foreign key, and seven-day absolute expiry |
| `records` | Resource, owner, validated JSON data, timestamp, and version |
| `activity` | Account-scoped creation, update, deletion, and workflow events |
| `idempotency` | Owner/resource/request key, input fingerprint, and created record ID |
| `seed_history` | Tracks one-time sample data initialization |

SQLite uses WAL and foreign keys. The local file is `.data/demo.sqlite`, excluded from Git. Database initialization upgrades earlier records with a version column. Earlier anonymous session records remain attached to their old session IDs; registration does not silently assign them to a new account.

## Accounts and access

Register with a name, email, and password of 12–128 characters. The first registered account becomes the workspace owner; later accounts are members. Create the owner on a fresh local installation before making the service publicly reachable. Clients cannot assign themselves a role.

Password hashing uses asynchronous scrypt with a random salt. Session tokens are random, stored as hashes, and sent in HttpOnly, SameSite=Lax cookies. Signing in rotates the current session. Logout removes that session; `DELETE /api/auth/sessions` revokes all sessions for the account. Use `COOKIE_SECURE=true` when serving the application through HTTPS.

Private records are scoped to the authenticated user. Shared catalogues and demo scores have explicit access rules. Public contact/return submission stays available where implemented, while reading requests requires the account submissions view or owner inbox. Write requests from another origin are rejected, except explicitly allowed local frontend development origins.

## API conventions

| Route | Behavior |
| --- | --- |
| `POST /api/auth/register` / `POST /api/auth/login` | Create an account or authenticate; return public user fields and a session cookie |
| `GET /api/auth/me` | Read the current session identity |
| `POST /api/auth/logout` / `DELETE /api/auth/sessions` | End the current session or all account sessions |
| `GET /api/workspace` | Return allowed resources and form metadata for the signed-in account |
| `GET /api/activity` | Read the account’s most recent 50 activity events |
| `GET /api/<resource>?page=1&limit=20&q=term` | Search and paginate accessible records; limit is capped at 100 |
| `POST /api/<resource>` | Validate and create a record; optional `Idempotency-Key` safely retries identical input |
| `PATCH` / `DELETE /api/<resource>/<id>` | Mutate an allowed editable record; optional `If-Match: "1"` rejects stale versions |
| `GET /api/account/submissions?resource=<name>` | Read the account’s own write-only requests, when that resource exists |
| `GET /api/admin/inbox` / `PATCH /api/admin/inbox/<id>` | Owner request review, with received/reviewing/closed status |

Collection reads without paging return an array capped at 500 for compatibility with the original interfaces. Paged reads return `items`, `total`, `page`, `limit`, and `pages`. Resource configuration determines public reads, owner-only management, immutable orders, and workflow-only creation. Errors use JSON `{ "error": "message" }` with appropriate 400/401/403/404/409/413/415/429 responses.

Creation, validation, domain side effects, audit entries, and retry-key storage commit in one transaction. Versioned edits detect conflicting saves; `ETag` exposes the current record version. The account UI creates a retry key for each submission and sends the version when editing.

Per-process limits allow 180 API reads, 60 writes, and 8 credential attempts per IP each minute. `429` includes `Retry-After`. Body limits, same-origin checks, explicit public account assets, private-path protection, and realpath confinement bound the HTTP surface. The server serves text as UTF-8, and the workspace renders stored values using text nodes.

## Verify and run

Run the commands in the README with Node.js 24+. `npm run test:api` uses temporary or in-memory databases, tests account isolation and login persistence, and exercises each repository’s own workflow. No provider credentials are needed for the mocked integration tests.

The server binds to loopback by default. Static GitHub Pages previews can display frontend assets; a Node runtime is required for accounts, database writes, provider proxies, and webhooks. The SQLite adapter is deliberately local and single-instance. Hosting, password recovery, and distributed rate limiting are separate future work. Demo orders do not process payments, and contact requests are stored rather than sent as email.
