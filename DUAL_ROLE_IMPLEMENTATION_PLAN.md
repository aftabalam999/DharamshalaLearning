# 🎭 Dual Role Implementation Plan
## Supporting Students Who Are Also Mentors

## Problem Statement

**Current System (Broken):**
```typescript
// Current isStudent() logic
const isStudent = (): boolean => {
  return !userData?.isAdmin && 
         !userData?.isSuperMentor && 
         userData?.role !== 'academic_associate' &&
         userData?.role !== 'super_mentor' &&
         userData?.role !== 'mentor';
};
```

**Issue:** If a user has `isMentor: true` or `role: 'mentor'`, they are treated as ONLY a mentor, NOT a student.

**Reality:** Many students also mentor other students. They need to:
- ✅ Submit their own weekly reviews (as a student)
- ✅ Review their mentees (as a mentor)
- ✅ Appear in BOTH student AND mentor compliance reports
- ✅ Access both Student Dashboard and Mentor Dashboard

---

## Current Data Model

```typescript
interface User {
  role?: 'admin' | 'academic_associate' | 'super_mentor' | 'mentor';
  isMentor?: boolean;        // Student who mentors others
  isSuperMentor?: boolean;   // Can mentor unlimited mentees
  mentor_id?: string;        // Their own mentor (if they're a student)
  // ... other fields
}
```

**Key Insight:** 
- `role: 'mentor'` → Professional mentor (NOT a student)
- `isMentor: true` → Student who ALSO mentors peers
- These are DIFFERENT!

---

## Solution Design

### Option 1: Fix isStudent() Logic (Recommended)

**Change:** `isStudent()` should return `true` for users who have a mentor_id (i.e., they ARE a student)

```typescript
// ✅ FIXED isStudent() logic
const isStudent = (): boolean => {
  // Check if user is a student by checking if they HAVE a mentor
  // Students can also be mentors (isMentor: true)
  return !!userData?.mentor_id || 
         (!userData?.role || 
          (userData?.role !== 'admin' && 
           userData?.role !== 'academic_associate' && 
           userData?.role !== 'super_mentor' &&
           userData?.role !== 'mentor'));
};

// isMentor() stays the same - checks if user can mentor others
const isMentor = (): boolean => {
  return userData?.isMentor || 
         userData?.isSuperMentor || 
         userData?.role === 'super_mentor' || 
         userData?.role === 'mentor' || 
         false;
};
```

**Logic:**
1. If user has `mentor_id` → They ARE a student (regardless of isMentor flag)
2. If user has `role: 'mentor'` but NO `mentor_id` → Professional mentor only
3. If user has `isMentor: true` AND `mentor_id` → Student who mentors peers

### Option 2: Add Explicit Flags (More Complex)

```typescript
interface User {
  // ... existing fields
  isActualStudent?: boolean;  // Explicitly marks if they're a student
  canMentor?: boolean;         // Can mentor others
}
```

**Pros:** More explicit  
**Cons:** Requires database migration, more fields to maintain

---

## Recommended Solution: Option 1

**Advantages:**
- ✅ Uses existing data (`mentor_id` is already there!)
- ✅ No database migration needed
- ✅ Clear logic: "Has a mentor = Is a student"
- ✅ Works with existing `isMentor` flag for dual-role users
- ✅ Minimal code changes

**Implementation Steps:**

### Step 1: Fix `AuthContext.tsx`

```typescript
// Before (Broken)
const isStudent = (): boolean => {
  return !userData?.isAdmin && 
         !userData?.isSuperMentor && 
         userData?.role !== 'academic_associate' &&
         userData?.role !== 'super_mentor' &&
         userData?.role !== 'mentor';
};

// After (Fixed)
const isStudent = (): boolean => {
  // Primary check: Do they have a mentor? (i.e., are they mentored by someone?)
  if (userData?.mentor_id) {
    return true;  // Has a mentor = Is a student
  }
  
  // Secondary check: No mentor_id, check role exclusions
  // If they have no mentor AND they're a professional role, they're not a student
  return !userData?.isAdmin && 
         !userData?.isSuperMentor && 
         userData?.role !== 'admin' &&
         userData?.role !== 'academic_associate' &&
         userData?.role !== 'super_mentor' &&
         userData?.role !== 'mentor';
};
```

### Step 2: Update AdminReviewCompliance Filter Logic

**Current Issue:** Filter by role='student' or role='mentor' is mutually exclusive

