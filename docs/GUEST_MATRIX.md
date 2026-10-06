# GUEST MATRIX (PASS 10.1 VERIFIED)

Total | PASS | FAIL | NOT IMPLEMENTED
20 | 20 | 0 | 0

| ID | Page | Action | Expected Guest Behaviour | Expected API Status | Desktop (1280x800) | Mobile (390x844) |
|---|---|---|---|---|---|---|
| GM-01 | /dashboard | see enrolled courses | Banner & tab shows 'To see your enrolled courses, login' + Login prompt | 401 / anonymous empty | PASS | PASS |
| GM-02 | /my-learning | see course watching history | Prompt 'To view your enrolled batches & watch history, login' + opens OTP modal | 401 / anonymous empty | PASS | PASS |
| GM-03 | /my-tests | see enrolled tests | Prompt 'To see your enrolled tests & series, login' + opens OTP modal | 401 / anonymous empty | PASS | PASS |
| GM-04 | /my-tests | see test report | Prompt 'To see your mock test reports & attempt history, login' + opens OTP modal | 401 / anonymous empty | PASS | PASS |
| GM-05 | /test-series | start a test | Clicking 'Start Now' opens mobile OTP modal with callbackUrl preserving exam | 401 on /api/exam/attempt/start | PASS | PASS |
| GM-06 | /books | browse catalog | Freely open book catalog & details with 200 OK without auth redirect | 200 OK public | PASS | PASS |
| GM-07 | /books | add to cart | Adds book item to client-side cart drawer without requiring login | Client-side local storage | PASS | PASS |
| GM-08 | /current-affairs-quizzes | my quiz history | Shows login prompt 'To view your past quizzes and progress, login' + OTP modal | 401 / anonymous empty | PASS | PASS |
| GM-09 | /current-affairs-quizzes | start now quiz | Opens mobile OTP modal before quiz attempt starts | 401 on quiz attempt start | PASS | PASS |
| GM-10 | /courses | Watch now | Prompts login with callbackUrl returning to lesson player | 401 on video lesson stream | PASS | PASS |
| GM-11 | /courses | Continue | Prompts login with callbackUrl returning to lesson | 401 on lesson progress/stream | PASS | PASS |
| GM-12 | /courses | Enroll | Opens mobile OTP modal and auto-enrolls upon verify | 401 on direct enroll API | PASS | PASS |
| GM-13 | /books/cart | Buy now | Prompts mobile OTP login preserving /books/cart return | 401 on order creation | PASS | PASS |
| GM-14 | /my-tests | Start next test | Clicking Start Next Test opens mobile login prompt | 401 on test attempt start | PASS | PASS |
| GM-15 | /my-tests | Full report | Clicking Full Report opens mobile login prompt | 401 on attempt result | PASS | PASS |
| GM-16 | /my-tests | View AIR | Clicking View AIR opens mobile login prompt | 401 on leaderboard details | PASS | PASS |
| GM-17 | /my-tests | Mistake notebook | Clicking Mistake Notebook opens mobile login prompt | 401 on solution review | PASS | PASS |
| GM-18 | /tutorials | Ask a doubt | Opens mobile OTP login modal preserving tutorial URL | 401 on /api/doubts creation | PASS | PASS |
| GM-19 | /tutorials | browse tutorials | Freely open tutorial list & articles with 200 OK without auth redirect | 200 OK public server rendered | PASS | PASS |
| GM-20 | /practice | run code | Freely executes code without login (rate limited per IP) | 200 OK public on /api/execute | PASS | PASS |
