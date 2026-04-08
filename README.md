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
3. Initialize the Neon schema and seed data:
   `npm run db:setup`
4. Start the backend server:
   `npm run dev`

The backend runs on `http://localhost:4000` by default.

Seed credentials:

- Email: `julian@vance.corp`
- Password: `banking123`

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
- Returns all accounts for the authenticated user

`GET /accounts/:accountId`

- Returns a single account by `accountId`

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

A k6 script is included at `backend/load-tests/transactions.js`.

Example usage:

```bash
cd backend
k6 run load-tests/transactions.js
```

You can override values with environment variables:

- `API_BASE_URL`
- `LOGIN_EMAIL`
- `LOGIN_PASSWORD`
- `ACCOUNT_ID`
- `AMOUNT`

The default scenario uses 1000 concurrent virtual users posting deposits to `/api/transactions`.

## Verified status

The backend was compiled successfully, the Neon schema was created successfully, and the seed data was applied successfully using the provided connection string.
