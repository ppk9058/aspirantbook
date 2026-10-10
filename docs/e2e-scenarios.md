# Test series end-to-end scenario matrix

Runs use the Docker-only `trillionskill_test` database, a per-run `E2E-*` nonce, and Next.js on port 3045 with `NEXT_DIST_DIR=.next-test`. `AUTOMATED` means the named Playwright specs contain an observable assertion for the scenario. `BLOCKED` means the requested behavior cannot currently be exercised end to end because the application does not expose the required flow. Payment cases are not faked.

## Teacher authoring and catalogue

| ID | Status | Evidence / reason |
|---|---|---|
| T-01 | BLOCKED | The “Publish Test Series Package” modal sends an immediate publish request; there is no save-as-draft action. The spec verifies persisted title/category/description and records the current published state. |
| T-02 | BLOCKED | Studio can create a draft, but has no route or UI to reopen/edit that draft. A draft cannot be authored and then published as the same test through the available flow. |
| T-03 | AUTOMATED | `teacher-authoring-to-student.spec.ts` fills five questions through the Studio with A/B/C/D/A answers and compares persisted option fields and keys. |
| T-04 | BLOCKED | The Studio does not load a saved draft after navigation/reload. The automated test compares the persisted published test with the UI fixture instead. |
| T-05 | AUTOMATED | API-level negative cases assert HTTP 400 and unchanged DB row counts for empty question, empty option and missing answer. Duplicate option text is currently accepted. Empty explanation is NOT REQUIRED by `isQuestionFilled` or the parser. |
| T-06 | AUTOMATED | The Studio publish button is asserted disabled before questions are completed and enabled after all five are complete. |
| T-07 | BLOCKED | Draft editing, reorder and delete controls for persisted tests are not available in the Studio. |
| T-08 | AUTOMATED | The authoring spec checks the saved test row is published and linked to the created series. Series creation itself publishes immediately (see T-01). |
| T-09 | BLOCKED | The authoring UI cannot create an unpublished series and then independently publish it after publishing a test. |
| T-10 | AUTOMATED | The guest/student spec checks the guest catalogue API and an actual guest series detail page. |
| T-11 | BLOCKED | The authored test is checked against its DB questions, but the authoring spec does not proceed through a student attempt for that same test. |
| T-12 | BLOCKED | Student dashboard/profile series discovery and `includeAll=1` goal semantics are not covered by the two journeys. |
| T-13 | BLOCKED | Teacher stat cards are not compared against a complete set of direct PostgreSQL aggregates in the authoring flow. |
| T-14 | BLOCKED | Unpublish controls/history after unpublishing are not available in the authoring flow. |
| T-15 | BLOCKED | No explicit preview-only attempt flow is exposed by the Studio; preview exclusion from every statistic has not been proven. |
| T-16 | BLOCKED | No edit/publish API route exists for a different teacher to exercise ownership boundaries on this authored test. |

## Guest and student journey

| ID | Status | Evidence / reason |
|---|---|---|
| S-01 | AUTOMATED | Fresh guest requests the catalogue and opens the nonce series detail page without a 404. |
| S-02 | BLOCKED | Guest `POST /api/exam/attempt/start` is checked as HTTP 401 with no attempt row. Intended-test redirect-back after login is not implemented/verified by the login UI. |
| S-03 | AUTOMATED | Student answers four correct and three wrong from fixture keys, skips three, clears/changes a response, opens the mobile palette, marks for review and observes the timer. |
| S-04 | AUTOMATED | Reload resumes the same question/selected answer; persisted answers and the server-derived remaining timer are checked. |
| S-05 | AUTOMATED | Expected score is calculated from fixture marks/penalty; result API and DB counts/score are asserted. |
| S-06 | BLOCKED | The result review UI is not traversed question by question in the journey. |
| S-07 | AUTOMATED | A replayed submit is issued; attempt row count and final result values remain unchanged. |
| S-08 | BLOCKED | Automatic expiry requires a separate short-duration fixture and a full minute wait; it is not included in this run. |
| S-09 | BLOCKED | Retake behavior (new attempt versus block) is not part of this journey’s asserted contract. |
| S-10 | BLOCKED | Leaderboard rank and percentile exclusion are not asserted in the student journey. |
| S-11 | AUTOMATED | Student direct start of the published PRO test returns HTTP 403 and creates no attempt. |
| S-12 | BLOCKED | No Test Series purchase/order creation and fulfillment route exists. Razorpay paths support courses/subscriptions, not `ExamSeriesEnrollment`; no payment is faked. |
| S-13 | BLOCKED | No Test Series checkout exists to exercise failure/cancel behavior. |
| S-14 | BLOCKED | No Test Series payment verification/webhook fulfillment exists to replay idempotently. |
| S-15 | BLOCKED | Paid test attempt after purchase depends on the unavailable series purchase flow. |
| S-16 | BLOCKED | A second student without purchase is not seeded and verified separately; S-11 checks the locked student gate. |
| S-17 | BLOCKED | Student profile/history record reflection and reopening past results are not asserted. |
| S-18 | BLOCKED | Cross-student result privacy is not asserted in this journey. |
| S-19 | BLOCKED | Unpublished series/draft test probes and guest `includeAll=1` leakage checks are not executed by this pair. |
| S-20 | BLOCKED | Teacher statistics are not compared with post-attempt PostgreSQL counts/averages. |
| S-21 | AUTOMATED | Student journey uses a 375x812 viewport and checks the guest detail page, attempt controls, palette, timer, submit and result. The paid purchase portion is blocked with S-12. |
| S-22 | BLOCKED | Shared payment fulfillment supports course enrollment and subscriptions, not test-series enrollments; there is no same-server-function grant path to use as the specified fallback. |

## Run boundary

The runner refuses to start if port 3045 is already serving a page and verifies `TEST_DATABASE_URL` targets `127.0.0.1:54329/trillionskill_test`. It overrides `DATABASE_URL`, `DIRECT_URL`, auth/app URLs, `APP_ENV`, and `NEXT_DIST_DIR` for the isolated server. No test queries or writes are sent to the Supabase URL in `.env.local`.
