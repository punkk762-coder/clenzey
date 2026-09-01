import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from './types';

/**
 * Configuration for the API client instance.
 */
export interface ApiConfig {
  baseURL: string;
  getToken: () => Promise<string | null>;
  setToken: (token: string) => Promise<void>;
  onAuthFailure: () => void;
  /** Path for the refresh endpoint. Defaults to '/auth/refresh'. */
  refreshEndpoint?: string;
}

/**
 * Auth endpoints that should NOT have Bearer token attached.
 * These are public endpoints used before the user is authenticated,
 * plus refresh which authenticates via HttpOnly cookie.
 */
const AUTH_ENDPOINTS = [
  '/auth/initiate',
  '/auth/validate',
  '/auth/signin',
  '/auth/signup',
  '/auth/logout',
];

/**
 * Determines whether a request URL targets an auth endpoint that
 * should skip token attachment.
 */
function shouldAttachToken(url: string | undefined, refreshEndpoint: string): boolean {
  if (!url) return false;
  if (url.includes(refreshEndpoint)) return false;
  return !AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

/**
 * Queued request callback shape used during token refresh.
 */
interface QueuedRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/**
 * Creates a configured Axios instance with auth interceptors.
 *
 * - Request interceptor: attaches Bearer token from secure storage (skips auth endpoints)
 * - Response interceptor: unwraps success envelope { success: true, data }
 * - Error interceptor: extracts structured ApiError from error responses
 * - 401 handling: queues pending requests, attempts token refresh, retries or triggers logout
 */
export function createApiClient(config: ApiConfig): AxiosInstance {
  const refreshEndpoint = config.refreshEndpoint ?? '/auth/refresh';

  let isRefreshing = false;
  let failedQueue: QueuedRequest[] = [];

  /**
   * Process all queued requests after a refresh attempt.
   * On success: retry each with the new token.
   * On failure: reject each with the given error.
   */
  function processQueue(error: unknown, token: string | null = null): void {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    failedQueue = [];
  }

  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: 30000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // ─── Request Interceptor ───────────────────────────────────────────────────
  // Attaches Authorization: Bearer <token> header to all protected requests.
  // Skips token attachment for auth/refresh endpoints.
  instance.interceptors.request.use(
    async (requestConfig: InternalAxiosRequestConfig) => {
      if (shouldAttachToken(requestConfig.url, refreshEndpoint)) {
        const token = await config.getToken();
        if (token) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      }
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  // ─── Response Interceptor (Success) ────────────────────────────────────────
  // Unwraps the API success envelope: { success: true, data: {...} } → data
  // If the response doesn't follow the envelope format, returns as-is.
  instance.interceptors.response.use(
    (response) => {
      const body = response.data;

      // Check if response follows the success envelope pattern
      if (body && typeof body === 'object' && body.success === true && 'data' in body) {
        return body.data;
      }

      // Non-envelope response — return raw data
      return body;
    },

    // ─── Error Interceptor ─────────────────────────────────────────────────────
    // Extracts structured ApiError from error responses.
    // Handles: 401 with token refresh, API error envelopes, network errors, timeout errors.
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized responses
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        // If the 401 came from the refresh endpoint itself, trigger logout immediately
        if (originalRequest.url?.includes(refreshEndpoint)) {
          config.onAuthFailure();
          const apiError = extractApiError(error);
          return Promise.reject(apiError);
        }

        // Mark this request to prevent infinite retry loops
        originalRequest._retry = true;

        if (isRefreshing) {
          // A refresh is already in progress — queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            // Retry with the new token
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          });
        }

        // Start the refresh flow
        isRefreshing = true;

        try {
          const response = await instance.post(
            refreshEndpoint,
            {},
            { withCredentials: true }
          );

          // The response interceptor unwraps the envelope, so response is the data
          const newToken = (response as unknown as { accessToken: string }).accessToken;

          await config.setToken(newToken);
          isRefreshing = false;

          // Retry all queued requests with the new token
          processQueue(null, newToken);

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;

          // Reject all queued requests
          processQueue(refreshError, null);

          // Trigger the auth failure callback (logout flow)
          config.onAuthFailure();

          const apiError = extractApiError(error);
          return Promise.reject(apiError);
        }
      }

      const apiError = extractApiError(error);
      return Promise.reject(apiError);
    }
  );

  return instance;
}

/**
 * Extracts a structured ApiError from an Axios error.
 *
 * Handles three cases:
 * 1. Server responded with error envelope { success: false, message, error: { code, details } }
 * 2. Network error (no response received)
 * 3. Timeout error
 */
function extractApiError(error: AxiosError): ApiError {
  // Case 1: Server responded with an error
  if (error.response) {
    const responseData = error.response.data as Record<string, unknown> | undefined;

    // Extract from structured error envelope
    if (responseData && responseData.success === false) {
      const errorObj = responseData.error as
        | { code?: string; details?: Array<{ field: string; message: string }> }
        | undefined;

      return {
        success: false,
        message: (responseData.message as string) || 'An error occurred',
        code: errorObj?.code,
        statusCode: error.response.status,
        details: errorObj?.details,
      };
    }

    // Server responded but not in expected envelope format
    return {
      success: false,
      message:
        (responseData?.message as string) ||
        error.message ||
        'An error occurred',
      statusCode: error.response.status,
    };
  }

  // Case 2: Timeout error
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      success: false,
      message: 'Request timeout',
      statusCode: 0,
    };
  }

  // Case 3: Network error (no response received)
  return {
    success: false,
    message: 'Network error',
    statusCode: 0,
  };
}
