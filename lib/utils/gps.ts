/**
 * Wraps navigator.geolocation.getCurrentPosition in a Promise.
 *
 * @returns Resolves with the current GeolocationPosition, or rejects with
 *          a GeolocationPositionError if the browser refuses or times out.
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

/**
 * Returns true when a timestamp is older than the given threshold.
 *
 * @param ts          - Timestamp in milliseconds (e.g. from Date.now() or a
 *                      Redis-cached location's `ts` field).
 * @param thresholdMs - Maximum acceptable age in milliseconds.
 * @returns true if the timestamp is stale (older than thresholdMs ago).
 *
 * @example
 * // Stale if location was last updated more than 60 seconds ago
 * isLocationStale(driverLocation.ts, 60_000)
 */
export function isLocationStale(ts: number, thresholdMs: number): boolean {
  return ts < Date.now() - thresholdMs;
}
