# Manual Testing

Copy-paste curl commands for ad hoc local testing. Start the server with `npm start`, `npm run dev`, or `docker compose up`.

Base URL: `http://localhost:3000`

API base: `http://localhost:3000/api/v1`

---

## Health check

```bash
curl -s http://localhost:3000/health | jq
```

---

## GET /metrics

DB usage metrics (query counts, duration, errors):

```bash
curl -s http://localhost:3000/metrics | jq
```

---

## GET /api/v1/tree

**Empty (fresh DB):**
```bash
curl -s http://localhost:3000/api/v1/tree | jq
```

**After adding nodes:**
```bash
curl -s http://localhost:3000/api/v1/tree | jq
```

**Limit depth (maxDepth=2):**
```bash
curl -s "http://localhost:3000/api/v1/tree?maxDepth=2" | jq
```

**Paginate roots (limit=20, offset=0):**
```bash
curl -s "http://localhost:3000/api/v1/tree?limit=20&offset=0" | jq
```

**Combined:**
```bash
curl -s "http://localhost:3000/api/v1/tree?maxDepth=3&limit=50&offset=0" | jq
```

---

## POST /api/v1/tree

**Create root node (omit parentId):**
```bash
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -d '{"label":"root"}' | jq
```

**Create root node (parentId: null):**
```bash
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -d '{"label":"root","parentId":null}' | jq
```

**Create child node (parentId: 1):**
```bash
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -d '{"label":"bear","parentId":1}' | jq
```

**Create child node (snake_case parent_id):**
```bash
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -d '{"label":"cat","parent_id":2}' | jq
```

**With idempotency (safe retries):**
```bash
# First request: creates node
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-unique-key-123" \
  -d '{"label":"root"}' | jq

# Duplicate request: returns same response, no duplicate node
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-unique-key-123" \
  -d '{"label":"root"}' | jq
```

---

## Full flow (build a tree)

```bash
# 1. Root
curl -s -X POST http://localhost:3000/api/v1/tree -H "Content-Type: application/json" -d '{"label":"root"}' | jq

# 2. Child of root (id 1)
curl -s -X POST http://localhost:3000/api/v1/tree -H "Content-Type: application/json" -d '{"label":"bear","parentId":1}' | jq

# 3. Child of bear (id 2)
curl -s -X POST http://localhost:3000/api/v1/tree -H "Content-Type: application/json" -d '{"label":"cat","parentId":2}' | jq

# 4. Fetch full tree
curl -s http://localhost:3000/api/v1/tree | jq
```

---

## Error cases

**404 — Parent not found:**
```bash
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -d '{"label":"orphan","parentId":999}' | jq
# Expect: {"error":{"code":"PARENT_NOT_FOUND","message":"Parent node does not exist"}}
```

**400 — Missing label:**
```bash
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# Expect: {"error":{"code":"VALIDATION_FAILED","message":"Validation failed","details":[...]}}
```

**400 — Empty label:**
```bash
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -d '{"label":""}' | jq
```

**400 — Invalid parentId type:**
```bash
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -d '{"label":"node","parentId":"not-a-number"}' | jq
```

**400 — Label too long (>500 chars):**
```bash
curl -s -X POST http://localhost:3000/api/v1/tree \
  -H "Content-Type: application/json" \
  -d "{\"label\":\"$(printf 'x%.0s' {1..501})\"}" | jq
```

---

## Without jq

Drop `| jq` if you don't have jq installed. Responses will be unformatted JSON.
