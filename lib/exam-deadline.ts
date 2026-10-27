/**
 * A14: one shared exam deadline policy for the web attempt routes
 * (`app/api/exam/attempt/[attemptId]/*`) and the v1/mobile service
 * (`lib/services/exam.service.ts`).
 *
 * Rule: answers may only be written while the attempt is inside the duration
 * window plus a short grace period. Past the grace period every platform
 * rejects late answer writes with the same stable message, and the check
 * happens BEFORE any write.
 */

export const ANSWER_WRITE_GRACE_MILLIS = 30 * 1000;

/**
 * The single rejection reason. v1 surfaces it after the `BAD_REQUEST:` prefix
 * (mapped to HTTP 400); the web routes return it in the response body.
 */
export const DEADLINE_EXPIRED_MESSAGE = "Attempt deadline has expired; answers are rejected";

function asMillis(startedAt: Date | string | number): number {
  if (startedAt instanceof Date) return startedAt.getTime();
  if (typeof startedAt === "number") return startedAt;
  return new Date(startedAt).getTime();
}

export interface ExamAttemptTiming {
  startedAt: Date | string | number;
  durationMinutes: number;
}

export interface ExamDeadline {
  /** Hard end of the timer (startedAt + duration). */
  deadlineMs: number;
  /** deadlineMs + grace: the last moment an answer write is accepted. */
  graceDeadlineMs: number;
  nowMs: number;
  /** Positive when `now` is past the grace deadline. */
  overdueMs: number;
  /** True when an answer write is still allowed. */
  withinGrace: boolean;
  /** True when the attempt is over and writes must be rejected. */
  expired: boolean;
}

export function examDeadline(
  attempt: ExamAttemptTiming,
  now: Date = new Date()
): ExamDeadline {
  const startedAtMs = asMillis(attempt.startedAt);
  const durationMinutes =
    Number.isFinite(attempt.durationMinutes) && attempt.durationMinutes > 0
      ? attempt.durationMinutes
      : 60;
  const deadlineMs = startedAtMs + durationMinutes * 60 * 1000;
  const graceDeadlineMs = deadlineMs + ANSWER_WRITE_GRACE_MILLIS;
  const nowMs = now.getTime();

  return {
    deadlineMs,
    graceDeadlineMs,
    nowMs,
    overdueMs: Math.max(0, nowMs - graceDeadlineMs),
    withinGrace: nowMs <= graceDeadlineMs,
    expired: nowMs > graceDeadlineMs,
  };
}

export function isAnswerWriteAllowed(
  attempt: ExamAttemptTiming,
  now: Date = new Date()
): boolean {
  return examDeadline(attempt, now).withinGrace;
}
