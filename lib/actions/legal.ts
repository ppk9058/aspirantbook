"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createFormSubmission } from "@/lib/forms-service";
import { sendEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

const DataDeletionSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  reason: z.string().trim().max(1000).nullish(),
  confirmText: z.string().refine((val) => val === "DELETE", {
    message: "You must type 'DELETE' to confirm your request",
  }),
});

const ContactFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please provide a valid email address"),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
});

export async function submitDataDeletionRequest(prevState: any, formData: FormData) {
  let clientIp = "127.0.0.1";
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    clientIp = getClientIp(h);
  } catch {
    clientIp = "127.0.0.1";
  }

  // Rate limiting: max 5 deletion requests per hour per IP (relaxed in test)
  const isTest = process.env.APP_ENV === "test" || process.env.NODE_ENV === "test";
  const maxAttempts = isTest ? 1000 : 5;
  const rateLimit = await checkRateLimit(`data-deletion:${clientIp}`, maxAttempts, 3600, { failClosed: true });
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many deletion requests submitted. Please try again later." };
  }

  const raw = {
    email: formData.get("email"),
    reason: formData.get("reason"),
    confirmText: formData.get("confirmText"),
  };

  const parsed = DataDeletionSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Invalid submission";
    return { success: false, error: firstError };
  }

  const { email, reason } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    // Check if user exists to link userId if applicable
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true },
    });

    // Create DataDeletionRequest record
    const requestRecord = await prisma.dataDeletionRequest.create({
      data: {
        userId: existingUser?.id || null,
        email: normalizedEmail,
        reason: reason || null,
        status: "PENDING",
      },
    });

    // Send confirmation email via email service
    await sendEmail({
      to: normalizedEmail,
      subject: "Account Data Deletion Request Received - AspirantBook",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Data Deletion Request Received</h2>
          <p>We have received your request to delete your account and personal data associated with <strong>${normalizedEmail}</strong>.</p>
          <p><strong>Request Reference:</strong> ${requestRecord.id}</p>
          <p>Our Data Governance team will process your request within 7 business days in accordance with applicable data privacy regulations.</p>
          <p>If you did not request this deletion, please contact our support team immediately.</p>
        </div>
      `,
    }).catch((err) => {
      console.warn("Could not dispatch deletion confirmation email:", err);
    });

    return {
      success: true,
      message: "Your deletion request has been submitted successfully (Reference: " + requestRecord.id + "). Our team will process it within 7 business days.",
    };
  } catch (error) {
    console.error("Data deletion request submission failed:", error);
    return { success: false, error: "An unexpected error occurred while processing your request. Please try again later." };
  }
}

export async function submitContactForm(prevState: any, formData: FormData) {
  let clientIp = "127.0.0.1";
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    clientIp = getClientIp(h);
  } catch {
    clientIp = "127.0.0.1";
  }

  // Rate limit: max 10 contact messages per hour per IP (relaxed in test)
  const isTest = process.env.APP_ENV === "test" || process.env.NODE_ENV === "test";
  const maxAttempts = isTest ? 1000 : 10;
  const rateLimit = await checkRateLimit(`contact-form:${clientIp}`, maxAttempts, 3600, { failClosed: true });
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many contact submissions. Please try again later." };
  }

  // Turnstile verification behind TURNSTILE_ENABLED flag
  const turnstileToken = (formData.get("cf-turnstile-response") || formData.get("turnstileToken")) as string | null;
  const turnstileCheck = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!turnstileCheck.success) {
    return { success: false, error: turnstileCheck.error || "Security verification failed. Please try again." };
  }

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  };

  const parsed = ContactFormSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Invalid submission";
    return { success: false, error: firstError };
  }

  const { name, email, subject, message } = parsed.data;

  try {
    await createFormSubmission({
      formSlug: "contact-us",
      userName: name,
      userEmail: email.toLowerCase(),
      formData: {
        subject,
        message,
        clientIp,
      },
    });

    return {
      success: true,
      message: "Thank you for reaching out! Your message has been received, and our support team will respond to your email shortly.",
    };
  } catch (error) {
    console.error("Contact form submission error:", error);
    return { success: false, error: "Failed to submit contact message. Please try again." };
  }
}
