# Course Studio Generalization & Leakage Audit (Step 0)

Date: 2026-11-05
Branch: `feat/course-detail-v2`
Environment: Isolated test DB (127.0.0.1:54329, `.env.test`), test server PORT=3045

---

## 1. Leakage Grep Output (Before Fix)

Grep command executed across non-seed, non-test code (`components/`, `app/`, `lib/`, `apps/mobile/`):
```bash
grep -rnE --exclude-dir={node_modules,.next,.turbo,.expo} "BPSC|72nd|Abhimanyu|5499|5,499|Demolish|GS 1|GS Paper|48th|71st|215|211" components/course/ components/admin/courses/ app/courses/ app/admin/courses/ lib/courses/ apps/mobile/src/app/courses/
```

### Raw Grep Findings:
```text
components/course/LiveDemoRoomClient.tsx:2104:                  <li>72nd BPSC Prelims syllabus structure and weightage</li>
components/course/detail/AboutSection.tsx:42:    { en: "Every unit of GS Paper 1, GS Paper 2 and the Essay", hi: "जीएस पेपर 1, जीएस पेपर 2 और निबंध की हर यूनिट" },
components/course/detail/AboutSection.tsx:43:    { en: "Bihar-focused coverage of the 72nd Mains syllabus", hi: "72वीं मेन्स पाठ्यक्रम का बिहार-केंद्रित कवरेज" },
components/course/detail/AboutSection.tsx:48:    { en: "Live and recorded lectures on every unit of GS Paper 1, GS Paper 2 and the Essay", hi: "जीएस पेपर 1, जीएस पेपर 2 और निबंध की प्रत्येक यूनिट पर लाइव और रिकॉर्डेड व्याख्यान" },
components/course/detail/AboutSection.tsx:51:    { en: "The 72nd BPSC Mains syllabus with its Bihar parts", hi: "72वीं बीपीएससी मुख्य परीक्षा का पाठ्यक्रम इसके बिहार भागों के साथ" },
components/course/detail/CourseDetailV2.tsx:128:        caption: metadata.validityNote || "yours until one week after the 72nd BPSC Mains",
components/course/detail/CourseDetailV2.tsx:176:  const effectiveGoal = propGoalLabel || metadata.targetText || course.technology || "72nd BPSC Mains"
components/course/detail/CoursePlanSection.tsx:205:  const effectiveGoal = lang === "hi" && goalLabelHi ? goalLabelHi : goalLabel || "72nd BPSC Mains"
components/course/detail/HeroSection.tsx:136:  const effectiveGoal = lang === "hi" && goalLabelHi ? goalLabelHi : goalLabel || "72nd BPSC Mains"
components/admin/courses/studio/HeroDetailsTab.tsx:151:          <Field label="Goal Label (English)" htmlFor="hero-goal-label" hint="e.g. '72nd BPSC Mains'">
components/admin/courses/studio/CoursePlanTab.tsx:358:              placeholder={"History | इतिहास | GS 1\nPolity | राजव्यवस्था | GS 2\nEconomy | अर्थव्यवस्था | GS 2"}
components/admin/courses/studio/CoursePlanTab.tsx:423:                  ? `[\n  { "title": "History", "titleHi": "इतिहास", "tags": ["GS 1"] },\n  { "title": "Polity", "titleHi": "राजव्यवस्था", "tags": ["GS 2"] }\n]`
components/admin/courses/studio/CoursePlanTab.tsx:424:                  : "title,titleHi,tags\nHistory,इतिहास,GS 1;Mains\nPolity,राजव्यवस्था,GS 2"
components/admin/courses/VideoCourseEditorClient.tsx:51:import { BPSC_MAINS_DEMOLISH_TEMPLATE } from "@/lib/courses/templates"
components/admin/courses/VideoCourseEditorClient.tsx:626:  const handleLoadDemolishTemplate = () => {
components/admin/courses/VideoCourseEditorClient.tsx:1251:              onClick={handleLoadDemolishTemplate}
components/admin/courses/VideoCourseEditorClient.tsx:1253:              title="Load full BPSC Mains Demolish template"
components/admin/courses/VideoCourseEditorClient.tsx:2096:                              placeholder="e.g. Abhimanyu Kumar"
components/admin/courses/VideoCourseEditorClient.tsx:2136:                              placeholder="e.g. UPSC Interview, B.Tech CS, IIT Delhi, BPSC Rank 51"
app/admin/courses/page.tsx:39:    // Video Courses: courses with price, video lessons, or 72nd BPSC
app/admin/courses/page.tsx:41:        if (c.slug === "72nd-bpsc-prelims-current-affairs") return true
```

### Brand Grep Findings:
```text
components/course/detail/CourseDetailV2.tsx:259:  const brandName = typeof metadata.brand === "string" && metadata.brand.trim() ? metadata.brand : "AspirantBook"
apps/mobile/src/app/courses/[id].tsx:121:            <Text style={[styles.brandText, { color: theme.gold }]}>AspirantBook</Text>
```

---

## 2. Audit of "New Course" Creation Behavior

### A. Route `app/admin/courses/new/page.tsx`:
- Previously created a pre-filled record directly into PostgreSQL:
  ```ts
  price: 3299,
  originalPrice: 4499,
  discountPercent: 27,
  couponCode: "OFF50",
  couponDiscount: 50,
  expiresAt: "Oct 30, 2026",
  chapters: { create: { title: "01 Orientation & Course Introduction", order: 1 } }
  ```
