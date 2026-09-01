import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../errors/appErrors.ts";
import { domainEvents } from "../../../realtime/domainEvents.ts";
import {
  parseStoredUploadKey,
  resolveUploadUrlForRead,
} from "../../../services/s3PresignService.ts";
import { isAllowedUploadUrl } from "../../../validations/uploadUrlValidator.ts";
import type { BookingRecord } from "../bookings/repository.ts";
import * as bookingsRepo from "../bookings/repository.ts";
import * as notificationsService from "../notifications/service.ts";
import type { DisputeRecord } from "./repository.ts";
import * as repo from "./repository.ts";

const ACTIVE_STATUSES = new Set<DisputeRecord["status"]>(["OPEN", "UNDER_REVIEW"]);
const DISPUTE_WINDOW_DAYS = 7;
const MAX_DISPUTE_EVIDENCE = 10;

export type CreateDisputeInput = {
  bookingId: string;
  category: "SERVICE_QUALITY" | "PRICING" | "DAMAGE" | "NO_SHOW" | "OTHER";
  description: string;
  raisedById: string;
  raisedByType: "CONSUMER" | "PARTNER";
};

export type UpdateDisputeInput = {
  adminId: string;
  disputeId: string;
  resolutionNotes?: string;
  status: "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
};

export type ListDisputesInput = {
  bookingId?: string;
  category?: "SERVICE_QUALITY" | "PRICING" | "DAMAGE" | "NO_SHOW" | "OTHER";
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  status?: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
};

export type DisputeSummary = {
  category: DisputeRecord["category"];
  createdAt: string;
  description: string;
  id: string;
  resolutionNotes: null | string;
  resolvedAt: null | string;
  status: DisputeRecord["status"];
};

export type DisputeEvidenceSummary = {
  createdAt: string;
  fileUrl: string;
  id: string;
  uploadedById: string;
};

export type DisputeDetail = {
  dispute: DisputeRecord;
  evidence: DisputeEvidenceSummary[];
};

export type BookingDisputeStatus = {
  canRaiseDispute: boolean;
  dispute: DisputeSummary | null;
  hasActiveDispute: boolean;
};

const mapEvidenceSummary = async (
  record: repo.DisputeEvidenceRecord,
): Promise<DisputeEvidenceSummary> => ({
  createdAt: record.createdAt.toISOString(),
  fileUrl: (await resolveUploadUrlForRead(record.fileUrl)) ?? record.fileUrl,
  id: record.id,
  uploadedById: record.uploadedById,
});

const assertDisputeEvidenceFileUrl = (
  fileUrl: string,
  dispute: DisputeRecord,
  userId: string,
): void => {
  if (!isAllowedUploadUrl(fileUrl)) {
    throw new BadRequestError("fileUrl must use an allowed upload origin.");
  }

  const key = parseStoredUploadKey(fileUrl);
  const expectedPrefix = `dispute-evidence/${userId}/${dispute.bookingId}/`;
  if (!key?.startsWith(expectedPrefix)) {
    throw new BadRequestError(
      "fileUrl must be a dispute evidence upload for this booking.",
    );
  }
};

const mapDisputeSummary = (dispute: DisputeRecord): DisputeSummary => ({
  category: dispute.category,
  createdAt: dispute.createdAt.toISOString(),
  description: dispute.description,
  id: dispute.id,
  resolutionNotes: dispute.resolutionNotes,
  resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
  status: dispute.status,
});

const getReferenceDate = (
  booking: Pick<
    BookingRecord,
    "cancelledAt" | "completedAt" | "status" | "updatedAt"
  >,
): Date | null => {
  if (booking.status === "COMPLETED") {
    return booking.completedAt ?? booking.updatedAt ?? null;
  }
  if (booking.status === "CANCELLED") {
    return booking.cancelledAt ?? booking.updatedAt ?? null;
  }
  return booking.completedAt ?? booking.cancelledAt;
};

