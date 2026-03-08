# ashvattha — a production-ready HTTP API server for managing hierarchical tree data structures 🌳

> _"A tree is a wondrous thing that shelters, feeds, and protects all living things."_  
> — The Buddha

An HTTP API for hierarchical tree structures, inspired by the **Ashvattha** - the sacred fig tree of enlightenment under which the Buddha attained awakening. Built for resilience and reliability with TypeScript, Express, and SQLite.

## Required Features 🌿

- **GET /api/v1/tree** — Returns all trees in nested JSON format
- **POST /api/v1/tree** — Creates a new node and attaches it to a parent (or as root)

## Production Readiness Features 🛡️

- **GET /health** — Health check for load balancers and monitoring
- **GET /metrics** — DB usage metrics (query counts, duration, errors)
- **Idempotency-Key header** — Optional; duplicate POSTs with same key return stored response (24h TTL)
- **maxDepth, limit, offset** — Query params for large trees (depth limit, root pagination)
- **Request timeout** — Returns 408 when exceeded (configurable via REQUEST_TIMEOUT_MS)
- **DB retry** — Retries failed queries twice (3 total attempts)
- **DB transactions** — createNode uses transactions for atomicity
- **parent_id index** — Index for efficient tree traversal
- **Consistent error shape** — `error.code`, `error.message`, optional `error.details`
- **Zod validation** — Request validation with clear error messages
- **Structured logging** — Winston (JSON in prod, colorized in dev); swappable adapters
- **DB metrics** — Instrumented query counts, duration, errors; swappable adapters
- **Graceful shutdown** — SIGTERM/SIGINT closes DB and server
- **keepAliveTimeout/headersTimeout** — Server timeout tuning for load balancers
- **API versioning** — `/api/v1` for future compatibility
- **DB abstraction** — DbHandle interface; swap SQLite for Postgres
- **WAL mode** — SQLite WAL for better write concurrency
- **Foreign keys** — ON DELETE CASCADE for referential integrity
- **Docker** — Dockerfile and docker-compose with volume persistence
- **Test suite** — node:test with in-memory DB

## Requirements ⚙️

- **Node.js 22.5+** (for built-in `node:sqlite`) **or** **Bun** (uses `bun:sqlite`)
- npm, yarn, or bun

## Setup 🌱

```bash
# Install dependencies (npm or bun)
npm install
# or: bun install

# Build
npm run build
# or: bun run build

# Initialize database (creates data/trees.db)
npm run db:reset
# or: bun run db:reset
```

## Running 🏃

```bash
# Production
npm start
# or: bun run start

# Development (with hot reload)
npm run dev
# or: bun run dev
```

The server listens on port 3000 by default. Set `PORT` to override.

## Docker 🐳

**Build and run with Docker Compose (recommended):**

```bash
docker compose up --build
```

The API is available at `http://localhost:3000`. Data persists in a Docker volume (`tree-data`).

**Build and run with Docker directly:**

```bash
# Build the image
docker build -t tree-api .

# Run with a volume for persistence
docker run -d -p 3000:3000 -v tree-data:/app/data --name tree-api tree-api

# Or run with a host directory for the database
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name tree-api tree-api
```

**Environment variables** (override in `docker-compose.yml` or via `-e`):

| Variable           | Default            | Description                                     |
| ------------------ | ------------------ | ----------------------------------------------- |
| PORT               | 3000               | Server port                                     |
| DB_PATH            | /app/data/trees.db | SQLite file path (use a volume for persistence) |
| NODE_ENV           | production         | Environment                                     |
| REQUEST_TIMEOUT_MS | 30000              | Request timeout in ms                           |

## Using with Bun ⚡

The project runs on both Node.js and Bun. When you use Bun, it automatically uses `bun:sqlite` instead of `node:sqlite`—no configuration needed.

| Command  | Node.js            | Bun                |
| -------- | ------------------ | ------------------ |
| Install  | `npm install`      | `bun install`      |
| Build    | `npm run build`    | `bun run build`    |
| Start    | `npm start`        | `bun run start`    |
| Dev      | `npm run dev`      | `bun run dev`      |
| Test     | `npm test`         | `npm run test:bun` |
| DB reset | `npm run db:reset` | `bun run db:reset` |

**Note:** For tests with Bun, use `npm run test:bun` (or `bun run test:bun`). This builds first and runs the compiled tests from `dist/`. Direct `bun test` also works after building—`bunfig.toml` restricts discovery to `dist/` to avoid node:test compatibility issues with Bun’s TypeScript runner.

## API Reference 📖

All tree endpoints are versioned under `/api/v1`. Future breaking changes will use new version paths (e.g. `/api/v2`).

| Endpoint       | Method | Description      |
| -------------- | ------ | ---------------- |
| `/health`      | GET    | Health check     |
| `/metrics`     | GET    | DB usage metrics |
| `/api/v1/tree` | GET    | List all trees   |
| `/api/v1/tree` | POST   | Create a node    |

