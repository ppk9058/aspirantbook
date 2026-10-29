# Data Deletion & Privacy Erasure Procedure

**Document Version:** 1.0  
**Authority:** Data Governance & Legal Compliance Team  
**Scope:** Manual processing of `DataDeletionRequest` records across web and mobile platforms

---

## 1. Governance Principles & Strict Guardrails

1. **No Automatic Hard Deletion:**  
   Per system policy, automatic hard deletion is strictly forbidden to prevent irreversible data loss and regulatory non-compliance. All deletion requests queue in `DataDeletionRequest` and undergo review by an authorized administrator (`ADMIN` role).
2. **Audit Logging Required:**  
   Every status transition (`PENDING` -> `IN_REVIEW` -> `COMPLETED` | `REJECTED`) writes a permanent audit entry to the `AuditLog` table with administrator credentials, timestamp, previous status, new status, and detailed administrative notes.
3. **Statutory Retention Overrides:**  
   Applicable statutory retention requirements (such as Indian financial and tax compliance under the Companies Act 2013 and Income Tax Act 1961) supersede general user erasure requests for financial transactions and tax invoices.

---

## 2. Category-by-Category Processing Procedure

When an administrator reviews a `DataDeletionRequest` in `/admin/data-deletion`, the following operations must be performed for each data category before marking the request `COMPLETED`:

### Category A: Identity, Account & Device Data
- **Target Tables / Models:** `User`, `Account`, `DeviceSession`, `DevicePushToken`, `PasswordResetToken`, `EmailVerificationToken`.
- **Action:**
  1. Revoke all active sessions (`DeviceSession.revokedAt = now()`).
  2. Delete push notification device tokens (`DevicePushToken.deleteMany()`).
  3. Decouple OAuth provider credentials (`Account.deleteMany()`).
  4. Deactivate the user and anonymize personal identifiers:
     - `isActive = false`
     - `email = "deleted-<userId>@anonymized.trillionskill.local"`
     - `name = "Deleted User"`
     - `phoneNumber = null`
     - `password = null`
     - `image = null`
     - Increment `sessionVersion` to revoke all issued JWT tokens.
- **Retention Rule:** `[OWNER TO CONFIRM: 30-day grace recovery window before irreversible PII wipe]`

---

### Category B: Academic, Course & Attempt History
- **Target Tables / Models:** `CourseEnrollment`, `LessonProgress`, `ExamAttempt`, `ExamAttemptAnswer`, `UserGoal`, `Bookmark`.
- **Action:**
  1. Retain attempt records linked to the anonymized `userId` so that cohort percentiles, question difficulty ratings, and historical test leaderboards remain statistically valid and tamper-evident.
  2. Individual learner identifying details are decoupled via Category A anonymization.
  3. Clear personalized course bookmarks and individual study goals.
- **Retention Rule:** `[OWNER TO CONFIRM: Retain anonymized exam answer records indefinitely for cohort analytics or purge after 3 years]`

---

### Category C: Financial & Statutory Records
- **Target Tables / Models:** `Order`, `Payment`, `RazorpayWebhookEvent`, `BookOrder`, `Subscription`.
- **Action:**
  1. **DO NOT DELETE FINANCIAL RECORDS.** Under Indian financial and tax regulations (Section 128 of the Companies Act 2013 and Income Tax Act 1961), all books of account, invoices, payment transaction IDs, and GST details must be maintained in good order for a minimum of 8 statutory fiscal years.
  2. Ensure the user's name on invoices remains archived for auditing while their login account is disabled.
- **Retention Rule:** `[OWNER TO CONFIRM: Maintain financial payment logs and GST invoices for exactly 8 fiscal years per statutory mandate]`

---

### Category D: AI & Chat Data
- **Target Tables / Models:** `DoubtTicket`, `DemoChat`, `AiParseHistory`.
- **Action:**
  1. Scrub any personal phone numbers, emails, or names submitted inside open-ended doubt queries.
  2. Disassociate user identity from AI prompt interaction logs.
- **Retention Rule:** `[OWNER TO CONFIRM: Purge raw doubt attachment screenshots after 90 days; retain anonymized technical query embeddings for model evaluation]`

---

## 3. Administrator Status Workflow

```
[ PENDING ] ─────────► [ IN_REVIEW ] ─────────► [ COMPLETED ] (Terminal)
     │                       │
     └───────────────────────┴────────────────► [ REJECTED ] (Terminal)
```

1. **PENDING:** Initial state upon submission from mobile settings or public web form `/data-deletion`.
2. **IN_REVIEW:** Administrator has picked up the request, verified identity, and initiated Category A anonymization.
3. **COMPLETED:** All category checklists completed, administrative notes documented, `processedAt` timestamp generated. Terminal state. Cannot transition back.
4. **REJECTED:** Request denied (e.g. fraudulent request, dispute, unable to verify identity). Detailed administrative rejection notes required. Terminal state.
