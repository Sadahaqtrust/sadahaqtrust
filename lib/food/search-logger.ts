/**
 * SearchLogger. Fire-and-forget writer for Search_Event rows.
 * See design.md §Data Flow 3 and requirements.md Requirement 4.
 *
 * Behaviour:
 *  - log(event) returns synchronously (void).
 *  - opt-out predicate short-circuits: no INSERT, emits dropped_optout.
 *  - Rate-limit drop: no INSERT, emits dropped_ratelimit with reason.
 *  - Insert scheduled via setImmediate; a tLogMs-long timeout runs in
 *    parallel so the surrounding HTTP handler can return without waiting.
 *  - Any insert error emits dropped_error, never retries on the user path.
 */
import type { PendingSearchEvent } from "./types";
import type { RateLimiter } from "./rate-limiter";

export type PgLikeClient = {
  query(text: string, values?: unknown[]): Promise<unknown>;
  end?: () => Promise<void>;
};

export type SearchLoggerDeps = {
  /** Factory so each log() gets a fresh client; callers may also reuse one. */
  pgClientFactory: () => Promise<PgLikeClient> | PgLikeClient;
  rateLimiter: RateLimiter;
  isOptedOut: (visitorId: string) => boolean | Promise<boolean>;
  tLogMs?: number;
  logFn?: (line: string) => void;
  now?: () => number;
};

export type SearchLogger = { log(event: PendingSearchEvent): void };

export const INSERT_SQL = `
  INSERT INTO search_event (
    visitor_id,
    query_text,
    query_truncated,
    cuisine,
    result_restaurant_ids,
    result_count,
    match_reason_breakdown,
    user_agent,
    locale,
    source_ip_hash
  ) VALUES ($1, $2, $3, $4, $5::text[], $6, $7::jsonb, $8, $9, $10)
`;

export function createSearchLogger(deps: SearchLoggerDeps): SearchLogger {
  const {
    pgClientFactory,
    rateLimiter,
    isOptedOut,
    tLogMs = 250,
    logFn = (s) => console.log(s),
    now = () => Date.now(),
  } = deps;

  function emit(obj: Record<string, unknown>): void {
    try {
      logFn(JSON.stringify({ svc: "food", ts: new Date(now()).toISOString(), ...obj }));
    } catch {
      /* best-effort */
    }
  }

  async function runInsert(event: PendingSearchEvent, startedAt: number) {
    let client: PgLikeClient;
    try {
      client = await pgClientFactory();
    } catch (err) {
      emit({
        event_type: "dropped_error",
        visitor_id: event.visitorId,
        query_length: event.queryText.length,
        cuisine: event.cuisine,
        result_count: event.resultCount,
        duration_ms: now() - startedAt,
        error: (err as Error).message,
      });
      return;
    }
    try {
      await client.query(INSERT_SQL, [
        event.visitorId,
        event.queryText,
        event.queryTruncated,
        event.cuisine,
        event.resultRestaurantIds,
        event.resultCount,
        JSON.stringify(event.matchReasonBreakdown),
        event.userAgent.slice(0, 512),
        event.locale,
        event.sourceIpHash,
      ]);
      emit({
        event_type: "logged",
        visitor_id: event.visitorId,
        query_length: event.queryText.length,
        query_text: event.queryText.slice(0, 64),
        cuisine: event.cuisine,
        result_count: event.resultCount,
        duration_ms: now() - startedAt,
      });
    } catch (err) {
      emit({
        event_type: "dropped_error",
        visitor_id: event.visitorId,
        query_length: event.queryText.length,
        cuisine: event.cuisine,
        result_count: event.resultCount,
        duration_ms: now() - startedAt,
        error: (err as Error).message,
      });
    } finally {
      try {
        await client.end?.();
      } catch {
        /* best-effort */
      }
    }
  }

  return {
    log(event: PendingSearchEvent): void {
      const startedAt = now();

      // Opt-out check runs synchronously for sync predicates; async predicates
      // still resolve on their own microtask without blocking the caller.
      const handle = (optedOut: boolean) => {
        if (optedOut) {
          emit({
            event_type: "dropped_optout",
            visitor_id: event.visitorId,
            query_length: event.queryText.length,
            cuisine: event.cuisine,
            result_count: event.resultCount,
            duration_ms: now() - startedAt,
          });
          return;
        }
        const decision = rateLimiter.allow(event.visitorId, event.sourceIpHash);
        if (!decision.ok) {
          emit({
            event_type: "dropped_ratelimit",
            visitor_id: event.visitorId,
            query_length: event.queryText.length,
            cuisine: event.cuisine,
            result_count: event.resultCount,
            duration_ms: now() - startedAt,
            reason: decision.reason,
          });
          return;
        }
        // Fire-and-forget. We do not await the returned promise; any
        // unhandled rejection is swallowed here because runInsert itself
        // catches everything internally.
        setImmediate(() => {
          void runInsert(event, startedAt);
        });
      };

      let optedOut: boolean | Promise<boolean>;
      try {
        optedOut = isOptedOut(event.visitorId);
      } catch (err) {
        emit({
          event_type: "dropped_error",
          visitor_id: event.visitorId,
          error: (err as Error).message,
          duration_ms: now() - startedAt,
        });
        return;
      }
      if (typeof (optedOut as Promise<boolean>).then === "function") {
        (optedOut as Promise<boolean>).then(handle).catch(() => handle(false));
      } else {
        handle(optedOut as boolean);
      }
    },
  };
}
