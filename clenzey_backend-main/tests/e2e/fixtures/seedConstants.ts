/** Stable IDs and credentials from scripts/seed.ts for E2E assertions. */

export const PASSWORD = "Test@1234";
export const ADMIN_PASSWORD = "Admin@1234";

export const CONSUMER = {
  email: "priya.consumer@clenzey.test",
  phone: "+919988776655",
  userId: "c1000001-0001-4001-8001-000000000001",
} as const;

export const OTHER_CONSUMER = {
  email: "rahul.consumer@clenzey.test",
  userId: "c1000002-0002-4002-8002-000000000002",
} as const;

export const PARTNER = {
  email: "amit.partner@clenzey.test",
  userId: "a1000001-0001-4001-8001-000000000001",
} as const;

export const ADMIN = {
  username: "superadmin",
  role: "SUPER_ADMIN",
} as const;

export const OPS_ADMIN = { username: "opsadmin", role: "OPERATIONS" } as const;
export const FINANCE_ADMIN = { username: "financeadmin", role: "FINANCE" } as const;
export const SUPPORT_ADMIN = { username: "supportadmin", role: "SUPPORT" } as const;

export const BOOKINGS = {
  assigned: "b1000001-0001-4001-8001-000000000001",
  paymentPending: "b1000001-0001-4001-8001-000000000014",
} as const;

export const SERVICES = {
  expressPolish: "e1010001-0001-4001-8001-000000000001",
} as const;