```typescript
// Before (Broken for dual-role users)
if (filters?.role === 'student') {
  usersQuery = query(usersRef, where('role', 'in', ['student', null]));
} else if (filters?.role === 'mentor') {
  usersQuery = query(usersRef, where('isMentor', '==', true));
}

// After (Fixed)
if (filters?.role === 'student') {
  // Students are those with a mentor_id
  usersQuery = query(usersRef, where('mentor_id', '!=', null));
} else if (filters?.role === 'mentor') {
  // Mentors have isMentor flag (includes dual-role students)
  usersQuery = query(usersRef, where('isMentor', '==', true));
}
```

**Note:** Some users will appear in BOTH filters (dual-role students)

### Step 3: Update Navigation Logic

```typescript
// src/App.tsx or Navigation component
const showStudentDashboard = isStudent();  // Now true for dual-role
const showMentorDashboard = isMentor();    // Also true for dual-role

// Both can be true simultaneously!
```

### Step 4: Update Compliance Calculation

```typescript
// AdminReviewCompliance.tsx - fetchComplianceData()

// Count students (includes dual-role users)
const students = allUsers.filter(u => 
  u.mentor_id !== undefined  // Has a mentor = Is a student
);

// Count mentors (includes dual-role users)
const mentors = allUsers.filter(u => 
  u.isMentor || u.isSuperMentor || u.role === 'super_mentor' || u.role === 'mentor'
);

// Note: Some users will be counted in BOTH categories (correct!)
```

### Step 5: Update BulkReminderPanel

```typescript
// When selecting "Students Only"
const studentUsers = allUsers.filter(u => 
  u.mentor_id !== undefined  // Has a mentor
);

// When selecting "Mentors Only"
const mentorUsers = allUsers.filter(u => 
  u.isMentor || u.isSuperMentor || u.role === 'mentor' || u.role === 'super_mentor'
);

// Dual-role users can receive reminders for BOTH responsibilities
```

---

## Testing Checklist

### Test User Profiles

**Profile A: Pure Student**
- `mentor_id: 'abc123'`
- `isMentor: false` (or undefined)
- Expected: `isStudent() = true`, `isMentor() = false`
- Can: Submit reviews, access student dashboard
- Cannot: Review mentees, access mentor dashboard

**Profile B: Student Who Mentors (Dual-Role)**
- `mentor_id: 'abc123'`  ← Has a mentor (is a student)
- `isMentor: true`       ← Can mentor others
- Expected: `isStudent() = true`, `isMentor() = true`
- Can: Submit reviews + Review mentees, access BOTH dashboards
- Appears in: Both student AND mentor compliance reports

**Profile C: Professional Mentor**
- `mentor_id: undefined` (or null)  ← No mentor (not a student)
- `role: 'mentor'`
- Expected: `isStudent() = false`, `isMentor() = true`
- Can: Review mentees, access mentor dashboard
- Cannot: Submit own reviews (not a student)

**Profile D: Super Mentor**
- `mentor_id: undefined`
- `isSuperMentor: true`
- Expected: `isStudent() = false`, `isMentor() = true`
- Same as Profile C, but unlimited mentees

**Profile E: Academic Associate**
- `mentor_id: undefined`
- `role: 'academic_associate'`
- Expected: `isStudent() = false`, `isMentor() = false`
- Can: Admin functions
- Cannot: Submit reviews or mentor

### Test Scenarios

#### Scenario 1: Dual-Role User Login
1. Login as user with `mentor_id` AND `isMentor: true`
2. ✅ Should see BOTH "Student Dashboard" and "Mentor Dashboard" in nav
3. ✅ Student Dashboard: Can submit weekly review
4. ✅ Mentor Dashboard: Can review mentees
5. ✅ Appears in admin compliance report under BOTH student and mentor sections

#### Scenario 2: Admin Compliance Filter
1. Open Admin Review Compliance
2. Filter by "Student" role
3. ✅ Shows all users with `mentor_id` (includes dual-role users)
4. Filter by "Mentor" role
5. ✅ Shows all users with `isMentor: true` (includes dual-role users)
6. ✅ Some users appear in BOTH filters (correct!)

#### Scenario 3: Bulk Reminders
1. Open Bulk Reminder Panel
2. Select "Students - Pending Reviews"
3. ✅ Dual-role user appears if their student review is pending
4. Select "Mentors - Pending Reviews"
5. ✅ Same dual-role user appears if their mentor reviews are pending
6. ✅ Can send reminder for BOTH responsibilities

