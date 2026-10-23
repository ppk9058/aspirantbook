/**
 * Query keys are part of the cache contract: every filter the request depends
 * on must be part of the key, otherwise changing that filter keeps serving the
 * previous filter's cached data.
 */
export function buildCoursesQueryKey(
  goalId: string,
  difficulty: string,
  search: string
): readonly ["courses-list", string, string, string] {
  return ["courses-list", goalId, difficulty, search] as const;
}
