/**
 * Seed script — E2E-ready data for Consumer, Partner, and Admin apps.
 *
 * Usage:
 *   pnpm seed          (dev — uses .env.dev)
 *   pnpm seed:prod     (prod — uses env vars)
 *   make seed          (Docker DB on localhost:5433)
 *
 * Idempotency:
 *   - First run: inserts platform catalog, users, partner pool, and bookings.
 *   - Subsequent runs: upserts accounts/catalog, refreshes availability/locations,
 *     and re-seeds BK-E2E-* / BK-SEED-* bookings + financials.
 *   - Primary test accounts (Priya, Amit, superadmin) are always preserved.
 */

import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";

import bcrypt from "bcrypt";
import { and, eq, gt, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { admins } from "../src/db/schema/admins.ts";
import { bankDetails } from "../src/db/schema/bankDetails.ts";
import { bookingEta } from "../src/db/schema/bookingEta.ts";
import {
  bookingAddons,
  bookings,
  bookingStatusHistory,
  maskedCallSessions,
  type CorporateDetailsJson,
} from "../src/db/schema/bookings.ts";
import { bookingPhotos } from "../src/db/schema/bookingPhotos.ts";
import { consumerAddresses, consumers } from "../src/db/schema/consumers.ts";
import { contactLogs } from "../src/db/schema/contactLogs.ts";
import { deviceTokens } from "../src/db/schema/deviceTokens.ts";
import { disputeEvidence } from "../src/db/schema/disputeEvidence.ts";
import { disputes } from "../src/db/schema/disputes.ts";
import { incentiveConfigs } from "../src/db/schema/incentiveConfigs.ts";
import { kycDocuments } from "../src/db/schema/kycDocuments.ts";
import { notifications } from "../src/db/schema/notifications.ts";
import { partnerLedgerEntries } from "../src/db/schema/partnerLedgerEntries.ts";
import { partnerMonthlyAttendance } from "../src/db/schema/partnerMonthlyAttendance.ts";
import { partnerPayrollRuns } from "../src/db/schema/partnerPayrollRuns.ts";
import { partnerZones } from "../src/db/schema/partnerZones.ts";
import { partners } from "../src/db/schema/partners.ts";
import { partnerSkills } from "../src/db/schema/partnerSkills.ts";
import { paymentEvents, payments } from "../src/db/schema/payments.ts";
import { payouts } from "../src/db/schema/payouts.ts";
import { couponRedemptions, coupons } from "../src/db/schema/pricing.ts";
import { referrals } from "../src/db/schema/referrals.ts";
import { refunds } from "../src/db/schema/refunds.ts";
import { quotationRequests } from "../src/db/schema/services.ts";
import { reviews } from "../src/db/schema/reviews.ts";
import {
  bookingAssignments,
  partnerAvailability,
  partnerLocations,
  timeSlots,
} from "../src/db/schema/scheduling.ts";
import { secrets } from "../src/db/schema/secrets.ts";
import { services } from "../src/db/schema/services.ts";
import { users } from "../src/db/schema/users.ts";
import {
  serviceZones,
  serviceZoneServices,
  zonePriceOverrides,
} from "../src/db/schema/zones.ts";

const scryptAsync = promisify(scrypt);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// ── Stable IDs (deterministic for E2E tests) ────────────────────────────────

const PASSWORD = "Test@1234";
const ADMIN_PASSWORD = "Admin@1234";
const BOOKING_PREFIX = "BK-E2E-";
const SEED_BOOKING_PREFIX = "BK-SEED-";
const CALENDAR_DAYS = 15;

const CONSUMER = {
  email: "priya.consumer@clenzey.test",
  fullName: "Priya Sharma",
  phone: "+919988776655",
  referralCode: "PRIYA2026",
  userId: "c1000001-0001-4001-8001-000000000001",
} as const;

const PARTNER = {
  email: "amit.partner@clenzey.test",
  fullName: "Amit Sharma",
  phone: "+919998887766",
  userId: "a1000001-0001-4001-8001-000000000001",
} as const;

const ADMIN = {
  email: "admin@clenzey.test",
  id: "f1000001-0001-4001-8001-000000000001",
  phone: "+919000000001",
  username: "superadmin",
} as const;

const EXTRA_ADMINS = [
  {
    email: "ops@clenzey.test",
    id: "f1000002-0002-4002-8002-000000000002",
    phone: "+919000000002",
    role: "OPERATIONS" as const,
    username: "opsadmin",
  },
  {
    email: "finance@clenzey.test",
    id: "f1000003-0003-4003-8003-000000000003",
    phone: "+919000000003",
    role: "FINANCE" as const,
    username: "financeadmin",
  },
  {
    email: "support@clenzey.test",
    id: "f1000004-0004-4004-8004-000000000004",
    phone: "+919000000004",
    role: "SUPPORT" as const,
    username: "supportadmin",
  },
] as const;

const EXTRA_CONSUMERS = [
  {
    addressId: "a1000002-0002-4002-8002-000000000002",
    email: "rahul.consumer@clenzey.test",
    fullName: "Rahul Verma",
    phone: "+919988776656",
    referralCode: "RAHUL2026",
    userId: "c1000002-0002-4002-8002-000000000002",
  },
  {
    addressId: "a1000003-0003-4003-8003-000000000003",
    email: "meera.consumer@clenzey.test",
    fullName: "Meera Desai",
    phone: "+919988776657",
    referralCode: "MEERA2026",
    userId: "c1000003-0003-4003-8003-000000000003",
  },
] as const;

const IDS = {
  address: "a1000001-0001-4001-8001-000000000001",
  bankDetails: "b1000001-0001-4001-8001-000000000001",
  bookings: {
    assigned: "b1000001-0001-4001-8001-000000000001",
    cancelled: "b1000001-0001-4001-8001-000000000007",
    checkedIn: "b1000001-0001-4001-8001-000000000003",
    completedDispute: "b1000001-0001-4001-8001-000000000010",
    completedRecent: "b1000001-0001-4001-8001-000000000005",
    completedReviewed: "b1000001-0001-4001-8001-000000000006",
    completedReviewPending: "b1000001-0001-4001-8001-000000000011",
    confirmedUnassigned: "b1000001-0001-4001-8001-000000000012",
    corporateScheduled: "b1000001-0001-4001-8001-000000000016",
    enRoute: "b1000001-0001-4001-8001-000000000002",
    instantDispatchReady: "b1000001-0001-4001-8001-000000000013",
    inProgress: "b1000001-0001-4001-8001-000000000004",
    noShow: "b1000001-0001-4001-8001-000000000008",
    paymentPending: "b1000001-0001-4001-8001-000000000014",
    pending: "b1000001-0001-4001-8001-000000000015",
    refunded: "b1000001-0001-4001-8001-000000000017",
    scheduled: "b1000001-0001-4001-8001-000000000009",
  },
  coupons: {
    flat100: "c1010001-0001-4001-8001-000000000002",
    meeraReferral: "c1010001-0001-4001-8001-000000000004",
    priyaReferral: "c1010001-0001-4001-8001-000000000003",
    welcome50: "c1010001-0001-4001-8001-000000000001",
  },
  disputes: {
    consumerOpen: "d1020001-0001-4001-8001-000000000002",
    partnerReview: "d1020001-0001-4001-8001-000000000001",
    resolved: "d1020001-0001-4001-8001-000000000003",
  },
  incentiveConfigs: {
    default: "e1060001-0001-4001-8001-000000000001",
    quickShine: "e1060001-0001-4001-8001-000000000002",
  },
  incentiveReview: "e1020001-0001-4001-8001-000000000001",
  reviewFourStar: "e1020001-0001-4001-8001-000000000002",
  salaryLedger: "e1030001-0001-4001-8001-000000000001",
  incentiveLedger: "e1030001-0001-4001-8001-000000000002",
  deductionLedger: "e1030001-0001-4001-8001-000000000003",
  payrollRun: "e1040001-0001-4001-8001-000000000001",
  payments: {
    authorized: "f1020001-0001-4001-8001-000000000002",
    pending: "f1020001-0001-4001-8001-000000000003",
    refunded: "f1020001-0001-4001-8001-000000000001",
  },
  services: {
    corporate: "e1010001-0001-4001-8001-000000000003",
    deepCleaning: "e1010001-0001-4001-8001-000000000002",
    expressPolish: "e1010001-0001-4001-8001-000000000001",
  },
  variantDeep2Bhk: "e1010003-0001-4001-8001-000000000002",
  variantExpress30: "e1010002-0001-4001-8001-000000000010",
  variantExpress60: "e1010002-0001-4001-8001-000000000001",
  variantExpress90: "e1010002-0001-4001-8001-000000000011",
  variantDeep1Bhk: "e1010003-0001-4001-8001-000000000001",
  variantCorporate26_50: "e1010004-0001-4001-8001-000000000003",
  quotationEnterprise: "e1050001-0001-4001-8001-000000000001",
  zoneAhmedabad: "d1010001-0001-4001-8001-000000000001",
} as const;

const SERVICE_NAMES = {
  corporate: "Clenzey Corporate",
  deepCleaning: "Deep Clean Pro",
  expressPolish: "Quick Shine",
} as const;

type CatalogInclusion = {
  description: string;
  id: string;
  sortOrder: number;
  title: string;
};

const catalogInclusion = (
  id: string,
  title: string,
  description: string,
  sortOrder: number,
): CatalogInclusion => ({ description, id, sortOrder, title });

const catalogExclusion = catalogInclusion;

type PartnerSeedProfile = {
  approvalStatus: "APPROVED" | "PENDING" | "REJECTED" | "UNDER_REVIEW";
  avgRating: string;
  email: string;
  fullName: string;
  isAvailable: boolean;
  isOnline: boolean;
  kycStatus: "VERIFIED" | "PENDING" | "REJECTED";
  lat: number;
  lng: number;
  phone: string;
  serviceIds: string[];
  totalReviews: number;
  userId: string;
};

/** Online partners free for instant auto-assignment (Amit is busy on active E2E jobs). */
const DISPATCH_PARTNERS: PartnerSeedProfile[] = [
  {
    approvalStatus: "APPROVED",
    avgRating: "4.72",
    email: "neha.partner@clenzey.test",
    fullName: "Neha Patel",
    isAvailable: true,
    isOnline: true,
    kycStatus: "VERIFIED",
    lat: 23.0235,
    lng: 72.5725,
    phone: "+919998887767",
    serviceIds: [
      IDS.services.expressPolish,
      IDS.services.deepCleaning,
      IDS.services.corporate,
    ],
    totalReviews: 18,
    userId: "a1000002-0002-4002-8002-000000000002",
  },
  {
    approvalStatus: "APPROVED",
    avgRating: "4.55",
    email: "ravi.partner@clenzey.test",
    fullName: "Ravi Mehta",
    isAvailable: true,
    isOnline: true,
    kycStatus: "VERIFIED",
    lat: 23.021,
    lng: 72.569,
    phone: "+919998887768",
    serviceIds: [IDS.services.expressPolish, IDS.services.deepCleaning],
    totalReviews: 11,
    userId: "a1000003-0003-4003-8003-000000000003",
  },
  {
    approvalStatus: "APPROVED",
    avgRating: "4.90",
    email: "sneha.partner@clenzey.test",
    fullName: "Sneha Shah",
    isAvailable: true,
    isOnline: true,
    kycStatus: "VERIFIED",
    lat: 23.024,
    lng: 72.574,
    phone: "+919998887769",
    serviceIds: [IDS.services.expressPolish],
    totalReviews: 24,
    userId: "a1000004-0004-4004-8004-000000000004",
  },
  {
    approvalStatus: "APPROVED",
    avgRating: "4.68",
    email: "anita.partner@clenzey.test",
    fullName: "Anita Desai",
    isAvailable: true,
    isOnline: true,
    kycStatus: "VERIFIED",
    lat: 23.0195,
    lng: 72.5665,
    phone: "+919998887773",
    serviceIds: [IDS.services.expressPolish, IDS.services.deepCleaning],
    totalReviews: 15,
    userId: "a1000008-0008-4008-8008-000000000008",
  },
  {
    approvalStatus: "APPROVED",
    avgRating: "4.41",
    email: "kunal.partner@clenzey.test",
    fullName: "Kunal Shah",
    isAvailable: true,
    isOnline: true,
    kycStatus: "VERIFIED",
    lat: 23.026,
    lng: 72.576,
    phone: "+919998887774",
    serviceIds: [IDS.services.expressPolish, IDS.services.corporate],
    totalReviews: 9,
    userId: "a1000009-0009-4009-8009-000000000009",
  },
  {
    approvalStatus: "APPROVED",
    avgRating: "4.83",
    email: "priya.partner@clenzey.test",
    fullName: "Priya Joshi",
    isAvailable: true,
    isOnline: true,
    kycStatus: "VERIFIED",
    lat: 23.0185,
    lng: 72.5735,
    phone: "+919998887775",
    serviceIds: [
      IDS.services.expressPolish,
      IDS.services.deepCleaning,
      IDS.services.corporate,
    ],
    totalReviews: 21,
    userId: "a1000010-0010-4010-8010-000000000010",
  },
  {
    approvalStatus: "APPROVED",
    avgRating: "4.36",
    email: "manish.partner@clenzey.test",
    fullName: "Manish Rao",
    isAvailable: true,
    isOnline: true,
    kycStatus: "VERIFIED",
    lat: 23.0255,
    lng: 72.5685,
    phone: "+919998887776",
    serviceIds: [IDS.services.expressPolish, IDS.services.deepCleaning],
    totalReviews: 7,
    userId: "a1000011-0011-4011-8011-000000000011",
  },
  {
    approvalStatus: "APPROVED",
    avgRating: "4.77",
    email: "heena.partner@clenzey.test",
    fullName: "Heena Modi",
    isAvailable: true,
    isOnline: true,
    kycStatus: "VERIFIED",
    lat: 23.0205,
    lng: 72.5705,
    phone: "+919998887777",
    serviceIds: [IDS.services.expressPolish, IDS.services.corporate],
    totalReviews: 13,
    userId: "a1000012-0012-4012-8012-000000000012",
  },
];

/** Partners for admin review / edge-case testing. */
const ADMIN_QUEUE_PARTNERS: PartnerSeedProfile[] = [
  {
    approvalStatus: "PENDING",
    avgRating: "0.00",
    email: "kiran.partner@clenzey.test",
    fullName: "Kiran Joshi",
    isAvailable: true,
    isOnline: false,
    kycStatus: "PENDING",
    lat: 23.02,
    lng: 72.57,
    phone: "+919998887770",
    serviceIds: [IDS.services.expressPolish],
    totalReviews: 0,
    userId: "a1000005-0005-4005-8005-000000000005",
  },
  {
    approvalStatus: "APPROVED",
    avgRating: "4.10",
    email: "deepa.partner@clenzey.test",
    fullName: "Deepa Nair",
    isAvailable: false,
    isOnline: false,
    kycStatus: "VERIFIED",
    lat: 23.025,
    lng: 72.575,
    phone: "+919998887771",
    serviceIds: [IDS.services.deepCleaning],
    totalReviews: 6,
    userId: "a1000006-0006-4006-8006-000000000006",
  },
  {
    approvalStatus: "REJECTED",
    avgRating: "2.50",
    email: "vijay.partner@clenzey.test",
    fullName: "Vijay Kumar",
    isAvailable: false,
    isOnline: false,
    kycStatus: "REJECTED",
    lat: 23.018,
    lng: 72.568,
    phone: "+919998887772",
    serviceIds: [IDS.services.expressPolish],
    totalReviews: 2,
    userId: "a1000007-0007-4007-8007-000000000007",
  },
];

const DAY_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const uuid = () => randomUUID();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);
const hoursFromNow = (n: number) => new Date(Date.now() + n * 3_600_000);
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

