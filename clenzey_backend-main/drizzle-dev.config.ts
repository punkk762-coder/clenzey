import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: ".env.dev",
  override: true,
  quiet: true,
});

console.log(`drizzle-dev: ${process.env.NODE_ENV} ${process.env.DATABASE_URL}`)
export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  dialect: "postgresql",
  extensionsFilters: ["postgis"],
  migrations: {
    prefix: "timestamp",
    schema: "public",
    table: "__drizzle_migrations__",
  },
  out: "./migrations",
  schema: "./src/db/schema.ts",
});
