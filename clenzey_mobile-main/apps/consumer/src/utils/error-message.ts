import { isApiError } from '@clenzey/api-client';

/**
 * Extracts a user-facing message from API, Razorpay, or generic errors.
 */
export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isApiError(err)) {
    return err.message;
  }

  if (err && typeof err === 'object') {
    const e = err as {
      description?: string;
      message?: string;
      error?: { description?: string };
    };

    if (e.error?.description) return e.error.description;
    if (e.description) return e.description;
    if (typeof e.message === 'string' && e.message) return e.message;
  }

  return fallback;
}