const geoPoint = (lng: number, lat: number) =>
  `SRID=4326;POINT(${lng} ${lat})`;

const getAllDaysOfWeek = (): (typeof DAY_OF_WEEK)[number][] => [...DAY_OF_WEEK];

const getAllPartnerIds = (): string[] => [
  PARTNER.userId,
  ...DISPATCH_PARTNERS.map((p) => p.userId),
  ...ADMIN_QUEUE_PARTNERS.map((p) => p.userId),
];

async function hashUserPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function hashAdminPassword(password: string) {
  const salt = randomBytes(32).toString("hex");
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

// ── Platform catalog ────────────────────────────────────────────────────────

async function seedAdmin(): Promise<string> {
  const passwordHash = await hashAdminPassword(ADMIN_PASSWORD);

  const [existing] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.username, ADMIN.username))
    .limit(1);

  if (existing) {
    await db
      .update(admins)
      .set({
        email: ADMIN.email,
        isActive: true,
        passwordHash,
        phone: ADMIN.phone,
        role: "SUPER_ADMIN",
      })
      .where(eq(admins.id, existing.id));
    console.log("  ✓ admin (superadmin, updated)");
    return existing.id;
  }

  await db.insert(admins).values({
    email: ADMIN.email,
    id: ADMIN.id,
    isActive: true,
    passwordHash,
    phone: ADMIN.phone,
    role: "SUPER_ADMIN",
    username: ADMIN.username,
  });
  console.log("  ✓ admin (superadmin)");
  return ADMIN.id;
}

async function seedExtraAdmins() {
  for (const admin of EXTRA_ADMINS) {
    const passwordHash = await hashAdminPassword(ADMIN_PASSWORD);
    const [existing] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.username, admin.username))
      .limit(1);

    if (existing) {
      await db
        .update(admins)
        .set({
          email: admin.email,
          isActive: true,
          passwordHash,
          phone: admin.phone,
          role: admin.role,
        })
        .where(eq(admins.id, existing.id));
      continue;
    }

    await db.insert(admins).values({
      email: admin.email,
      id: admin.id,
      isActive: true,
      passwordHash,
      phone: admin.phone,
      role: admin.role,
      username: admin.username,
    });
  }

  console.log(`  ✓ extra admins (${EXTRA_ADMINS.length} roles)`);
}

async function seedServices() {
  const sharedHomeExclusions = [
    catalogExclusion(
      "e1010091-0001-4001-8001-000000000001",
      "Moving Heavy Furniture or Appliances",
      "Furniture or appliances over 15 kg are not moved by our team.",
      0,
    ),
    catalogExclusion(
      "e1010091-0001-4001-8001-000000000002",
      "Paint, Cement, Rust & Permanent Stain Removal",
      "Permanent stains and construction residue require specialist treatment.",
      1,
    ),
    catalogExclusion(
      "e1010091-0001-4001-8001-000000000003",
      "Biohazard Cleaning",
      "Blood, vomit, urine, baby or pet waste cleanup is not included.",
      2,
    ),
    catalogExclusion(
      "e1010091-0001-4001-8001-000000000004",
      "Post-Construction or Renovation Cleaning",
      "Debris, dust sheets, and post-renovation residue are excluded.",
      3,
    ),
    catalogExclusion(
      "e1010091-0001-4001-8001-000000000005",
      "Washing Curtains, Carpets, Upholstery & Personal Clothing",
      "Laundry and upholstery shampooing are available as add-ons only.",
      4,
    ),
  ];

  const quickShineExclusions = sharedHomeExclusions;

  const deepCleanExclusions = [
    ...sharedHomeExclusions,
    catalogExclusion(
      "e1010092-0001-4001-8001-000000000006",
      "Exterior High-Rise Window Cleaning",
      "Outside glass and high-rise windows are not included.",
      5,
    ),
    catalogExclusion(
      "e1010092-0001-4001-8001-000000000007",
      "Ceiling, Wall & Surface Repairs",
      "Patching, painting, and repair work are excluded.",
      6,
    ),
    catalogExclusion(
      "e1010092-0001-4001-8001-000000000008",
      "Pest Control, Mold or Termite Treatment",
      "Specialist pest and mold remediation is not included.",
      7,
    ),
    catalogExclusion(
      "e1010092-0001-4001-8001-000000000009",
      "Cleaning Delicate or High-Value Items",
      "Artwork, antiques, and sensitive electronics are excluded.",
      8,
    ),
    catalogExclusion(
      "e1010092-0001-4001-8001-000000000010",
      "Dismantling or Servicing Appliances",
      "AC, chimney, refrigerator, and washing machine servicing excluded.",
      9,
    ),
  ];

  const deepCleanInclusions = [
    catalogInclusion(
      "e1010012-0001-4001-8001-000000000001",
      "Floor Scrubbing & Wet Mopping",
      "All reachable floor surfaces scrubbed and mopped.",
      0,
    ),
    catalogInclusion(
      "e1010012-0001-4001-8001-000000000002",
      "Bathroom Deep Cleaning",
      "Tiles, toilet, basin, and floor deep cleaned.",
      1,
    ),
    catalogInclusion(
      "e1010012-0001-4001-8001-000000000003",
      "Kitchen Deep Cleaning",
      "Counter, sink, cabinets, and tiles degreased.",
      2,
    ),
    catalogInclusion(
      "e1010012-0001-4001-8001-000000000004",
      "Bedroom & Living Area Deep Dusting",
      "Furniture, shelves, and accessible surfaces dusted.",
      3,
    ),
  ];

  const corporateInclusions = [
    catalogInclusion(
      "e1010013-0001-4001-8001-000000000001",
      "Floor Sweeping & Mopping",
      "All office floor areas swept and mopped.",
      0,
    ),
    catalogInclusion(
      "e1010013-0001-4001-8001-000000000002",
      "Workstation, Desk & Chair Cleaning",
      "Desks, chairs, and shared workstations wiped down.",
      1,
    ),
    catalogInclusion(
      "e1010013-0001-4001-8001-000000000003",
      "Restroom & Common Area Cleaning",
      "Restrooms, corridors, and reception areas cleaned.",
      2,
    ),
    catalogInclusion(
      "e1010013-0001-4001-8001-000000000004",
      "Pantry Cleaning",
      "Pantry counters, tables, and sinks cleaned.",
      3,
    ),
    catalogInclusion(
      "e1010013-0001-4001-8001-000000000005",
      "Door, Door Handle & Switchboard Cleaning",
      "High-touch surfaces disinfected across the office.",
      4,
    ),
  ];

  const corporateExclusions = [
    catalogExclusion(
      "e1010093-0001-4001-8001-000000000001",
      "Moving Heavy Furniture or Office Equipment",
      "Desks, servers, and heavy equipment are not moved.",
      0,
    ),
    catalogExclusion(
      "e1010093-0001-4001-8001-000000000002",
      "Exterior Glass or High-Rise Window Cleaning",
      "Exterior and high-rise glass cleaning is excluded.",
      1,
    ),
    catalogExclusion(
      "e1010093-0001-4001-8001-000000000003",
      "Paint, Cement, Rust & Permanent Stain Removal",
      "Permanent stains and construction residue are excluded.",
      2,
    ),
    catalogExclusion(
      "e1010093-0001-4001-8001-000000000004",
      "Biohazard Cleaning",
      "Blood, vomit, urine, or medical waste cleanup excluded.",
      3,
    ),
    catalogExclusion(
      "e1010093-0001-4001-8001-000000000005",
      "Post-Construction or Renovation Cleaning",
      "Post-renovation debris and dust are not included.",
      4,
    ),
  ];

  const rows = [
    {
      addons: [
        {
          description: "Add an extra 30 minutes to your Quick Shine visit",
          id: "e1010021-0001-4001-8001-000000000001",
          name: "Extra 30 Minutes",
          price: "79.00",
          sortOrder: 0,
        },
      ],
      category: "QUICK_SHINE" as const,
      description:
        "Routine home upkeep priced by visit duration. Pick how long your Clenzey Pro stays — ideal for touch-ups in Ahmedabad.",
      exclusions: quickShineExclusions,
      id: IDS.services.expressPolish,
      imageUrl: "https://storage.clenzey.com/services/quick-shine.jpg",
      inclusions: [],
      isActive: true,
      name: SERVICE_NAMES.expressPolish,
      pricingModel: "FIXED" as const,
      serviceType: "B2C",
      sortOrder: 0,
      tagline: "Pick your duration, get a spotless home",
      variants: [
        {
          basePrice: "99.00",
          id: IDS.variantExpress30,
          label: "30 mins",
          sortOrder: 0,
          value: "30",
        },
        {
          basePrice: "169.00",
          id: IDS.variantExpress60,
          label: "60 mins",
          sortOrder: 1,
          value: "60",
        },
        {
          basePrice: "239.00",
          id: IDS.variantExpress90,
          label: "90 mins",
          sortOrder: 2,
          value: "90",
        },
      ],
    },
    {
      addons: [
        {
          description: "Sweep, mop, and railing wipe for one balcony",
          id: "e1010022-0001-4001-8001-000000000001",
          name: "Balcony Deep Cleaning",
          price: "79.00",
          sortOrder: 0,
        },
        {
          description: "Interior shelves and door seals",
          id: "e1010022-0001-4001-8001-000000000002",
          name: "Refrigerator Interior Cleaning",
          price: "89.00",
          sortOrder: 1,
        },
        {
          description: "Hand-wash up to 20 utensils",
          id: "e1010022-0001-4001-8001-000000000003",
          name: "Dishwashing (Up to 20 Utensils)",
          price: "69.00",
          sortOrder: 2,
        },
        {
          description: "Iron and fold up to 7 clothing sets",
          id: "e1010022-0001-4001-8001-000000000004",
          name: "Clothes Ironing & Folding (Up to 7 Sets)",
          price: "139.00",
          sortOrder: 3,
        },
        {
          description: "Interior glass panes only",
          id: "e1010022-0001-4001-8001-000000000005",
          name: "Interior Window Glass Cleaning (Inside Only)",
          price: "49.00",
          sortOrder: 4,
        },
        {
          description: "Accessible wardrobe shelves wiped",
          id: "e1010022-0001-4001-8001-000000000006",
          name: "Wardrobe Interior Cleaning",
          price: "99.00",
          sortOrder: 5,
        },
        {
          description: "Customer must provide a safe ladder or height support",
          id: "e1010022-0001-4001-8001-000000000007",
          name: "Fan Cleaning",
          price: "29.00",
          sortOrder: 6,
        },
      ],
      category: "DEEP_CLEANING" as const,
      description:
        "Intensive top-to-bottom cleaning for move-ins, festivals, or quarterly resets. Please provide all necessary equipment for the expert.",
      exclusions: deepCleanExclusions,
      id: IDS.services.deepCleaning,
      imageUrl: "https://storage.clenzey.com/services/deep-clean-pro.jpg",
      inclusions: deepCleanInclusions,
      isActive: true,
      name: SERVICE_NAMES.deepCleaning,
      pricingModel: "FIXED" as const,
      serviceType: "B2C",
      sortOrder: 1,
      tagline: "Every corner, every crevice",
      variants: [
        {
          basePrice: "399.00",
          id: IDS.variantDeep1Bhk,
          label: "1 BHK",
          sortOrder: 0,
          value: "1bhk",
        },
        {
          basePrice: "599.00",
          id: IDS.variantDeep2Bhk,
          label: "2 BHK",
          sortOrder: 1,
          value: "2bhk",
        },
        {
          basePrice: "799.00",
          id: "e1010003-0001-4001-8001-000000000003",
          label: "3 BHK",
          sortOrder: 2,
          value: "3bhk",
        },
        {
          basePrice: "999.00",
          id: "e1010003-0001-4001-8001-000000000004",
          label: "4 BHK",
          sortOrder: 3,
          value: "4bhk",
        },
      ],
    },
    {
      addons: [
        {
          description: "Interior glass partitions and conference room glass",
          estimatedDurationMin: 45,
          id: "e1010023-0001-4001-8001-000000000001",
          name: "Glass Partition Cleaning",
          price: "399.00",
          sortOrder: 0,
        },
        {
          description: "Carpet extraction per 500 sq ft block",
          estimatedDurationMin: 90,
          id: "e1010023-0001-4001-8001-000000000002",
          name: "Carpet Shampooing",
          price: "899.00",
          sortOrder: 1,
        },
        {
          description: "Shampoo extraction for office chairs",
          estimatedDurationMin: 60,
          id: "e1010023-0001-4001-8001-000000000003",
          name: "Chair Shampooing",
          price: "499.00",
          sortOrder: 2,
        },
        {
          description: "Sofa shampooing for break-out areas",
          estimatedDurationMin: 60,
          id: "e1010023-0001-4001-8001-000000000004",
          name: "Sofa Shampooing",
          price: "599.00",
          sortOrder: 3,
        },
        {
          description: "Deep clean pantry counters and appliances",
          estimatedDurationMin: 45,
          id: "e1010023-0001-4001-8001-000000000005",
          name: "Pantry Deep Cleaning",
          price: "349.00",
          sortOrder: 4,
        },
        {
          description: "Commercial-grade restroom deep clean",
          estimatedDurationMin: 60,
          id: "e1010023-0001-4001-8001-000000000006",
          name: "Washroom Deep Cleaning",
          price: "449.00",
          sortOrder: 5,
        },
        {
          description: "AC vent and grille dust removal",
          estimatedDurationMin: 30,
          id: "e1010023-0001-4001-8001-000000000007",
          name: "AC Vent Cleaning",
          price: "299.00",
          sortOrder: 6,
        },
        {
          description: "Disinfection fogging for open floor plans",
          estimatedDurationMin: 30,
          id: "e1010023-0001-4001-8001-000000000008",
          name: "Sanitization Fogging",
          price: "1499.00",
          sortOrder: 7,
        },
        {
          description: "Dust and wipe window blinds",
          estimatedDurationMin: 45,
          id: "e1010023-0001-4001-8001-000000000009",
          name: "Blind Cleaning",
          price: "249.00",
          sortOrder: 8,
        },
      ],
      category: "CORPORATE" as const,
      description:
        "Regular office cleaning for teams of every size. Book once or set a recurring schedule — before, during, or after office hours.",
      exclusions: corporateExclusions,
      id: IDS.services.corporate,
      imageUrl: "https://storage.clenzey.com/services/clenzey-corporate.jpg",
      inclusions: corporateInclusions,
      isActive: true,
      name: SERVICE_NAMES.corporate,
      pricingModel: "FIXED" as const,
      serviceType: "B2B",
      sortOrder: 2,
      tagline: "Workspaces that impress clients",
      variants: [
        {
          basePrice: "1999.00",
          estimatedDurationMin: 120,
          estimatedTeam: 2,
          id: "e1010004-0001-4001-8001-000000000001",
          label: "1–10 Employees",
          sortOrder: 0,
          sqFtHint: "Up to 500 sq.ft.",
          value: "emp_1_10",
        },
        {
          basePrice: "2999.00",
          estimatedDurationMin: 180,
          estimatedTeam: 2,
          id: "e1010004-0001-4001-8001-000000000002",
          label: "11–25 Employees",
          sortOrder: 1,
          sqFtHint: "500–1,500 sq.ft.",
          value: "emp_11_25",
        },
        {
          basePrice: "4999.00",
          estimatedDurationMin: 240,
          estimatedTeam: 3,
          id: IDS.variantCorporate26_50,
          label: "26–50 Employees",
          sortOrder: 2,
          value: "emp_26_50",
        },
        {
          basePrice: "7999.00",
          estimatedDurationMin: 300,
          estimatedTeam: 4,
          id: "e1010004-0001-4001-8001-000000000004",
          label: "51–100 Employees",
          sortOrder: 3,
          value: "emp_51_100",
        },
        {
          basePrice: "0.00",
          id: "e1010004-0001-4001-8001-000000000005",
          label: "100+ Employees",
          pricingModel: "INSPECTION" as const,
          sortOrder: 4,
          sqFtHint: "Custom scope",
          value: "emp_100_plus",
        },
      ],
    },
  ];

  for (const row of rows) {
    await db
      .insert(services)
      .values(row)
      .onConflictDoUpdate({
        set: {
          addons: row.addons,
          category: row.category,
          description: row.description,
          exclusions: row.exclusions,
          imageUrl: row.imageUrl,
          inclusions: row.inclusions,
          isActive: row.isActive,
          name: row.name,
          pricingModel: row.pricingModel,
          serviceType: row.serviceType,
          sortOrder: row.sortOrder,
          tagline: row.tagline,
          variants: row.variants,
        },
        target: services.id,
      });
  }

  console.log(`  ✓ services (${rows.length} production catalog)`);
}

