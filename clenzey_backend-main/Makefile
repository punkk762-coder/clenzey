.PHONY: help up down build rebuild restart restart-backend restart-worker status health \
       logs logs-backend logs-db logs-redis logs-worker \
       migrate migrate-local bootstrap seed seed-services reseed add-admin \
       shell-backend shell-worker shell-db shell-redis clean prune

COMPOSE ?= docker compose
BACKEND_URL ?= http://localhost:3001

# Default target
help: ## Show this help
	@echo ""
	@echo "Docker workflow (recommended):"
	@echo "  make bootstrap     Start all services + run migrations"
	@echo "  make rebuild       Rebuild backend/worker images after code changes, then migrate"
	@echo "  make migrate       Apply pending DB migrations (containers must be running)"
	@echo "  make logs-worker   Tail dispatch worker (required for auto-assignment)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# --- Docker Compose ---

up: ## Start all services in background (db, redis, backend, worker)
	$(COMPOSE) up --build -d

down: ## Stop and remove all services (keeps volumes)
	$(COMPOSE) down

build: ## Rebuild backend and worker images without cache
	$(COMPOSE) build --no-cache backend worker

rebuild: ## Rebuild backend/worker and recreate containers (run after pulling code)
	$(COMPOSE) up --build -d backend worker
	@echo "Waiting for backend to become healthy..."
	@sleep 5
	$(MAKE) migrate

bootstrap: up migrate ## First-time setup: start stack and apply migrations

restart: ## Restart all services
	$(COMPOSE) restart

restart-backend: ## Restart API container only
	$(COMPOSE) restart backend

restart-worker: ## Restart dispatch worker only
	$(COMPOSE) restart worker

status: ## Show running service status
	$(COMPOSE) ps

health: ## Hit backend readiness endpoint
	@wget -qO- $(BACKEND_URL)/api/v1/health/ready || curl -sf $(BACKEND_URL)/api/v1/health/ready

# --- Logs ---

logs: ## Tail logs for all services
	$(COMPOSE) logs -f

logs-backend: ## Tail backend API logs
	$(COMPOSE) logs -f backend

logs-worker: ## Tail dispatch worker logs
	$(COMPOSE) logs -f worker

logs-db: ## Tail database logs
	$(COMPOSE) logs -f db

logs-redis: ## Tail Redis logs
	$(COMPOSE) logs -f redis

# --- Database ---

migrate: ## Run migrations inside the backend container (uses Docker DB)
	$(COMPOSE) exec backend pnpm exec drizzle-kit migrate --config drizzle-migrate.config.ts

migrate-local: ## Run migrations from host against Docker DB on localhost:5433
	DATABASE_URL=postgresql://clenzey:clenzey_secret@localhost:5433/clenzey \
		pnpm exec drizzle-kit migrate --config drizzle-migrate.config.ts

seed-services: ## Seed services catalog inside backend container
	$(COMPOSE) exec backend node dist/scripts/seed-services.js

seed: ## Seed E2E data from host against Docker DB on localhost:5433
	DATABASE_URL=postgresql://clenzey:clenzey_secret@localhost:5433/clenzey pnpm tsx scripts/seed.ts

reseed: ## Truncate tables and re-seed from scratch (destructive)
	$(COMPOSE) exec db psql -U clenzey -d clenzey -c "\
		TRUNCATE \
		users, consumers, partners, admins, services, service_zones, service_zone_services, \
		partner_zones, consumer_addresses, bookings, booking_addons, booking_status_history, \
		payments, payment_events, reviews, partner_skills, partner_availability, partner_locations, \
		partner_ledger_entries, partner_monthly_attendance, partner_payroll_runs, incentive_configs, \
		bank_details, kyc_documents, coupons, coupon_redemptions, \
		notifications, device_tokens, time_slots, booking_assignments, payouts, refunds, \
		disputes, booking_photos, booking_eta, quotation_requests, masked_call_sessions, \
		zone_price_overrides, contact_logs, secrets \
		CASCADE;"
	$(MAKE) seed

add-admin: ## Add admin user (e.g. make add-admin ARGS="--username admin --password secret")
	$(COMPOSE) exec backend node dist/scripts/add-admin.js $(ARGS)

# --- Shell Access ---

shell-backend: ## Open a shell in the backend container
	$(COMPOSE) exec backend sh

shell-worker: ## Open a shell in the worker container
	$(COMPOSE) exec worker sh

shell-db: ## Open psql in the database container
	$(COMPOSE) exec db psql -U clenzey -d clenzey

shell-redis: ## Open redis-cli in the Redis container
	$(COMPOSE) exec redis redis-cli

# --- Cleanup ---

clean: ## Stop services and remove volumes (deletes DB and Redis data)
	$(COMPOSE) down -v

prune: ## Remove dangling Docker images and build cache
	docker image prune -f
	docker builder prune -f
