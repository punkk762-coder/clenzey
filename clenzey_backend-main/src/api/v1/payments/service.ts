import {
  getRazorpayClient,
  verifyRazorpayOrderSignature,
} from "../../../configs/razorpayConfig.ts";
import {
  BadRequestError,
  NotFoundError,
} from "../../../errors/appErrors.ts";
import logger from "../../../configs/loggerConfig.ts";
import { parseMoney, toMoneyPaise } from "../../../utilities/moneyUtils.ts";
import * as bookingsRepo from "../bookings/repository.ts";
import { transitionBookingStatus } from "../bookings/service.ts";
import { triggerDispatchOnConfirmed } from "../../../queues/dispatchTrigger.ts";
import { handleRefundWebhook } from "../refunds/service.ts";
import * as repo from "./repository.ts";

// The Razorpay SDK throws plain objects, not Error instances.
// This helper extracts a human-readable message from whatever it throws.
function razorpayErrorMessage(err: unknown): string {
  try {
    // Razorpay SDK throws plain objects like { error: { description } }, not Error instances.
    // JSON round-trip extracts a message without type assertions or `in` narrowing.
    const parsed = JSON.parse(JSON.stringify(err));
    return parsed?.error?.description ?? parsed?.message ?? "Razorpay request failed";
  } catch {
    return "Razorpay request failed";
  }
}

export const createRazorpayOrderForBooking = async (
  bookingId: string,
  consumerId: string,
) => {
  const booking = await bookingsRepo.findBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");
  if (booking.consumerId !== consumerId)
    throw new BadRequestError("Not your booking.");
  if (booking.paymentStatus === "CAPTURED") {
    throw new BadRequestError("Booking already paid.");
  }

  const existing = await repo.findPaymentByBookingId(bookingId);
  if (existing && existing.razorpayOrderId && existing.status === "PENDING") {
    return { booking, payment: existing };
  }

  const amountInRupees = parseMoney(booking.totalAmount);
  const amountInPaise = toMoneyPaise(amountInRupees);
  if (amountInPaise <= 0) {
    throw new BadRequestError(
      "Booking total is invalid. Please cancel and create a new booking, or contact support.",
    );
  }

  const client = getRazorpayClient();
  // eslint-disable-next-line prefer-const
  let order;
  try {
    order = await client.orders.create({
      amount: amountInPaise,
      currency: "INR",
      notes: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
      },
      receipt: booking.bookingNumber,
    });
  } catch (err) {
    const msg = razorpayErrorMessage(err);
    logger.error({ err, msg, message: "Razorpay order creation failed" });
    throw new BadRequestError(`Payment gateway error: ${msg}`);
  }

  const payment = existing
    ? await repo.updatePayment(existing.id, {
        amount: booking.totalAmount,
        currency: "INR",
        razorpayOrderId: order.id,
        status: "PENDING",
      })
    : await repo.insertPayment({
        amount: booking.totalAmount,
        bookingId: booking.id,
        currency: "INR",
        provider: "RAZORPAY",
        razorpayOrderId: order.id,
        status: "PENDING",
      });

  await transitionBookingStatus({
    actor: "SYSTEM",
    bookingId: booking.id,
    metadata: { orderId: order.id },
    reason: "Razorpay order created",
    toStatus: "PAYMENT_PENDING",
  });

  return {
    booking: { ...booking, status: "PAYMENT_PENDING" as const },
    order,
    payment,
  };
};

export const confirmPaymentBySignature = async (params: {
  consumerId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) => {
  const valid = verifyRazorpayOrderSignature(
    params.razorpayOrderId,
    params.razorpayPaymentId,
    params.razorpaySignature,
  );
  if (!valid) throw new BadRequestError("Invalid payment signature.");

  const payment = await repo.findPaymentByOrderId(params.razorpayOrderId);
  if (!payment) throw new NotFoundError("Payment record not found.");

  const booking = await bookingsRepo.findBookingById(payment.bookingId);
  if (!booking) throw new NotFoundError("Booking not found.");
  if (booking.consumerId !== params.consumerId)
    throw new BadRequestError("Not your booking.");

  if (payment.status === "CAPTURED") {
    return { booking, payment };
  }

  const updated = await repo.updatePayment(payment.id, {
    capturedAt: new Date(),
    razorpayPaymentId: params.razorpayPaymentId,
    razorpaySignature: params.razorpaySignature,
    status: "CAPTURED",
  });

  await bookingsRepo.updateBooking(booking.id, {
    paymentStatus: "CAPTURED",
  });

  const confirmed = await transitionBookingStatus({
    actor: "SYSTEM",
    bookingId: booking.id,
    metadata: {
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
    },
    reason: "Payment confirmed via Razorpay",
    toStatus: "CONFIRMED",
  });

  await triggerDispatchOnConfirmed(booking.id);

  return { booking: confirmed, payment: updated };
};

export const handleWebhookEvent = async (event: {
  event: string;
  id?: string;
  payload: { payment?: { entity?: Record<string, unknown> }; refund?: { entity?: Record<string, unknown> } };
}) => {
  await repo.recordEvent({
    eventType: event.event,
    payload: event,
    provider: "RAZORPAY",
    providerEventId: event.id ?? null,
  });

  // Handle refund.processed webhook
  if (event.event === "refund.processed") {
    await handleRefundWebhook(event as Parameters<typeof handleRefundWebhook>[0]);
    return;
  }

  const payment = event.payload.payment?.entity;
  const orderId =
    typeof payment?.["order_id"] === "string"
      ? (payment["order_id"] as string)
      : undefined;
  if (!orderId) return;

  const record = await repo.findPaymentByOrderId(orderId);
  if (!record) return;

  if (event.event === "payment.captured") {
    if (record.status !== "CAPTURED") {
      const paymentId =
        typeof payment?.["id"] === "string"
          ? (payment["id"] as string)
          : undefined;
      await repo.updatePayment(record.id, {
        capturedAt: new Date(),
        rawPayload: event,
        razorpayPaymentId: paymentId ?? null,
        status: "CAPTURED",
      });
      const booking = await bookingsRepo.findBookingById(record.bookingId);
      if (booking) {
        await bookingsRepo.updateBooking(booking.id, {
          paymentStatus: "CAPTURED",
        });
        if (booking.status === "PAYMENT_PENDING" || booking.status === "PENDING") {
          await transitionBookingStatus({
            actor: "SYSTEM",
            bookingId: booking.id,
            metadata: { orderId, source: "razorpay_webhook" },
            reason: "Payment captured (webhook)",
            toStatus: "CONFIRMED",
          });
          await triggerDispatchOnConfirmed(booking.id);
        }
      }
    }
  } else if (event.event === "payment.failed") {
    const reason =
      typeof payment?.["error_description"] === "string"
        ? (payment["error_description"] as string)
        : "Payment failed";
    await repo.updatePayment(record.id, {
      failureReason: reason,
      rawPayload: event,
      status: "FAILED",
    });
  }
};
