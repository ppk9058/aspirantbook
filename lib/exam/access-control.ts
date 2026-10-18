export interface UserSessionContext {
  id?: string | null;
  role?: string | null;
}

export interface TestAccessContext {
  id: string;
  isLive?: boolean | null;
  liveStartAt?: Date | string | null;
  liveEndAt?: Date | string | null;
  createdById?: string | null;
}

export interface AttemptAccessContext {
  id: string;
  userId: string;
  testId: string;
  status: string;
  submittedAt?: Date | string | null;
}

export interface AccessDecision {
  allowed: boolean;
  statusCode: 200 | 401 | 403 | 404 | 409;
  reason: string;
  isLiveActive?: boolean;
}

/**
 * Evaluates whether a user can access solutions (questions, correct answers, and explanations).
 *
 * Enforces:
 * 1. Authentication (401).
 * 2. Strict ownership: students can only access their own attempts (403).
 * 3. Submission state: attempt must be SUBMITTED (403/409).
 * 4. Live test window: if isLive is true, liveEndAt must have passed on server clock (403).
 * 5. Intentional Staff bypass:
 *    - ADMIN: system-wide administration and moderation.
 *    - TEACHER: only for tests they created (createdById === user.id).
 */
export function canViewSolutions(
  user: UserSessionContext | null | undefined,
  test: TestAccessContext,
  attempt?: AttemptAccessContext | null
): AccessDecision {
  if (!user?.id) {
    return { allowed: false, statusCode: 401, reason: "Authentication required to view solutions" };
  }

  const role = user.role;

  // Intentional Admin bypass: Platform administrators have access for system support and moderation.
  if (role === "ADMIN") {
    return { allowed: true, statusCode: 200, reason: "Admin access granted" };
  }

  // Intentional Teacher author bypass: Teachers can preview solutions ONLY for tests they authored.
  if (role === "TEACHER" && test.createdById && test.createdById === user.id) {
    return { allowed: true, statusCode: 200, reason: "Teacher author access granted" };
  }

  // For students (and non-author teachers): a submitted attempt is required.
  if (!attempt) {
    return { allowed: false, statusCode: 403, reason: "No submitted attempt found for this test" };
  }

  if (attempt.userId !== user.id) {
    return { allowed: false, statusCode: 403, reason: "Forbidden: You can only view your own attempt solutions" };
  }

  if (attempt.status !== "SUBMITTED") {
    return { allowed: false, statusCode: 403, reason: "This attempt has not been submitted yet" };
  }

  // Live test rule: check server clock
  if (test.isLive) {
    const now = new Date();
    if (test.liveEndAt) {
      const liveEndTime = new Date(test.liveEndAt);
      if (now < liveEndTime) {
        return {
          allowed: false,
          statusCode: 403,
          reason: `Solutions will be available once the live test concludes at ${liveEndTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
          isLiveActive: true,
        };
      }
    } else {
      return {
        allowed: false,
        statusCode: 403,
        reason: "Solutions will be available once the live test concludes",
        isLiveActive: true,
      };
    }
  }

  return { allowed: true, statusCode: 200, reason: "Access granted" };
}

/**
 * Evaluates whether a user can access the test leaderboard / rankings.
 *
 * Enforces:
 * 1. Authentication (401).
 * 2. Completion requirement: user must have at least one SUBMITTED attempt of this test (403).
 * 3. Live test window: if isLive is true, liveEndAt must have passed on server clock (403).
 * 4. Intentional Staff bypass:
 *    - ADMIN: platform administration.
 *    - TEACHER: only for tests they created (createdById === user.id).
 */
export function canViewLeaderboard(
  user: UserSessionContext | null | undefined,
  test: TestAccessContext,
  hasSubmittedAttempt: boolean
): AccessDecision {
  if (!user?.id) {
    return { allowed: false, statusCode: 401, reason: "Authentication required to view leaderboard" };
  }

  const role = user.role;

  // Intentional Admin bypass: Platform administrators have access for verification.
  if (role === "ADMIN") {
    return { allowed: true, statusCode: 200, reason: "Admin access granted" };
  }

  // Intentional Teacher author bypass: Teachers can view leaderboard ONLY for tests they authored.
  if (role === "TEACHER" && test.createdById && test.createdById === user.id) {
    return { allowed: true, statusCode: 200, reason: "Teacher author access granted" };
  }

  // Students must have completed and submitted the test
  if (!hasSubmittedAttempt) {
    return {
      allowed: false,
      statusCode: 403,
      reason: "You must complete and submit this test to unlock the leaderboard and rankings",
    };
  }

  // Live test rule: check server clock
  if (test.isLive) {
    const now = new Date();
    if (test.liveEndAt) {
      const liveEndTime = new Date(test.liveEndAt);
      if (now < liveEndTime) {
        return {
          allowed: false,
          statusCode: 403,
          reason: `Rankings will be revealed once the live test concludes at ${liveEndTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
          isLiveActive: true,
        };
      }
    } else {
      return {
        allowed: false,
        statusCode: 403,
        reason: "Rankings will be revealed once the live test concludes",
        isLiveActive: true,
      };
    }
  }

  return { allowed: true, statusCode: 200, reason: "Access granted" };
}
