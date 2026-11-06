export function formatActiveGoalLabel(goals: { name: string }[]): string {
    if (goals.length === 0) return "No goal selected"

    const [first, ...rest] = goals
    return rest.length > 0 ? `${first.name} +${rest.length}` : first.name
}
