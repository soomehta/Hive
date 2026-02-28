import { createLogger } from "@/lib/logger";

const log = createLogger("retry");

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 529];

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  label?: string;
}

/**
 * Retry a function with exponential backoff and jitter.
 * Retries on network errors and retryable HTTP status codes.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 1000, label = "unknown" } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const status = (error as { status?: number })?.status;
      const isRetryable =
        status !== undefined && RETRYABLE_STATUS_CODES.includes(status);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const jitter = Math.random() * 500;
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
      log.warn(
        { attempt: attempt + 1, status, delay: Math.round(delay), label },
        "Retrying call"
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
