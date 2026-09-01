# Load & Performance Tests (k6)

Run against a running backend (Docker recommended):

```bash
# Start stack with seed data
make bootstrap && make seed

# Smoke test — health endpoints (10 VUs, 30s)
k6 run load/k6/health.js

# Catalog read load — ramp to 100 VUs
k6 run load/k6/services.js

# Auth flow — 20 sign-ins/sec for 1 minute
k6 run load/k6/auth-flow.js
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3001` | Backend base URL |
| `CONSUMER_EMAIL` | `priya.consumer@clenzey.test` | Seed consumer for auth test |
| `CONSUMER_PASSWORD` | `Test@1234` | Seed password |

## Thresholds

Default SLOs (adjust per environment):

- `http_req_failed` < 1%
- `p(95)` latency < 800ms (health/catalog), < 1200ms (auth)

## CI note

k6 is not run in GitHub Actions by default (requires running server). Run manually before releases or add a scheduled workflow against QA.
