/** Shared k6 configuration — override via environment variables. */
export const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
export const API_PREFIX = `${BASE_URL}/api/v1`;

export const THRESHOLDS = {
  http_req_duration: ["p(95)<800", "p(99)<1500"],
  http_req_failed: ["rate<0.01"],
};

export const defaultOptions = {
  discardResponseBodies: false,
  thresholds: THRESHOLDS,
};
