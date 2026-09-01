import { HttpStatusCode } from "axios";
import { and, desc, eq, gt, ilike, or, sql } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  admins,
  bookings,
  consumers,
  partners,
  secrets,
  users,
} from "../../../db/schema.ts";
import { type approvalStatusEnum } from "../../../db/schema/enums.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type AdminUser = typeof admins.$inferSelect;

type SecretRecord = typeof secrets.$inferSelect;
type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number];

export type AdminConsumer = {
  id: string;
  fullName: null | string;
  phone: string;
  isActive: boolean;
  referralCode: string;
  totalBookings: number;
  totalSpend: string;
  createdAt: Date;
};

export type AdminPartner = {
  id: string;
  fullName: null | string;
  phone: string;
  approvalStatus: ApprovalStatus;
  approvalDate: Date | null;
  approvalRejectionReason: null | string;
  isAvailable: boolean;
  experienceYears: null | number;
  bio: null | string;
  languages: string[];
  profileImage: null | string;
  rating: number;
  totalBookings: number;
  monthlySalary: number | null;
  isPayrollActive: boolean;
  salaryEffectiveFrom: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const findActiveSecret = async (
  phone: string,
): Promise<null | SecretRecord> => {
  const [secret] = await db
    .select()
    .from(secrets)
    .where(
      and(
        eq(secrets.phone, phone),
        eq(secrets.userType, "ADMIN"),
        eq(secrets.isUsed, false),
        gt(secrets.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return secret ?? null;
};

export const findSecretByToken = async (
  token: string,
): Promise<null | SecretRecord> => {
  const [secret] = await db
    .select()
    .from(secrets)
    .where(
      and(
        gt(secrets.expiresAt, new Date()),
        eq(secrets.isUsed, false),
        eq(secrets.token, token),
      ),
    )
    .limit(1);

  return secret ?? null;
};

export const consumeSecret = async (id: string): Promise<void> => {
  await db
    .update(secrets)
    .set({ consumedAt: new Date(), isUsed: true })
    .where(eq(secrets.id, id));
};

export const createSecret = async (
  phone: string,
  token: string,
  expiresAt: Date,
): Promise<SecretRecord> => {
  const [secret] = await db
    .insert(secrets)
    .values({ expiresAt, phone, token, userType: "ADMIN" })
    .returning();

  if (!secret) {
    throw new AppError("Failed to create secret record", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }

  return secret;
};

export const findAdminByPhone = async (
  phone: string,
): Promise<AdminUser | null> => {
  const [admin] = await db
    .select()
    .from(admins)
    .where(and(eq(admins.phone, phone), eq(admins.isActive, true)))
    .limit(1);

  return admin ?? null;
};

export const findAdminByUsername = async (
  username: string,
): Promise<AdminUser | null> => {
  const [admin] = await db
    .select()
    .from(admins)
    .where(and(eq(admins.username, username), eq(admins.isActive, true)))
    .limit(1);

  return admin ?? null;
};

export const findAdminById = async (
  id: string,
): Promise<AdminUser | null> => {
  const [admin] = await db
    .select()
    .from(admins)
    .where(and(eq(admins.id, id), eq(admins.isActive, true)))
    .limit(1);

  return admin ?? null;
};

// ── Consumers ───────────────────────────────────────────────────────────────

const consumerSelection = {
  id: consumers.id,
  fullName: consumers.fullName,
  phone: users.phone,
  isActive: consumers.isActive,
  referralCode: consumers.referralCode,
  createdAt: users.createdAt,
  totalBookings: sql<string>`count(${bookings.id})`.as("total_bookings"),
  totalSpend: sql<string>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.status} = 'COMPLETED'), 0)`.as(
    "total_spend",
  ),
};

const mapConsumer = (row: {
  id: string;
  fullName: null | string;
  phone: string;
  isActive: boolean;
  referralCode: string;
  createdAt: Date;
  totalBookings: null | string;
  totalSpend: null | string;
}): AdminConsumer => ({
  id: row.id,
  fullName: row.fullName,
  phone: row.phone,
  isActive: row.isActive,
  referralCode: row.referralCode,
  createdAt: row.createdAt,
  totalBookings: Number(row.totalBookings ?? 0),
  totalSpend: String(row.totalSpend ?? "0"),
});

export const listConsumers = async (filter: {
  query?: string | undefined;
  limit: number;
  offset: number;
}): Promise<AdminConsumer[]> => {
  const where = filter.query
    ? or(
        ilike(consumers.fullName, `%${filter.query}%`),
        ilike(users.phone, `%${filter.query}%`),
        ilike(consumers.referralCode, `%${filter.query}%`),
      )
    : undefined;

  const rows = await db
    .select(consumerSelection)
    .from(consumers)
    .innerJoin(users, eq(users.id, consumers.id))
    .leftJoin(bookings, eq(bookings.consumerId, consumers.id))
    .where(where)
    .groupBy(consumers.id, users.id)
    .orderBy(desc(users.createdAt))
    .limit(filter.limit)
    .offset(filter.offset);

  return rows.map(mapConsumer);
};

export const getConsumerById = async (
  id: string,
): Promise<AdminConsumer | null> => {
  const [row] = await db
    .select(consumerSelection)
    .from(consumers)
    .innerJoin(users, eq(users.id, consumers.id))
    .leftJoin(bookings, eq(bookings.consumerId, consumers.id))
    .where(eq(consumers.id, id))
    .groupBy(consumers.id, users.id)
    .limit(1);

  return row ? mapConsumer(row) : null;
};

export const setConsumerActive = async (
  id: string,
  isActive: boolean,
): Promise<void> => {
  await db.update(consumers).set({ isActive }).where(eq(consumers.id, id));
};

// ── Partners ────────────────────────────────────────────────────────────────

const partnerSelection = {
  id: partners.id,
  fullName: partners.fullName,
  phone: users.phone,
  approvalStatus: partners.approvalStatus,
  approvalDate: partners.approvalDate,
  approvalRejectionReason: partners.approvalRejectionReason,
  isAvailable: partners.isAvailable,
  experienceYears: partners.experienceYears,
  bio: partners.bio,
  languages: partners.languages,
  profileImage: partners.profileImage,
  monthlySalary: partners.monthlySalary,
  isPayrollActive: partners.isPayrollActive,
  salaryEffectiveFrom: partners.salaryEffectiveFrom,
  createdAt: partners.createdAt,
  updatedAt: partners.updatedAt,
  totalBookings: sql<string>`count(${bookings.id}) filter (where ${bookings.status} = 'COMPLETED')`.as(
    "total_bookings",
  ),
};

const mapPartner = (row: {
  id: string;
  fullName: null | string;
  phone: string;
  approvalStatus: ApprovalStatus;
  approvalDate: Date | null;
  approvalRejectionReason: null | string;
  isAvailable: boolean;
  experienceYears: null | number;
  bio: null | string;
  languages: string[];
  profileImage: null | string;
  monthlySalary: null | string;
  isPayrollActive: boolean;
  salaryEffectiveFrom: Date | null;
  createdAt: Date;
  updatedAt: Date;
  totalBookings: null | string;
}): AdminPartner => ({
  id: row.id,
  fullName: row.fullName,
  phone: row.phone,
  approvalStatus: row.approvalStatus,
  approvalDate: row.approvalDate,
  approvalRejectionReason: row.approvalRejectionReason,
  isAvailable: row.isAvailable,
  experienceYears: row.experienceYears,
  bio: row.bio,
  languages: row.languages,
  profileImage: row.profileImage,
  rating: 0,
  totalBookings: Number(row.totalBookings ?? 0),
  monthlySalary: row.monthlySalary ? parseFloat(row.monthlySalary) : null,
  isPayrollActive: row.isPayrollActive,
  salaryEffectiveFrom: row.salaryEffectiveFrom,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const listPartners = async (filter: {
  approvalStatus?: ApprovalStatus | undefined;
  limit: number;
  offset: number;
}): Promise<AdminPartner[]> => {
  const where = filter.approvalStatus
    ? eq(partners.approvalStatus, filter.approvalStatus)
    : undefined;

  const rows = await db
    .select(partnerSelection)
    .from(partners)
    .innerJoin(users, eq(users.id, partners.id))
    .leftJoin(bookings, eq(bookings.partnerId, partners.id))
    .where(where)
    .groupBy(partners.id, users.id)
    .orderBy(desc(partners.createdAt))
    .limit(filter.limit)
    .offset(filter.offset);

  return rows.map(mapPartner);
};

export const getPartnerById = async (
  id: string,
): Promise<AdminPartner | null> => {
  const [row] = await db
    .select(partnerSelection)
    .from(partners)
    .innerJoin(users, eq(users.id, partners.id))
    .leftJoin(bookings, eq(bookings.partnerId, partners.id))
    .where(eq(partners.id, id))
    .groupBy(partners.id, users.id)
    .limit(1);

  return row ? mapPartner(row) : null;
};

export const updateApprovalStatus = async (params: {
  id: string;
  status: ApprovalStatus;
  reason?: null | string | undefined;
  approvedBy?: null | string | undefined;
}): Promise<void> => {
  const setApprovalDate = params.status === "APPROVED" ? new Date() : null;
  await db
    .update(partners)
    .set({
      approvalStatus: params.status,
      approvalDate: setApprovalDate,
      approvalRejectionReason: params.reason ?? null,
      approvedBy:
        params.status === "APPROVED" ? params.approvedBy ?? null : null,
    })
    .where(eq(partners.id, params.id));
};

export const partnerExists = async (id: string): Promise<boolean> => {
  const [row] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1);
  return Boolean(row);
};