async function seedZone(): Promise<string> {
  const lat = 23.0225;
  const lng = 72.5714;
  const boundary = `SRID=4326;MULTIPOLYGON(((${lng - 0.1} ${lat - 0.1}, ${lng + 0.1} ${lat - 0.1}, ${lng + 0.1} ${lat + 0.1}, ${lng - 0.1} ${lat + 0.1}, ${lng - 0.1} ${lat - 0.1})))`;

  const [existing] = await db
    .select({ id: serviceZones.id })
    .from(serviceZones)
    .where(eq(serviceZones.slug, "ahmedabad-central"))
    .limit(1);

  const zoneId = existing?.id ?? IDS.zoneAhmedabad;

  if (!existing) {
    await db.insert(serviceZones).values({
      boundary,
      centerLat: "23.0225000",
      centerLng: "72.5714000",
      city: "Ahmedabad",
      country: "India",
      id: zoneId,
      name: "Ahmedabad Central",
      priority: 1,
      slug: "ahmedabad-central",
      state: "Gujarat",
      status: "ACTIVE",
      surgeMultiplier: "1.00",
      tier: "STANDARD",
    });
  }

  for (const serviceId of Object.values(IDS.services)) {
    await db
      .insert(serviceZoneServices)
      .values({
        id: uuid(),
        isAvailable: true,
        serviceId,
        zoneId,
      })
      .onConflictDoUpdate({
        set: { isAvailable: true },
        target: [serviceZoneServices.zoneId, serviceZoneServices.serviceId],
      });
  }

  await db
    .insert(zonePriceOverrides)
    .values([
      {
        id: "d1030001-0001-4001-8001-000000000001",
        overridePrice: "149.00",
        serviceId: IDS.services.expressPolish,
        variantId: IDS.variantExpress60,
        zoneId,
      },
      {
        id: "d1030001-0001-4001-8001-000000000002",
        overridePrice: "549.00",
        serviceId: IDS.services.deepCleaning,
        variantId: IDS.variantDeep2Bhk,
        zoneId,
      },
    ])
    .onConflictDoNothing();

  console.log(
    `  ✓ service_zones (Ahmedabad Central${existing ? ", existing" : ""}) + price overrides`,
  );
  return zoneId;
}

async function seedIncentiveConfigs() {
  const rows = [
    {
      effectiveFrom: daysAgo(180),
      id: IDS.incentiveConfigs.default,
      isActive: true,
      percentage: "20.00",
      serviceId: null as string | null,
    },
    {
      effectiveFrom: daysAgo(90),
      id: IDS.incentiveConfigs.quickShine,
      isActive: true,
      percentage: "20.00",
      serviceId: IDS.services.expressPolish,
    },
  ];

  for (const row of rows) {
    await db
      .insert(incentiveConfigs)
      .values(row)
      .onConflictDoUpdate({
        set: {
          effectiveFrom: row.effectiveFrom,
          isActive: row.isActive,
          percentage: row.percentage,
          serviceId: row.serviceId,
        },
        target: incentiveConfigs.id,
      });
  }
  console.log(`  ✓ incentive_configs (${rows.length})`);
}

async function seedCoupons() {
  const rows = [
    {
      code: "WELCOME50",
      description: "50% off first booking",
      discountType: "PERCENTAGE" as const,
      discountValue: "50.00",
      firstBookingOnly: true,
      id: IDS.coupons.welcome50,
      isActive: true,
      key: "welcome50" as const,
      maxDiscountAmount: "200.00",
      minOrderAmount: "299.00",
    },
    {
      code: "FLAT100",
      description: "Flat ₹100 off",
      discountType: "FLAT" as const,
      discountValue: "100.00",
      firstBookingOnly: false,
      id: IDS.coupons.flat100,
      isActive: true,
      key: "flat100" as const,
      minOrderAmount: "499.00",
    },
    {
      code: "PRIYA-REFERRAL-100",
      description: "Referral reward for Priya",
      discountType: "FLAT" as const,
      discountValue: "100.00",
      firstBookingOnly: false,
      id: IDS.coupons.priyaReferral,
      isActive: true,
      issuedToConsumerId: CONSUMER.userId,
      key: "priyaReferral" as const,
      minOrderAmount: "299.00",
      perUserLimit: 1,
      usageLimit: 1,
    },
    {
      code: "MEERA-WELCOME-100",
      description: "Welcome reward for referred consumer Meera",
      discountType: "FLAT" as const,
      discountValue: "100.00",
      firstBookingOnly: true,
      id: IDS.coupons.meeraReferral,
      isActive: true,
      issuedToConsumerId: EXTRA_CONSUMERS[1]!.userId,
      key: "meeraReferral" as const,
      minOrderAmount: "299.00",
      perUserLimit: 1,
      usageLimit: 1,
    },
  ];

  const couponIds: Record<keyof typeof IDS.coupons, string> = {
    ...IDS.coupons,
  };

  for (const row of rows) {
    const { key, ...coupon } = row;
    const [saved] = await db
      .insert(coupons)
      .values(coupon)
      .onConflictDoUpdate({
        set: {
          description: row.description,
          discountValue: row.discountValue,
          isActive: row.isActive,
          minOrderAmount: row.minOrderAmount,
        },
        target: coupons.code,
      })
      .returning({ id: coupons.id });
    couponIds[key] = saved!.id;
  }
  console.log(`  ✓ coupons (${rows.length})`);
  return couponIds;
}

