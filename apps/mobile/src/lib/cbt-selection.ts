/**
 * Returns the question at `index` from the already-section-filtered list.
 *
 * Never falls back to another list: a fallback to the unfiltered questions can
 * silently target a question from a different section, recording the answer
 * against the wrong question after a section switch.
 */
export function selectQuestionAtIndex<T>(
  questions: readonly T[] | null | undefined,
  index: number
): T | undefined {
  if (!questions || !Number.isInteger(index) || index < 0 || index >= questions.length) {
    return undefined;
  }
  return questions[index];
}
