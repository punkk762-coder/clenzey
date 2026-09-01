import { defineConfig } from "drizzle-kit";

/**
 * Minimal config for running `drizzle-kit migrate` in Docker.
 * Only needs dialect, dbCredentials, and migrations path — no schema import
 * so it won't trigger app-level env validation (JWT_SECRET, etc.).
 */
export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  dialect: "postgresql",
  migrations: {
    prefix: "timestamp",
    schema: "public",
    table: "__drizzle_migrations__",
  },
  out: "./migrations",
});
