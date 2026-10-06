# Architectural & QA Decisions (Pass 9.1)

## DECISION-01: Anonymous Access to Trial Lessons vs Full Video Course Player
- **Context**: In Pass 9, J1-02 asserted anonymous access to `/courses/[slug]/learn/[lessonId]`. The route currently redirects unauthenticated users to `/login?callbackUrl=...` via NextAuth middleware (`middleware.ts`), which enforces that `/learn` and authenticated interactive player views require a verified session.
- **Rule**: 
  - The Course Details Overview page (`/courses/[slug]`) is 100% public to all anonymous visitors and displays the full curriculum, badges, and trial metadata without leaking private videos, attachments, or Telegram links.
  - The interactive video classroom player (`/courses/[slug]/learn/[lessonId]`) requires a logged-in user session so that progress tracking, video completion analytics, doubt posting, and user identity can be properly associated with the user account.
  - Trial lessons allow any logged-in user with role `FREE` (free tier) to view the complete lesson video and public trial notes without paying for the course.
  - Unauthenticated anonymous users attempting to navigate directly to the deep video player URL `/courses/[slug]/learn/[lessonId]` are redirected via HTTP 307 to `/login` with an intact, sanitized `callbackUrl`.