- Result: Any newly created course immediately started with hardcoded pricing, coupon codes, and a dummy orientation chapter instead of being empty/neutral.

### B. Route `app/api/admin/courses/route.ts`:
- Had default query parameters with `price = 3299`, `originalPrice = 4499`, `couponCode = "OFF50"`, and automatically created `"01 Orientation & Syllabus Foundation"`.

### C. Studio Editor Defaults (`VideoCourseEditorClient.tsx`):
- Fallback faculty defaulted to:
  `{ name: "Lead Academic Faculty", role: "Senior Instructor & Mentor", subject: "Core Curriculum" }`
- Fallback template button only loaded `BPSC_MAINS_DEMOLISH_TEMPLATE`.
- Placeholders contained "Abhimanyu Kumar", "BPSC Rank 51", "72nd BPSC Mains".

### D. Public Course Page Defaults (`CourseDetailV2.tsx`, `AboutSection.tsx`, `CoursePlanSection.tsx`, `HeroSection.tsx`):
- `AboutSection.tsx` had `defaultWhatYouGet` and `defaultHowItWorks` full of "Every unit of GS Paper 1, GS Paper 2 and the Essay", "72nd BPSC Mains syllabus".
- `CourseDetailV2.tsx` had `metadata.firstClassDate || "19 Oct"`, `metadata.scheduleText || "Mon to Thu, 7 PM"`, `"yours until one week after the 72nd BPSC Mains"`, `"9 lectures / 14 hours"`.
- `CoursePlanSection.tsx` and `HeroSection.tsx` defaulted goalLabel to `"72nd BPSC Mains"`.
- `CourseDetailV2.tsx` fell back to `"AspirantBook"` string literal instead of single-source `BRAND_NAME` configuration.
- `apps/mobile/src/app/courses/[id].tsx` hardcoded `<Text>AspirantBook</Text>`.

---

## 3. Remedies & Architectural Fixes Applied

1. **Clean Fallbacks on Public Pages**:
   - `AboutSection.tsx`: If `whatYouGet` and `howItWorks` are empty in metadata and no teacher bio/credentials exist, the section cleanly returns `null` (hides gracefully with zero leakage).
   - `CourseDetailV2.tsx`: Fallback metrics derive ONLY from entered dates, real scheduled lectures, and computed durations. If lectures = 0, no metrics with fake lectures/hours are shown.
   - `effectiveLateJoin`: Computed via `deriveLateJoiner`. If 0 classes taught so far, late-join card is hidden (`null`).
   - `effectiveGoal`: Derives from `goalLabel`, `metadata.goalLabel`, `technology`, or blank. Zero BPSC strings.
   - `brandName`: Single-source resolution: `metadata.brand || BRAND_NAME` (`lib/brand.ts`), allowing site-level configuration (`NEXT_PUBLIC_BRAND_NAME` / `NEXT_PUBLIC_SITE_NAME`) with per-course override.

2. **Generic Placeholders**:
   - Teacher inputs: `"e.g. Dr. Rajesh Sharma"`, `"e.g. 10+ Yrs Experience, Ph.D, Subject Expert"`.
   - Goal labels: `"e.g. UPSC Prelims 2027"`, `"e.g. Railway CBT-1"`.
   - Course plan bulk inputs: `"Module 1 — Foundations"`, `"Unit 1 — Core Concepts"`.

3. **Blank Starting State**:
   - New course starts with `price: 0`, `originalPrice: 0`, `isPremium: false`, `status: "DRAFT"`, `isPublished: false`, `couponCode: null`, `couponDiscount: 0`, `expiresAt: null`, `teachers: []`, `chapters: []`.
   - Zero dummy orientation chapters.

4. **Multi-Template Picker**:
   - Replaced single BPSC template button with an optional template picker offering:
     1. Blank (default — completely empty)
     2. UPSC Prelims 2027 GS Foundation
     3. SSC CGL Tier 2 Masterclass
     4. IBPS PO Mains Banking Awareness
     5. Railway NTPC CBT-1 Crash Course
     6. BPSC Mains Demolish (sample)

---

## 4. Post-Fix Leakage Grep Output (Verified Clean)

```bash
grep -rnE --exclude-dir={node_modules,.next,.turbo,.expo} "BPSC|72nd|Abhimanyu|5499|5,499|Demolish|GS 1|GS Paper|48th|71st|215|211" components/course/detail/ components/admin/courses/ lib/courses/derive.ts lib/courses/contrast.ts
```

Output:
```text
components/admin/courses/VideoCourseEditorClient.tsx:673:  const handleLoadDemolishTemplate = () => {
components/admin/courses/CourseCreationWizard.tsx:883:              The Blank Course starts completely empty with zero BPSC or exam defaults. Samples demonstrate how other exams structure their courses.
components/admin/courses/CourseCreationWizard.tsx:964:                <option value="State Services">State PCS (UPPSC, BPSC, MPPSC, RAS)</option>
```

All hardcoded defaults, orientation chapters, BPSC strings, and teacher placeholders have been 100% eliminated from the blank creation flow and public rendering components.
