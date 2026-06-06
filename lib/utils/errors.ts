/**
 * Standard API error shape returned by all Digital Rohtak backend endpoints.
 */
export interface ApiError {
  /** Human-readable English message */
  error: string;
  /** Machine-readable code (e.g. "PRODUCT_HAS_ACTIVE_ORDERS") */
  code?: string;
  /** For validation errors, the offending field name */
  field?: string;
}

/**
 * Type guard — narrows an unknown thrown value to ApiError.
 *
 * @example
 * catch (e) {
 *   if (isApiError(e)) toast(e.error);
 * }
 */
export function isApiError(e: unknown): e is ApiError {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof (e as Record<string, unknown>).error === "string"
  );
}

/**
 * Parses the ApiError shape from a non-ok Response and throws an Error with
 * the human-readable message from the body. Falls back to the HTTP status
 * text when the body cannot be parsed as JSON or lacks an `error` field.
 *
 * Always returns `Promise<never>` — callers can `await handleApiError(res)` in
 * a non-ok branch without needing a separate throw.
 *
 * @example
 * const res = await fetch("/api/endpoint");
 * if (!res.ok) await handleApiError(res);
 */
export async function handleApiError(response: Response): Promise<never> {
  let message = response.statusText || `HTTP ${response.status}`;

  try {
    const body: unknown = await response.json();
    if (isApiError(body)) {
      message = body.error;
    }
  } catch {
    // Body was not valid JSON — fall through to the status-text message.
  }

  throw new Error(message);
}
