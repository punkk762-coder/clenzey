import { HttpStatusCode } from "axios";
import { and, desc, eq, isNull, or } from "drizzle-orm";

import db from "../../../db/index.ts";
import {
  quotationRequests,
  services,
  type ServiceAddonJson,
  type ServiceInclusionJson,
  type ServiceSubVariantJson,
  type ServiceVariantJson,
} from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

export type ServiceRecord = typeof services.$inferSelect;
export type QuotationRecord = typeof quotationRequests.$inferSelect;
export type QuotationInsert = typeof quotationRequests.$inferInsert;

export type {
  ServiceAddonJson,
  ServiceInclusionJson,
  ServiceSubVariantJson,
  ServiceVariantJson,
};

// ─── Reads ────────────────────────────────────────────────────────

export const listActiveServices = async (): Promise<ServiceRecord[]> => {
  return await db
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(services.sortOrder);
};

export const findServiceById = async (
  id: string,
): Promise<null | ServiceRecord> => {
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), eq(services.isActive, true)))
    .limit(1);
  return service ?? null;
};

export const findServiceByIdIncludingInactive = async (
  id: string,
): Promise<null | ServiceRecord> => {
  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, id))
    .limit(1);
  return service ?? null;
};

// ─── Create / Update / Soft-delete service ────────────────────────

export const insertService = async (data: typeof services.$inferInsert) => {
  const [service] = await db.insert(services).values(data).returning();
  if (!service) {
    throw new AppError("Failed to create service", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return service;
};

export const updateService = async (
  id: string,
  patch: Partial<typeof services.$inferInsert>,
) => {
  const [row] = await db
    .update(services)
    .set(patch)
    .where(eq(services.id, id))
    .returning();
  return row ?? null;
};

export const softDeleteService = async (id: string) => {
  await db.update(services).set({ isActive: false }).where(eq(services.id, id));
};

// ─── Quotation requests ───────────────────────────────────────────

export const createQuotationRequest = async (
  data: QuotationInsert,
): Promise<QuotationRecord> => {
  const [record] = await db.insert(quotationRequests).values(data).returning();
  if (!record) {
    throw new AppError("Failed to create quotation request", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export type EnrichedQuotation = QuotationRecord & { serviceName: string | null };

export const listQuotationRequests = async (filter: {
  status?: QuotationRecord["status"];
  consumerId?: string;
  limit?: number;
  offset?: number;
}): Promise<EnrichedQuotation[]> => {
  const { status, consumerId, limit = 50, offset = 0 } = filter;
  const rows = await db
    .select({
      q: quotationRequests,
      serviceName: services.name,
    })
    .from(quotationRequests)
    .leftJoin(services, eq(quotationRequests.serviceId, services.id))
    .where(
      and(
        status ? eq(quotationRequests.status, status) : undefined,
        consumerId ? eq(quotationRequests.consumerId, consumerId) : undefined,
      ),
    )
    .orderBy(desc(quotationRequests.createdAt))
    .limit(limit)
    .offset(offset);
  return rows.map(r => ({ ...r.q, serviceName: r.serviceName ?? null }));
};

export const updateQuotationStatus = async (
  id: string,
  status: QuotationRecord["status"],
  quotedAmount?: number,
): Promise<QuotationRecord | null> => {
  const [record] = await db
    .update(quotationRequests)
    .set({
      status,
      updatedAt: new Date(),
      ...(quotedAmount !== undefined && { quotedAmount }),
    })
    .where(eq(quotationRequests.id, id))
    .returning();
  return record ?? null;
};

export const deleteQuotationAsConsumer = async (
  id: string,
  consumerId: string,
): Promise<QuotationRecord | null> => {
  const [record] = await db
    .delete(quotationRequests)
    .where(
      and(
        eq(quotationRequests.id, id),
        eq(quotationRequests.consumerId, consumerId),
        or(
          eq(quotationRequests.status, "PENDING"),
          eq(quotationRequests.status, "SCHEDULED"),
        ),
      ),
    )
    .returning();
  return record ?? null;
};

export const acceptQuotationAsConsumer = async (
  id: string,
  consumerId: string,
): Promise<QuotationRecord | null> => {
  const [record] = await db
    .update(quotationRequests)
    .set({ status: "ACCEPTED", updatedAt: new Date() })
    .where(
      and(
        eq(quotationRequests.id, id),
        eq(quotationRequests.consumerId, consumerId),
        eq(quotationRequests.status, "QUOTED"),
      ),
    )
    .returning();
  return record ?? null;
};
