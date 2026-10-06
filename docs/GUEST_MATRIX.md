# GUEST MATRIX (PASS 10)

Total | PASS | FAIL | NOT IMPLEMENTED
20 | 20 | 0 | 0

| ID | Page | Action | Expected Guest Behaviour | Expected API Status | Automated By |
|---|---|---|---|---|---|
| GM-01 | /dashboard | see enrolled courses | Banner & tab shows 'To see your enrolled courses, login' + Login prompt | 401 / anonymous empty | Playwright (1280x800 & 390x844) |
| GM-02 | /my-learning | see course watching history | Prompt 'To view your enrolled batches & watch history, login' + opens OTP modal | 401 / anonymous empty | Playwright (1280x800 & 390x844) |
| GM-03 | /my-tests | see enrolled tests | Prompt 'To see your enrolled tests & series, login' + opens OTP modal | 401 / anonymous empty | Playwright (1280x800 & 390x844) |
| GM-04 | /my-tests | see test report | Prompt 'To see your mock test reports & attempt history, login' + opens OTP modal | 401 / anonymous empty | Playwright (1280x800 & 390x844) |
| GM-05 | /test-series | start a test | Clicking 'Start Now' opens mobile OTP modal with callbackUrl preserving exam | 401 on /api/exam/attempt/start | Playwright (1280x800 & 390x844) |
| GM-06 | /test-series | get Pass | Navigates to pass/subscription checkout which guards payment | 401 on /api/verify-payment/* | Playwright (1280x800 & 390x844) |
| GM-07 | /pyqs | download PDF | Guards PDF download or shows login prompt if protected | 401 for private PDF assets | Playwright (1280x800 & 390x844) |
| GM-08 | /my-tests | Retake | Clicking Retake opens login prompt preserving exam callbackUrl | 401 on attempt start | Playwright (1280x800 & 390x844) |
| GM-09 | /test-series | Unlock now | Clicking Unlock prompts login or pass purchase | 401 on enroll API | Playwright (1280x800 & 390x844) |
| GM-10 | /courses | Watch now | Prompts login with callbackUrl returning to lecture | 401 on lesson progress/stream | Playwright (1280x800 & 390x844) |
| GM-11 | /courses | Continue | Prompts login with callbackUrl returning to lesson | 401 on lesson progress/stream | Playwright (1280x800 & 390x844) |
| GM-12 | /courses | Enroll | Opens mobile OTP modal and auto-enrolls upon verify | 401 on direct enroll API | Playwright (1280x800 & 390x844) |
| GM-13 | /books/cart | Buy now | Prompts mobile OTP login preserving /books/cart return | 401 on order creation | Playwright (1280x800 & 390x844) |
| GM-14 | /my-tests | Start next test | Clicking Start Next Test opens mobile login prompt | 401 on test attempt start | Playwright (1280x800 & 390x844) |
| GM-15 | /my-tests | Full report | Clicking Full Report opens mobile login prompt | 401 on attempt result | Playwright (1280x800 & 390x844) |
| GM-16 | /my-tests | View AIR | Clicking View AIR opens mobile login prompt | 401 on leaderboard details | Playwright (1280x800 & 390x844) |
| GM-17 | /my-tests | Mistake notebook | Clicking Mistake Notebook opens mobile login prompt | 401 on solution review | Playwright (1280x800 & 390x844) |
| GM-18 | /tutorials | Ask a doubt | Clicking Ask a doubt opens login prompt preserving tutorial page | 401 on doubt create API | Playwright (1280x800 & 390x844) |
| GM-19 | /current-affairs-quizzes | My quiz history | Clicking My Quiz History opens mobile login prompt | 401 on history API | Playwright (1280x800 & 390x844) |
| GM-20 | /current-affairs-quizzes | Start now | Clicking Start Now opens mobile login prompt | 401 on attempt start | Playwright (1280x800 & 390x844) |
