# SCIM v2 Validator

A developer tool for testing SCIM v2 server implementations against Microsoft Entra ID provisioning behavior.

---

## What it does

Runs a sequence of automated tests against any SCIM v2 endpoint to verify:

- Correct schema URNs and response structure
- Pagination support
- Filter support (required by Entra for user lookups)
- PATCH support (Entra never uses PUT for updates)
- User disable via `active=false` (Entra's deprovisioning method)

Each test shows the raw request, raw response, and a pass/fail/warning result. Reports can be exported as JSON or Markdown.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Backend | Node.js, Express, TypeScript, Axios |

---

## Getting started

### Prerequisites

- Node.js 18+
- Yarn

### Dev (both servers, one command)

```bash
yarn install  # installs all workspaces at once
yarn dev
```

- Backend → `http://localhost:3000`
- Frontend → `http://localhost:3001`

Open `http://localhost:3001` in your browser.

### Production build (single deployable directory)

```bash
yarn build
yarn start
```

`yarn build` does three things in sequence:
1. Next.js static export → `frontend/out/`
2. TypeScript compile → `backend/dist/`
3. Copies `frontend/out/` → `backend/dist/public/`

`yarn start` runs `backend/dist/server.js` which serves the API on `/api` and the frontend as static files — everything on one port (`3000` by default).

---

## Usage

1. Enter your **SCIM Base URL** — e.g. `https://example.com/scim/v2`
2. Enter your **Bearer Token**
3. Optionally add custom request headers
4. Click **Run SCIM Validation**

Results appear as expandable cards. Click any card to see the full request/response payload.

---

## Tests run

| # | Test | Method | Endpoint |
|---|------|--------|----------|
| 1 | ServiceProviderConfig | `GET` | `/ServiceProviderConfig` |
| 2 | Fetch Users | `GET` | `/Users` |
| 3 | Filter Users | `GET` | `/Users?filter=userName eq "..."` |
| 4 | Create User | `POST` | `/Users` |
| 5 | Retrieve User | `GET` | `/Users/{id}` |
| 6 | Update User | `PATCH` | `/Users/{id}` |
| 7 | Disable User | `PATCH` | `/Users/{id}` — `active=false` |

Tests 5–7 depend on the user `id` returned from Test 4. If Create User fails to return an `id`, those tests are skipped.

---

## Result statuses

| Status | Meaning |
|---|---|
| ✅ passed | All validations passed |
| ❌ failed | One or more errors (e.g. wrong status code, missing required attribute) |
| ⚠️ warning | Non-blocking issue (e.g. missing pagination fields) |
| ⏭️ skipped | Could not run due to a failed dependency |

---

## Entra ID compatibility notes

Microsoft Entra ID has specific provisioning behaviors this tool validates against:

- **Filter before create** — Entra always filters by `userName` before creating a user to avoid duplicates. Your endpoint must support `GET /Users?filter=userName eq "..."`.
- **PATCH only** — Entra uses `PATCH` with `PatchOp` for all updates. `PUT` is never used.
- **Disable, don't delete** — When deprovisioning, Entra sends `PATCH` with `active=false`. Your endpoint must handle this correctly.
- **Pagination** — Entra sends `startIndex` and `count` query params and expects `totalResults`, `startIndex`, and `itemsPerPage` in the `ListResponse`.
- **Exact schema URNs** — Responses must include the correct `schemas` array values, e.g. `urn:ietf:params:scim:schemas:core:2.0:User`.

---

## Exporting results

After a test run, use the buttons in the top-right of the results panel:

- **Export JSON** — machine-readable full report
- **Export MD** — Markdown summary for documentation or issue tracking

---

## Project structure

```
scim-v2-validator/
├── package.json                     # Root workspace — dev/build/start scripts
├── scripts/
│   └── copy-static.js               # Copies frontend/out -> backend/dist/public
├── plan.md                          # Architecture and test strategy
├── backend/
│   ├── server.ts                    # Express entry point; serves static in prod
│   ├── routes/
│   │   └── validate.ts              # POST /api/validate
│   └── services/
│       ├── scimClient.ts            # Axios SCIM client wrapper
│       ├── scimTests.ts             # Test runner (7 tests)
│       └── validation.ts            # Schema/attribute validation helpers
└── frontend/
    ├── .env.local                   # Dev-only: sets NEXT_PUBLIC_API_URL
    ├── next.config.js               # output: 'export' for static build
    ├── app/
    │   ├── layout.tsx
    │   └── page.tsx                 # Main dashboard
    ├── components/
    │   ├── ConfigPanel.tsx          # Config form
    │   ├── TestResults.tsx          # Results list
    │   └── TestResultItem.tsx       # Expandable result card
    └── lib/
        ├── types.ts                 # Shared TypeScript types
        └── api.ts                   # Backend fetch wrapper
```

### Build output

```
backend/dist/
├── server.js          ← entry point (yarn start)
├── routes/
├── services/
└── public/            ← static frontend (copied from frontend/out/)
    ├── index.html
    └── _next/
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend port |
| `NEXT_PUBLIC_API_URL` | `/api` (prod) / `http://localhost:3000/api` (dev via `.env.local`) | Backend URL used by the frontend |

In dev, `frontend/.env.local` sets the full URL so the Next.js dev server can reach the separate backend process. In production both run on the same origin so `/api` is used automatically.