async function seedTimeSlots() {
  const serviceIds = Object.values(IDS.services);
  await db.delete(timeSlots).where(inArray(timeSlots.serviceId, serviceIds));

  const rows: Array<{
    capacity: number;
    endAt: Date;
    id: string;
    isActive: boolean;
    reservedCount: number;
    serviceId: string;
    startAt: Date;
  }> = [];

  const addSlot = (
    serviceId: string,
    startAt: Date,
    durationHours: number,
    capacity: number,
    reservedCount = 0,
  ) => {
    const endAt = new Date(startAt);
    endAt.setHours(endAt.getHours() + durationHours);
    rows.push({
      capacity,
      endAt,
      id: uuid(),
      isActive: true,
      reservedCount,
      serviceId,
      startAt: new Date(startAt),
    });
  };

  const b2cServiceIds = [IDS.services.expressPolish, IDS.services.deepCleaning];
  const corporateWeekdayHours = [6, 12, 18, 20];
  const corporateWeekendHours = [8, 10, 12, 14, 16];
  const b2cHours = [8, 10, 12, 14, 16];

  for (let d = 0; d < CALENDAR_DAYS; d += 1) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const h of b2cHours) {
      const startAt = new Date(day);
      startAt.setHours(h, 0, 0, 0);

      for (const serviceId of b2cServiceIds) {
        addSlot(
          serviceId,
          startAt,
          2,
          8,
          d === 0 && h === 10 ? 2 : 0,
        );
      }
    }

    const corporateHours = isWeekend
      ? corporateWeekendHours
      : corporateWeekdayHours;

    for (const h of corporateHours) {
      const startAt = new Date(day);
      startAt.setHours(h, 0, 0, 0);
      const duration = 2;
      addSlot(IDS.services.corporate, startAt, duration, 4);
    }
  }

  await db.insert(timeSlots).values(rows).onConflictDoNothing();
  const corporateCount = rows.filter(
    (r) => r.serviceId === IDS.services.corporate,
  ).length;
  console.log(
    `  ✓ time_slots (${rows.length} over ${CALENDAR_DAYS} days, ${corporateCount} corporate)`,
  );
}

// ── Consumer account ────────────────────────────────────────────────────────

async function seedConsumer(zoneId: string) {
  const passwordHash = await hashUserPassword(PASSWORD);

  const [existingPhone] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, CONSUMER.phone))
    .limit(1);

  if (existingPhone && existingPhone.id !== CONSUMER.userId) {
    throw new Error(
      `Phone ${CONSUMER.phone} is already used by another account. Run \`make reseed\` for a clean E2E database.`,
    );
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, CONSUMER.email))
    .limit(1);

  if (existingEmail && existingEmail.id !== CONSUMER.userId) {
    throw new Error(
      `Email ${CONSUMER.email} is already used by another account. Run \`make reseed\` for a clean E2E database.`,
    );
  }

  await db
    .insert(users)
    .values({
      email: CONSUMER.email,
      id: CONSUMER.userId,
      isActive: true,
      passwordHash,
      phone: CONSUMER.phone,
    })
    .onConflictDoUpdate({
      set: {
        email: CONSUMER.email,
        isActive: true,
        passwordHash,
        phone: CONSUMER.phone,
      },
      target: users.id,
    });

  await db
    .insert(consumers)
    .values({
      fullName: CONSUMER.fullName,
      id: CONSUMER.userId,
      isActive: true,
      profileImage: null,
      referralCode: CONSUMER.referralCode,
    })
    .onConflictDoUpdate({
      set: {
        fullName: CONSUMER.fullName,
        isActive: true,
        profileImage: null,
        referralCode: CONSUMER.referralCode,
      },
      target: consumers.id,
    });

  await db
    .insert(consumerAddresses)
    .values({
      addressType: "HOME",
      city: "Ahmedabad",
      consumerId: CONSUMER.userId,
      country: "India",
      id: IDS.address,
      isDefault: true,
      isServiceable: true,
      label: "Home",
      latitude: "23.0225000",
      line1: "14, Satellite Road, Near ISKCON Temple",
      longitude: "72.5714000",
      pincode: "380015",
      state: "Gujarat",
      zoneId,
    })
    .onConflictDoUpdate({
      set: {
        city: "Ahmedabad",
        isDefault: true,
        isServiceable: true,
        label: "Home",
        latitude: "23.0225000",
        line1: "14, Satellite Road, Near ISKCON Temple",
        longitude: "72.5714000",
        pincode: "380015",
        state: "Gujarat",
        zoneId,
      },
      target: consumerAddresses.id,
    });

  await db
    .insert(deviceTokens)
    .values({
      deviceToken: `fcm_e2e_consumer_${CONSUMER.userId}`,
      id: uuid(),
      platform: "IOS",
      userId: CONSUMER.userId,
      userType: "CONSUMER",
    })
    .onConflictDoUpdate({
      set: {
        platform: "IOS",
        userId: CONSUMER.userId,
        userType: "CONSUMER",
      },
      target: deviceTokens.deviceToken,
    });

  console.log("  ✓ consumer (Priya Sharma)");
}

async function seedExtraConsumers(zoneId: string) {
  const passwordHash = await hashUserPassword(PASSWORD);

  for (const consumer of EXTRA_CONSUMERS) {
    await db
      .insert(users)
      .values({
        email: consumer.email,
        id: consumer.userId,
        isActive: true,
        passwordHash,
        phone: consumer.phone,
      })
      .onConflictDoUpdate({
        set: {
          email: consumer.email,
          isActive: true,
          passwordHash,
          phone: consumer.phone,
        },
        target: users.id,
      });

    await db
      .insert(consumers)
      .values({
        fullName: consumer.fullName,
        id: consumer.userId,
        isActive: true,
        profileImage: undefined,
        referralCode: consumer.referralCode,
        referrerId: CONSUMER.userId,
      })
      .onConflictDoUpdate({
        set: {
          fullName: consumer.fullName,
          isActive: true,
          profileImage: undefined,
          referralCode: consumer.referralCode,
          referrerId: CONSUMER.userId,
        },
        target: consumers.id,
      });

    const lat = consumer.userId.endsWith("000002") ? "23.0240000" : "23.0210000";
    const lng = consumer.userId.endsWith("000002") ? "72.5740000" : "72.5680000";

    await db
      .insert(consumerAddresses)
      .values({
        addressType: consumer.userId.endsWith("000002") ? "HOME" : "WORK",
        city: "Ahmedabad",
        consumerId: consumer.userId,
        country: "India",
        id: consumer.addressId,
        isDefault: true,
        isServiceable: true,
        label: consumer.userId.endsWith("000002") ? "Home" : "Office",
        latitude: lat,
        line1: consumer.userId.endsWith("000002")
          ? "22, Prahladnagar, Near SG Highway"
          : "5, Ashram Road, Near Law Garden",
        longitude: lng,
        pincode: "380015",
        state: "Gujarat",
        zoneId,
      })
      .onConflictDoUpdate({
        set: {
          isDefault: true,
          isServiceable: true,
          latitude: lat,
          longitude: lng,
          zoneId,
        },
        target: consumerAddresses.id,
      });

    await db
      .insert(deviceTokens)
      .values({
        deviceToken: `fcm_seed_consumer_${consumer.userId}`,
        id: uuid(),
        platform: "ANDROID",
        userId: consumer.userId,
        userType: "CONSUMER",
      })
      .onConflictDoUpdate({
        set: {
          platform: "ANDROID",
          userId: consumer.userId,
          userType: "CONSUMER",
        },
        target: deviceTokens.deviceToken,
      });
  }

  console.log(`  ✓ extra consumers (${EXTRA_CONSUMERS.length})`);
}

// ── Partner account ─────────────────────────────────────────────────────────

async function seedPartner(zoneId: string) {
  const passwordHash = await hashUserPassword(PASSWORD);

  const [existingPhone] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, PARTNER.phone))
    .limit(1);

  if (existingPhone && existingPhone.id !== PARTNER.userId) {
    throw new Error(
      `Phone ${PARTNER.phone} is already used by another account. Run \`make reseed\` for a clean E2E database.`,
    );
  }

  await db
    .insert(users)
    .values({
      email: PARTNER.email,
      id: PARTNER.userId,
      isActive: true,
      passwordHash,
      phone: PARTNER.phone,
    })
    .onConflictDoUpdate({
      set: {
        email: PARTNER.email,
        isActive: true,
        passwordHash,
        phone: PARTNER.phone,
      },
      target: users.id,
    });

  await db
    .insert(partners)
    .values({
      approvalDate: daysAgo(30),
      approvalStatus: "APPROVED",
      avgRating: "4.85",
      baseLocation: "SRID=4326;POINT(72.5714 23.0225)",
      bio: "Professional home cleaner serving Ahmedabad. Specialised in deep cleaning and express polish.",
      dob: new Date("1990-06-15"),
      experienceYears: 6,
      fullName: PARTNER.fullName,
      gender: "male",
      id: PARTNER.userId,
      isAvailable: true,
      isPayrollActive: true,
      kycStatus: "VERIFIED",
      languages: ["Hindi", "English", "Gujarati"],
      monthlySalary: "25000.00",
      profileImage: null,
      salaryEffectiveFrom: daysAgo(90),
      totalReviews: 2,
    })
    .onConflictDoUpdate({
      set: {
        approvalDate: daysAgo(30),
        approvalStatus: "APPROVED",
        avgRating: "4.85",
        baseLocation: "SRID=4326;POINT(72.5714 23.0225)",
        bio: "Professional home cleaner serving Ahmedabad. Specialised in deep cleaning and express polish.",
        experienceYears: 6,
        fullName: PARTNER.fullName,
        isAvailable: true,
        isPayrollActive: true,
        kycStatus: "VERIFIED",
        monthlySalary: "25000.00",
        salaryEffectiveFrom: daysAgo(90),
        totalReviews: 2,
      },
      target: partners.id,
    });

  await db
    .insert(bankDetails)
    .values({
      accountHolderName: PARTNER.fullName,
      accountNumber: "50100234567890",
      bankName: "HDFC Bank",
      id: IDS.bankDetails,
      ifscCode: "HDFC0001234",
      partnerId: PARTNER.userId,
    })
    .onConflictDoUpdate({
      set: {
        accountHolderName: PARTNER.fullName,
        accountNumber: "50100234567890",
        bankName: "HDFC Bank",
        ifscCode: "HDFC0001234",
      },
      target: bankDetails.partnerId,
    });

  const kycRows = [
    {
      documentType: "AADHAAR" as const,
      fileUrl: "https://storage.clenzey.com/kyc/e2e/aadhaar.jpg",
      id: "d1000001-0001-4001-8001-000000000001",
      status: "APPROVED" as const,
    },
    {
      documentType: "PAN" as const,
      fileUrl: "https://storage.clenzey.com/kyc/e2e/pan.jpg",
      id: "d1000001-0001-4001-8001-000000000002",
      status: "APPROVED" as const,
    },
    {
      documentType: "SELFIE" as const,
      fileUrl: "https://storage.clenzey.com/kyc/e2e/selfie.jpg",
      id: "d1000001-0001-4001-8001-000000000003",
      status: "APPROVED" as const,
    },
  ];

  for (const row of kycRows) {
    await db
      .insert(kycDocuments)
      .values({
        ...row,
        partnerId: PARTNER.userId,
        reviewedAt: daysAgo(20),
      })
      .onConflictDoUpdate({
        set: {
          fileUrl: row.fileUrl,
          reviewedAt: daysAgo(20),
          status: row.status,
        },
        target: [kycDocuments.partnerId, kycDocuments.documentType],
      });
  }

  for (const serviceId of Object.values(IDS.services)) {
    await db
      .insert(partnerSkills)
      .values({ id: uuid(), partnerId: PARTNER.userId, serviceId })
      .onConflictDoNothing({
        target: [partnerSkills.partnerId, partnerSkills.serviceId],
      });
  }

  await db
    .insert(partnerZones)
    .values({
      isPrimary: true,
      partnerId: PARTNER.userId,
      zoneId,
    })
    .onConflictDoUpdate({
      set: { isPrimary: true },
      target: [partnerZones.partnerId, partnerZones.zoneId],
    });

  await db
    .insert(deviceTokens)
    .values({
      deviceToken: `fcm_e2e_partner_${PARTNER.userId}`,
      id: uuid(),
      platform: "ANDROID",
      userId: PARTNER.userId,
      userType: "PARTNER",
    })
    .onConflictDoUpdate({
      set: {
        platform: "ANDROID",
        userId: PARTNER.userId,
        userType: "PARTNER",
      },
      target: deviceTokens.deviceToken,
    });

  console.log("  ✓ partner (Amit Sharma)");
}

