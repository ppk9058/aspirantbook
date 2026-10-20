import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  ViewerProfileDto,
  UpdateProfileRequest,
  DeleteAccountRequest,
  DeleteAccountResponseDto,
} from "@aspirantbook/shared";
import { invalidateViewerCache } from "@/lib/api/v1/viewer";

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

export async function deleteViewerAccount(
  userId: string,
  options: DeleteAccountRequest
): Promise<DeleteAccountResponseDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      password: true,
      email: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new Error("NOT_FOUND: User account not found or already deleted");
  }

  // Protect last remaining administrator
  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    if (adminCount <= 1) {
      throw new Error("FORBIDDEN: Cannot delete the last remaining active administrator account");
    }
  }

  // Re-authentication check
  if (user.password) {
    if (!options.password) {
      throw new Error("VALIDATION_ERROR: Password re-authentication required to delete account");
    }
    const isPasswordValid = await bcrypt.compare(options.password, user.password);
    if (!isPasswordValid) {
      throw new Error("FORBIDDEN: Incorrect password confirmation");
    }
  } else {
    // Users without password (OAuth or OTP registration)
    if (
      options.confirmation !== "DELETE_ACCOUNT" &&
      options.confirmation !== "DELETE"
    ) {
      throw new Error("VALIDATION_ERROR: Confirmation code 'DELETE_ACCOUNT' required to delete account");
    }
  }

  // 1. Invalidate active device sessions (mobile)
  await prisma.deviceSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // 2. Delete push notification device tokens
  await prisma.devicePushToken.deleteMany({
    where: { userId },
  });

  // 3. Remove OAuth provider link
  await prisma.account.deleteMany({
    where: { userId },
  });

  // 4. Anonymize user personal data and deactivate account
  // Note: Financial/payment/order records and exam attempts remain linked to user.id for statutory audits
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      email: `deleted-${user.id}@anonymized.trillionskill.local`,
      name: "Deleted User",
      phoneNumber: null,
      image: null,
      password: null,
      sessionVersion: { increment: 1 },
    },
  });

  // 5. Invalidate in-process cache
  invalidateViewerCache(userId);

  return {
    deleted: true,
    anonymized: true,
    message: "Account and personal data have been anonymized and all sessions revoked.",
  };
}
