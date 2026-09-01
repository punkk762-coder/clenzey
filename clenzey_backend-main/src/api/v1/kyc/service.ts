import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import * as repo from "./repository.ts";

// ── IFSC Validation ──────────────────────────────────────────────────────────

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const validateIfsc = (ifsc: string): boolean => IFSC_REGEX.test(ifsc);

// ── Bank Details ─────────────────────────────────────────────────────────────

export type SubmitBankDetailsInput = {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  partnerId: string;
};

export const submitBankDetails = async (
  input: SubmitBankDetailsInput,
): Promise<repo.BankDetailsRecord> => {
  if (!validateIfsc(input.ifscCode)) {
    throw new BadRequestError(
      "Invalid IFSC code. Must be 4 uppercase letters followed by 0 and 6 alphanumeric characters.",
    );
  }

  return await repo.insertBankDetails({
    accountHolderName: input.accountHolderName,
    accountNumber: input.accountNumber,
    bankName: input.bankName,
    ifscCode: input.ifscCode,
    partnerId: input.partnerId,
  });
};

export const getBankDetails = async (
  partnerId: string,
): Promise<repo.BankDetailsRecord | null> => {
  return await repo.findBankDetailsByPartnerId(partnerId);
};

// ── KYC Documents ────────────────────────────────────────────────────────────

export type UploadKycDocumentInput = {
  documentType: repo.KycDocumentRecord["documentType"];
  fileUrl: string;
  partnerId: string;
};

export const uploadKycDocument = async (
  input: UploadKycDocumentInput,
): Promise<repo.KycDocumentRecord> => {
  const existing = await repo.findByPartnerAndType(
    input.partnerId,
    input.documentType,
  );

  if (existing) {
    // If already approved, reject the upload with 409
    if (existing.status === "APPROVED") {
      throw new ConflictError(
        `A ${input.documentType} document has already been approved. Cannot re-upload.`,
      );
    }

    // If PENDING or REJECTED, update with new file
    return await repo.updateKycDocument(existing.id, {
      fileUrl: input.fileUrl,
      rejectionReason: null,
      reviewedAt: null,
      reviewedBy: null,
      status: "PENDING",
    });
  }

  // No existing document of this type — create new
  return await repo.insertKycDocument({
    documentType: input.documentType,
    fileUrl: input.fileUrl,
    partnerId: input.partnerId,
    status: "PENDING",
  });
};

export const listKycDocuments = async (
  partnerId: string,
): Promise<repo.KycDocumentRecord[]> => {
  return await repo.listKycDocumentsByPartnerId(partnerId);
};

// ── Admin: Approve / Reject ──────────────────────────────────────────────────

export const approveDocument = async (
  documentId: string,
  adminId: string,
): Promise<repo.KycDocumentRecord> => {
  const doc = await repo.findKycDocumentById(documentId);
  if (!doc) {
    throw new NotFoundError("KYC document not found.");
  }

  const updated = await repo.updateKycDocument(documentId, {
    rejectionReason: null,
    reviewedAt: new Date(),
    reviewedBy: adminId,
    status: "APPROVED",
  });

  // Check if both AADHAAR and PAN are now approved → set partner VERIFIED
  await checkAndUpdateKycStatus(doc.partnerId);

  return updated;
};

export const rejectDocument = async (
  documentId: string,
  adminId: string,
  rejectionReason: string,
): Promise<repo.KycDocumentRecord> => {
  const doc = await repo.findKycDocumentById(documentId);
  if (!doc) {
    throw new NotFoundError("KYC document not found.");
  }

  return await repo.updateKycDocument(documentId, {
    rejectionReason,
    reviewedAt: new Date(),
    reviewedBy: adminId,
    status: "REJECTED",
  });
};

// ── KYC Status Derivation ────────────────────────────────────────────────────

/**
 * After a document approval, check if both AADHAAR and PAN are approved.
 * If so, mark the partner's kycStatus as VERIFIED.
 */
const checkAndUpdateKycStatus = async (partnerId: string): Promise<void> => {
  const aadhaar = await repo.findByPartnerAndType(partnerId, "AADHAAR");
  const pan = await repo.findByPartnerAndType(partnerId, "PAN");

  if (aadhaar?.status === "APPROVED" && pan?.status === "APPROVED") {
    await repo.updatePartnerKycStatus(partnerId, "VERIFIED");
  }
};

// ── Admin: View partner KYC ──────────────────────────────────────────────────

export const getPartnerKyc = async (partnerId: string) => {
  const [bankDetailsResult, documents] = await Promise.all([
    repo.findBankDetailsByPartnerId(partnerId),
    repo.listKycDocumentsByPartnerId(partnerId),
  ]);

  return {
    bankDetails: bankDetailsResult,
    documents,
  };
};
