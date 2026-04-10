# Precision Editorial Banking

This project is split into two parts:

- `app/`, `components/`, and the rest of the root Next.js codebase provide the frontend UI.
- `backend/` is a separate Express + Neon/Postgres service that owns auth, accounts, transactions, optimistic concurrency control, and WebSocket events.

## Architecture

### Frontend

- Next.js App Router
- Dashboard, ledger, transactions, and auth screens
- Currently UI-first, ready to be wired to the backend routes below

### Backend

- Express.js API in `backend/src`
- Neon Postgres connection via `pg`
- Socket.IO for realtime events
- Optimistic concurrency control using the `accounts.version` column

### Database schema

The backend creates these tables in Neon:

- `users`
- `accounts`
- `transactions`
- `activity_events`

The `accounts` table includes:

- `account_id`
- `holder_name`
- `balance`
- `status`
- `version`

The `version` field is used in `UPDATE ... WHERE version = $expectedVersion` statements so concurrent writes only succeed if the account has not changed since it was read.

## Shared Accounts & Multi-User Access

Multiple users can now collaborate on the same account with role-based access control:

### Account Members Table

The new `account_members` table manages sharing:

- `account_id` — the account being shared
- `user_id` — the user being granted access
- `role` — permission level: `owner`, `editor`, or `viewer`

### Roles

- **Owner** — Account creator, full control, can manage members
- **Editor** — Can perform transactions (deposit/withdraw/transfer)
- **Viewer** — Read-only access to account details

### Example: Shared Account Scenario

Account ACC1001 is created by Julian (owner). He can:

1. Share it with Alice as an **editor** — Alice can now deposit/withdraw
2. Share it with Bob as a **viewer** — Bob can see balances but cannot transact
3. When Alice and Bob both try to withdraw simultaneously, optimistic locking prevents race conditions

### Member Management APIs

All require `Authorization: Bearer <token>`

**List account members:**

```
GET /accounts/:accountId/members
```

**Add a member (owner only):**

```
POST /accounts/:accountId/members
Content-Type: application/json

{
  "email": "alice@vance.corp",
  "role": "editor"
}
```

**Update member role (owner only):**

```
PATCH /accounts/:accountId/members/:userId
Content-Type: application/json

{
  "role": "viewer"
}
```

**Remove member (owner only):**

```
DELETE /accounts/:accountId/members/:userId
```

### Test Data

Three users are seeded by default:

- **julian@vance.corp** (password: `banking123`)
  - Owner of ACC1001, ACC1002, ACC1003
- **alice@vance.corp** (password: `banking123`)
  - Editor on ACC1001 and ACC1002
- **bob@vance.corp** (password: `banking123`)
  - Viewer on ACC1001
  - Editor on ACC1002

### Frontend Integration

New UI components:

- **Accounts Page** (`/accounts`) — View all accessible accounts (owned + shared)
- **Members Panel** (`MembersPanel.tsx`) — Modal to view and manage account members
- **Dashboard** — Shows account member count and sharing status
- **Account Cards** — Display "Shared with X members" badge

## Concurrency control strategy

The transaction engine is implemented in `backend/src/services/transaction-service.ts`.

- Deposits and withdrawals read the current account state, then attempt an optimistic update with the current version number.
- Transfers update both accounts inside one database transaction.
- Account rows are updated in deterministic account-id order during transfers to reduce deadlock risk.
- If a version mismatch occurs, the backend retries the transaction up to 5 times.
- If the balance would go negative, the transaction is rejected and persisted as a failed transaction.
- Realtime events are emitted for:
  - `transaction:created`
  - `balance:updated`
  - `transaction:failed`

## Local setup

### Frontend

1. Install root dependencies:
   `npm install`
2. Start the Next.js app:
   `npm run dev`

### Backend

1. Install backend dependencies:
   `cd backend && npm install`
2. Review `backend/.env`
3. Initialize the Neon schema, run migrations, and seed data:
   `npm run db:setup`

   This runs:
   - `db:init` — Creates core schema (users, accounts, transactions, activity_events)
   - `db:migrate` — Adds shared accounts table (account_members)
   - `db:seed` — Populates test users and shared accounts

4. Start the backend server:
   `npm run dev`

The backend runs on `http://localhost:4000` by default.

