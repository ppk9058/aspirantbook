import { z } from "zod";
import { UserSummaryDto } from "./auth.dto";

export const UpdateProfileRequestSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  goal: z.string().max(50).optional(),
  image: z.string().url().max(1000).optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export interface ViewerProfileDto extends UserSummaryDto {
  entitlements: {
    enrolledCoursesCount: number;
    activePassesCount: number;
    completedTestsCount: number;
    streakDays: number;
  };
}
