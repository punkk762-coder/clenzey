import { HttpStatusCode } from "axios";

import { getRazorpayClient } from "../../../configs/razorpayConfig.ts";
import logger from "../../../configs/loggerConfig.ts";
import {
  AppError,
  BadRequestError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import ErrorCode from "../../../errors/errorCode.ts";
import * as bookingsRepo from "../bookings/repository.ts";
import { transitionBookingStatus } from "../bookings/service.ts";
import * as paymentsRepo from "../payments/repository.ts";
import * as repo from "./repository.ts";

// ── Types ────────────────────────────────────────────────────────────────────

export type InitiateRefundInput = {
  adminId: string;
  amount: number; // partial or full refund amount
  bookingId: string;
  reason?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract a human-readable message from Razorpay SDK errors.
 * The SDK throws plain objects, not Error instances.
 */
function razorpayErrorMessage(err: unknown): string {
  try {
    const parsed = JSON.parse(JSON.stringify(err));
    return (
      parsed?.error?.description ?? parsed?.message ?? "Razorpay refund request failed"
    );
  } catch {
    return "Razorpay refund request failed";
  }
}

// ── Service Functions ────────────────────────────────────────────────────────

/**
 * Initiate a refund for a booking's captured payment.
 *
 * Validates:
 * - Booking exists and has a captured payment
 * - Refund amount <= (captured amount - previously refunded amount)
 *
 * On success: updates payment status (REFUNDED or PARTIALLY_REFUNDED),
 * transitions booking to REFUNDED if full refund.
 *
 * On error: logs the error, stores failure reason, throws 502.
 */
export const initiateRefund = async (
  input: InitiateRefundInput,
): Promise<repo.RefundRecord> => {
  // 1. Find the booking
  const booking = await bookingsRepo.findBookingById(input.bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found.");
  }

  // 2. Find the captured payment for this booking
  const payment = await paymentsRepo.findPaymentByBookingId(input.bookingId);
  if (!payment) {
    throw new NotFoundError("No payment found for this booking.");
  }
  if (payment.status !== "CAPTURED" && payment.status !== "PARTIALLY_REFUNDED") {
    throw new BadRequestError(
      "Payment must be in CAPTURED or PARTIALLY_REFUNDED status to process a refund.",
    );
  }

  // 3. Validate refund amount does not exceed remaining capturable amount
  const capturedAmount = parseFloat(payment.amount);
  const previouslyRefunded = await repo.sumRefundedForPayment(payment.id);
  const remainingAmount = capturedAmount - previouslyRefunded;

  if (input.amount <= 0) {
    throw new BadRequestError("Refund amount must be greater than zero.");
  }

  if (input.amount > remainingAmount) {
    throw new BadRequestError(
      `Refund amount (${input.amount}) exceeds remaining refundable amount (${remainingAmount.toFixed(2)}).`,
    );
  }

  // 4. Create refund record with INITIATED status
  const refundRecord = await repo.insertRefund({
    amount: input.amount.toFixed(2),
    bookingId: input.bookingId,
    initiatedBy: input.adminId,
    paymentId: payment.id,
    reason: input.reason ?? null,
    status: "INITIATED",
  });

  // 5. Call Razorpay refund API
  const amountInPaise = Math.round(input.amount * 100);
  const client = getRazorpayClient();

  try {
    const razorpayRefund = await client.payments.refund(
      payment.razorpayPaymentId!,
      {
        amount: amountInPaise,
        notes: {
          bookingId: input.bookingId,
          refundId: refundRecord.id,
        },
      },
    );

    // 6. Update refund record with Razorpay refund ID
    await repo.updateRefundStatus(refundRecord.id, {
      razorpayRefundId: razorpayRefund.id,
      status: "PROCESSING",
    });

    // 7. Determine if full or partial refund
    const totalRefundedAfter = previouslyRefunded + input.amount;
    const isFullRefund = totalRefundedAfter >= capturedAmount;

    // 8. Update payment status
    await paymentsRepo.updatePayment(payment.id, {
      status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
    });

    // 9. Update booking payment status
    await bookingsRepo.updateBooking(booking.id, {
      paymentStatus: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
    });

    // 10. Transition booking to REFUNDED if full refund
    if (isFullRefund) {
      await transitionBookingStatus({
        actor: "SYSTEM",
        bookingId: booking.id,
        metadata: {
          razorpayRefundId: razorpayRefund.id,
          refundId: refundRecord.id,
        },
        reason: "Full refund processed",
        toStatus: "REFUNDED",
      });
    }

    // Return updated refund record
    const updated = await repo.findRefundById(refundRecord.id);
    return updated ?? refundRecord;
  } catch (err) {
    // On Razorpay error: log, store failure reason, throw 502
    const errorMessage = razorpayErrorMessage(err);
    logger.error({
      bookingId: input.bookingId,
      err,
      message: "Razorpay refund request failed",
      paymentId: payment.id,
      refundId: refundRecord.id,
    });

    // Store the failure reason on the refund record
    await repo.updateRefundStatus(refundRecord.id, {
      reason: `${input.reason ? input.reason + " | " : ""}FAILED: ${errorMessage}`,
      status: "FAILED",
    });

    throw new AppError(`Refund processing failed: ${errorMessage}`, {
      error: { code: ErrorCode.EXTERNAL_SERVICE_ERROR },
      statusCode: HttpStatusCode.BadGateway,
    });
  }
};

/**
 * Handle the Razorpay `refund.processed` webhook event.
 * Updates the refund record status to COMPLETED upon asynchronous confirmation.
 */
export const handleRefundWebhook = async (event: {
  event: string;
  payload: {
    refund?: {
      entity?: Record<string, unknown>;
    };
  };
}): Promise<void> => {
  if (event.event !== "refund.processed") return;

  const refundEntity = event.payload.refund?.entity;
  if (!refundEntity) return;

  const razorpayRefundId =
    typeof refundEntity["id"] === "string" ? refundEntity["id"] : undefined;
  if (!razorpayRefundId) return;

  // Find the refund record by Razorpay refund ID
  const refundRecord = await repo.findRefundByRazorpayId(razorpayRefundId);
  if (!refundRecord) {
    logger.warn({
      message: "Received refund.processed webhook for unknown refund",
      razorpayRefundId,
    });
    return;
  }

  // Update refund status to COMPLETED
  await repo.updateRefundStatus(refundRecord.id, {
    status: "COMPLETED",
  });

  logger.info({
    message: "Refund confirmed via webhook",
    razorpayRefundId,
    refundId: refundRecord.id,
  });
};
