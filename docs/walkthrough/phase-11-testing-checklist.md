# Phase 11: Comprehensive Verification Checklist

## Overview
This document provides a complete testing checklist for all features implemented in the aspirantbook platform. Test each scenario systematically to ensure everything works correctly.

---

## Test Environment Setup

### Prerequisites
- [ ] Development server running (`npm run dev`)
- [ ] Database populated with test data
- [ ] Test users created (run `scripts/create-test-users.sql` if needed)

### Test User Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | `adminuser@example.com` | `Test@123` |
| Premium | `premiumuser@example.com` | `Test@123` |
| Free | `freeuser1@example.com` | `Test@123` |

---

## 1. Authentication & User Management

### 1.1 Login Flow
- [ ] **Test:** Login with admin credentials
  - **Expected:** Successful login, redirected to dashboard
- [ ] **Test:** Login with premium credentials
  - **Expected:** Successful login, redirected to dashboard
- [ ] **Test:** Login with free credentials
  - **Expected:** Successful login, redirected to dashboard
- [ ] **Test:** Login with incorrect password
  - **Expected:** "Invalid credentials" error message

### 1.2 User Profile
- [ ] **Test:** View profile page (`/profile`)
  - **Expected:** Display user information, stats, enrollments
- [ ] **Test:** View subscription status
  - **Expected:** Shows current plan and status
- [ ] **Test:** View settings page (`/settings`)
  - **Expected:** Profile editing, password change, notification preferences

---

## 2. FREE User Workflow

### 2.1 Course Discovery
- [ ] **Test:** Browse courses page (`/courses`)
  - **Expected:** See all published courses
- [ ] **Test:** View free course details
  - **Expected:** See "Enroll for Free" button
- [ ] **Test:** View premium course details
  - **Expected:** See "Enroll (Premium)" button with lock icon

### 2.2 Free Course Access
- [ ] **Test:** Enroll in free course
  - **Expected:** Successful enrollment, see "Start Course" button
- [ ] **Test:** Start free course
  - **Expected:** Redirected to first lesson
- [ ] **Test:** View lesson content
  - **Expected:** Video player (if video exists), content displayed
- [ ] **Test:** Mark lesson as complete
  - **Expected:** Lesson marked complete, progress updated
- [ ] **Test:** Navigate to next lesson
  - **Expected:** Successfully view next lesson

### 2.3 Premium Content Blocking
- [ ] **Test:** Try to enroll in premium course
  - **Expected:** Redirected to `/pricing` page
- [ ] **Test:** Try to access premium lesson directly (via URL)
  - **Expected:** Redirected to `/pricing` page
- [ ] **Test:** View pricing page
  - **Expected:** See pricing plans and features

---

## 3. PREMIUM User Workflow

### 3.1 Subscription Status
- [ ] **Test:** Check if user has ACTIVE subscription
  - **Method:** Go to `/subscription` or check in admin panel
  - **Expected:** Active subscription with valid end date
- [ ] **Test:** View subscription details
  - **Expected:** Plan type, status, renewal date

### 3.2 Premium Course Access
- [ ] **Test:** View premium course details
  - **Expected:** See "Start Course" button (no enrollment needed)
- [ ] **Test:** Start premium course
  - **Expected:** Immediate access to first lesson
- [ ] **Test:** View premium lesson content
  - **Expected:** Full access to all content
- [ ] **Test:** Complete premium lessons
  - **Expected:** Progress tracked correctly

### 3.3 Free Course Access
- [ ] **Test:** Access free courses
  - **Expected:** Immediate access (no enrollment needed)
- [ ] **Test:** Complete free course
  - **Expected:** Progress tracked correctly

---

## 4. ADMIN User Workflow

### 4.1 Admin Portal Access
- [ ] **Test:** Navigate to `/admin`
  - **Expected:** Redirected to `/admin/dashboard`
- [ ] **Test:** View admin dashboard
  - **Expected:** Stats cards with loading skeletons, then data

### 4.2 Course Management
- [ ] **Test:** Create new course
  - **Expected:** Course created successfully
- [ ] **Test:** Edit course details
  - **Expected:** Changes saved
- [ ] **Test:** Add chapter to course
  - **Expected:** Chapter created
- [ ] **Test:** Add lesson to chapter
  - **Expected:** Lesson created
- [ ] **Test:** Upload video for lesson
  - **Expected:** Video uploaded to S3 (if AWS configured)
- [ ] **Test:** Publish course
  - **Expected:** Course status changed to PUBLISHED
- [ ] **Test:** Delete course
  - **Expected:** Course deleted with confirmation

### 4.3 User Management
- [ ] **Test:** View users list (`/admin/users`)
  - **Expected:** See all users with role badges
- [ ] **Test:** Search for user by email
  - **Expected:** Filtered results
- [ ] **Test:** Filter users by role
  - **Expected:** Filtered results
- [ ] **Test:** View user details
  - **Expected:** Complete user profile with subscriptions
- [ ] **Test:** Change user role (FREE → PREMIUM)
  - **Expected:** Role updated, confirmation message
- [ ] **Test:** Manually activate subscription
  - **Expected:** Subscription created, user role updated to PREMIUM
- [ ] **Test:** Enroll user in course
  - **Expected:** User enrolled successfully
