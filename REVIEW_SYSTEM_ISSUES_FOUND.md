# 🐛 Review System Issues Found - November 10, 2025

## Issues Discovered

### Issue #1: Score Display Shows "1/2" Instead of "1.0/2"
**Location:** `src/components/Student/StudentDashboard.tsx` Line 1042

**Problem:**
```tsx
<p className="text-3xl font-bold text-gray-900">{stats.reviewScore ?? 0}/2</p>
```

The `/2` is hardcoded, assuming all reviews have max score of 2. But with your test data showing all 1s, the average is 1.0, so it should display "1.0/2" not "1/2".

**Analysis:**
- Your review data: `{morning_exercise: 1, communication: 1, academic_effort: 1, campus_contribution: 1, behavioural: 1, mentorship_level: 1}`
- Calculation: `(1+1+1+1+1+1) / 6 = 6/6 = 1.0`
- Current display: `1/2` (incorrect - showing integer only)
- Expected display: `1.0/2` (correct - showing one decimal place)

**Root Cause:**
`stats.reviewScore` is already calculated correctly as `1.0` by `calculateReviewScore()`, but the display is truncating it when it's a whole number.

### Issue #2: Wrong Date Passed to hasSubmittedThisWeek()
**Location:** `src/components/Student/StudentDashboard.tsx` Line 323

**Problem:**
```tsx
const hasSubmitted = await MentorReviewService.hasSubmittedThisWeek(
  userData.id,
  mentor.id,
  new Date()  // ❌ WRONG - passes current date/time
);
```

Should be:
```tsx
const hasSubmitted = await MentorReviewService.hasSubmittedThisWeek(
  userData.id,
  mentor.id,
  getCurrentWeekStart()  // ✅ CORRECT - passes Monday midnight
);
```

**Impact:**
The "Due" badge might not disappear correctly after submitting a review because it's comparing against the wrong date.

### Issue #3: Parameter Order Mismatch
**Location:** Same as Issue #2

**Problem:**
The function signature expects:
```typescript
hasSubmittedThisWeek(mentorId, studentId, weekStart)
```

But the call passes:
```typescript
hasSubmittedThisWeek(userData.id, mentor.id, date)
// which means: hasSubmittedThisWeek(studentId, mentorId, date)
```

The parameters are SWAPPED!

### Issue #4: Mentorship Level Not in MentorDashboard Form
**Status:** NOT A BUG

**Analysis:**
- StudentDashboard has the form for students to rate their mentors (includes 6 scales)
- MentorDashboard does NOT have a form to rate mentors
- Mentors who also have mentors (dual-role) use StudentDashboard to submit mentor reviews
- This is correct behavior - only one place to submit each type of review

**Confirmation:**
Looking at the logs, when accessing from any page, the form loads from StudentDashboard which includes all 6 scales including Mentorship Level.

## Fixes Required

### Fix #1: Display Score with Decimal
Keep the hardcoded `/2` but ensure the score displays with one decimal place:

```tsx
<p className="text-3xl font-bold text-gray-900">
  {(stats.reviewScore ?? 0).toFixed(1)}/2
</p>
```

### Fix #2: Use Correct Week Start Date
Import and use `getCurrentWeekStart()`:

```tsx
import { getCurrentWeekStart } from '../../utils/reviewDateUtils';

// ... later in the code
const hasSubmitted = await MentorReviewService.hasSubmittedThisWeek(
  mentor.id,        // mentor_id (correct order)
  userData.id,      // student_id (correct order) 
  getCurrentWeekStart()  // Monday midnight
);
```

### Fix #3: Fix Parameter Order
Swap the parameters to match the function signature.

## Testing Plan

### Test #1: Score Display
1. Open performance review modal
2. Check "Overall Average Score"
3. Expected: Shows `1.0/2` (not `1/2`)
4. Verify it shows one decimal place for all scores

### Test #2: "Due" Badge Disappears
1. Login as student with mentor
2. Check ReviewActionsCard - should show "Due" badge
3. Submit mentor review
4. Refresh page
5. Expected: "Due" badge should disappear
6. Check console: `hasSubmitted` should log `true`

### Test #3: Multiple Review Locations
1. Submit mentor review from StudentDashboard (homepage)
2. Verify all 6 scales are visible including "Mentorship Quality"
3. Submit successfully
4. Check Firebase - should have `mentorship_level` field
5. Verify score calculation includes all 6 criteria

## Notes

- The "1/2" vs "1.0/2" is a display issue only - calculations are correct
- The parameter swap is the critical bug affecting "Due" badge
- Mentorship Level form is only in StudentDashboard (correct design)
- All review submission points use the same form component