async function upsertPartnerProfile(
  profile: PartnerSeedProfile,
  zoneId: string,
  opts?: { withKyc?: boolean; withBank?: boolean },
) {
  const passwordHash = await hashUserPassword(PASSWORD);
  const withKyc = opts?.withKyc ?? profile.approvalStatus === "APPROVED";
  const withBank = opts?.withBank ?? profile.approvalStatus === "APPROVED";

  await db
    .insert(users)
    .values({
      email: profile.email,
      id: profile.userId,
      isActive: profile.approvalStatus !== "REJECTED",
      passwordHash,
      phone: profile.phone,
    })
    .onConflictDoUpdate({
      set: {
        email: profile.email,
        isActive: profile.approvalStatus !== "REJECTED",
        passwordHash,
        phone: profile.phone,
      },
      target: users.id,
    });

  await db
    .insert(partners)
    .values({
      approvalDate:
        profile.approvalStatus === "APPROVED" ? daysAgo(45) : null,
      approvalStatus: profile.approvalStatus,
      approvalRejectionReason:
        profile.approvalStatus === "REJECTED"
          ? "Incomplete background verification."
          : null,
      avgRating: profile.avgRating,
      baseLocation: geoPoint(profile.lng, profile.lat),
      bio: `${profile.fullName} — Clenzey partner in Ahmedabad.`,
      dob: new Date("1992-03-20"),
      experienceYears: profile.approvalStatus === "APPROVED" ? 4 : 1,
      fullName: profile.fullName,
      gender: "female",
      id: profile.userId,
      isAvailable: profile.isAvailable,
      isPayrollActive: profile.approvalStatus === "APPROVED",
      kycStatus: profile.kycStatus,
      languages: ["Hindi", "English", "Gujarati"],
      monthlySalary: profile.approvalStatus === "APPROVED" ? "22000.00" : null,
      salaryEffectiveFrom:
        profile.approvalStatus === "APPROVED" ? daysAgo(60) : null,
      totalReviews: profile.totalReviews,
    })
    .onConflictDoUpdate({
      set: {
        approvalDate:
          profile.approvalStatus === "APPROVED" ? daysAgo(45) : null,
        approvalStatus: profile.approvalStatus,
        approvalRejectionReason:
          profile.approvalStatus === "REJECTED"
            ? "Incomplete background verification."
            : null,
        avgRating: profile.avgRating,
        baseLocation: geoPoint(profile.lng, profile.lat),
        fullName: profile.fullName,
        isAvailable: profile.isAvailable,
        isPayrollActive: profile.approvalStatus === "APPROVED",
        kycStatus: profile.kycStatus,
        monthlySalary:
          profile.approvalStatus === "APPROVED" ? "22000.00" : null,
        totalReviews: profile.totalReviews,
      },
      target: partners.id,
    });

  for (const serviceId of profile.serviceIds) {
    await db
      .insert(partnerSkills)
      .values({ id: uuid(), partnerId: profile.userId, serviceId })
      .onConflictDoNothing({
        target: [partnerSkills.partnerId, partnerSkills.serviceId],
      });
  }

  await db
    .insert(partnerZones)
    .values({
      isPrimary: true,
      partnerId: profile.userId,
      zoneId,
    })
    .onConflictDoUpdate({
      set: { isPrimary: true },
      target: [partnerZones.partnerId, partnerZones.zoneId],
    });

  if (withKyc) {
    const kycStatus =
      profile.kycStatus === "VERIFIED"
        ? ("APPROVED" as const)
        : profile.kycStatus === "REJECTED"
          ? ("REJECTED" as const)
          : ("PENDING" as const);

    for (const documentType of ["AADHAAR", "PAN", "SELFIE"] as const) {
      await db
        .insert(kycDocuments)
        .values({
          documentType,
          fileUrl: `https://storage.clenzey.com/kyc/seed/${profile.userId}/${documentType.toLowerCase()}.jpg`,
          id: uuid(),
          partnerId: profile.userId,
          reviewedAt: kycStatus === "APPROVED" ? daysAgo(10) : null,
          status: kycStatus,
        })
        .onConflictDoUpdate({
          set: {
            status: kycStatus,
          },
          target: [kycDocuments.partnerId, kycDocuments.documentType],
        });
    }
  }

  if (withBank) {
    await db
      .insert(bankDetails)
      .values({
        accountHolderName: profile.fullName,
        accountNumber: `50100${profile.userId.slice(-8).replace(/-/g, "")}`,
        bankName: "ICICI Bank",
        id: uuid(),
        ifscCode: "ICIC0001234",
        partnerId: profile.userId,
      })
      .onConflictDoUpdate({
        set: {
          accountHolderName: profile.fullName,
          bankName: "ICICI Bank",
        },
        target: bankDetails.partnerId,
      });
  }

  await db
    .insert(deviceTokens)
    .values({
      deviceToken: `fcm_seed_partner_${profile.userId}`,
      id: uuid(),
      platform: "ANDROID",
      userId: profile.userId,
      userType: "PARTNER",
    })
    .onConflictDoUpdate({
      set: {
        platform: "ANDROID",
        userId: profile.userId,
        userType: "PARTNER",
      },
      target: deviceTokens.deviceToken,
    });
}

async function seedPartnerPool(zoneId: string) {
  for (const profile of DISPATCH_PARTNERS) {
    await upsertPartnerProfile(profile, zoneId);
  }
  for (const profile of ADMIN_QUEUE_PARTNERS) {
    await upsertPartnerProfile(profile, zoneId, {
      withBank: profile.approvalStatus === "APPROVED",
      withKyc: true,
    });
  }

  console.log(
    `  ✓ partner pool (${DISPATCH_PARTNERS.length} dispatch + ${ADMIN_QUEUE_PARTNERS.length} admin-queue)`,
  );
}

async function refreshPartnerScheduling(partnerIds: string[]) {
  for (const partnerId of partnerIds) {
    for (const dayOfWeek of getAllDaysOfWeek()) {
      await db
        .insert(partnerAvailability)
        .values({
          dayOfWeek,
          endHour: 22,
          isActive: true,
          partnerId,
          startHour: 8,
        })
        .onConflictDoNothing({
          target: [
            partnerAvailability.partnerId,
            partnerAvailability.dayOfWeek,
            partnerAvailability.startHour,
          ],
        });
    }
  }

  const locationByPartner = new Map<string, { lat: number; lng: number; online: boolean }>([
    [PARTNER.userId, { lat: 23.023, lng: 72.572, online: true }],
    ...DISPATCH_PARTNERS.map((p) => ({
      key: p.userId,
      value: { lat: p.lat, lng: p.lng, online: p.isOnline },
    })).map(({ key, value }) => [key, value] as const),
    ...ADMIN_QUEUE_PARTNERS.map((p) => ({
      key: p.userId,
      value: { lat: p.lat, lng: p.lng, online: p.isOnline },
    })).map(({ key, value }) => [key, value] as const),
  ]);

  for (const partnerId of partnerIds) {
    const loc = locationByPartner.get(partnerId) ?? {
      lat: 23.0225,
      lng: 72.5714,
      online: false,
    };

    await db
      .insert(partnerLocations)
      .values({
        isOnline: loc.online,
        lastSeenAt: new Date(),
        location: geoPoint(loc.lng, loc.lat),
        partnerId,
      })
      .onConflictDoUpdate({
        set: {
          isOnline: loc.online,
          lastSeenAt: new Date(),
          location: geoPoint(loc.lng, loc.lat),
        },
        target: partnerLocations.partnerId,
      });
  }

  console.log(
    `  ✓ partner availability & locations (${partnerIds.length} partners, all week IST)`,
  );
}

// ── Bookings (re-seeded each run) ─────────────────────────────────────────────

type BookingInsert = typeof bookings.$inferInsert;

/** Stable unique 4-digit codes for seed bookings (active-status unique). */
let seedCheckInCodeSeq = 1000;
const nextSeedCheckInCode = (): string => {
  const code = String(seedCheckInCodeSeq);
  seedCheckInCodeSeq += 1;
  if (seedCheckInCodeSeq > 9999) seedCheckInCodeSeq = 1000;
  return code;
};

const buildCalendarBookings = (): {
  assignments: Array<typeof bookingAssignments.$inferInsert>;
  payments: Array<typeof payments.$inferInsert>;
  rows: BookingInsert[];
} => {
  const neha = DISPATCH_PARTNERS[0]!;
  const ravi = DISPATCH_PARTNERS[1]!;
  const consumerProfiles = [
    {
      addressId: IDS.address,
      fullName: CONSUMER.fullName,
      id: CONSUMER.userId,
      phone: CONSUMER.phone,
    },
    ...EXTRA_CONSUMERS.map((c) => ({
      addressId: c.addressId,
      fullName: c.fullName,
      id: c.userId,
      phone: c.phone,
    })),
  ];

  const rows: BookingInsert[] = [];
  const assignments: Array<typeof bookingAssignments.$inferInsert> = [];
  const paymentRows: Array<typeof payments.$inferInsert> = [];

  const makeScheduledAt = (dayOffset: number, hour: number) => {
    const at = daysFromNow(dayOffset);
    at.setHours(hour, 0, 0, 0);
    return at;
  };

  for (let day = 1; day <= CALENDAR_DAYS; day += 1) {
    const consumer = consumerProfiles[day % consumerProfiles.length]!;
    const scheduledAt = makeScheduledAt(day, day % 2 === 0 ? 10 : 14);
    const serviceMod = day % 3;
    const isDeepClean = serviceMod === 1;
    const isCorporate = serviceMod === 2;
    const basePrice = isCorporate ? "4999.00" : isDeepClean ? "599.00" : "169.00";
    const durationMin = isCorporate ? 240 : isDeepClean ? 180 : 60;
    const serviceId = isCorporate
      ? IDS.services.corporate
      : isDeepClean
        ? IDS.services.deepCleaning
        : IDS.services.expressPolish;
    const serviceName = isCorporate
      ? SERVICE_NAMES.corporate
      : isDeepClean
        ? SERVICE_NAMES.deepCleaning
        : SERVICE_NAMES.expressPolish;
    const variantId = isCorporate
      ? IDS.variantCorporate26_50
      : isDeepClean
        ? IDS.variantDeep2Bhk
        : IDS.variantExpress60;
    const variantLabel = isCorporate
      ? "26–50 Employees"
      : isDeepClean
        ? "2 BHK"
        : "60 mins";
    const scheduledEndAt = new Date(
      scheduledAt.getTime() + durationMin * 60_000,
    );
    const bookingId = uuid();
    const bookingNumber = `${SEED_BOOKING_PREFIX}${String(day).padStart(4, "0")}`;
    const mode = day % 4;

    let status: BookingInsert["status"] = "CONFIRMED";
    let partnerId: string | null = null;
    let partnerAssignedAt: Date | null = null;
    let paymentStatus: BookingInsert["paymentStatus"] = "CAPTURED";

    if (mode === 1) {
      status = "PROFESSIONAL_ASSIGNED";
      partnerId = neha.userId;
      partnerAssignedAt = hoursFromNow(-2);
    } else if (mode === 2) {
      status = "PROFESSIONAL_ASSIGNED";
      partnerId = ravi.userId;
      partnerAssignedAt = hoursFromNow(-1);
    } else if (mode === 3) {
      paymentStatus = "PENDING";
      status = "PAYMENT_PENDING";
    }

    rows.push({
      addonsTotal: "0.00",
      addressId: consumer.addressId,
      addressSnapshot: `${consumer.fullName}'s address, Ahmedabad`,
      basePrice,
      bookingNumber,
      bookingType: "SCHEDULED",
      checkInCode: nextSeedCheckInCode(),
      confirmedAt: paymentStatus === "CAPTURED" ? hoursFromNow(-3) : null,
      consumerId: consumer.id,
      consumerName: consumer.fullName,
      consumerNotes: `Calendar seed booking for day +${day}`,
      consumerPhone: consumer.phone,
      corporateDetails: isCorporate
        ? ({
            cleaningFrequency: day % 2 === 0 ? "WEEKLY" : "ONE_TIME",
            companyName: "ABC Technologies Pvt Ltd",
            contactEmail: "ops@abctech.test",
            contactPerson: consumer.fullName,
            estimatedTeam: 3,
            gstNumber: "24AABCU9603R1ZM",
            schedulePreference:
              day % 4 === 0 ? "WEEKEND" : "BEFORE_OFFICE",
          } satisfies CorporateDetailsJson)
        : null,
      discountAmount: "0.00",
      estimatedDurationMin: durationMin,
      id: bookingId,
      partnerAssignedAt,
      partnerId,
      paymentStatus,
      platformFee: "0.00",
      scheduledAt,
      scheduledEndAt,
      serviceId,
      serviceName,
      status,
      subtotal: basePrice,
      subscriptionPlan: (isCorporate && day % 2 === 0 ? "WEEKLY" : "ONE_TIME") as
        | "ONE_TIME"
        | "WEEKLY",
      surgeAmount: "0.00",
      surgeMultiplier: "1.00",
      taxAmount: "0.00",
      totalAmount: basePrice,
      variantId,
      variantLabel,
    });

    if (partnerId) {
      assignments.push({
        bookingId,
        distanceMeters: 800 + day * 50,
        expiresAt: new Date(),
        id: uuid(),
        partnerId: isCorporate ? neha.userId : partnerId,
        proposedAt: partnerAssignedAt ?? new Date(),
        respondedAt: partnerAssignedAt ?? new Date(),
        status: "ACCEPTED",
      });
    }

    if (paymentStatus === "CAPTURED") {
      paymentRows.push({
        amount: basePrice,
        bookingId,
        capturedAt: hoursFromNow(-3),
        currency: "INR",
        id: uuid(),
        provider: "RAZORPAY",
        razorpayOrderId: `order_seed_${bookingNumber}`,
        razorpayPaymentId: `pay_seed_${bookingNumber}`,
        status: "CAPTURED",
      });
    }
  }

  // Past completed bookings for admin analytics
  for (let day = 1; day <= 5; day += 1) {
    const consumer = consumerProfiles[day % consumerProfiles.length]!;
    const scheduledAt = daysAgo(day);
    scheduledAt.setHours(11, 0, 0, 0);
    const bookingId = uuid();
    const bookingNumber = `${SEED_BOOKING_PREFIX}P${String(day).padStart(3, "0")}`;
    const partnerId = day % 2 === 0 ? neha.userId : ravi.userId;

    rows.push({
      addonsTotal: "0.00",
      addressId: consumer.addressId,
      addressSnapshot: `${consumer.fullName}'s address, Ahmedabad`,
      basePrice: "169.00",
      bookingNumber,
      bookingType: day % 2 === 0 ? "INSTANT" : "SCHEDULED",
      checkInCode: nextSeedCheckInCode(),
      checkInCodeVerifiedAt: daysAgo(day - 1),
      completedAt: daysAgo(day - 1),
      confirmedAt: daysAgo(day),
      consumerId: consumer.id,
      consumerName: consumer.fullName,
      consumerPhone: consumer.phone,
      discountAmount: "0.00",
      estimatedDurationMin: 90,
      id: bookingId,
      partnerAssignedAt: daysAgo(day),
      partnerId,
      paymentStatus: "CAPTURED",
      platformFee: "0.00",
      scheduledAt,
      serviceId: IDS.services.expressPolish,
      serviceName: SERVICE_NAMES.expressPolish,
      startedAt: daysAgo(day - 1),
      status: "COMPLETED",
      subtotal: "169.00",
      surgeAmount: "0.00",
      surgeMultiplier: "1.00",
      taxAmount: "0.00",
      totalAmount: "169.00",
      variantId: IDS.variantExpress60,
      variantLabel: "60 mins",
    });

    assignments.push({
      bookingId,
      distanceMeters: 650,
      expiresAt: daysAgo(day),
      id: uuid(),
      partnerId,
      proposedAt: daysAgo(day),
      respondedAt: daysAgo(day),
      status: "ACCEPTED",
    });

    paymentRows.push({
      amount: "169.00",
      bookingId,
      capturedAt: daysAgo(day),
      currency: "INR",
      id: uuid(),
      provider: "RAZORPAY",
      razorpayOrderId: `order_seed_${bookingNumber}`,
      razorpayPaymentId: `pay_seed_${bookingNumber}`,
      status: "CAPTURED",
    });
  }

  return { assignments, payments: paymentRows, rows };
};

