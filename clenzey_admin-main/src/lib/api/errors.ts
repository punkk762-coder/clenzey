import axios from "axios";

type ApiErrorBody = {
  success?: boolean;
  message?: string;
  error?:
    | string
    | {
        message?: string;
        code?: string;
        details?: Array<string | { field?: string; message?: string }>;
      };
  errors?: Array<string | { message?: string; field?: string }>;
};

const GENERIC_AXIOS_MESSAGE = /^Request failed with status code \d+$/;

function formatValidationDetail(
  detail: string | { field?: string; message?: string },
): string | undefined {
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (detail && typeof detail === "object" && detail.message?.trim()) {
    return detail.field
      ? `${detail.field}: ${detail.message.trim()}`
      : detail.message.trim();
  }
  return undefined;
}

function messageFromBody(data: unknown): string | undefined {
  if (!data) return undefined;
  if (typeof data === "string" && data.trim()) return data.trim();

  if (typeof data !== "object") return undefined;

  const body = data as ApiErrorBody;
  const nested = body.error;

  if (nested && typeof nested === "object" && Array.isArray(nested.details)) {
    const detailMessages = nested.details
      .map(formatValidationDetail)
      .filter((msg): msg is string => Boolean(msg));
    if (detailMessages.length > 0) return detailMessages.join(". ");
  }

  if (typeof nested === "string" && nested.trim()) return nested.trim();
  if (nested && typeof nested === "object" && nested.message?.trim()) {
    return nested.message.trim();
  }
  if (body.message?.trim()) return body.message.trim();

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const first = formatValidationDetail(body.errors[0]);
    if (first) return first;
  }

  return undefined;
}

/** True when an axios error represents a missing endpoint or resource. */
export function isApiNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

/** Extract a user-facing message from an API/axios error response. */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(error)) {
    const fromBody = messageFromBody(error.response?.data);
    if (fromBody) return fromBody;
  } else {
    const fromBody = messageFromBody(error);
    if (fromBody) return fromBody;
  }

  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (!GENERIC_AXIOS_MESSAGE.test(msg)) return msg;
  }

  return fallback;
}
