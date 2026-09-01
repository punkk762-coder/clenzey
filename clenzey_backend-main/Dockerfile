# --- Build stage ---
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.json tsconfig.build.json index.ts ./
COPY src/ ./src/
COPY scripts/ ./scripts/

RUN pnpm run build

# --- Production stage ---
FROM node:24-alpine AS production

RUN apk add --no-cache wget

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder (includes src/ and scripts/)
COPY --from=builder /app/dist ./dist

# Migrations (run via: make migrate)
COPY migrations/ ./migrations/
COPY drizzle-migrate.config.ts ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health/ready || exit 1

CMD ["node", "dist/index.js"]