async function clearSeedBookings() {
  const e2eRows = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(like(bookings.bookingNumber, `${BOOKING_PREFIX}%`));

  const seedRows = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(like(bookings.bookingNumber, `${SEED_BOOKING_PREFIX}%`));

  const allIds = [...e2eRows, ...seedRows].map((row) => row.id);
  if (allIds.length === 0) return;

  await db.delete(bookings).where(inArray(bookings.id, allIds));
}

async function seedBookings() {
  await clearSeedBookings();

  const addressSnapshot = "14, Satellite Road, Near ISKCON Temple, Ahmedabad";
  const common = {
    addonsTotal: "79.00",
    addressId: IDS.address,
    addressSnapshot,
    basePrice: "169.00",
    consumerId: CONSUMER.userId,
    consumerName: CONSUMER.fullName,
    consumerNotes: "Please use eco-friendly products. Dog at home — friendly.",
    consumerPhone: CONSUMER.phone,
    discountAmount: "0.00",
    estimatedDurationMin: 90,
    paymentStatus: "CAPTURED" as const,
    platformFee: "0.00",
    serviceId: IDS.services.expressPolish,
    serviceName: SERVICE_NAMES.expressPolish,
    subtotal: "248.00",
    surgeAmount: "0.00",
    surgeMultiplier: "1.00",
    taxAmount: "0.00",
    totalAmount: "248.00",
    variantId: IDS.variantExpress60,
    variantLabel: "60 mins",
  };

  const rows = [
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0001`,
      bookingType: "INSTANT" as const,
      confirmedAt: minutesAgo(45),
      id: IDS.bookings.assigned,
      partnerAssignedAt: minutesAgo(40),
      partnerId: PARTNER.userId,
      scheduledAt: minutesAgo(30),
      status: "PROFESSIONAL_ASSIGNED" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0002`,
      bookingType: "INSTANT" as const,
      confirmedAt: minutesAgo(90),
      enRouteAt: minutesAgo(15),
      id: IDS.bookings.enRoute,
      partnerAssignedAt: minutesAgo(80),
      partnerId: PARTNER.userId,
      scheduledAt: minutesAgo(70),
      status: "PROFESSIONAL_EN_ROUTE" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0003`,
      bookingType: "SCHEDULED" as const,
      checkedInAt: minutesAgo(8),
      confirmedAt: hoursFromNow(-2),
      id: IDS.bookings.checkedIn,
      partnerAssignedAt: hoursFromNow(-1.5),
      partnerId: PARTNER.userId,
      scheduledAt: minutesAgo(10),
      status: "CHECKED_IN" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0004`,
      bookingType: "SCHEDULED" as const,
      checkedInAt: minutesAgo(35),
      confirmedAt: hoursFromNow(-3),
      id: IDS.bookings.inProgress,
      partnerAssignedAt: hoursFromNow(-2.5),
      partnerId: PARTNER.userId,
      scheduledAt: minutesAgo(40),
      startedAt: minutesAgo(20),
      status: "IN_PROGRESS" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0005`,
      bookingType: "INSTANT" as const,
      completedAt: daysAgo(2),
      confirmedAt: daysAgo(2),
      id: IDS.bookings.completedRecent,
      partnerAssignedAt: daysAgo(2),
      partnerId: PARTNER.userId,
      scheduledAt: daysAgo(2),
      startedAt: daysAgo(2),
      status: "COMPLETED" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0006`,
      bookingType: "SCHEDULED" as const,
      completedAt: daysAgo(5),
      confirmedAt: daysAgo(5),
      couponCode: "FLAT100",
      discountAmount: "100.00",
      id: IDS.bookings.completedReviewed,
      partnerAssignedAt: daysAgo(5),
      partnerId: PARTNER.userId,
      scheduledAt: daysAgo(5),
      startedAt: daysAgo(5),
      status: "COMPLETED" as const,
      totalAmount: "148.00",
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0007`,
      bookingType: "SCHEDULED" as const,
      cancellationReason: "Partner unavailable due to vehicle breakdown.",
      cancelledAt: daysAgo(1),
      cancelledById: PARTNER.userId,
      cancelledByType: "PARTNER" as const,
      confirmedAt: daysAgo(1),
      id: IDS.bookings.cancelled,
      partnerAssignedAt: daysAgo(1),
      partnerId: PARTNER.userId,
      scheduledAt: daysAgo(1),
      status: "CANCELLED" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0008`,
      bookingType: "SCHEDULED" as const,
      confirmedAt: daysAgo(3),
      id: IDS.bookings.noShow,
      partnerAssignedAt: daysAgo(3),
      partnerId: PARTNER.userId,
      scheduledAt: daysAgo(3),
      status: "NO_SHOW" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0009`,
      bookingType: "SCHEDULED" as const,
      confirmedAt: new Date(),
      id: IDS.bookings.scheduled,
      partnerAssignedAt: new Date(),
      partnerId: PARTNER.userId,
      scheduledAt: hoursFromNow(26),
      status: "PROFESSIONAL_ASSIGNED" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0010`,
      bookingType: "INSTANT" as const,
      completedAt: daysAgo(4),
      confirmedAt: daysAgo(4),
      id: IDS.bookings.completedDispute,
      partnerAssignedAt: daysAgo(4),
      partnerId: PARTNER.userId,
      scheduledAt: daysAgo(4),
      startedAt: daysAgo(4),
      status: "COMPLETED" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0011`,
      bookingType: "INSTANT" as const,
      completedAt: daysAgo(1),
      confirmedAt: daysAgo(1),
      id: IDS.bookings.completedReviewPending,
      partnerAssignedAt: daysAgo(1),
      partnerId: PARTNER.userId,
      scheduledAt: daysAgo(1),
      startedAt: daysAgo(1),
      status: "COMPLETED" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0012`,
      bookingType: "SCHEDULED" as const,
      confirmedAt: hoursFromNow(-1),
      id: IDS.bookings.confirmedUnassigned,
      partnerId: null,
      scheduledAt: hoursFromNow(12),
      status: "CONFIRMED" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0013`,
      bookingType: "INSTANT" as const,
      confirmedAt: minutesAgo(2),
      id: IDS.bookings.instantDispatchReady,
      partnerId: null,
      scheduledAt: minutesAgo(1),
      status: "CONFIRMED" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0014`,
      bookingType: "INSTANT" as const,
      id: IDS.bookings.paymentPending,
      paymentStatus: "PENDING" as const,
      scheduledAt: new Date(),
      status: "PAYMENT_PENDING" as const,
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0015`,
      bookingType: "INSTANT" as const,
      id: IDS.bookings.pending,
      paymentStatus: "PENDING" as const,
      scheduledAt: new Date(),
      status: "PENDING" as const,
      totalAmount: "248.00",
    },
    {
      addonsTotal: "899.00",
      addressId: EXTRA_CONSUMERS[1]!.addressId,
      addressSnapshot: "5, Ashram Road, Near Law Garden, Ahmedabad",
      basePrice: "4999.00",
      bookingNumber: `${BOOKING_PREFIX}0016`,
      bookingType: "SCHEDULED" as const,
      confirmedAt: hoursFromNow(-4),
      consumerId: EXTRA_CONSUMERS[1]!.userId,
      consumerName: EXTRA_CONSUMERS[1]!.fullName,
      consumerNotes: "Please call security before arrival.",
      consumerPhone: EXTRA_CONSUMERS[1]!.phone,
      corporateDetails: {
        cleaningFrequency: "WEEKLY",
        companyName: "Desai Consulting LLP",
        contactEmail: "meera.consumer@clenzey.test",
        contactPerson: EXTRA_CONSUMERS[1]!.fullName,
        estimatedTeam: 3,
        gstNumber: "24AAACD1234F1Z5",
        schedulePreference: "BEFORE_OFFICE",
      } satisfies CorporateDetailsJson,
      discountAmount: "0.00",
      estimatedDurationMin: 240,
      id: IDS.bookings.corporateScheduled,
      partnerAssignedAt: hoursFromNow(-3),
      partnerId: DISPATCH_PARTNERS[0]!.userId,
      paymentStatus: "CAPTURED" as const,
      platformFee: "0.00",
      scheduledAt: hoursFromNow(30),
      scheduledEndAt: hoursFromNow(34),
      serviceId: IDS.services.corporate,
      serviceName: SERVICE_NAMES.corporate,
      status: "PROFESSIONAL_ASSIGNED" as const,
      subscriptionPlan: "WEEKLY" as const,
      subtotal: "5898.00",
      surgeAmount: "0.00",
      surgeMultiplier: "1.00",
      taxAmount: "0.00",
      totalAmount: "5898.00",
      variantId: IDS.variantCorporate26_50,
      variantLabel: "26–50 Employees",
    },
    {
      ...common,
      bookingNumber: `${BOOKING_PREFIX}0017`,
      bookingType: "SCHEDULED" as const,
      cancellationReason: "Refund approved after a verified service-quality issue.",
      cancelledAt: daysAgo(6),
      cancelledById: ADMIN.id,
      cancelledByType: "ADMIN" as const,
      completedAt: daysAgo(7),
      confirmedAt: daysAgo(7),
      id: IDS.bookings.refunded,
      partnerAssignedAt: daysAgo(7),
      partnerId: PARTNER.userId,
      paymentStatus: "REFUNDED" as const,
      scheduledAt: daysAgo(7),
      startedAt: daysAgo(7),
      status: "REFUNDED" as const,
    },
  ];

  const calendar = buildCalendarBookings();
  seedCheckInCodeSeq = 1000;
  const allRows: BookingInsert[] = [...rows, ...calendar.rows].map((row) => {
    const record = row as BookingInsert;
    const needsVerified =
      record.status === "CHECKED_IN" ||
      record.status === "IN_PROGRESS" ||
      record.status === "COMPLETED" ||
      record.status === "REFUNDED";
    return {
      ...record,
      checkInCode: nextSeedCheckInCode(),
      ...(needsVerified
        ? {
            checkInCodeVerifiedAt:
              record.checkInCodeVerifiedAt ??
              record.startedAt ??
              record.checkedInAt ??
              record.completedAt ??
              new Date(),
          }
        : {}),
    };
  });

  await db.insert(bookings).values(allRows);

  await db.insert(bookingAddons).values([
    {
      bookingId: IDS.bookings.assigned,
      id: uuid(),
      name: "Extra 30 Minutes",
      price: "79.00",
      quantity: 1,
    },
    {
      bookingId: IDS.bookings.inProgress,
      id: uuid(),
      name: "Balcony cleaning",
      price: "99.00",
      quantity: 1,
    },
  ]);

  await db.insert(bookingStatusHistory).values([
    {
      actorId: PARTNER.userId,
      actorType: "PARTNER",
      bookingId: IDS.bookings.enRoute,
      fromStatus: "PROFESSIONAL_ASSIGNED",
      id: uuid(),
      toStatus: "PROFESSIONAL_EN_ROUTE",
    },
    {
      actorId: PARTNER.userId,
      actorType: "PARTNER",
      bookingId: IDS.bookings.checkedIn,
      fromStatus: "PROFESSIONAL_EN_ROUTE",
      id: uuid(),
      toStatus: "CHECKED_IN",
    },
    {
      actorId: PARTNER.userId,
      actorType: "PARTNER",
      bookingId: IDS.bookings.inProgress,
      fromStatus: "CHECKED_IN",
      id: uuid(),
      toStatus: "IN_PROGRESS",
    },
    {
      actorId: PARTNER.userId,
      actorType: "PARTNER",
      bookingId: IDS.bookings.completedRecent,
      fromStatus: "IN_PROGRESS",
      id: uuid(),
      toStatus: "COMPLETED",
    },
  ]);

  await db.insert(bookingPhotos).values([
    {
      bookingId: IDS.bookings.inProgress,
      fileUrl: "https://storage.clenzey.com/bookings/e2e/before-1.jpg",
      id: uuid(),
      type: "BEFORE",
      uploadedBy: PARTNER.userId,
    },
    {
      bookingId: IDS.bookings.completedRecent,
      fileUrl: "https://storage.clenzey.com/bookings/e2e/before-2.jpg",
      id: uuid(),
      type: "BEFORE",
      uploadedBy: PARTNER.userId,
    },
    {
      bookingId: IDS.bookings.completedRecent,
      fileUrl: "https://storage.clenzey.com/bookings/e2e/after-2.jpg",
      id: uuid(),
      type: "AFTER",
      uploadedBy: PARTNER.userId,
    },
  ]);

  const paidBookingIds = [
    IDS.bookings.completedRecent,
    IDS.bookings.completedReviewed,
    IDS.bookings.completedDispute,
    IDS.bookings.completedReviewPending,
    IDS.bookings.inProgress,
    IDS.bookings.enRoute,
    IDS.bookings.assigned,
    IDS.bookings.checkedIn,
    IDS.bookings.scheduled,
    IDS.bookings.confirmedUnassigned,
    IDS.bookings.instantDispatchReady,
    IDS.bookings.corporateScheduled,
  ];

  await db.insert(payments).values([
    ...paidBookingIds.map((bookingId, index) => ({
      amount:
        bookingId === IDS.bookings.corporateScheduled
          ? "5898.00"
          : bookingId === IDS.bookings.completedReviewed
            ? "148.00"
            : "248.00",
      bookingId,
      capturedAt: daysAgo(index),
      currency: "INR",
      id: uuid(),
      provider: "RAZORPAY",
      razorpayOrderId: `order_e2e_${index + 1}`,
      razorpayPaymentId: `pay_e2e_${index + 1}`,
      status: "CAPTURED" as const,
    })),
    ...calendar.payments,
    {
      amount: "248.00",
      bookingId: IDS.bookings.refunded,
      capturedAt: daysAgo(7),
      currency: "INR",
      id: IDS.payments.refunded,
      provider: "RAZORPAY",
      razorpayOrderId: "order_e2e_refunded",
      razorpayPaymentId: "pay_e2e_refunded",
      status: "REFUNDED" as const,
    },
  ]);

  const e2eAssignments = [
    IDS.bookings.assigned,
    IDS.bookings.enRoute,
    IDS.bookings.checkedIn,
    IDS.bookings.inProgress,
    IDS.bookings.scheduled,
    IDS.bookings.corporateScheduled,
  ].map((bookingId) => ({
    bookingId,
    distanceMeters: 420,
    expiresAt: new Date(),
    id: uuid(),
    partnerId: PARTNER.userId,
    proposedAt: minutesAgo(50),
    respondedAt: minutesAgo(45),
    status: "ACCEPTED" as const,
  }));

  await db.insert(bookingAssignments).values([
    ...e2eAssignments,
    ...calendar.assignments,
  ]);

  await db.insert(reviews).values([
    {
      bookingId: IDS.bookings.completedRecent,
      consumerId: CONSUMER.userId,
      id: IDS.incentiveReview,
      partnerId: PARTNER.userId,
      rating: 5,
      review: "Amit did an excellent job. Apartment looks brand new!",
    },
    {
      bookingId: IDS.bookings.completedReviewed,
      consumerId: CONSUMER.userId,
      id: IDS.reviewFourStar,
      partnerId: PARTNER.userId,
      rating: 4,
      review: "Very thorough cleaning. Arrived on time.",
    },
  ]);

  await db.insert(disputes).values([
    {
      bookingId: IDS.bookings.completedDispute,
      category: "PRICING",
      description: "Consumer disputed addon charge after service completion.",
      id: IDS.disputes.partnerReview,
      raisedById: PARTNER.userId,
      raisedByType: "PARTNER",
      status: "UNDER_REVIEW",
    },
    {
      bookingId: IDS.bookings.completedReviewed,
      category: "SERVICE_QUALITY",
      description: "Consumer claimed bathroom tiles were missed.",
      id: IDS.disputes.consumerOpen,
      raisedById: CONSUMER.userId,
      raisedByType: "CONSUMER",
      status: "OPEN",
    },
    {
      bookingId: IDS.bookings.refunded,
      category: "SERVICE_QUALITY",
      description: "Before/after evidence confirmed an incomplete service.",
      id: IDS.disputes.resolved,
      raisedById: CONSUMER.userId,
      raisedByType: "CONSUMER",
      resolutionNotes: "Full refund approved after support reviewed the evidence.",
      resolvedAt: daysAgo(6),
      resolvedBy: ADMIN.id,
      status: "RESOLVED",
    },
  ]);

  await linkScheduledBookingsToSlots();

  console.log(
    `  ✓ bookings (${allRows.length}: ${rows.length} E2E lifecycle + ${calendar.rows.length} calendar)`,
  );
}

async function linkScheduledBookingsToSlots() {
  const links = [
    {
      bookingId: IDS.bookings.scheduled,
      serviceId: IDS.services.expressPolish,
    },
    {
      bookingId: IDS.bookings.confirmedUnassigned,
      serviceId: IDS.services.expressPolish,
    },
    {
      bookingId: IDS.bookings.corporateScheduled,
      serviceId: IDS.services.corporate,
    },
  ];

  for (const link of links) {
    const [slot] = await db
      .select({
        endAt: timeSlots.endAt,
        id: timeSlots.id,
        startAt: timeSlots.startAt,
      })
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.serviceId, link.serviceId),
          eq(timeSlots.isActive, true),
          gt(timeSlots.startAt, new Date()),
        ),
      )
      .orderBy(timeSlots.startAt)
      .limit(1);

    if (!slot) continue;

    await db
      .update(bookings)
      .set({
        scheduledAt: slot.startAt,
        scheduledEndAt: slot.endAt,
        timeSlotId: slot.id,
      })
      .where(eq(bookings.id, link.bookingId));
  }
}

// ── Cross-feature operational records for the three primary personas ──────────

async function seedOperationalRecords(
  couponIds: Record<keyof typeof IDS.coupons, string>,
) {
  await db.insert(bookingEta).values([
    {
      bookingId: IDS.bookings.assigned,
      distanceKm: "2.40",
      etaMinutes: 12,
      lastPartnerLat: "23.0230000",
      lastPartnerLng: "72.5720000",
    },
    {
      bookingId: IDS.bookings.enRoute,
      distanceKm: "0.80",
      etaMinutes: 5,
      lastPartnerLat: "23.0228000",
      lastPartnerLng: "72.5718000",
    },
  ]);

  await db.insert(contactLogs).values([
    {
      bookingId: IDS.bookings.assigned,
      consumerId: CONSUMER.userId,
      id: "f1030001-0001-4001-8001-000000000001",
      partnerId: PARTNER.userId,
      requestedBy: CONSUMER.userId,
      requestedByType: "CONSUMER",
      timestamp: minutesAgo(35),
    },
    {
      bookingId: IDS.bookings.enRoute,
      consumerId: CONSUMER.userId,
      id: "f1030001-0001-4001-8001-000000000002",
      partnerId: PARTNER.userId,
      requestedBy: PARTNER.userId,
      requestedByType: "PARTNER",
      timestamp: minutesAgo(10),
    },
  ]);

  await db.insert(maskedCallSessions).values([
    {
      bookingId: IDS.bookings.assigned,
      expiresAt: hoursFromNow(2),
      id: "f1040001-0001-4001-8001-000000000001",
      status: "ACTIVE",
      twilioProxySessionSid: "KS_E2E_ACTIVE_0001",
      virtualNumber: "+919000009001",
    },
    {
      bookingId: IDS.bookings.completedRecent,
      expiresAt: daysAgo(1),
      id: "f1040001-0001-4001-8001-000000000002",
      status: "CLOSED",
      twilioProxySessionSid: "KS_E2E_CLOSED_0002",
      virtualNumber: "+919000009002",
    },
  ]);

  await db.insert(disputeEvidence).values([
    {
      disputeId: IDS.disputes.consumerOpen,
      fileUrl: "https://storage.clenzey.com/disputes/e2e/missed-bathroom.jpg",
      id: "f1050001-0001-4001-8001-000000000001",
      uploadedById: CONSUMER.userId,
    },
    {
      disputeId: IDS.disputes.resolved,
      fileUrl: "https://storage.clenzey.com/disputes/e2e/before-service.jpg",
      id: "f1050001-0001-4001-8001-000000000002",
      uploadedById: PARTNER.userId,
    },
    {
      disputeId: IDS.disputes.resolved,
      fileUrl: "https://storage.clenzey.com/disputes/e2e/after-service.jpg",
      id: "f1050001-0001-4001-8001-000000000003",
      uploadedById: CONSUMER.userId,
    },
  ]);

  await db.insert(payments).values([
    {
      amount: "248.00",
      bookingId: IDS.bookings.paymentPending,
      currency: "INR",
      id: IDS.payments.authorized,
      provider: "RAZORPAY",
      razorpayOrderId: "order_e2e_authorized",
      status: "AUTHORIZED",
    },
    {
      amount: "248.00",
      bookingId: IDS.bookings.pending,
      currency: "INR",
      id: IDS.payments.pending,
      provider: "RAZORPAY",
      razorpayOrderId: "order_e2e_pending",
      status: "PENDING",
    },
  ]);

  const paymentEventRows = [
    {
      eventType: "payment.authorized",
      id: "f1060001-0001-4001-8001-000000000001",
      paymentId: IDS.payments.authorized,
      payload: { amount: 24800, currency: "INR", status: "authorized" },
      providerEventId: "evt_e2e_payment_authorized",
    },
    {
      eventType: "payment.captured",
      id: "f1060001-0001-4001-8001-000000000002",
      paymentId: IDS.payments.refunded,
      payload: { amount: 24800, currency: "INR", status: "captured" },
      providerEventId: "evt_e2e_payment_captured",
    },
    {
      eventType: "refund.processed",
      id: "f1060001-0001-4001-8001-000000000003",
      paymentId: IDS.payments.refunded,
      payload: { amount: 24800, refundId: "rfnd_e2e_0001", status: "processed" },
      providerEventId: "evt_e2e_refund_processed",
    },
  ];

  for (const event of paymentEventRows) {
    await db
      .insert(paymentEvents)
      .values(event)
      .onConflictDoUpdate({
        set: { paymentId: event.paymentId, payload: event.payload },
        target: paymentEvents.providerEventId,
      });
  }

  await db.insert(refunds).values({
    amount: "248.00",
    bookingId: IDS.bookings.refunded,
    id: "f1070001-0001-4001-8001-000000000001",
    initiatedBy: ADMIN.id,
    paymentId: IDS.payments.refunded,
    razorpayRefundId: "rfnd_e2e_0001",
    reason: "Service-quality dispute resolved in the consumer's favour.",
    status: "PROCESSED",
  });

  await db.insert(bookingAssignments).values([
    {
      bookingId: IDS.bookings.instantDispatchReady,
      distanceMeters: 700,
      expiresAt: minutesAgo(1),
      id: "f1080001-0001-4001-8001-000000000001",
      partnerId: DISPATCH_PARTNERS[1]!.userId,
      proposedAt: minutesAgo(8),
      respondedAt: minutesAgo(7),
      status: "DECLINED",
      declineReason: "Finishing another job",
    },
    {
      bookingId: IDS.bookings.instantDispatchReady,
      distanceMeters: 900,
      expiresAt: minutesAgo(2),
      id: "f1080001-0001-4001-8001-000000000002",
      partnerId: DISPATCH_PARTNERS[2]!.userId,
      proposedAt: minutesAgo(6),
      status: "EXPIRED",
    },
    {
      bookingId: IDS.bookings.instantDispatchReady,
      distanceMeters: 450,
      expiresAt: hoursFromNow(1),
      id: "f1080001-0001-4001-8001-000000000003",
      partnerId: DISPATCH_PARTNERS[0]!.userId,
      proposedAt: minutesAgo(2),
      status: "PROPOSED",
    },
  ]);

  const referralRows = [
    {
      id: "f1090001-0001-4001-8001-000000000001",
      refereeCouponId: couponIds.meeraReferral,
      refereeId: EXTRA_CONSUMERS[1]!.userId,
      referralCode: CONSUMER.referralCode,
      referrerCouponId: couponIds.priyaReferral,
      referrerId: CONSUMER.userId,
    },
    {
      id: "f1090001-0001-4001-8001-000000000002",
      refereeCouponId: null,
      refereeId: EXTRA_CONSUMERS[0]!.userId,
      referralCode: CONSUMER.referralCode,
      referrerCouponId: couponIds.priyaReferral,
      referrerId: CONSUMER.userId,
    },
  ];

  for (const referral of referralRows) {
    await db
      .insert(referrals)
      .values(referral)
      .onConflictDoUpdate({
        set: {
          refereeCouponId: referral.refereeCouponId,
          referralCode: referral.referralCode,
          referrerCouponId: referral.referrerCouponId,
          referrerId: referral.referrerId,
        },
        target: referrals.refereeId,
      });
  }

  await db
    .insert(couponRedemptions)
    .values({
      bookingId: IDS.bookings.completedReviewed,
      consumerId: CONSUMER.userId,
      couponId: couponIds.flat100,
      discountAmount: "100.00",
      id: "f1100001-0001-4001-8001-000000000001",
    })
    .onConflictDoUpdate({
      set: {
        bookingId: IDS.bookings.completedReviewed,
        couponId: couponIds.flat100,
        discountAmount: "100.00",
      },
      target: couponRedemptions.id,
    });

  const secretRows = [
    {
      consumedAt: daysAgo(2),
      expiresAt: daysAgo(2),
      id: "f1110001-0001-4001-8001-000000000001",
      isUsed: true,
      phone: CONSUMER.phone,
      token: "seed-consumed-consumer-token",
      userType: "CONSUMER" as const,
    },
    {
      consumedAt: null,
      expiresAt: daysAgo(1),
      id: "f1110001-0001-4001-8001-000000000002",
      isUsed: false,
      phone: PARTNER.phone,
      token: "seed-expired-partner-token",
      userType: "PARTNER" as const,
    },
  ];

  for (const secret of secretRows) {
    await db
      .insert(secrets)
      .values(secret)
      .onConflictDoUpdate({
        set: {
          consumedAt: secret.consumedAt,
          expiresAt: secret.expiresAt,
          isUsed: secret.isUsed,
        },
        target: secrets.token,
      });
  }

  console.log(
    "  ✓ ETA, contacts, masked calls, evidence, payment events, refund, referrals & redemptions",
  );
}

// ── Payroll & payouts (salary + incentive model) ────────────────────────────

async function seedPayrollAndPayouts(adminId: string) {
  await db
    .delete(partnerLedgerEntries)
    .where(eq(partnerLedgerEntries.partnerId, PARTNER.userId));
  await db.delete(payouts).where(eq(payouts.partnerId, PARTNER.userId));
  await db
    .delete(partnerPayrollRuns)
    .where(eq(partnerPayrollRuns.partnerId, PARTNER.userId));
  await db
    .delete(partnerMonthlyAttendance)
    .where(eq(partnerMonthlyAttendance.partnerId, PARTNER.userId));

  await db.insert(partnerMonthlyAttendance).values({
    absentDays: 2,
    id: uuid(),
    month: 5,
    partnerId: PARTNER.userId,
    source: "ADMIN",
    year: 2026,
  });

  await db.insert(partnerPayrollRuns).values({
    absentDays: 2,
    baseSalary: "25000.00",
    deductionAmount: "1612.90",
    id: IDS.payrollRun,
    netSalary: "23387.10",
    partnerId: PARTNER.userId,
    payrollPeriod: "2026-05",
    processedAt: daysAgo(25),
    status: "PROCESSED",
  });

  await db.insert(partnerLedgerEntries).values([
    {
      amount: "25000.00",
      description: "Monthly salary for 2026-05",
      earningDate: daysAgo(25),
      id: IDS.salaryLedger,
      metadata: { absentDays: 2, baseSalary: 25000 },
      partnerId: PARTNER.userId,
      payrollPeriod: "2026-05",
      type: "SALARY",
    },
    {
      amount: "1612.90",
      description: "Absent day deduction for 2026-05",
      earningDate: daysAgo(25),
      id: IDS.deductionLedger,
      metadata: { absentDays: 2, baseSalary: 25000 },
      partnerId: PARTNER.userId,
      payrollPeriod: "2026-05",
      type: "SALARY_DEDUCTION",
    },
    {
      amount: "119.60",
      bookingId: IDS.bookings.completedRecent,
      description: "5-star review incentive",
      earningDate: daysAgo(2),
      id: IDS.incentiveLedger,
      metadata: { incentivePct: 20, subtotal: 248 },
      partnerId: PARTNER.userId,
      reviewId: IDS.incentiveReview,
      type: "INCENTIVE",
    },
  ]);

  await db.insert(payouts).values([
    {
      amount: "15000.00",
      breakdown: { deductions: 1612.9, incentives: 119.6, salary: 25000 },
      id: uuid(),
      initiatedBy: adminId,
      notes: "May 2026 salary payout (partial)",
      paidAt: daysAgo(7),
      partnerId: PARTNER.userId,
      periodEnd: daysAgo(7),
      periodStart: daysAgo(37),
      status: "PAID",
    },
    {
      amount: "8506.70",
      breakdown: { deductions: 0, incentives: 119.6, salary: 8387.1 },
      id: uuid(),
      initiatedBy: adminId,
      notes: "Pending balance payout",
      partnerId: PARTNER.userId,
      periodEnd: new Date(),
      periodStart: daysAgo(7),
      status: "PROCESSING",
    },
  ]);

  console.log("  ✓ payroll, ledger entries & payouts");
}

async function seedQuotationRequests() {
  await db
    .insert(quotationRequests)
    .values({
      address: "5, Ashram Road, Near Law Garden, Ahmedabad, 380009",
      consumerId: EXTRA_CONSUMERS[1]!.userId,
      id: IDS.quotationEnterprise,
      name: EXTRA_CONSUMERS[1]!.fullName,
      notes: "100+ employees — open floor plan, needs custom scope.",
      phone: EXTRA_CONSUMERS[1]!.phone,
      preferredTime: hoursFromNow(72),
      serviceId: IDS.services.corporate,
      status: "PENDING",
      variantId: "e1010004-0001-4001-8001-000000000005",
    })
    .onConflictDoUpdate({
      set: {
        notes: "100+ employees — open floor plan, needs custom scope.",
        status: "PENDING",
      },
      target: quotationRequests.id,
    });

  console.log("  ✓ quotation_requests (enterprise corporate)");
}

async function seedNotifications() {
  const recipientIds = [
    ADMIN.id,
    CONSUMER.userId,
    PARTNER.userId,
    ...EXTRA_CONSUMERS.map((c) => c.userId),
    ...DISPATCH_PARTNERS.map((p) => p.userId),
  ];

  await db
    .delete(notifications)
    .where(inArray(notifications.recipientId, recipientIds));

  await db.insert(notifications).values([
    {
      body: "Your booking BK-E2E-0001 has been confirmed.",
      channel: "PUSH",
      id: uuid(),
      metadata: { bookingId: IDS.bookings.assigned, type: "BOOKING_CONFIRMED" },
      recipientId: CONSUMER.userId,
      recipientType: "CONSUMER",
      title: "Booking confirmed",
    },
    {
      body: "Rate your recent cleaning service.",
      channel: "IN_APP",
      id: uuid(),
      metadata: { bookingId: IDS.bookings.completedReviewPending, type: "REVIEW_REQUEST" },
      recipientId: CONSUMER.userId,
      recipientType: "CONSUMER",
      title: "How was your service?",
    },
    {
      body: "You have been assigned booking BK-E2E-0001.",
      channel: "PUSH",
      id: uuid(),
      metadata: { bookingId: IDS.bookings.assigned, type: "PARTNER_AUTO_ASSIGNED" },
      recipientId: PARTNER.userId,
      recipientType: "PARTNER",
      title: "New job assigned",
    },
    {
      body: "Booking BK-E2E-0009 is scheduled for tomorrow.",
      channel: "IN_APP",
      id: uuid(),
      metadata: { bookingId: IDS.bookings.scheduled, type: "BOOKING_REMINDER" },
      recipientId: PARTNER.userId,
      recipientType: "PARTNER",
      title: "Upcoming booking",
    },
    {
      body: "Your May salary payout of ₹15,000 has been processed.",
      channel: "IN_APP",
      id: uuid(),
      metadata: { type: "PAYOUT_PAID" },
      recipientId: PARTNER.userId,
      recipientType: "PARTNER",
      title: "Payout processed",
    },
    {
      body: "You earned ₹119.60 incentive for a 5-star review!",
      channel: "IN_APP",
      id: uuid(),
      metadata: { ledgerEntryId: IDS.incentiveLedger, type: "INCENTIVE_CREDITED" },
      recipientId: PARTNER.userId,
      recipientType: "PARTNER",
      title: "Review incentive credited",
    },
    {
      body: "You are online and eligible for instant bookings.",
      channel: "IN_APP",
      id: uuid(),
      metadata: { type: "PARTNER_ONLINE" },
      recipientId: DISPATCH_PARTNERS[0]!.userId,
      recipientType: "PARTNER",
      title: "Ready for jobs",
    },
    {
      body: "New partner application pending review.",
      channel: "IN_APP",
      id: uuid(),
      metadata: { partnerId: ADMIN_QUEUE_PARTNERS[0]!.userId, type: "PARTNER_PENDING" },
      recipientId: ADMIN.id,
      recipientType: "ADMIN",
      title: "Partner approval required",
    },
    {
      body: "A ₹248 refund was processed after dispute resolution.",
      channel: "EMAIL",
      id: uuid(),
      metadata: { bookingId: IDS.bookings.refunded, type: "REFUND_PROCESSED" },
      recipientId: CONSUMER.userId,
      recipientType: "CONSUMER",
      title: "Refund processed",
    },
  ]);

  console.log(`  ✓ notifications (${recipientIds.length} recipients)`);
}

function printCredentials() {
  console.log("\n  ── Consumer app (primary) ──");
  console.log(`    Name:     ${CONSUMER.fullName}`);
  console.log(`    Phone:    ${CONSUMER.phone}  (OTP login)`);
  console.log(`    Email:    ${CONSUMER.email}`);
  console.log(`    Password: ${PASSWORD}`);
  console.log("\n  ── Partner app (primary — busy on active E2E jobs) ──");
  console.log(`    Name:     ${PARTNER.fullName}`);
  console.log(`    Phone:    ${PARTNER.phone}  (OTP login)`);
  console.log(`    Email:    ${PARTNER.email}`);
  console.log(`    Password: ${PASSWORD}`);
  console.log("    Mobile:   send header X-Client-Platform: ios");
  console.log("\n  ── Dispatch pool (auto-assignment) ──");
  for (const p of DISPATCH_PARTNERS.filter((x) => x.isOnline)) {
    console.log(`    ${p.fullName.padEnd(14)} ${p.phone}  online`);
  }
  console.log("\n  ── Admin ──");
  console.log(`    Username: ${ADMIN.username}  Password: ${ADMIN_PASSWORD}`);
  for (const a of EXTRA_ADMINS) {
    console.log(`    Username: ${a.username.padEnd(14)} (${a.role})  Password: ${ADMIN_PASSWORD}`);
  }
  console.log(`\n  E2E bookings:   ${BOOKING_PREFIX}0001–0017 (full lifecycle + corporate)`);
  console.log(`  Calendar:       ${SEED_BOOKING_PREFIX}0001–${String(CALENDAR_DAYS).padStart(4, "0")} (next ${CALENDAR_DAYS} days)`);
  console.log("  Review pending: BK-E2E-0011 — submit 5★ to test incentive");
  console.log("  Dispatch test:  BK-E2E-0013 — instant CONFIRMED, unassigned");
  console.log("  Admin queue:    Kiran Joshi (+919998887770) — pending approval\n");
}

async function main() {
  console.log("\n🌱 Seeding E2E database…\n");

  try {
    const adminId = await seedAdmin();
    await seedExtraAdmins();
    await seedServices();
    const zoneId = await seedZone();
    await seedIncentiveConfigs();
    await seedTimeSlots();
    await seedConsumer(zoneId);
    await seedExtraConsumers(zoneId);
    const couponIds = await seedCoupons();
    await seedPartner(zoneId);
    await seedPartnerPool(zoneId);
    await refreshPartnerScheduling(getAllPartnerIds());
    await seedBookings();
    await seedOperationalRecords(couponIds);
    await seedQuotationRequests();
    await seedPayrollAndPayouts(adminId);
    await seedNotifications();

    console.log("\n✅ Seed complete!");
    printCredentials();
  } catch (err) {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
