# Admin Practice Exercise Management - Implementation Plan

**Priority**: 2  
**Follows**: Proper System Design Architecture

---

## Goal

Build admin interface for creating and managing coding exercises, following the pattern:
```
Admin creates exercise → Adds test cases → Links to Lesson → Student practices
```

---

## Proposed Changes

### Component 1: Admin Exercise List

#### [NEW] [app/admin/exercises/page.tsx](file:///Users/praveenkumar/aspirantbook/app/admin/exercises/page.tsx)

**Purpose**: List all coding exercises

**Features**:
- Table showing all exercises
- Columns: Title, Language, Difficulty, Linked Lesson
- Actions: Edit, Delete
- "Create Exercise" button

**Data Fetching**:
```typescript
const exercises = await prisma.exercise.findMany({
  include: {
    lesson: { select: { title: true } },
    testCases: { select: { id: true } } // Count
  },
  orderBy: { createdAt: 'desc' }
})
```

---

### Component 2: Admin Exercise Creation

#### [NEW] [app/admin/exercises/create/page.tsx](file:///Users/praveenkumar/aspirantbook/app/admin/exercises/create/page.tsx)

**Purpose**: Create new coding exercise

**Form Fields**:
- Title (required)
- Slug (auto-generated)
- Description (Markdown)
- Language (Python, JavaScript, etc.)
- Difficulty (BEGINNER, INTERMEDIATE, ADVANCED)
- Starter Code (Monaco Editor)
- Solution Code (Monaco Editor)
- Hints (List of strings)
- Linked Lesson (Dropdown of available lessons)

**Test Case Builder**:
- Add multiple test cases
- Input (string)
- Expected Output (string)
- Is Hidden (boolean)

---

#### [NEW] [app/admin/exercises/create/ExerciseForm.tsx](file:///Users/praveenkumar/aspirantbook/app/admin/exercises/create/ExerciseForm.tsx)

**Client Component**: Form with state management

**State**:
```typescript
{
  title: string
  description: string
  language: string
  difficulty: Difficulty
  starterCode: string
  solutionCode: string
  hints: string[]
  lessonId: string
  testCases: TestCase[]
}
```

---

### Component 3: Test Case Editor

#### [NEW] [components/admin/exercise/TestCaseEditor.tsx](file:///Users/praveenkumar/aspirantbook/components/admin/exercise/TestCaseEditor.tsx)

**Purpose**: Manage test cases for an exercise

**Props**:
```typescript
{
  testCases: TestCase[]
  onChange: (cases: TestCase[]) => void
}
```

---

### Component 4: Server Actions

#### [NEW] [lib/actions/admin/exercises.ts](file:///Users/praveenkumar/aspirantbook/lib/actions/admin/exercises.ts)

**Actions**:

```typescript
// Create exercise
export async function createExercise(data: ExerciseInput)

// Update exercise
export async function updateExercise(id: string, data: ExerciseInput)

// Delete exercise
export async function deleteExercise(id: string)

// Add test case
export async function addTestCase(exerciseId: string, data: TestCaseInput)
```

---

### Component 5: Update Admin Navigation

#### [MODIFY] [components/admin/AdminNav.tsx](file:///Users/praveenkumar/aspirantbook/components/admin/AdminNav.tsx)

**Add Exercises Section**:
```typescript
{
  title: "Practice",
  items: [
    { title: "All Exercises", href: "/admin/exercises" },
    { title: "Create Exercise", href: "/admin/exercises/create" },
  ]
}
```

---

## Data Flow Verification

### 1. Admin Creates Exercise

```
Admin → /admin/exercises/create
  ↓
Fill form + Add test cases + Link to Lesson
  ↓
Server Action: createExercise(data)
  ↓
Database: INSERT INTO Exercise + TestCases
  ↓
Redirect: /admin/exercises
```

### 2. Student Practices

```
Student → /courses/[slug]/learn/[lessonId]
  ↓
Click "Practice" tab
  ↓
Fetch linked exercise
  ↓
Load starter code & test cases
```

---

## Implementation Order

1. ✅ Server actions (`lib/actions/admin/exercises.ts`)
2. ✅ Admin exercise list (`/admin/exercises`)
3. ✅ Admin exercise create (`/admin/exercises/create`)
4. ✅ Test case editor component
5. ✅ Admin exercise edit (`/admin/exercises/[id]/edit`)
6. ✅ Update admin navigation
7. ✅ Verify linking to lesson

---

**Ready to implement Priority 2.**
