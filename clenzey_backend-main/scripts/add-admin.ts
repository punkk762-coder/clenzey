/**
 * Usage:
 *   pnpm admin:add      --username admin1 --password SecureP@ss1 --phone +919876543210 --role SUPER_ADMIN
 *   pnpm admin:add:prod --username admin1 --password SecureP@ss1 --phone +919876543210 --role SUPER_ADMIN
 *   pnpm admin:add      --username ops --password MyPass123 --phone +919876543210 --role SUPPORT --email ops@clenzey.com
 *
 * Roles: OPERATIONS | SUPPORT | FINANCE | SUPER_ADMIN  (default: SUPPORT)
 *
 * In production DATABASE_URL must be set in the environment.
 */

import { randomBytes, scrypt } from "node:crypto";
import { parseArgs } from "node:util";

import { eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import { admins } from "../src/db/schema.ts";

const ROLES = ["OPERATIONS", "SUPPORT", "FINANCE", "SUPER_ADMIN"] as const;

const inputSchema = z.object({
  email: z.email().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(7, "Phone number is required"),
  role: z.enum(ROLES).default("SUPPORT"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, dots, hyphens, and underscores"),
});

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    phone: { type: "string" },
    role: { type: "string" },
    username: { type: "string" },
  },
  strict: false,
});

const parsed = inputSchema.safeParse({
  email: values.email,
  password: values.password,
  phone: values.phone,
  role: values.role,
  username: values.username,
});

if (!parsed.success) {
  console.error("Invalid arguments:\n");
  for (const issue of parsed.error.issues) {
    console.error(`  --${String(issue.path[0])}: ${issue.message}`);
  }
  console.error(
    "\nUsage: pnpm admin:add --username <name> --password <pass> --phone <e164> --role <ROLE> [--email <email>]",
  );
  console.error(`Roles: ${ROLES.join(" | ")}`);
  process.exit(1);
}

const { email, password, phone, role, username } = parsed.data;

/**
 * Hash a password using scrypt with a random salt.
 * Returns "salt:hash" format (both hex-encoded).
 */
async function hashPassword(plaintext: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    scrypt(plaintext, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });
  return `${salt}:${hash}`;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Check for existing admin with same username or phone
const [existing] = await db
  .select({ id: admins.id, phone: admins.phone, username: admins.username })
  .from(admins)
  .where(or(eq(admins.username, username), eq(admins.phone, phone)))
  .limit(1);

if (existing) {
  if (existing.username === username) {
    console.error(`An admin with username "${username}" already exists (id: ${existing.id}).`);
  } else {
    console.error(`An admin with phone ${phone} already exists (id: ${existing.id}).`);
  }
  await pool.end();
  process.exit(1);
}

const passwordHash = await hashPassword(password);

const [admin] = await db
  .insert(admins)
  .values({ email: email ?? null, passwordHash, phone, role, username })
  .returning();

await pool.end();

console.log("\nAdmin created successfully\n");
console.log(`  ID       : ${admin!.id}`);
console.log(`  Username : ${admin!.username}`);
console.log(`  Phone    : ${admin!.phone}`);
console.log(`  Email    : ${admin!.email ?? "(none)"}`);
console.log(`  Role     : ${admin!.role}`);
console.log();
