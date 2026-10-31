/**
 * Data Retention & Privacy Erasure Configuration Constants
 * Retention values are DRAFT - each requires owner / CA confirmation before permanent operationalization.
 * Reference: docs/evidence/deletion-procedure.md
 */

// [DRAFT - owner/CA to confirm: 30-day recovery window before irreversible PII wipe]
export const RETENTION_ACCOUNT_RECOVERY_DAYS = 30;

// [DRAFT - owner/CA to confirm: anonymized exam answers retained for analytics indefinitely]
export const RETENTION_EXAM_ANSWERS_INDEFINITE = true;

// [DRAFT - owner/CA to confirm: payment logs and GST invoices retained 8 statutory fiscal years]
export const RETENTION_FINANCIAL_YEARS = 8;

// [DRAFT - owner/CA to confirm: doubt attachments purged after 90 days]
export const RETENTION_DOUBT_ATTACHMENT_DAYS = 90;
