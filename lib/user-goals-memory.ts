// In-memory fallback map for active user goals across the server session
export const userGoalsMemoryMap = new Map<string, { goalId: string; subGoalId?: string; updatedAt: string }>()
