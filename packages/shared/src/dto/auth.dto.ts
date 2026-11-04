import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
  deviceName: z.string().max(100).optional(),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  appVersion: z.string().max(50).optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().max(20).optional(),
  selectedGoal: z.string().max(50).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must be 13+ and agree to the Terms and Privacy Policy" }),
  }),
  deviceName: z.string().max(100).optional(),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  appVersion: z.string().max(50).optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(20, "Refresh token is required"),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const GoogleAuthRequestSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
  deviceName: z.string().max(100).optional(),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  appVersion: z.string().max(50).optional(),
});

export type GoogleAuthRequest = z.infer<typeof GoogleAuthRequestSchema>;

export const OtpRequestSchema = z.object({
  phoneNumber: z.string().min(10, "Valid phone number required").max(15),
});

export type OtpRequest = z.infer<typeof OtpRequestSchema>;

export const OtpVerifySchema = z.object({
  phoneNumber: z.string().min(10, "Valid phone number required").max(15),
  code: z.string().length(6, "Verification code must be 6 digits"),
  verificationId: z.string().min(1, "Verification id is required").max(200),
  deviceName: z.string().max(100).optional(),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  appVersion: z.string().max(50).optional(),
});

export type OtpVerifyRequest = z.infer<typeof OtpVerifySchema>;

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds (e.g. 900 for 15 min)
  tokenType: "Bearer";
}

export interface UserSummaryDto {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  image: string | null;
  phoneNumber: string | null;
  goal: string | null;
  emailVerified: Date | null;
  isActive: boolean;
}

export interface LoginResponseDto {
  tokens: AuthTokensDto;
  user: UserSummaryDto;
}

export interface DeviceSessionDto {
  id: string;
  deviceName: string | null;
  platform: string;
  appVersion: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}
