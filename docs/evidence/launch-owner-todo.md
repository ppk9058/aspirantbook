# Launch Owner Action Items & Sign-Off Checklist

**Branch:** `feat/launch-blockers`  
**Platform:** AspirantBook (aspirantbook.com)  
**Legal Entity:** Prince Singh (Sole Proprietor), trading as AspirantBook  
**Status:** Action Required Before Public Launch  

This document tracks items that require external owner confirmation, legal counsel review, or infrastructure setup prior to public go-live.

---

## 1. Registered Address & PIN Code Verification
- **Current Configured Address:**  
  `Pawar View, RK Puram, Near IIT Delhi, Hauz Khas, New Delhi, Delhi - 110016`
- **Owner Action:**  
  TODO: Owner to confirm the exact 6-digit postal PIN code for the physical Hauz Khas / RK Puram premises (e.g. verify if 110016 vs 110022 applies). If changed, update `REGISTERED_ADDRESS` in `.env` or edit the fallback in `lib/config/brand.ts`.

---

## 2. Grievance Redressal Email & Cloudflare Alias
- **Designated Grievance Officer:** Prince Singh  
- **Primary Grievance Email:** `grievance@aspirantbook.com`  
- **Fallback Email:** `ppk5859@gmail.com`  
- **Owner Action:**  
  TODO: Owner must configure the Cloudflare Email Routing alias for `grievance@aspirantbook.com` to forward directly to Prince Singh's inbox. If the custom domain email alias is delayed or unavailable at launch, update `GRIEVANCE_EMAIL` in the deployment environment to `ppk5859@gmail.com`.

---

## 3. Legal Review of Draft Refund Policy & Grievance Timelines
- **Rendered Surface:** `/refund` (Cancellation & Refund Policy)
- **Digital Products Policy Rules Rendered:**
  - Mock test series: Full refund within 48 hours if no test was started.
  - Video courses: Refund within 7 days if less than 10% coursework accessed.
  - Live batches: Full refund before class 1; within 7 days if <= 2 classes attended.
  - ePDF books: Non-refundable once downloaded, except duplicate charge or corrupt file.
  - 100% refund for duplicate charges or service cancellation.
  - 5-7 working days processing timeline.
  - Grievance acknowledgement within 48 hours, resolution within 1 month.
- **Owner Action:**  
  TODO: Owner must submit the draft refund policy and grievance resolution timelines to legal counsel for formal review to ensure strict compliance with the Consumer Protection (E-Commerce) Rules, 2020.

---

## 4. Support Hours Confirmation
- **Current Configured Hours:** `Mon-Sat, 10:00 AM - 6:00 PM IST`
- **Owner Action:**  
  TODO: Owner to confirm customer support operating hours and phone helpline availability (`+91 8340665934`). If different, edit `supportHours` in `lib/config/brand.ts` or set `SUPPORT_HOURS` environment variable.

---

## 5. Chartered Accountant (CA) & Legal Review of Data Retention Procedure
- **Internal Document:** `docs/evidence/deletion-procedure.md`
- **Draft Retention Defaults Configured:**
  - Category A (Account/PII): 30-day recovery grace window prior to irreversible data erasure.
  - Category B (Exam History): Retain anonymized exam answer records indefinitely for cohort percentiles, difficulty calibration, and leaderboard statistical integrity.
  - Category C (Financial & Tax): Retain payment logs and GST invoices for 8 statutory fiscal years per Section 128 of the Companies Act 2013 and the Income Tax Act 1961.
  - Category D (Doubt Queries): Purge raw doubt attachment screenshots after 90 days.
- **Owner Action:**  
  TODO: Owner and CA must review and confirm statutory compliance of the retention and destruction timelines before automated or manual bulk purges are executed.

---

## 6. Flipping CI Placeholder Check to Blocking
- **Current State:**  
  The `check-launch-placeholders` job in `.github/workflows/ci.yml` runs `npm run check:launch-placeholders` with `continue-on-error: true`.
- **How to Flip to Blocking:**  
  In `.github/workflows/ci.yml`, locate the `check-launch-placeholders` job and either remove `continue-on-error: true` or set `continue-on-error: false`. Once flipped, any merge or PR introducing unresolved `[OWNER TO CONFIRM` markers in `app/` or `lib/` will fail the CI pipeline.
