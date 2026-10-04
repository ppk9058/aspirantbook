# Admin Assessment Management - Implementation Plan

**Priority**: 1 (Critical)  
**Follows**: Proper System Design Architecture

---

## Goal

Build complete admin assessment management system following proper data flow:
```
Admin creates → Adds questions → Publishes → Student sees → Student takes → Admin monitors
```

---

## Proposed Changes

### Component 1: Admin Assessment List

#### [NEW] [app/admin/assessments/page.tsx](file:///Users/praveenkumar/aspirantbook/app/admin/assessments/page.tsx)

**Purpose**: List all assessments with stats and actions

**Features**:
- Table showing all assessments (published and drafts)
- Stats: Total questions, attempts, avg score
- Actions: Edit, Publish/Unpublish, Delete, View Attempts
- "Create Assessment" button
- Filter by technology, difficulty, published status

**Data Fetching**:
```typescript
const assessments = await prisma.assessment.findMany({
  include: {
    _count: {
      select: { questions: true, attempts: true }
    }
  },
  orderBy: { createdAt: 'desc' }
})
```

---

### Component 2: Admin Assessment Creation

#### [NEW] [app/admin/assessments/create/page.tsx](file:///Users/praveenkumar/aspirantbook/app/admin/assessments/create/page.tsx)

**Purpose**: Create new assessment with questions

**Form Fields**:
- Title (required)
- Slug (auto-generated from title)
- Description
- Technology (dropdown: Python, JavaScript, SQL, etc.)
- Difficulty (BEGINNER, INTERMEDIATE, ADVANCED)
- Duration (minutes)
- Passing Score (percentage)

**Question Builder**:
- Add multiple questions
- Question types: MCQ, Code Completion, Fill Blank, Code Output
- For each question:
  - Question text
  - Options (for MCQ)
  - Correct answer
  - Points
  - Explanation
  - Order

**Save Options**:
- Save as Draft
- Save and Publish

---

#### [NEW] [app/admin/assessments/create/AssessmentForm.tsx](file:///Users/praveenkumar/aspirantbook/app/admin/assessments/create/AssessmentForm.tsx)

**Client Component**: Form with state management

**State**:
```typescript
{
  title: string
  description: string
  technology: string
  difficulty: Difficulty
  duration: number
  passingScore: number
  questions: Question[]
}
```

**Actions**:
- Add question
- Remove question
- Reorder questions
- Edit question
- Submit (draft or publish)

---

### Component 3: Admin Assessment Editor

#### [NEW] [app/admin/assessments/[id]/edit/page.tsx](file:///Users/praveenkumar/aspirantbook/app/admin/assessments/[id]/edit/page.tsx)

**Purpose**: Edit existing assessment

**Features**:
- Same form as create
- Pre-populated with existing data
- Publish/Unpublish toggle
- Delete assessment
- View attempts button

---

### Component 4: Question Components

#### [NEW] [components/admin/assessment/QuestionEditor.tsx](file:///Users/praveenkumar/aspirantbook/components/admin/assessment/QuestionEditor.tsx)

**Purpose**: Unified question editor for all types

**Props**:
```typescript
{
  question: Question
  onChange: (question: Question) => void
  onRemove: () => void
}
```

**Renders Different UI Based on Type**:
- MCQ: Options list with add/remove
- Code: Monaco editor for correct answer
- Fill Blank: Text input
- Output: Textarea

---

### Component 5: Assessment Attempts Viewer

#### [NEW] [app/admin/assessments/[id]/attempts/page.tsx](file:///Users/praveenkumar/aspirantbook/app/admin/assessments/[id]/attempts/page.tsx)

**Purpose**: View all student attempts for an assessment

**Features**:
- Table of attempts with:
  - Student name
  - Score
  - Pass/Fail
  - Time spent
  - Date taken
- Filter by pass/fail
- Export to CSV
- View individual attempt details

**Data**:
```typescript
const attempts = await prisma.assessmentAttempt.findMany({
  where: { assessmentId: params.id },
  include: {
    user: {
      select: { name: true, email: true }
    }
  },
  orderBy: { startedAt: 'desc' }
})
```

---

### Component 6: Server Actions

#### [NEW] [lib/actions/admin/assessments.ts](file:///Users/praveenkumar/aspirantbook/lib/actions/admin/assessments.ts)

**Actions**:

