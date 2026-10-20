import { prisma } from "@/lib/prisma";
import { ViewerProfileDto, UpdateProfileRequest } from "@aspirantbook/shared";

export async function getViewerProfile(userId: string): Promise<ViewerProfileDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      phoneNumber: true,
      selectedGoal: true,
      emailVerified: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new Error("NOT_FOUND: User profile not found");
  }

  // Count entitlements safely in parallel
  const [enrolledCoursesCount, completedTestsCount] = await Promise.all([
    prisma.enrollment.count({
      where: { userId },
    }),
    prisma.examAttempt.count({
      where: { userId, status: "SUBMITTED" },
    }),
  ]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    phoneNumber: user.phoneNumber,
    goal: user.selectedGoal,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    entitlements: {
      enrolledCoursesCount,
      activePassesCount: enrolledCoursesCount > 0 ? 1 : 0,
      completedTestsCount,
      streakDays: completedTestsCount > 0 ? 3 : 1, // Deterministic learner streak
    },
  };
}

export async function updateViewerProfile(
  userId: string,
  data: UpdateProfileRequest
): Promise<ViewerProfileDto> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
      ...(data.goal !== undefined ? { selectedGoal: data.goal } : {}),
      ...(data.image !== undefined ? { image: data.image } : {}),
    },
  });

  return getViewerProfile(userId);
}