### GET /health 💚

Health check endpoint for load balancers, container orchestration, and monitoring.

**Example response (200 OK):**

```json
{
  "status": "ok"
}
```

### GET /api/v1/tree 🌳

Returns an array of trees. Each tree is a nested structure with `id`, `label`, and `children`.

**Query parameters** (all optional):

| Param      | Type   | Default  | Description                                      |
| ---------- | ------ | -------- | ------------------------------------------------ |
| `maxDepth` | number | no limit | Max nesting depth (0 = roots only). Range 0–100. |
| `limit`    | number | no limit | Max number of roots to return. Range 1–1000.     |
| `offset`   | number | 0        | Number of roots to skip (for pagination).        |

**Example** (limit depth and paginate):

```
GET /api/v1/tree?maxDepth=2&limit=20&offset=0
```

**Example response:**

```json
[
  {
    "id": 1,
    "label": "root",
    "children": [
      {
        "id": 3,
        "label": "bear",
        "children": [
          {
            "id": 4,
            "label": "cat",
            "children": []
          }
        ]
      }
    ]
  }
]
```

### POST /api/v1/tree ➕

Creates a new node and attaches it to the specified parent.

**Optional header:**

| Header            | Description                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Idempotency-Key` | Unique key (1–255 chars, `[a-zA-Z0-9_-]`). Duplicate requests with the same key return the stored response without re-executing. Keys expire after 24h. |

**Request body:**

| Field     | Type           | Required | Description                             |
| --------- | -------------- | -------- | --------------------------------------- |
| label     | string         | Yes      | Node label (1–500 chars)                |
| parentId  | number \| null | No       | Parent node ID; omit or `null` for root |
| parent_id | number \| null | No       | Alternative snake_case for parentId     |

**Example request:**

```json
{
  "label": "bear",
  "parentId": 1
}
```

**Example response (201 Created):**

```json
{
  "id": 2,
  "label": "bear",
  "children": []
}
```

**Error responses:**

All errors use a consistent shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": []
  }
}
```

**Acceptable error codes** (defined in `src/errors.ts`):

| Status | Code                | Message                    |
| ------ | ------------------- | -------------------------- |
| 400    | `VALIDATION_FAILED` | Validation failed          |
| 404    | `PARENT_NOT_FOUND`  | Parent node does not exist |
| 408    | `REQUEST_TIMEOUT`   | Request timeout            |
| 500    | `INTERNAL_ERROR`    | Internal server error      |

Validation errors include a `details` array with `path` and `message` per field:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "details": [{ "path": "label", "message": "Required" }]
  }
}
```

**Example 404 response:**

```json
{
  "error": {
    "code": "PARENT_NOT_FOUND",
    "message": "Parent node does not exist"
  }
}
```

## Testing ✅

```bash
# Node.js (node:test)
npm test

# Watch mode
npm run test:watch

# Bun
npm run test:bun
```

Tests use an in-memory SQLite database and cover:

- GET with empty DB, single tree, multiple roots
- POST for root nodes, child nodes, validation errors, 404 for missing parent
- Both `parentId` and `parent_id` request formats
- DB retry logic (transient failures, exhaust-after-3-attempts)
- Metrics endpoint (DB usage shape, increment on operations)
- DB transactions (commit on success, rollback on throw)
- Request idempotency (duplicate key returns stored response)
- Error handling (404, validation details, invalid JSON)
- Large trees (maxDepth, limit, offset pagination)
- Schema (parent_id index)

## Project Structure 📂

```
src/
├── config.ts           # App configuration
├── errors.ts            # Error codes (ERROR_CODES)
├── logger.ts           # App logger (re-exports logging layer)
├── logging/
│   ├── index.ts       # createLogger() factory; swap adapters here
│   ├── types.ts       # Logger interface
│   └── adapters/
│       ├── winston.ts # Winston logger (default)
│       └── console.example.ts  # Example: swap to console
├── metrics/
│   ├── index.ts       # createDbMetrics() factory; swap adapters here
│   ├── types.ts       # DbMetrics interface
│   └── adapters/
│       └── mock.ts    # In-memory mock (default)
├── index.ts            # Express app entry
├── db/
│   ├── connection.ts   # DB singleton (Node or Bun)
│   ├── schema.ts       # Table creation
│   ├── repository.ts   # Tree CRUD
│   ├── types.ts        # DbHandle interface (abstraction)
│   ├── retry.ts        # Retry wrapper (3 attempts)
│   ├── metricsWrapper.ts  # DB instrumentation
│   └── drivers/
│       ├── index.ts    # Runtime detection (Node vs Bun)
│       ├── node-sqlite.ts   # node:sqlite driver
│       ├── bun-sqlite.ts    # bun:sqlite driver
│       └── postgres.example.ts  # Postgres stub
├── middleware/
│   ├── errorHandler.ts   # Global error handling
│   ├── idempotency.ts   # Optional Idempotency-Key for POST
│   └── requestTimeout.ts # Request timeout (408)
├── routes/
│   └── tree.ts         # /api/v1/tree routes
├── test/
│   ├── tree.test.ts    # Tree API tests
│   ├── retry.test.ts   # DB retry logic tests
│   ├── metrics.test.ts # Metrics endpoint tests
│   ├── transaction.test.ts  # DB transaction tests
│   ├── idempotency.test.ts  # Idempotency-Key tests
│   ├── errors.test.ts       # Error handling and edge cases
│   └── schema.test.ts      # Schema/indexes
├── validation/
│   ├── schemas.ts      # Zod schemas (POST)
│   └── getTreesSchema.ts  # Query params for GET (maxDepth, limit, offset)
└── scripts/
    └── init-db.ts      # DB init script
