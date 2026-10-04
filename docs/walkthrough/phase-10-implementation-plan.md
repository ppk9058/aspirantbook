# Phase 10: Role-Based Access Control - Implementation Plan

## Overview
Enhance and complete the role-based access control system with user management tools, visual role indicators, and comprehensive testing.

## Current State Analysis

### ✅ Already Implemented
1. **Premium Content Gating**
   - Subscription-based access control in [courses/[slug]/page.tsx](file:///Users/praveenkumar/aspirantbook/app/(dashboard)/courses/[slug]/page.tsx)
   - Lesson access control in [learn/[courseSlug]/[lessonId]/page.tsx](file:///Users/praveenkumar/aspirantbook/app/(dashboard)/learn/[courseSlug]/[lessonId]/page.tsx)
   - Checks for ACTIVE subscriptions with valid `endDate`
   - Admin users have full access bypass

2. **Middleware Protection**
   - Admin routes protected in [middleware.ts](file:///Users/praveenkumar/aspirantbook/middleware.ts)
   - Dashboard routes require authentication

### 🔨 To Be Implemented

## Proposed Changes

### 1. User Management Dashboard

#### [NEW] `app/admin/users/page.tsx`
Admin page to view and manage all users:
- User list with filtering (by role, subscription status)
- Search functionality
- Pagination
- Quick actions (view details, change role, view subscriptions)

#### [NEW] `app/admin/users/[userId]/page.tsx`
Detailed user profile for admins:
- User information display
- Subscription history
- Enrollment history
- Progress overview
- Role management
- Subscription management (manual override)

---

### 2. User Role Indicators

#### [MODIFY] `components/admin/AdminNav.tsx`
No changes needed - already clean.

#### [NEW] `components/admin/UserRoleBadge.tsx`
Reusable badge component for displaying user roles:
- Color-coded badges (Admin: purple, Premium: gold, Free: gray)
- Icons for each role
- Tooltip with role description

#### [MODIFY] `app/admin/users/page.tsx`
Display role badges in user list.

---

### 3. Subscription Status Display

#### [NEW] `components/admin/SubscriptionStatusBadge.tsx`
Visual indicator for subscription status:
- ACTIVE: green
- EXPIRED: red
- CANCELLED: orange
- Shows expiry date on hover

#### [MODIFY] `app/admin/users/[userId]/page.tsx`
Display detailed subscription information:
- Current plan
- Status with badge
- Start and end dates
- Payment history
- Renewal information

---

### 4. Server Actions for User Management

#### [NEW] `lib/actions/admin/users.ts`
Admin-only actions:
- `getUsersList()` - Fetch paginated users with filters
- `getUserDetails(userId)` - Get detailed user info
- `updateUserRole(userId, role)` - Change user role
- `getUserSubscriptions(userId)` - Get subscription history
- `getUserEnrollments(userId)` - Get course enrollments
- `manuallyActivateSubscription(userId, plan, duration)` - Admin override

---

### 5. Access Control Testing Suite

#### [NEW] `scripts/test-access-control.ts`
Automated testing script to verify:
- FREE user cannot access premium courses
- PREMIUM user can access all courses
- ADMIN user has full access
- Expired subscriptions block access
- Enrollment requirements for free courses

---

## Verification Plan

### Manual Testing Checklist
1. **FREE User**
   - ✅ Can view free courses
   - ✅ Cannot access premium courses (redirected to /pricing)
   - ✅ Must enroll in free courses to view lessons
   - ✅ Cannot access admin panel

2. **PREMIUM User (Active Subscription)**
   - ✅ Can access all courses without enrollment
   - ✅ Can view all premium content
   - ✅ Cannot access admin panel
   - ✅ Subscription status visible in profile

3. **PREMIUM User (Expired Subscription)**
   - ✅ Treated as FREE user
   - ✅ Blocked from premium content
   - ✅ Redirected to pricing page

4. **ADMIN User**
   - ✅ Full access to all content
   - ✅ Can access admin panel
   - ✅ Can manage users
   - ✅ Can view all subscriptions
   - ✅ Can manually grant/revoke access

### Automated Tests
Run `npx tsx scripts/test-access-control.ts` to verify all scenarios.

---

## Implementation Order

1. **Create User Management Dashboard** (Priority: High)
   - User list page
   - User detail page
   - Server actions

2. **Add Role Indicators** (Priority: Medium)
   - UserRoleBadge component
   - SubscriptionStatusBadge component
   - Integrate into user list

3. **Enhance Subscription Display** (Priority: Medium)
   - Detailed subscription info in admin
   - Manual subscription management

4. **Create Testing Suite** (Priority: High)
   - Access control test script
   - Manual testing checklist

5. **Documentation** (Priority: Low)
   - Update walkthrough with testing results
   - Document admin user management features

---

## Security Considerations

> [!IMPORTANT]
> All user management actions must verify ADMIN role server-side.

> [!WARNING]
> Manual subscription activation should be logged for audit purposes.

> [!CAUTION]
> Changing user roles affects their access immediately - ensure proper validation.

---

## Database Schema Review

Current schema supports all requirements:
- `User.role` enum: FREE, PREMIUM, ADMIN
- `Subscription.status` enum: ACTIVE, EXPIRED, CANCELLED
- `Subscription.endDate` for expiry checks
- All necessary relations in place

No schema changes required.
