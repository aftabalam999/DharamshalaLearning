# Complete Flow Testing Guide
**Date:** November 11, 2025

## 🔍 Issues to Investigate

### 1. **New Users Not Showing in Mentor Assignment List** ⚠️
### 2. **Mentor Request & Approval Flow** ✅
### 3. **Goal Approval by Mentor Flow** ✅

---

## 🧪 Testing Procedures

### **ISSUE 1: New Users Not Appearing in Assignment List**

#### Root Cause Analysis:
The `MentorAssignment.tsx` component filters users with:
```typescript
.filter(u => !u.isAdmin)
```

**Potential Problems:**
1. **New users don't have `isAdmin` field** - They may be filtered out incorrectly
2. **Role-based filtering issue** - System should check `role !== 'admin'` instead of `isAdmin`
3. **Cache issue** - getAllUsers() uses 5-minute cache

#### Test Steps:
```bash
# 1. Check Firestore Console
# Navigate to: Firebase Console → Firestore Database → users collection
# Verify new user documents have:
   - ✅ isAdmin: false (or missing)
   - ✅ role: 'student' (or missing/null)
   - ✅ created_at: timestamp

# 2. Check Browser Console
# Open: http://localhost:3000/admin/dashboard → Mentor Assignment tab
# Look for console errors

# 3. Test Cache Invalidation
# In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

#### Expected Behavior:
- **All non-admin users should appear** in the mentor assignment list
- New users should show with "No mentor assigned" status
- Filter dropdown should work: All / With Mentor / Without Mentor

#### Files to Check:
```
src/components/Admin/MentorAssignment.tsx (line 78)
src/services/dataServices.ts (AdminService.getAllUsers)
src/utils/cache.ts (queryCache)
```

---

### **ISSUE 2: Mentor Request & Approval Flow** ✅

#### Current Implementation (WORKING):
```
Student Dashboard → Find/Change Mentor → Select Mentor → Submit Request
       ↓
Request stored in 'mentor_change_requests' collection
       ↓
Student.pending_mentor_id = requested_mentor_id
       ↓
Admin/Academic Associate sees request in dashboard
       ↓
Admin clicks "Approve"
       ↓
Student.mentor_id = requested_mentor_id
Student.pending_mentor_id = '' (cleared)
Request.status = 'approved'
```

#### Test Steps:
```bash
# AS STUDENT:
1. Login as student
2. Go to Home Dashboard
3. Click "Change Mentor" or "Find Mentor" button
4. Browse available mentors (sorted by capacity)
5. Select a mentor
6. Enter reason for request
7. Click "Submit Request"
8. Verify "Change pending" badge appears
9. Verify "Change Mentor" button is disabled

# AS ADMIN:
1. Login as admin
2. Go to Admin Dashboard → Mentor Requests tab
3. Verify pending request appears with:
   - Student name & email
   - Current mentor (if any)
   - Requested mentor
   - Reason provided
4. Enter admin notes (optional)
5. Click "Approve"
6. Verify success message
7. Check request disappears from list

# VERIFY IN FIRESTORE:
- users/{studentId}/mentor_id = new mentor ID
- users/{studentId}/pending_mentor_id = '' (cleared)
- mentor_change_requests/{requestId}/status = 'approved'
- mentor_change_requests/{requestId}/reviewed_by = admin ID
- mentor_change_requests/{requestId}/reviewed_at = timestamp
```

#### Known Issues (FIXED):
- ✅ Firebase undefined field error - Fixed by conditional field inclusion
- ✅ Parameter order mismatch - Fixed in MentorBrowser.tsx
- ✅ Admin notes causing errors - Fixed by optional inclusion

#### Files Involved:
```
src/components/Student/MentorBrowser.tsx
src/components/Admin/MentorRequestApproval.tsx
src/services/dataServices.ts (MentorshipService)
```

---

### **ISSUE 3: Goal Approval by Mentor** ✅

#### Current Implementation (WORKING):
```
Student submits goal → Goal.status = 'pending'
       ↓
Mentor sees goal in dashboard/mentee review page
       ↓
Mentor clicks "Approve" or "Send Feedback"
       ↓
Goal.status = 'approved' or 'reviewed'
Goal.reviewed_by = mentor_id
Goal.reviewed_at = timestamp
Goal.mentor_comment = feedback (if provided)
       ↓
Student sees status update in their dashboard
```

#### Test Steps:
```bash
# AS STUDENT:
1. Login as student
2. Go to Goals & Reflections page
3. Set a daily goal
4. Click "Submit Goal"
5. Verify goal shows "pending" status