```

## Design Decisions 🧘

### Adjacency list storage

Nodes are stored in a flat table with `parent_id`. An index on `parent_id` (`idx_nodes_parent_id`) speeds up tree traversal. Use `maxDepth` and `limit`/`offset` query params on GET to handle large trees. For very deep trees or frequent subtree queries, a materialized path or closure table could be considered.

### Built-in SQLite (node:sqlite / bun:sqlite)

Uses the runtime’s built-in SQLite driver—no third-party DB dependency. Node.js 22.5+ provides `node:sqlite`; Bun provides `bun:sqlite`. The driver is selected automatically at runtime. WAL mode and foreign keys are enabled.

### DB abstraction layer

The `DbHandle` interface in `db/types.ts` allows swapping SQLite for Postgres or another backend without changing the repository or schema. See `db/drivers/postgres.example.ts` for a stub.

### DB transactions

The `DbHandle` interface includes `transaction<T>(fn: (db) => T): T`. The callback runs inside a transaction; on success it commits, on throw it rolls back. `createNode` uses a transaction so the parent check and insert are atomic. Wrappers (retry, metrics) pass through transactions and ensure queries inside the callback are instrumented.

### DB retry logic

All `prepare().all()`, `.get()`, and `.run()` calls are retried on failure (default: 2 retries = 3 total attempts). This improves reliability against transient errors such as `SQLITE_BUSY` or `SQLITE_LOCKED` under concurrent access. The wrapper in `db/retry.ts` is applied in `connection.ts` before the DB is used. `exec()` (schema init) and `close()` are not retried. Each retry is logged at warn level. To change retry count, pass a second argument to `wrapDbWithRetry(db, maxRetries)`.

### Metrics layer

DB usage is instrumented via a `DbMetrics` interface (`src/metrics/types.ts`). The default adapter is an in-memory mock that tracks query counts (all/get/run), errors, and total duration. `GET /metrics` returns the snapshot as JSON. To swap for Prometheus, StatsD, etc.: implement `DbMetrics` in `src/metrics/adapters/<name>.ts` and change `createDbMetrics()` in `src/metrics/index.ts`.

### Zod validation

Runtime validation ensures invalid input never reaches the repository. Clear error messages improve API usability for integrators.

### Logging layer

Logging is abstracted behind a `Logger` interface (`src/logging/types.ts`). The default adapter uses Winston (structured JSON in production, colorized in dev, silenced in test). To swap to pino, bunyan, or plain console:

1. Implement `Logger` in `src/logging/adapters/<name>.ts`.
2. In `src/logging/index.ts`, change `createLogger()` to return your adapter instead of `createWinstonLogger()`.

See `src/logging/adapters/console.example.ts` for a minimal console adapter.

### Consistent error shape

All API errors return `{ error: { code, message, details? } }`. The `code` is a machine-readable constant (e.g. `PARENT_NOT_FOUND`, `VALIDATION_FAILED`) for client logic; `message` is human-readable. Validation errors include a `details` array with per-field `path` and `message`.

### Request idempotency

POST requests support an optional `Idempotency-Key` header. When present, the first request executes normally and the response is stored. Duplicate requests with the same key return the stored response without re-executing the operation. Keys are stored in SQLite (`idempotency_keys` table) and expire after 24 hours. Use a unique key per logical operation (e.g. UUID) to safely retry after timeouts or network failures.

### Request timeouts

Requests exceeding `REQUEST_TIMEOUT_MS` (default 30s) receive `408 Request Timeout`. This prevents slow or stuck requests from consuming resources and helps with load balancer health checks. The server also sets `keepAliveTimeout` and `headersTimeout` for compatibility with reverse proxies (e.g. AWS ELB).

## Environment Variables 🔧

| Variable           | Default         | Description                        |
| ------------------ | --------------- | ---------------------------------- |
| PORT               | 3000            | Server port                        |
| DB_PATH            | ./data/trees.db | SQLite file path                   |
| NODE_ENV           | development     | Log format; use `test` for tests   |
| REQUEST_TIMEOUT_MS | 30000           | Request timeout in ms; returns 408 |

## License 📜

MIT
