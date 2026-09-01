export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin@1234";

export const ADMIN_USERS = {
  superadmin: { username: "superadmin", role: "SUPER_ADMIN" },
  opsadmin: { username: "opsadmin", role: "OPERATIONS" },
  financeadmin: { username: "financeadmin", role: "FINANCE" },
  supportadmin: { username: "supportadmin", role: "SUPPORT" },
} as const;

export const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? "http://localhost:3001/api/v1";

export const NAV_ROUTES = [
  { href: "/overview", label: "Overview", title: "Performance Overview" },
  { href: "/bookings", label: "Bookings", title: "The log" },
  { href: "/dispatch", label: "Dispatch", title: "Dispatch console" },
  { href: "/quotations", label: "Corporate", title: "Quotation desk" },
  { href: "/slots", label: "Time Slots", title: "Time Slots Management" },
  { href: "/disputes", label: "Disputes", title: "Resolution hub" },
  { href: "/payments", label: "Payments", title: "Payments", financeOnly: true },
  { href: "/payroll", label: "Payroll", title: "Payroll", financeOnly: true },
  {
    href: "/pricing-settings",
    label: "Platform Pricing",
    title: "Platform Pricing",
    financeOnly: true,
  },
  { href: "/services", label: "Services", title: "Service catalogue" },
  { href: "/coupons", label: "Coupons", title: "Coupons" },
  { href: "/zones", label: "Geofences", title: "Service polygons" },
  { href: "/partners", label: "Partners", title: "Partner Directory" },
  { href: "/customers", label: "Customers", title: "Customers" },
  { href: "/reviews", label: "Reviews", title: "Reviews" },
  { href: "/settings", label: "Settings", title: "System Configurations" },
] as const;

export const SEED_ENTITIES = {
  consumerName: "Priya Sharma",
  partnerName: "Amit Sharma",
  couponCode: "WELCOME50",
} as const;