# AS MENTOR (Method 1 - Mentor Dashboard):
1. Login as mentor
2. Go to Mentor Dashboard
3. Scroll to "Goals & Reflections Review" section
4. Find pending goal from student
5. Click goal to expand
6. Choose: "Approve" or "Review with Feedback"
7. Add comment (optional for approve, required for review)
8. Submit

# AS MENTOR (Method 2 - Mentee Review Page):
1. Login as mentor
2. Go to Mentor Dashboard → Select mentee
3. Click "View Details & History"
4. Go to "Goals & Reflections" tab
5. Click pending goal
6. In feedback modal:
   - Select "✓ Approve Goal" or "⚠ Request Changes"
   - Add comment if needed
   - Click "Approve" or "Send Feedback"

# AS ADMIN/ACADEMIC ASSOCIATE:
1. Login as admin/academic associate
2. Go to Admin Dashboard → Mentor Campus Overview
3. Select student from list
4. View goals & reflections
5. Can approve/review any goal from assigned campus

# VERIFY RESULTS:
- Goal status changes from 'pending' to 'approved'/'reviewed'
- Student sees updated status immediately
- Mentor comment appears in goal card
- Student can proceed to reflection (if approved)
```

#### Permission Matrix:
```
┌─────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ User Role           │ Own Goal │ Mentee   │ Campus   │ All      │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Student             │ Create   │ ❌       │ ❌       │ ❌       │
│ Mentor              │ ❌       │ ✅       │ ❌       │ ❌       │
│ Super Mentor        │ ❌       │ ✅       │ ❌       │ ❌       │
│ Academic Associate  │ ❌       │ ❌       │ ✅       │ ❌       │
│ Admin               │ ❌       │ ❌       │ ❌       │ ✅       │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┘
```

#### Goal Status Flow:
```
pending → (mentor reviews) → approved ✅
pending → (mentor reviews) → reviewed 🔄 (needs changes)
reviewed → (student updates) → pending → approved ✅
```

#### Files Involved:
```
src/components/Mentor/MentorDashboard.tsx
src/components/Mentor/MentorMenteeReview.tsx
src/components/Admin/MentorCampusTab.tsx
src/services/dataServices.ts (GoalService.reviewGoal)
src/services/permissions.ts (canReviewGoal)
```

---

## 🐛 Debugging Commands

### Check New Users in Firestore:
```javascript
// Run in browser console
const checkNewUsers = async () => {
  const response = await fetch('/__/firebase/firestore/users');
  const users = await response.json();
  console.table(users.filter(u => !u.mentor_id));
};
```

### Force Cache Refresh:
```javascript
// Run in browser console
localStorage.removeItem('firebase-cache');
sessionStorage.clear();
location.reload();
```

### Check Mentor Request Status:
```javascript
// In browser console while logged in as student
const checkMyRequest = async () => {
  const userId = localStorage.getItem('userId'); // Get from auth context
  console.log('Checking requests for user:', userId);
  // Check Firestore directly or use network tab
};
```

### Verify Goal Permissions:
```javascript
// Check if mentor can review a goal
const verifyPermission = async (goalId) => {
  try {
    await GoalService.reviewGoal(goalId, 'current-user-id', 'approved');
    console.log('✅ Permission granted');
  } catch (error) {
    console.error('❌ Permission denied:', error.message);
  }
};
```

---

## 🔧 Quick Fixes

### Fix 1: New Users Not Showing
```typescript
// In src/components/Admin/MentorAssignment.tsx
// Change line 78 from:
.filter(u => !u.isAdmin)

// To:
.filter(u => !u.isAdmin && u.role !== 'admin')

// Better yet, use explicit role check:
.filter(u => {
  const role = u.role || 'student';
  return role === 'student' || role === 'mentee' || (!u.isAdmin && !u.role);
})
```

### Fix 2: Force Load All Users
```typescript
// Add this button in MentorAssignment component
<button onClick={async () => {
  const { queryCache } = await import('../utils/cache');
  queryCache.invalidate('all-users');
  await loadStudents();
}}>
  🔄 Refresh User List
