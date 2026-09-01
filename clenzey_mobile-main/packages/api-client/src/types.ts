/**
 * Standard API response envelope returned by the backend.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Structured error returned by the API client on request failure.
 */
export interface ApiError {
  success: false;
  message: string;
  code?: string;
  statusCode: number;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Type guard to check if an unknown error is a structured ApiError.
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    (error as ApiError).success === false &&
    'message' in error &&
    'statusCode' in error
  );
}
