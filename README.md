# Precision Editorial Banking

I built Precision Editorial Banking as a full-stack banking workflow simulator focused on safe concurrent transaction processing, account sharing, and auditability. The project is split into a Next.js frontend and an Express + PostgreSQL backend.

## Live URLs

- Frontend: https://precision-banking-xp8e.vercel.app
- Backend health endpoint: https://precision-banking.vercel.app/api/health

## Setup Instructions

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL or Neon

### Backend

```bash
cd backend
npm install
```

Create `backend/.env` with:

```env
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
PORT=4000
FRONTEND_URLS=http://localhost:3000,https://precision-banking-xp8e.vercel.app
```

Initialize the database and seed demo data:

```bash
npm run db:setup
```

Run the backend locally:

```bash
npm run dev
```

Build the backend:

```bash
npm run build
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Run the frontend locally:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

### Seeded Accounts

- `julian@vance.corp` / `banking123`
- `alice@vance.corp` / `banking123`
- `bob@vance.corp` / `banking123`

## Architecture

The system has two parts:

- [frontend](frontend): Next.js App Router application for authentication, dashboard, accounts, ledger, notifications, and transactions
- [backend](backend): Express API for authentication, account access, transaction processing, activity logging, and concurrency control

### Frontend

I used Next.js App Router for the frontend. It is responsible for authentication state, protected navigation, API access, and the banking UI.

Key files:

- [frontend/context/AuthContext.tsx](frontend/context/AuthContext.tsx)
- [frontend/lib/api.ts](frontend/lib/api.ts)
- [frontend/components/ProtectedRoute.tsx](frontend/components/ProtectedRoute.tsx)
- [frontend/context/RealtimeContext.tsx](frontend/context/RealtimeContext.tsx)

### Backend

I organized the backend by responsibility.

Key files:

- [backend/src/app.ts](backend/src/app.ts)
- [backend/src/server.ts](backend/src/server.ts)
- [backend/src/routes](backend/src/routes)
- [backend/src/services](backend/src/services)
- [backend/src/db/schema.sql](backend/src/db/schema.sql)

### Database Design

The main tables are:

- `users`
- `accounts`
- `account_members`
- `transactions`
- `activity_events`

The `accounts` table includes a `version` column, which I use for optimistic concurrency control.

## Concurrency Control Strategy

I implemented concurrency protection in [backend/src/services/transaction-service.ts](backend/src/services/transaction-service.ts).

### Optimistic Locking

Each balance-changing update checks the current `version` of the account row.

- I read the current account state.
- I update the row only if the current version still matches the version I previously read.
- If the update affects zero rows, I treat that as a concurrent write conflict and retry.

This prevents lost updates when multiple requests try to modify the same account at nearly the same time.

### Balance Safety

I enforce non-negative balances in two layers:

- Service-level validation rejects withdrawals and transfers when the balance is insufficient.
- SQL update conditions also require `balance + delta >= 0`.

That means even under contention, the database will not accept a write that would make the balance negative.

### Retry Strategy

I retry optimistic conflicts up to 5 times. If all retries fail, I persist the operation as a failed transaction and return HTTP 409.

### Transfer Consistency

Transfers update two accounts inside one database transaction. To reduce deadlock risk, I sort the source and destination accounts in a deterministic order before applying updates.

### Auditability

I store failed withdrawals, transfers, and conflict outcomes in the `transactions` table and also write `activity_events` so the system keeps a reliable audit trail.

## API Documentation

Base URL:

- Local: `http://localhost:4000/api`
- Hosted: `https://precision-banking.vercel.app/api`

### Authentication

#### `POST /auth/register`

Request:

```json
{
  "name": "Julian Vance",
  "email": "julian@vance.corp",
  "password": "banking123"
}
```

Response:

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

#### `POST /auth/login`

Request:

```json
{
  "email": "julian@vance.corp",
  "password": "banking123"
}
```

Response:

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

All account endpoints require `Authorization: Bearer <jwt>`.

#### `GET /accounts`

Returns all accounts available to the authenticated user.

#### `GET /accounts/:accountId`

Returns a single account.

#### `GET /accounts/:accountId/members`

Returns collaborators for the account.

#### `POST /accounts/:accountId/members`

Adds a collaborator.

Request:

```json
{
  "email": "alice@vance.corp",
  "role": "editor"
}
```

#### `PATCH /accounts/:accountId/members/:userId`

Updates a collaborator role.

Request:

```json
{
  "role": "viewer"
}
```

#### `DELETE /accounts/:accountId/members/:userId`

Removes a collaborator.

### Dashboard

#### `GET /dashboard/summary`

Returns account summary and recent activity.

#### `GET /dashboard/activity-feed?limit=10`

Returns recent activity items.

### Transactions

#### `GET /transactions`

Supports:

- `page`
- `limit`
- `type`
- `accountId`
- `fromDate`
- `toDate`

#### `GET /transactions/:transactionRef`

Returns a single transaction by reference.

#### `POST /transactions`

Generic transaction endpoint for deposit, withdraw, or transfer.

Example withdraw request:

```json
{
  "type": "withdraw",
  "accountId": "ACC1001",
  "amount": 50,
  "metadata": {
    "source": "manual-test"
  }
}
```

Example transfer request:

```json
{
  "type": "transfer",
  "sourceAccountId": "ACC1001",
  "destinationAccountId": "ACC1002",
  "amount": 75,
  "metadata": {
    "source": "manual-test"
  }
}
```

#### `POST /transactions/deposit`

Deposit shortcut endpoint.

#### `POST /transactions/withdraw`

Withdraw shortcut endpoint.

#### `POST /transactions/transfer`

Transfer shortcut endpoint.

### Health

#### `GET /health`

Response:

```json
{
  "status": "ok"
}
```

## Load Testing

I included the following load testing artifacts:

- [backend/load-tests/artillery-transactions.yml](backend/load-tests/artillery-transactions.yml)
- [backend/load-tests/artillery-processor.cjs](backend/load-tests/artillery-processor.cjs)
- [backend/load-tests/validate-consistency.mjs](backend/load-tests/validate-consistency.mjs)
- [backend/load-tests/results/artillery-report.json](backend/load-tests/results/artillery-report.json)

The recorded Artillery run targeted the local backend for 10 seconds at an arrival rate of 1000 virtual users per second. In that captured run:

- 10,000 virtual users were created
- 10,037 HTTP requests were attempted
- 37 requests returned HTTP 200
- Mean response time for successful login requests was 5580.1 ms
- p95 response time was 9801.2 ms
- 9,280 requests failed with `ECONNREFUSED`
- 720 requests failed with timeouts

That run saturated the local environment before it could produce a realistic throughput profile, but it is still useful for validating contention behavior and post-run balance consistency.

To run the load tests:

```bash
cd backend
npm run load:test
npm run load:test:report
npm run load:validate
```

## Deployment Notes

### Frontend

- Hosted on Vercel
- Public URL: https://precision-banking-xp8e.vercel.app

### Backend

- Hosted on Vercel as an HTTP API
- Health URL: https://precision-banking.vercel.app/api/health
- Websocket realtime is not active in the hosted Vercel setup because Socket.IO requires a persistent process
