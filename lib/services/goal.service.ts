import { prisma } from "@/lib/prisma";
import { GOAL_CATEGORIES } from "@aspirantbook/shared";

export async function getGoalsList() {
  // Try querying dynamic Goal table if seeded, otherwise fallback to GOAL_CATEGORIES
  try {
    const goals = await prisma.goal.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    if (goals.length > 0) {
      return goals;
    }
  } catch {
    // Fall back to constants
  }

  return GOAL_CATEGORIES.map((g) => ({
    id: g.id,
    name: g.label,
    description: g.description,
  }));
}