- [ ] **Test:** Unenroll user from course
  - **Expected:** Enrollment removed

### 4.4 Admin Content Access
- [ ] **Test:** Access any course without enrollment
  - **Expected:** Full access to all content
- [ ] **Test:** View all lessons
  - **Expected:** No restrictions

---

## 5. Payment Integration

### 5.1 Checkout Flow
- [ ] **Test:** Click "Upgrade to Premium" from pricing page
  - **Expected:** Redirected to `/checkout`
- [ ] **Test:** View checkout page
  - **Expected:** Payment method selector (Razorpay for India, Stripe for others)
- [ ] **Test:** Select payment method
  - **Expected:** Correct payment gateway loaded

### 5.2 Payment Processing (Manual Test)
> **Note:** Requires actual payment gateway credentials

- [ ] **Test:** Complete Stripe payment (test mode)
  - **Expected:** Subscription created, user role updated
- [ ] **Test:** Complete Razorpay payment (test mode)
  - **Expected:** Subscription created, user role updated
- [ ] **Test:** Check webhook processing
  - **Expected:** Database updated correctly

---

## 6. Progress Tracking

### 6.1 Lesson Progress
- [ ] **Test:** Watch video lesson
  - **Expected:** Progress tracked automatically
- [ ] **Test:** Scroll through reading lesson
  - **Expected:** Scroll progress indicator updates
- [ ] **Test:** Auto-complete at 90% scroll
  - **Expected:** Lesson marked complete
- [ ] **Test:** View progress in sidebar
  - **Expected:** Completed lessons show checkmark

### 6.2 Course Progress
- [ ] **Test:** View course detail page
  - **Expected:** Progress bar shows completion percentage
- [ ] **Test:** View "My Library" page
  - **Expected:** Enrolled courses with progress

---

## 7. Role-Based Access Control

### 7.1 Access Matrix Verification

| User Type | Free Course | Premium Course | Admin Panel |
|-----------|-------------|----------------|-------------|
| **FREE** | ✅ If Enrolled | ❌ Blocked | ❌ Blocked |
| **PREMIUM (Active)** | ✅ Full Access | ✅ Full Access | ❌ Blocked |
| **PREMIUM (Expired)** | ✅ If Enrolled | ❌ Blocked | ❌ Blocked |
| **ADMIN** | ✅ Full Access | ✅ Full Access | ✅ Full Access |

### 7.2 Test Each Scenario
- [ ] **Test:** FREE user tries to access premium content
  - **Expected:** Redirected to `/pricing`
- [ ] **Test:** PREMIUM user accesses premium content
  - **Expected:** Full access granted
- [ ] **Test:** Expired PREMIUM user tries to access premium content
  - **Expected:** Redirected to `/pricing`
- [ ] **Test:** ADMIN user accesses all content
  - **Expected:** Full access without enrollment

---

## 8. UI/UX Verification

### 8.1 Visual Elements
- [ ] **Test:** Role badges display correctly
  - **Expected:** Color-coded (Admin: purple, Premium: gold, Free: gray)
- [ ] **Test:** Subscription status badges
  - **Expected:** Color-coded (Active: green, Expired: red, Cancelled: orange)
- [ ] **Test:** Loading skeletons
  - **Expected:** Smooth loading states on admin dashboard

### 8.2 Responsive Design
- [ ] **Test:** Mobile view (< 768px)
  - **Expected:** Sidebar collapses, mobile-friendly layout
- [ ] **Test:** Tablet view (768px - 1024px)
  - **Expected:** Proper layout adjustments
- [ ] **Test:** Desktop view (> 1024px)
  - **Expected:** Full layout with sidebar

---

## 9. Error Handling

### 9.1 Common Errors
- [ ] **Test:** Access protected route without login
  - **Expected:** Redirected to login page
- [ ] **Test:** Non-admin tries to access `/admin`
  - **Expected:** Redirected or 403 error
- [ ] **Test:** Try to enroll in already enrolled course
  - **Expected:** Error message
- [ ] **Test:** Try to create course with duplicate slug
  - **Expected:** Unique slug generated automatically

---

## 10. Performance

### 10.1 Load Times
- [ ] **Test:** Dashboard loads within 2 seconds
  - **Expected:** Fast initial render with skeletons
- [ ] **Test:** Course list loads quickly
  - **Expected:** Pagination or lazy loading
- [ ] **Test:** Video player loads smoothly
  - **Expected:** No buffering issues

---

## Bug Report Template

If you find any issues, document them using this format:

```markdown
### Bug: [Brief Description]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**User Type:** [FREE/PREMIUM/ADMIN]

**Screenshots/Logs:**
[If applicable]

**Priority:** [High/Medium/Low]
```

---

## Testing Summary

After completing all tests, fill out this summary:

- **Total Tests:** ___
- **Passed:** ___
- **Failed:** ___
- **Blocked:** ___
- **Pass Rate:** ___%

### Critical Issues Found:
1. 
2. 
3. 

### Minor Issues Found:
1. 
2. 
3. 

### Recommendations:
1. 
2. 
3. 

---

## Sign-off

- [ ] All critical features tested
- [ ] All user types verified
- [ ] Access control working correctly
- [ ] No blocking issues
- [ ] Ready for deployment

**Tested By:** _______________  
**Date:** _______________  
**Signature:** _______________
