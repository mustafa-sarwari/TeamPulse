# TeamPulse task board — full-stack project

Manage teams and tasks with account ownership, status, priority, due dates, and relationship-safe changes.

**Frontend:** HTML, CSS, and JavaScript. **Backend:** Node.js 24, HTTP API, SQLite, and account sessions.

Tasks must reference a team owned by the current account. Team renames update related tasks in the same transaction. Deleting a team with tasks is blocked, so tasks cannot become orphaned. Each account owns its own board.

## Run locally

```bash
npm run start:api
```

Open <http://localhost:4000>, choose **Sign in · Account**, and create your local owner account. **My workspace** opens the stored workflows. The first account manages owner-only resources; later accounts receive member access and private account data.

## Implementation

- Salted scrypt password hashes, rotated HttpOnly sessions, seven-day expiry, and owner/member roles.
- SQLite-backed `teams`, `tasks` workflows with access checks and server-side validation.
- Connected account screens for saved records, search, paging, and activity; resource permissions control available actions.
- Transactional writes, retry keys, version-aware edits to mutable records, bounded requests, and protected server files.

[Routes, storage design, and access rules](docs/backend.md) · [Workspace preview](docs/workspace-preview.jpg)

![Account workspace](docs/workspace-preview.jpg)

## Verification

`npm run test:api` passes **4 backend tests**, covering account security, session expiry/persistence, access control, validation, and the repository workflow.

The account/resource flow passes browser checks at 375px and 1280px without page JavaScript errors or horizontal overflow in those flows. [GitHub Actions](.github/workflows/fullstack.yml) runs backend checks on pushes and pull requests.

## Project context

[Mustafa Sarwari](https://github.com/mustafa-sarwari) — junior full-stack developer building deeper frontend integration, server validation, authentication, database, and testing skills. The HTTP/account workspace foundation is reused across these portfolio projects; each project’s domain behavior is described above. Original community content, educational fixtures, and licenses remain attributed.

A Node runtime is required for accounts, persistence, provider proxies, and webhooks. Static previews show frontend assets. Demonstration orders do not process payments; stored requests are not emailed. Live provider/store credentials have not been exercised by the fixture tests.
