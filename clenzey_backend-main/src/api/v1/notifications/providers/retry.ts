import logger from "../../../../configs/loggerConfig.ts";

/**
 * Retries a function with exponential backoff.
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000). Delays: 1s, 2s, 4s...
 * @returns The result of the function call
 * @throws The last error if all retries are exhausted
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        logger.error(
          `All ${maxRetries + 1} attempts failed. Throwing last error.`,
        );
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      logger.warning(
        `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
        { error: err instanceof Error ? err.message : String(err) },
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // Unreachable, but satisfies TypeScript
  throw new Error("Unreachable");
};