#### Scenario 4: Compliance Stats
1. Admin Dashboard compliance stats
2. ✅ Total students count includes dual-role users
3. ✅ Total mentors count includes dual-role users
4. ✅ Some users counted in both (correct!)
5. Example: "45 students, 12 mentors (3 are both)"

---

## Database Query Considerations

### Firestore Queries

**Problem:** Firestore doesn't have `where('mentor_id', '!=', null)` directly

**Solution:**
```typescript
// Option A: Filter in code after fetching
const allUsers = await getDocs(usersRef);
const students = allUsers.filter(u => u.mentor_id !== undefined);

// Option B: Use `where('mentor_id', '>', '')` (excludes null/undefined)
const studentsQuery = query(usersRef, where('mentor_id', '>', ''));

// Recommended: Option A (more flexible, works with cache)
```

---

## Migration Guide (If Needed)

**Current Users in Database:** No migration needed! Just deploy code fix.

**Why:** We're using existing `mentor_id` field, which already exists for students.

**Edge Cases to Check:**
1. Users with NO `mentor_id` AND NO `role` → Treated as students (current behavior)
2. Users with `role: 'mentor'` but ALSO have `mentor_id` → Treated as dual-role
3. Users with only `isMentor: true` but no `mentor_id` → **Need manual check**

**Data Audit Script:**
```typescript
// Check for inconsistent data
const allUsers = await getDocs(collection(db, 'users'));
const inconsistent = [];

allUsers.forEach(doc => {
  const user = doc.data();
  
  // Red flag: isMentor but no mentor_id and no role
  if (user.isMentor && !user.mentor_id && !user.role) {
    inconsistent.push({
      id: doc.id,
      name: user.name,
      issue: 'isMentor without mentor_id or role'
    });
  }
});

console.log('Inconsistent users:', inconsistent);
```

---

## Files to Modify

### 1. `src/contexts/AuthContext.tsx`
- **Change:** Fix `isStudent()` logic to check `mentor_id` first

### 2. `src/components/Admin/AdminReviewCompliance.tsx`
- **Change:** Update filter queries to use `mentor_id` for students
- **Change:** Update compliance calculations

### 3. `src/components/Admin/BulkReminderPanel.tsx`
- **Change:** Update user filtering logic

### 4. `src/components/Admin/HistoricalTrendsTable.tsx`
- **Change:** Update role filtering

### 5. `src/App.tsx` (Navigation)
- **Verify:** Navigation shows both dashboards for dual-role users

---

## Benefits of This Approach

1. ✅ **No Database Migration:** Uses existing `mentor_id` field
2. ✅ **Clear Logic:** "Has mentor = Is student"
3. ✅ **Supports Dual-Role:** Students can also be mentors
4. ✅ **Accurate Reports:** Users counted correctly in both categories
5. ✅ **Minimal Code Changes:** Only update a few functions
6. ✅ **Backward Compatible:** Existing data works without changes

---

## Rollout Plan

### Phase 1: Code Fix (30 min)
1. Update `AuthContext.tsx` isStudent() logic
2. Test with dual-role user (create test user if needed)
3. Verify both dashboards appear

### Phase 2: Admin Compliance (30 min)
4. Update `AdminReviewCompliance.tsx` filter logic
5. Test student filter shows dual-role users
6. Test mentor filter shows dual-role users

### Phase 3: Bulk Reminders (30 min)
7. Update `BulkReminderPanel.tsx` filtering
8. Test dual-role users can receive both types of reminders

### Phase 4: Testing (1-2 hours)
9. Run all test scenarios above
10. Verify compliance stats are accurate
11. Check edge cases

### Total Time: ~3 hours

---

## Next Steps

**Immediate:**
1. ✅ Confirm this is the correct understanding of your requirement
2. ✅ Identify test user(s) with dual roles (or create one)
3. ✅ Proceed with Phase 1 code fix

**Questions to Clarify:**
- Are there users in your DB who have `isMentor: true` AND `mentor_id`? (dual-role)
- Should professional mentors (role='mentor') have NO mentor_id?
- Should academic associates be able to submit reviews? (currently no)

---

**Status:** 📋 Plan ready, awaiting confirmation to proceed

**Priority:** 🔴 HIGH - Affects compliance tracking accuracy

**Risk:** 🟢 LOW - No database changes needed, backward compatible