const isWithinDisputeWindow = (
  booking: Pick<
    BookingRecord,
    "cancelledAt" | "completedAt" | "status" | "updatedAt"
  >,
): boolean => {
  const referenceDate = getReferenceDate(booking);
  if (!referenceDate) return false;

  const daysSince =
    (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= DISPUTE_WINDOW_DAYS;
};

const isEligibleBookingStatus = (
  status: BookingRecord["status"],
): boolean => status === "COMPLETED" || status === "CANCELLED";

const assertCanRaiseDisputeForBooking = (
  booking: BookingRecord,
  raisedById: string,
  raisedByType: "CONSUMER" | "PARTNER",
): void => {
  if (
    raisedByType === "CONSUMER" &&
    booking.consumerId !== raisedById
  ) {
    throw new UnauthorizedError("You do not have access to dispute this booking.");
  }

  if (raisedByType === "PARTNER") {
    if (!booking.partnerId || booking.partnerId !== raisedById) {
      throw new UnauthorizedError(
        "You can only dispute bookings assigned to you.",
      );
    }
  }

  if (!isEligibleBookingStatus(booking.status)) {
    throw new BadRequestError(
      "Disputes can only be raised for bookings in COMPLETED or CANCELLED status.",
    );
  }

  if (!getReferenceDate(booking)) {
    throw new BadRequestError(
      "Booking has no completion or cancellation date.",
    );
  }

  if (!isWithinDisputeWindow(booking)) {
    throw new BadRequestError(
      "Disputes can only be raised within 7 days of booking completion or cancellation.",
    );
  }
};

export const buildDisputeStatus = (
  booking: BookingRecord,
  existing: DisputeRecord | null,
  options: {
    forUser: boolean;
    userId?: string;
    userType?: "CONSUMER" | "PARTNER";
  },
): BookingDisputeStatus => {
  let hasAccess = false;
  if (
    options.userType === "CONSUMER" &&
    options.userId === booking.consumerId
  ) {
    hasAccess = true;
  }
  if (
    options.userType === "PARTNER" &&
    booking.partnerId &&
    options.userId === booking.partnerId
  ) {
    hasAccess = true;
  }

  const hasActiveDispute =
    !!existing && ACTIVE_STATUSES.has(existing.status);

  const canRaiseDispute =
    options.forUser &&
    hasAccess &&
    isEligibleBookingStatus(booking.status) &&
    isWithinDisputeWindow(booking) &&
    !!getReferenceDate(booking) &&
    !hasActiveDispute;

  return {
    canRaiseDispute,
    dispute: existing ? mapDisputeSummary(existing) : null,
    hasActiveDispute,
  };
};

export const getDisputeStatusForBooking = async (
  bookingId: string,
  userId: string,
  userType: "CONSUMER" | "PARTNER",
): Promise<BookingDisputeStatus> => {
  const booking = await bookingsRepo.findBookingById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  if (userType === "CONSUMER" && booking.consumerId !== userId) {
    throw new UnauthorizedError("You do not have access to this booking.");
  }
  if (
    userType === "PARTNER" &&
    (!booking.partnerId || booking.partnerId !== userId)
  ) {
    throw new UnauthorizedError("You do not have access to this booking.");
  }

  const existing = await repo.findLatestByBookingAndUser(bookingId, userId);
  return buildDisputeStatus(booking, existing, {
    forUser: true,
    userId,
    userType,
  });
};

export const createDispute = async (
  input: CreateDisputeInput,
): Promise<DisputeRecord> => {
  const booking = await bookingsRepo.findBookingById(input.bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  assertCanRaiseDisputeForBooking(
    booking,
    input.raisedById,
    input.raisedByType,
  );

  const existing = await repo.findActiveByBookingAndUser(
    input.bookingId,
    input.raisedById,
  );
  if (existing) {
    throw new ConflictError(
      "An active dispute already exists for this booking.",
    );
  }

  const dispute = await repo.insertDispute({
    bookingId: input.bookingId,
    category: input.category,
    description: input.description,
    raisedById: input.raisedById,
    raisedByType: input.raisedByType,
    status: "OPEN",
  });

  domainEvents.emitDisputeCreated({
    bookingId: dispute.bookingId,
    disputeId: dispute.id,
    raisedById: dispute.raisedById,
    raisedByType: dispute.raisedByType,
    timestamp: new Date().toISOString(),
  });

  return dispute;
};

export const updateDispute = async (
  input: UpdateDisputeInput,
): Promise<DisputeRecord> => {
  const dispute = await repo.findDisputeById(input.disputeId);
  if (!dispute) {
    throw new NotFoundError("Dispute not found.");
  }

  if (dispute.status === "CLOSED") {
    throw new BadRequestError("This dispute is closed and cannot be updated.");
  }

  if (
    dispute.status === "RESOLVED" &&
    input.status !== "CLOSED" &&
    input.status !== "RESOLVED"
  ) {
    throw new BadRequestError(
      "A resolved dispute can only be moved to CLOSED.",
    );
  }

  const patch: Parameters<typeof repo.updateDispute>[1] = {
    status: input.status,
  };

  if (input.resolutionNotes !== undefined) {
    patch.resolutionNotes = input.resolutionNotes;
  }

  if (input.status === "RESOLVED") {
    patch.resolvedAt = new Date();
    patch.resolvedBy = input.adminId;
  }

  const updated = await repo.updateDispute(input.disputeId, patch);
  if (!updated) {
    throw new NotFoundError("Dispute not found.");
  }

  if (input.status === "RESOLVED") {
    domainEvents.emit("dispute:resolved", {
      bookingId: updated.bookingId,
      disputeId: updated.id,
      raisedById: updated.raisedById,
      raisedByType: updated.raisedByType,
      resolutionNotes: updated.resolutionNotes,
      timestamp: new Date().toISOString(),
    });

    await notificationsService.createNotification({
      body: updated.resolutionNotes
        ? `Your dispute has been resolved: ${updated.resolutionNotes}`
        : "Your dispute has been resolved. View the booking for details.",
      channel: "IN_APP",
      metadata: {
        bookingId: updated.bookingId,
        disputeId: updated.id,
      },
      recipientId: updated.raisedById,
      recipientType: updated.raisedByType,
      title: "Dispute resolved",
    });
  }

  return updated;
};

export const getDisputeById = async (
  disputeId: string,
  userId: string,
): Promise<DisputeDetail> => {
  const dispute = await assertDisputeAccess(disputeId, userId);
  const evidence = await listDisputeEvidenceRecords(disputeId);
  return { dispute, evidence };
};

export const listDisputeEvidence = async (
  disputeId: string,
  userId: string,
): Promise<DisputeEvidenceSummary[]> => {
  await assertDisputeAccess(disputeId, userId);
  return listDisputeEvidenceRecords(disputeId);
};

const assertDisputeAccess = async (
  disputeId: string,
  userId: string,
): Promise<DisputeRecord> => {
  const dispute = await repo.findDisputeById(disputeId);
  if (!dispute) {
    throw new NotFoundError("Dispute not found.");
  }
  if (dispute.raisedById !== userId) {
    throw new UnauthorizedError("You do not have access to this dispute.");
  }
  return dispute;
};

const listDisputeEvidenceRecords = async (
  disputeId: string,
): Promise<DisputeEvidenceSummary[]> => {
  const evidenceRecords = await repo.listEvidenceByDisputeId(disputeId);
  return Promise.all(evidenceRecords.map(mapEvidenceSummary));
};

export const addDisputeEvidence = async (input: {
  disputeId: string;
  fileUrl: string;
  userId: string;
}): Promise<DisputeEvidenceSummary> => {
  const dispute = await repo.findDisputeById(input.disputeId);
  if (!dispute) {
    throw new NotFoundError("Dispute not found.");
  }
  if (dispute.raisedById !== input.userId) {
    throw new UnauthorizedError("You do not have access to this dispute.");
  }
  if (!ACTIVE_STATUSES.has(dispute.status)) {
    throw new BadRequestError(
      "Evidence can only be added while the dispute is open or under review.",
    );
  }

  assertDisputeEvidenceFileUrl(input.fileUrl, dispute, input.userId);

  const count = await repo.countEvidenceByDisputeId(input.disputeId);
  if (count >= MAX_DISPUTE_EVIDENCE) {
    throw new BadRequestError(
      `Maximum of ${MAX_DISPUTE_EVIDENCE} evidence files per dispute has been reached.`,
    );
  }

  const record = await repo.insertDisputeEvidence({
    disputeId: input.disputeId,
    fileUrl: input.fileUrl,
    uploadedById: input.userId,
  });

  return await mapEvidenceSummary(record);
};

export const getAdminDisputeById = async (
  disputeId: string,
): Promise<repo.AdminDisputeDetail & { evidence: DisputeEvidenceSummary[] }> => {
  const detail = await repo.findAdminDetailById(disputeId);
  if (!detail) {
    throw new NotFoundError("Dispute not found.");
  }

  const evidenceRecords = await repo.listEvidenceByDisputeId(disputeId);
  const evidence = await Promise.all(evidenceRecords.map(mapEvidenceSummary));

  return { ...detail, evidence };
};

export const listDisputes = async (
  userId: string,
  opts: {
    limit?: number;
    offset?: number;
    status?: DisputeRecord["status"];
  } = {},
): Promise<{ disputes: DisputeRecord[]; total: number }> => {
  return await repo.listByUser(userId, opts);
};

export const listDisputesAdmin = async (
  filters: ListDisputesInput = {},
): Promise<{ disputes: DisputeRecord[]; total: number }> => {
  return await repo.listAdmin(filters);
};
