/**
 * Zod validation schemas for Content Engine API routes
 */

import { z } from "zod"

export const AddBatchSchema = z.object({
  pastedText: z
    .string()
    .min(5, "Pasted text is required")
    .max(2 * 1024 * 1024, "Pasted text must be 2MB or less"),
  defaultSubject: z.string().max(100).optional(),
  defaultTopic: z.string().max(100).optional(),
  defaultExam: z.string().max(100).optional(),
  defaultYear: z.string().max(10).optional(),
})

export type AddBatchInput = z.infer<typeof AddBatchSchema>

export const BulkAssignSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1, "At least one question must be selected"),
  subject: z.string().min(1, "Subject is required").max(100),
  topic: z.string().min(1, "Topic is required").max(100),
  subjectHindi: z.string().max(100).optional(),
  topicHindi: z.string().max(100).optional(),
  exam: z.string().max(100).optional(),
  year: z.string().max(10).optional(),
})

export type BulkAssignInput = z.infer<typeof BulkAssignSchema>

export const HindiImportSchema = z.object({
  rawInput: z
    .string()
    .min(5, "Import data is required")
    .max(5 * 1024 * 1024, "Import payload must be 5MB or less"),
})

export type HindiImportInput = z.infer<typeof HindiImportSchema>

export const HindiReviewToggleSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  isReviewed: z.boolean(),
})

export type HindiReviewToggleInput = z.infer<typeof HindiReviewToggleSchema>

export const ExamAliasSchema = z.object({
  name: z.string().min(1, "Exam name is required").max(80),
  pattern: z.string().max(120).optional(),
  isEnabled: z.boolean().default(true),
})

export type ExamAliasInput = z.infer<typeof ExamAliasSchema>

export const PublishWaveSchema = z.object({
  waveSize: z.number().int().min(1).max(1000).default(200),
})

export type PublishWaveInput = z.infer<typeof PublishWaveSchema>

export const PublishToggleSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1),
  isPublished: z.boolean(),
})

export type PublishToggleInput = z.infer<typeof PublishToggleSchema>

export const SettingUpdateSchema = z.object({
  key: z.string().min(1).max(50),
  value: z.any(),
})

export type SettingUpdateInput = z.infer<typeof SettingUpdateSchema>