</button>
```

### Fix 3: Show User Creation Debug
```typescript
// In AuthContext.tsx or registration flow
console.log('Creating new user with data:', {
  isAdmin: false,
  role: 'student',
  mentor_id: null,
  // ... other fields
});
```

---

## ✅ Verification Checklist

### New User Registration:
- [ ] User document created in Firestore
- [ ] isAdmin set to false (or missing)
- [ ] role set to 'student' (or missing)
- [ ] User appears in admin user list
- [ ] User appears in mentor assignment list
- [ ] User can login successfully
- [ ] User sees student dashboard

### Mentor Request Flow:
- [ ] Student can browse mentors
- [ ] Student can submit request with reason
- [ ] pending_mentor_id is set on student
- [ ] Request appears in admin dashboard
- [ ] Admin can approve request
- [ ] mentor_id is updated on student
- [ ] pending_mentor_id is cleared
- [ ] Request status changes to 'approved'
- [ ] Student sees new mentor in dashboard

### Goal Approval Flow:
- [ ] Student can create goal
- [ ] Goal shows "pending" status
- [ ] Mentor sees goal in their dashboard
- [ ] Mentor can click to review
- [ ] Mentor can approve with optional comment
- [ ] Mentor can request changes with required comment
- [ ] Goal status updates immediately
- [ ] Student sees updated status
- [ ] Student sees mentor comment
- [ ] If approved, student can create reflection

---

## 📊 Database Schema Reference

### users Collection:
```typescript
{
  id: string,
  name: string,
  email: string,
  isAdmin: boolean,          // FALSE for new users
  role: string,              // 'student' | 'mentor' | 'admin' | 'super_mentor' | 'academic_associate'
  mentor_id: string | null,  // Assigned mentor ID
  pending_mentor_id: string, // Pending mentor request ID
  campus: string,            // 'Dharamshala' | 'Bageshree' | etc
  status: string,            // 'active' | 'inactive' | 'dropout' | etc
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### mentor_change_requests Collection:
```typescript
{
  id: string,
  student_id: string,
  student_name: string,           // Denormalized
  student_email: string,          // Denormalized
  requested_mentor_id: string,
  requested_mentor_name: string,  // Denormalized
  current_mentor_id: string,      // Can be null
  current_mentor_name: string,    // Denormalized
  status: 'pending' | 'approved' | 'rejected',
  reason: string,                 // Student's reason
  admin_notes: string,            // Optional admin notes
  created_at: Timestamp,
  reviewed_at: Timestamp,
  reviewed_by: string             // Admin user ID
}
```

### daily_goals Collection:
```typescript
{
  id: string,
  student_id: string,
  goal_text: string,
  target_percentage: number,
  status: 'pending' | 'approved' | 'reviewed',
  mentor_comment: string,         // Optional feedback
  reviewed_by: string,            // Mentor/Admin ID
  reviewed_at: Timestamp,
  phase_id: string,
  topic_id: string,
  created_at: Timestamp,
  for_date: string                // YYYY-MM-DD format
}
```

---

## 🚨 Common Errors & Solutions

### Error 1: "User not found in mentor assignment"
**Cause:** User document missing `isAdmin` field or cache is stale
**Solution:**
```bash
1. Check Firestore Console - verify user exists
2. Clear cache: localStorage.clear()
3. Add isAdmin: false to user document manually
4. Restart dev server
```

### Error 2: "Cannot approve mentor request"
**Cause:** Admin notes field is undefined
**Solution:** Already fixed - admin notes are now optional

### Error 3: "Permission denied to review goal"
**Cause:** Mentor is not assigned to student or role mismatch
**Solution:**
```bash
1. Verify mentor_id matches reviewer ID
2. Check role in Firestore (should be 'mentor' or 'super_mentor')
3. Verify permissions.ts logic
```

### Error 4: "Goal status not updating"
**Cause:** Optimistic update failed or Firestore rule blocking
**Solution:**
```bash
1. Check Firestore rules
2. Verify reviewed_by field is set
3. Check browser console for errors
4. Refresh page to see actual state
```

---

## 🎯 Next Steps

1. **Test new user registration completely**
   - Create new user via signup
   - Verify appears in admin lists
   - Assign mentor
   - Test mentor request flow

2. **Test goal approval with all roles**
   - Student creates goal
   - Mentor approves
   - Super mentor approves (assigned mentee)
   - Academic associate approves (same campus)
   - Admin approves (any goal)

3. **Load test with multiple users**
   - Create 20+ test users
   - Verify all appear in lists
   - Test filtering and search
   - Check performance

4. **End-to-end workflow**
   - New user signs up
   - Requests mentor
   - Admin approves
   - Student sets goal
   - Mentor reviews goal
   - Student completes reflection
   - Mentor reviews reflection

---

## 📝 Notes

- Mentor request flow is WORKING correctly ✅
- Goal approval flow is WORKING correctly ✅
- New user visibility issue needs investigation ⚠️
- Consider adding logging for debugging user loading
- May need to update Firestore indexes for complex queries

**Recommendation:** Run through all test cases above and report which specific step fails for new users not appearing.
