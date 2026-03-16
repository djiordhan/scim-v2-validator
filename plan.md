# SCIM v2 Validator — Plan

## Architecture

```
Browser (Next.js)
    │
    │  POST /api/validate { baseUrl, token, customHeaders }
    ▼
Express Backend (Node.js)
    │
    │  Runs SCIM tests sequentially using Axios
    ▼
Target SCIM Server
```

## SCIM Request Flow

1. Frontend collects config (baseUrl + token + optional headers)
2. Sends to backend POST /api/validate
3. Backend creates Axios client with Authorization: Bearer <token>
4. Runs each test in order, collecting results
5. Returns structured result array to frontend
6. Frontend renders results with pass/fail/warning status

## Test Strategy

Tests run sequentially because later tests depend on earlier results (e.g., the user ID returned from Create is used in Update, Disable, and Retrieve).

| # | Test | Method | Path | Key Validation |
|---|------|--------|------|----------------|
| 1 | ServiceProviderConfig | GET | /ServiceProviderConfig | PATCH supported, filter, bulk |
| 2 | Fetch Users | GET | /Users | ListResponse schema, pagination |
| 3 | Filter Users | GET | /Users?filter=... | Entra lookup behavior |
| 4 | Create User | POST | /Users | 201 + id returned |
| 5 | Retrieve User | GET | /Users/{id} | 200 + required attrs |
| 6 | Update User | PATCH | /Users/{id} | Replace op, 200/204 |
| 7 | Disable User | PATCH | /Users/{id} | active=false, Entra deprovisioning |

## Entra Provisioning Behavior

Microsoft Entra ID provisions users to SCIM endpoints with specific patterns:

- **Lookup before create**: Entra always GETs /Users?filter=userName eq "..." before creating to avoid duplicates
- **PATCH not PUT**: Entra uses PATCH for all updates (never PUT for user updates)
- **Disable, not delete**: Entra sets active=false instead of DELETE for deprovisioning
- **Pagination**: Entra uses startIndex + count query params; expects totalResults in response
- **Schema URNs**: Must use exact URNs — urn:ietf:params:scim:schemas:core:2.0:User etc.

## Implementation Steps

1. [x] Backend: Express server with /api/validate endpoint
2. [x] Backend: scimClient — Axios wrapper with auth headers
3. [x] Backend: scimTests — Sequential test runner
4. [x] Backend: validation — Schema + attribute checks
5. [x] Frontend: ConfigPanel — URL + token + custom headers input
6. [x] Frontend: TestResults + TestResultItem — Expandable result cards
7. [x] Frontend: Export JSON + Markdown

## Running Locally

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Backend: http://localhost:3000
Frontend: http://localhost:3001
