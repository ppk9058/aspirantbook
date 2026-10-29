/**
 * Mobile Data Deletion Helper Module
 *
 * Implements Google Play & App Store compliant account/data deletion flow:
 * - Submits authenticated deletion request to /api/v1/data-deletion
 * - Fetches active deletion request status (PENDING, IN_REVIEW, COMPLETED, REJECTED)
 * - Returns the canonical public web deletion URL for unauthenticated learners
 */

export interface DeletionRequestResult {
  id: string;
  status: "PENDING" | "IN_REVIEW" | "COMPLETED" | "REJECTED";
  requestedAt: string;
  processedAt?: string | null;
  adminNotes?: string | null;
  isExisting?: boolean;
}

export function getPublicDeletionUrl(baseUrl?: string): string {
  const host = baseUrl || process.env.EXPO_PUBLIC_APP_URL || "https://aspirantbook.com";
  const cleanHost = host.replace(/\/+$/, "");
  return `${cleanHost}/data-deletion`;
}

export function formatDeletionStatus(status: string): {
  label: string;
  description: string;
  variant: "warning" | "info" | "success" | "danger" | "neutral";
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending Review",
        description: "Your deletion request has been submitted and is awaiting data governance review.",
        variant: "warning",
      };
    case "IN_REVIEW":
      return {
        label: "Under Review",
        description: "A data privacy administrator is actively verifying and processing your deletion request.",
        variant: "info",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        description: "Your account credentials and personal data have been permanently anonymized.",
        variant: "success",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        description: "Your request could not be processed. Please refer to support for details.",
        variant: "danger",
      };
    default:
      return {
        label: status || "Unknown",
        description: "Status unrecognized.",
        variant: "neutral",
      };
  }
}

export async function submitMobileDeletionRequest(
  apiClient: { post: (endpoint: string, data?: any) => Promise<any> },
  reason?: string
): Promise<{ ok: boolean; data?: DeletionRequestResult; error?: string }> {
  try {
    const res = await apiClient.post("/api/v1/data-deletion", {
      reason: reason?.trim() || "User requested deletion via mobile app settings",
    });

    if (res?.ok && res?.data) {
      return { ok: true, data: res.data };
    }
    return { ok: false, error: res?.error?.message || "Failed to submit deletion request" };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Network error submitting deletion request" };
  }
}

export async function fetchMobileDeletionStatus(
  apiClient: { get: (endpoint: string) => Promise<any> }
): Promise<{ ok: boolean; request: DeletionRequestResult | null; error?: string }> {
  try {
    const res = await apiClient.get("/api/v1/data-deletion");
    if (res?.ok) {
      return { ok: true, request: res.data?.request || null };
    }
    return { ok: false, request: null, error: res?.error?.message || "Failed to fetch deletion status" };
  } catch (err: any) {
    return { ok: false, request: null, error: err?.message || "Network error fetching deletion status" };
  }
}
