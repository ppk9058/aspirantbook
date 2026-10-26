import { prisma } from "@/lib/prisma";
import { GOAL_CATEGORIES } from "@aspirantbook/shared";

export async function getGoalsList() {
  // Goal categories from canonical shared constants
  return GOAL_CATEGORIES.map((g) => ({
    id: g.id,
    name: g.label,
    description: g.description,
  }));
}