```typescript
// Create assessment
export async function createAssessment(data: AssessmentInput)

// Update assessment
export async function updateAssessment(id: string, data: AssessmentInput)

// Publish/Unpublish
export async function togglePublishAssessment(id: string)

// Delete assessment
export async function deleteAssessment(id: string)

// Add question
export async function addQuestion(assessmentId: string, question: QuestionInput)

// Update question
export async function updateQuestion(questionId: string, data: QuestionInput)

// Delete question
export async function deleteQuestion(questionId: string)

// Reorder questions
export async function reorderQuestions(assessmentId: string, questionIds: string[])
```

---

### Component 7: Update Admin Navigation

#### [MODIFY] [components/admin/AdminNav.tsx](file:///Users/praveenkumar/aspirantbook/components/admin/AdminNav.tsx)

**Add Assessments Section**:
```typescript
{
  title: "Assessments",
  items: [
    { title: "All Assessments", href: "/admin/assessments" },
    { title: "Create Assessment", href: "/admin/assessments/create" },
  ]
}
```

---

### Component 8: Update User Detail Page

#### [MODIFY] [app/admin/users/[id]/UserDetailClient.tsx](file:///Users/praveenkumar/aspirantbook/app/admin/users/%5Bid%5D/UserDetailClient.tsx)

**Add Assessment Attempts Tab**:
- Show all assessments taken by user
- Display scores, pass/fail, dates
- Link to view attempt details

**Data to Fetch**:
```typescript
assessmentAttempts: {
  include: {
    assessment: {
      select: { title: true, passingScore: true }
    }
  },
  orderBy: { startedAt: 'desc' }
}
```

---

## Data Flow Verification

### 1. Admin Creates Assessment

```
Admin → /admin/assessments/create
  ↓
Fill form + Add questions
  ↓
Click "Save as Draft"
  ↓
Server Action: createAssessment(data)
  ↓
Database: INSERT INTO Assessment + Questions
  ↓
Status: isPublished = false
  ↓
Redirect: /admin/assessments
```

### 2. Admin Publishes Assessment

```
Admin → /admin/assessments/[id]/edit
  ↓
Toggle "Publish"
  ↓
Server Action: togglePublishAssessment(id)
  ↓
Database: UPDATE Assessment SET isPublished = true
  ↓
Now visible to students
```

### 3. Student Takes Assessment

```
Student → /assessments
  ↓
Query: WHERE isPublished = true
  ↓
Student clicks "Start Assessment"
  ↓
Create AssessmentAttempt
  ↓
Student answers questions
  ↓
Submit → Calculate score
  ↓
Database: UPDATE AssessmentAttempt
```

### 4. Admin Monitors

```
Admin → /admin/assessments/[id]/attempts
  ↓
View all student attempts
  ↓
See scores, pass rates, analytics
```

---

## Verification Plan

### Step 1: Build Admin Interface
1. Create admin assessment list page
2. Create assessment creation form
3. Test creating draft assessment
4. Verify assessment saved to database

### Step 2: Test Publishing
1. Create assessment as draft
2. Verify NOT visible to students
3. Publish assessment
4. Verify NOW visible to students

### Step 3: Test Student Flow
1. Student sees published assessment
2. Student takes assessment
3. Student submits
4. Verify attempt saved

### Step 4: Test Admin Monitoring
1. Admin views assessment attempts
2. Verify all student attempts shown
3. Verify scores calculated correctly
4. Admin views user profile
5. Verify assessment attempts shown

---

## Success Criteria

✅ Admin can create assessments via admin panel  
✅ Admin can add multiple question types  
✅ Admin can save as draft (not visible to students)  
✅ Admin can publish (visible to students)  
✅ Students only see published assessments  
✅ Admin can view all student attempts  
✅ Admin can see attempt details (score, time, answers)  
✅ User profile shows assessment history  
✅ Complete data flow: Create → Publish → Take → Monitor

---

## Implementation Order

1. ✅ Server actions (`lib/actions/admin/assessments.ts`)
2. ✅ Admin assessment list (`/admin/assessments`)
3. ✅ Admin assessment create (`/admin/assessments/create`)
4. ✅ Question editor component
5. ✅ Admin assessment edit (`/admin/assessments/[id]/edit`)
6. ✅ Assessment attempts viewer (`/admin/assessments/[id]/attempts`)
7. ✅ Update admin navigation
8. ✅ Update user detail page
9. ✅ Test complete flow
10. ✅ Verify student portal shows only published

---

**Ready to implement following proper system design architecture.**