Seed credentials (test users for shared account demonstrations):

- Email: `julian@vance.corp` (Owner) / Password: `banking123`
- Email: `alice@vance.corp` (Collaborator) / Password: `banking123`
- Email: `bob@vance.corp` (Collaborator) / Password: `banking123`

## API documentation

Base URL: `http://localhost:4000/api`

### Auth

`POST /auth/register`

Request body:

```json
{
  "name": "Julian Vance",
  "email": "julian@vance.corp",
  "password": "banking123"
}
```

`POST /auth/login`

Request body:

```json
{
  "email": "julian@vance.corp",
  "password": "banking123"
}
```

Both auth routes return:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "name": "Julian Vance",
    "email": "julian@vance.corp"
  }
}
```

### Accounts

`GET /accounts`

- Requires `Authorization: Bearer <token>`
- Returns all accounts for the authenticated user (both owned and shared)
- Each account includes:
  - `accountId`, `balance`, `versionNumber`, `versionLabel`
  - `memberCount` — number of people with access (including owner)
  - `isShared` — boolean if account is shared with others

`GET /accounts/:accountId`

- Returns a single account by `accountId`
- Requires membership (owner, editor, or viewer role)

`GET /accounts/:accountId/members`

- Lists all members with access to the account
- Each member includes:
  - `userId`, `role` (owner/editor/viewer)
  - `user` object with `name` and `email`
  - `createdAt` timestamp

`POST /accounts/:accountId/members`

- Add a member to the account (owner only)
- Request body: `{ "email": "newuser@example.com", "role": "editor" }`
- Returns the created member object

`PATCH /accounts/:accountId/members/:userId`

- Update a member's role (owner only)
- Request body: `{ "role": "viewer" }`
- Cannot change owner's role

`DELETE /accounts/:accountId/members/:userId`

- Remove a member from the account (owner only)
- Cannot remove the account owner

### Dashboard

`GET /dashboard/summary`

- Returns dashboard-ready data:
  - accounts
  - recent activity feed

`GET /dashboard/activity-feed?limit=10`

- Returns realtime-style feed entries for the ledger sidebar

### Transactions

`GET /transactions?page=1&limit=10&type=deposit&accountId=ACC1001`

- Supports pagination and optional filtering by type and account

`GET /transactions/:transactionRef`

- Returns a single transaction detail record

`POST /transactions`

Generic transaction creation endpoint used for load testing and unified processing.

Deposit example:

```json
{
  "type": "deposit",
  "accountId": "ACC1001",
  "amount": 100
}
```

Withdraw example:

```json
{
  "type": "withdraw",
  "accountId": "ACC1001",
  "amount": 100
}
```

Transfer example:

```json
{
  "type": "transfer",
  "sourceAccountId": "ACC1001",
  "destinationAccountId": "ACC1002",
  "amount": 100
}
```

Convenience routes are also available:

- `POST /transactions/deposit`
- `POST /transactions/withdraw`
- `POST /transactions/transfer`

## Realtime events

Socket.IO emits:

- `transaction:created`
- `balance:updated`
- `transaction:failed`

## Load testing

Load testing is implemented with Artillery.

Scenario file:

- `backend/load-tests/artillery-transactions.yml`

Execution command:

```bash
cd backend
npm run load:test
```

This runs a concurrency scenario against:

- `POST /api/auth/login`
- `POST /api/transactions`

Default behavior targets 1000 arrival rate for 10 seconds using seeded credentials.

To change target URL, credentials, account, amount, or intensity, edit `backend/load-tests/artillery-transactions.yml`.

Note: On a local laptop, a 1000-arrival profile may produce transport errors (`ECONNREFUSED` / `ETIMEDOUT`) due to machine limits. Keep the 1000 profile for assignment evidence, and use a lower profile for iterative debugging.

### Save results for submission

```bash
npm run load:test:report
npm run load:test:html
```

Artifacts are generated in:

- `backend/load-tests/results/artillery-report.json`
- `backend/load-tests/results/artillery-report.html`

### Post-test consistency validation

Run:

```bash
npm run load:validate
```

This verifies account balances are non-negative after the load test and prints a concise summary suitable for submission notes.

## Verified status

The backend was compiled successfully, the Neon schema was created successfully, and the seed data was applied successfully using the provided connection string.
