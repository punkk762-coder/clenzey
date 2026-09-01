import { and, desc, eq } from "drizzle-orm";
import { HttpStatusCode } from "axios";

import db from "../../../db/index.ts";
import { bankDetails, kycDocuments, partners } from "../../../db/schema.ts";
import { AppError } from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";

// ── Types ────────────────────────────────────────────────────────────────────

export type BankDetailsRecord = typeof bankDetails.$inferSelect;
export type BankDetailsInsert = typeof bankDetails.$inferInsert;

export type KycDocumentRecord = typeof kycDocuments.$inferSelect;
export type KycDocumentInsert = typeof kycDocuments.$inferInsert;

// ── Bank Details CRUD ────────────────────────────────────────────────────────

export const insertBankDetails = async (
  input: BankDetailsInsert,
): Promise<BankDetailsRecord> => {
  const [record] = await db
    .insert(bankDetails)
    .values(input)
    .onConflictDoUpdate({
      set: {
        accountHolderName: input.accountHolderName,
        accountNumber: input.accountNumber,
        bankName: input.bankName,
        ifscCode: input.ifscCode,
      },
      target: bankDetails.partnerId,
    })
    .returning();

  if (!record) {
    throw new AppError("Failed to save bank details", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findBankDetailsByPartnerId = async (
  partnerId: string,
): Promise<BankDetailsRecord | null> => {
  const [row] = await db
    .select()
    .from(bankDetails)
    .where(eq(bankDetails.partnerId, partnerId))
    .limit(1);
  return row ?? null;
};

// ── KYC Documents CRUD ───────────────────────────────────────────────────────

export const insertKycDocument = async (
  input: KycDocumentInsert,
): Promise<KycDocumentRecord> => {
  const [record] = await db
    .insert(kycDocuments)
    .values(input)
    .returning();

  if (!record) {
    throw new AppError("Failed to create KYC document", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const updateKycDocument = async (
  id: string,
  patch: Partial<Pick<KycDocumentRecord, "fileUrl" | "rejectionReason" | "reviewedAt" | "reviewedBy" | "status">>,
): Promise<KycDocumentRecord> => {
  const [record] = await db
    .update(kycDocuments)
    .set(patch)
    .where(eq(kycDocuments.id, id))
    .returning();

  if (!record) {
    throw new AppError("Failed to update KYC document", {
      error: { code: ErrorCode.SERVER_ERROR },
      statusCode: HttpStatusCode.InternalServerError,
    });
  }
  return record;
};

export const findKycDocumentById = async (
  id: string,
): Promise<KycDocumentRecord | null> => {
  const [row] = await db
    .select()
    .from(kycDocuments)
    .where(eq(kycDocuments.id, id))
    .limit(1);
  return row ?? null;
};

export const findByPartnerAndType = async (
  partnerId: string,
  documentType: KycDocumentRecord["documentType"],
): Promise<KycDocumentRecord | null> => {
  const [row] = await db
    .select()
    .from(kycDocuments)
    .where(
      and(
        eq(kycDocuments.partnerId, partnerId),
        eq(kycDocuments.documentType, documentType),
      ),
    )
    .limit(1);
  return row ?? null;
};

export const listKycDocumentsByPartnerId = async (
  partnerId: string,
): Promise<KycDocumentRecord[]> => {
  return await db
    .select()
    .from(kycDocuments)
    .where(eq(kycDocuments.partnerId, partnerId))
    .orderBy(desc(kycDocuments.createdAt));
};

// ── Partner KYC Status ───────────────────────────────────────────────────────

export const updatePartnerKycStatus = async (
  partnerId: string,
  kycStatus: "PENDING" | "IN_PROGRESS" | "VERIFIED" | "REJECTED",
): Promise<void> => {
  await db
    .update(partners)
    .set({ kycStatus })
    .where(eq(partners.id, partnerId));
};
