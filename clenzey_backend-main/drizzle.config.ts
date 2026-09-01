import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// dotenv.config({
//   path: process.env.NODE_ENV === "prod" ? ".env" : ".env.dev",
//   quiet: true,
// });

export default defineConfig({
  breakpoints: true,
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
  strict: true,
  verbose: true,
});
