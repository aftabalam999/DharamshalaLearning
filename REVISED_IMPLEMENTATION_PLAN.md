# 🎯 REVISED IMPLEMENTATION PLAN: Book Session + Rolling Queue System

**Date:** October 21, 2025  
**Status:** Ready for Implementation  
**Build Status:** ✅ Passing  

---

## 📝 Key Clarifications Integrated

### 1. **Mentor Assignment Model**
- ✅ **ALL students already have mentors assigned** → No need to create mentor assignment
- Mentors provide pair programming **only for their mentees** OR on-demand mentor changes
- Academic Associates are **special mentors with expanded scope**
- Academic Associates do pair programming with **all students** (not just their mentees)

### 2. **Academic Associate Role**
- Academic Associates **are mentors**, but with **different responsibilities**
- They handle **higher volume** of sessions (capacity: 6-10 sessions/day)
- Unlike regular mentors: serve **everyone in campus** (not just assigned mentees)
- Can be configured via admin UI to assign student groups
- Pair programming is **their primary function** (vs regular mentors who tutor)

### 3. **Session Rules by Mentor Type**
```
REGULAR MENTOR:
├─ Pair programming: ✅ Yes (with assigned mentee)
├─ Mentor change sessions: ✅ Yes (on-demand requests)
├─ Cross-campus students: ❌ No
└─ Capacity: ~1-2 sessions/week

ACADEMIC ASSOCIATE:
├─ Pair programming: ✅ Yes (with ANY student)
├─ Student scope: All in campus + filter by admin grouping
├─ Cross-campus students: ❌ No (campus-based)
├─ Capacity: 6-10 sessions/day
└─ Admin assigns student groups: Yes (by house + phase)
```

### 4. **Cancellation & Auto-Requeue Logic**
- When student **cancels** a session:
  - Remove from current slot
  - **Auto-add to queue** for next available slot
  - Assign to **different academic associate** (load balance)
  - Notify student: "Rescheduled for [time] with [associate]"
  - Student can **accept or decline** the requeue offer

### 5. **Queue System: Rolling Basis**
- **Not fixed daily slots** → Rolling queue
- Sessions available **continuously** (not just 1 per day)
- System processes queue in **FIFO order** with **priority adjustments**
- **"Last served" tracking**: Students who haven't had pair programming in longest time get priority

### 6. **Dynamic Time Slots**
- **Not fixed 9:00, 10:00, 11:00** → Flexible based on:
  - Academic associate availability (campus hours)
  - Student preference (if provided)
  - Campus schedules & breaks
  - Leave requests
- Slots can be **30min, 45min, 60min** (configurable)

### 7. **Load Balancing on Academic Associates**
- **Admin UI** to assign student groups to specific academic associates
- Filter by: **House** + **Phase** (for easy grouping)
- Example: "House A, Phase 2 students → Academic Associate Jane"
- System tracks **session count per associate** → balances queue distribution
- If one associate overloaded → route new students to underloaded associate

---

## 🏗️ NEW Architecture: Rolling Queue System

```
╔══════════════════════════════════════════════════════════════╗
║          ROLLING QUEUE ARCHITECTURE (vs Daily Slots)         ║
╚══════════════════════════════════════════════════════════════╝

CURRENT (Fixed Daily):
├─ 8 students → 1 session each per day
├─ 09:00, 10:00, 11:00, 12:00, 14:00, 15:00, 16:00, 17:00
├─ Jane: 09:00 (S1), 10:00 (S2), 11:00 (S3), 12:00 (S4)
├─ Bob:  14:00 (S5), 15:00 (S6), 16:00 (S7), 17:00 (S8)
└─ After 17:00: Queue empty until next day

NEW (Rolling Queue):
├─ Queue continuously processes
├─ Session when: associate available + student ready
├─ Can be: 09:15, 11:45, 13:30, 14:10, 15:50, etc.
├─ Priority: Students waiting longest get next slot
├─ Jane: 09:00 (S1) → 09:50 (S5) → 10:40 (S3) → 11:25 (S7)...
├─ Bob:  09:30 (S2) → 10:15 (S6) → 11:10 (S4) → 12:00 (S8)...
├─ Continuous throughout day
└─ Supports unlimited sessions (not just N per day)
```

---

## 📊 Data Model Updates

### Collections Structure

```typescript
// EXISTING - students collection (already have mentor assigned)
students: {
  userId: {
    name: string,
    mentor_id: string,        // ✅ ALREADY EXISTS
    academic_associate_id: string,  // ✅ NEW: Can be assigned to AA for higher-freq sessions
    house: string,            // ✅ For admin grouping
    phase: number,            // ✅ For admin grouping
    last_pairing_timestamp: number,  // ✅ NEW: Last time paired for queue priority
    active_sessions: number,  // ✅ NEW: Count of pending/scheduled sessions
  }
}

// ✅ EXISTING - sessions collection
sessions: {
  sessionId: {
    student_id: string,
    mentor_id: string,        // Can be regular mentor or academic associate
    scheduled_date: string,   // Date of session
    scheduled_time: string,   // Time (e.g., "09:00")
    session_type: "mentorship" | "pair_programming" | "mentor_change",
    status: "scheduled" | "completed" | "cancelled" | "no_show",
    is_rescheduled: boolean,  // Track if auto-requeued from cancellation
    previous_session_id: string, // Link to original if rescheduled
    created_at: number,
    cancelled_at?: number,
    cancelled_by?: string,
    rescheduled_to?: string,  // Auto-assigned next slot
  }
}

// ✅ EXISTING - users collection (mentors)
users: {
  mentorId: {
    name: string,
    is_mentor: boolean,
    is_academic_associate: boolean,  // ✅ NEW: Distinguishes academic associates
    campus: string,
    working_hours: { start: number, end: number },  // ✅ NEW: Individual hours
    concurrent_sessions: number,      // ✅ NEW: How many simultaneous (usually 1)
  }
}

// ✅ EXISTING - campus_schedules collection (extend)
campus_schedules: {
  campusName: {
    campus_name: string,
    working_hours: { start, end },
    breaks: [{ start, end }],
    academic_associates: [
      {
        associate_id: string,
        name: string,
        sessions_per_day_capacity: number,  // ✅ NEW: 6-10
        assigned_students: [string],         // ✅ NEW: [S1, S3, S5, S7]
        assigned_house: string,              // ✅ NEW: "House A"
        assigned_phase: number,              // ✅ NEW: 2
        current_queue_position: number,      // ✅ NEW: How many in queue
      }
    ]
  }
}

// ✅ NEW - pair_programming_queue collection
pair_programming_queue: {
  queueId: {
    campus: string,
    student_id: string,
    queue_position: number,           // ✅ Order in rolling queue
    time_added: number,               // When added
    preferred_academic_associate?: string,  // If specified
    last_served_timestamp: number,    // Student's last pair programming session
    estimated_wait_time: number,      // Calculated based on associates' capacity
    status: "queued" | "matched" | "completed" | "cancelled",
  }
}

// ✅ NEW - academic_associate_assignments collection
academic_associate_assignments: {
  assignmentId: {
    campus: string,
    academic_associate_id: string,
    assigned_house: string,           // Filter by house
    assigned_phase: number,           // Filter by phase
    assigned_students: [string],      // Explicit list [S1, S3, S5, S7]
    created_by: string,               // Admin who created
    created_at: number,
    updated_at: number,
  }
}

// ✅ NEW - session_cancellations_log collection (track requeues)
session_cancellations_log: {
  logId: {
    original_session_id: string,
    student_id: string,
    cancelled_by: string,
    reason: string,
    cancelled_at: number,
    rescheduled_to?: string,          // Auto-assigned session ID
    rescheduled_at?: number,
    requeue_status: "pending" | "assigned" | "declined",
  }
}
```

---

## 🔄 Core Processes

### Process 1: Book Session (Direct Mentee → Mentor)

```
STUDENT CLICKS "BOOK SESSION":
├─ Step 1: Mentor Auto-Selected
│  ├─ Check userData.mentor_id
│  ├─ If exists → Load mentor details, auto-select
│  ├─ If NOT exists → Show error: "Request mentor first"
│  └─ Display: "Booking with [Mentor Name]"
│
├─ Step 2: Choose Preferred Time (Optional)
│  ├─ Display available slots from SlotAvailabilityService
│  ├─ Mentor's availability based on their schedule + existing bookings
│  ├─ Can leave blank for "next available"
│  └─ Calendar or time picker
│
├─ Step 3: Confirm
│  ├─ Topic (auto-populated from student phase)
│  ├─ Priority (optional)
│  └─ "Confirm Booking"
│
└─ RESULT: Session created
   ├─ session_type: "mentorship"
   ├─ mentor_id: assigned mentor
   ├─ scheduled_date: provided or "next available"
   └─ status: "scheduled"
```

### Process 2: Request Pair Programming (Any Student)

```
STUDENT CLICKS "REQUEST PAIR PROGRAMMING":
├─ Step 1: Select Type
│  ├─ Option A: "Quick Session (30 min)"
│  ├─ Option B: "Deep Dive (60 min)"
│  ├─ Option C: "Extended (90 min)"
│  └─ Select duration
│
├─ Step 2: Time Preference (Optional)
│  ├─ "ASAP" (default)
│  ├─ "Pick specific time"
│  └─ Calendar picker
│
├─ Step 3: Confirm Topic
│  ├─ Auto-populated from student phase
│  ├─ Can edit if needed
│  └─ "Submit Request"
│
└─ RESULT: Added to rolling queue
   ├─ Added to pair_programming_queue collection
   ├─ queue_position: calculated based on last_served_timestamp
   ├─ estimated_wait_time: shown to student
   └─ Auto-matched when academic associate available
```

### Process 3: Admin Assigns Students to Academic Associates

```
ADMIN OPENS CAMPUS SCHEDULE ADMIN:
├─ Tab: "Academic Associates"
│
├─ Step 1: Select Academic Associate
│  ├─ Dropdown: [Jane Smith ▼] [Bob Wilson ▼]
│  └─ Show: "Currently assigned: 18 students, Capacity: 6/day"
│
├─ Step 2: Filter & Assign Students
│  ├─ Filter By House: [House A ▼]
│  ├─ Filter By Phase: [2 ▼]
│  ├─ Result: Shows 8 students matching House A + Phase 2
│  └─ List with checkboxes:
│     ☑ Student 1 (Last paired: 3 days ago)
│     ☐ Student 2 (Last paired: 1 week ago)
│     ☑ Student 3 (Last paired: 2 days ago)
│     etc.
│
├─ Step 3: Save Assignment
│  ├─ "Update Academic Associate Assignments"
│  ├─ Saves to academic_associate_assignments collection
│  └─ Updates pair_programming_queue for these students
│
└─ RESULT: Students now route to this academic associate
   ├─ Stored in academic_associate_assignments
   ├─ Queue manager checks this on matching
   └─ Load balances across assigned associates
```

### Process 4: Rolling Queue Matching & Load Balancing

```
BACKGROUND PROCESS (Every 30 seconds):
├─ Query pair_programming_queue (status="queued")
├─ Sort by: last_served_timestamp (oldest first)
│
├─ For each student in queue:
│  ├─ Check: Which academic associates available?
│  ├─ Check: Student's assigned associates (from admin UI)
│  ├─ Filter to: Assigned associates ONLY
│  ├─ Select: One with LOWEST current_queue_position
│  │  (Load balancing: distribute to least-loaded)
│  ├─ Get: Next available time slot for that associate
│  ├─ Create: Session with that associate
│  ├─ Update: pair_programming_queue (status="matched")
│  └─ Notify: Student "Matched with [Associate] at [Time]"
│
└─ Repeat until all queued students matched or no slots available
```

### Process 5: Cancellation & Auto-Requeue

```
STUDENT CLICKS "CANCEL SESSION":
├─ Shows: Reason dropdown
│  ├─ Conflict with class
│  ├─ Not feeling well
│  ├─ Schedule change
│  └─ Other [text box]
│
├─ Confirms: "This will auto-requeue you for next available"
│
└─ ON CONFIRM:
   ├─ Step 1: Log Cancellation
   │  ├─ Update session.status = "cancelled"
   │  ├─ Create session_cancellations_log entry
   │  └─ Set cancelled_at timestamp
   │
   ├─ Step 2: Auto-Requeue
   │  ├─ Add to pair_programming_queue
   │  ├─ Set queue_position based on last_served_timestamp
   │  ├─ Set requeue_status = "pending"
   │  └─ Trigger immediate matching (don't wait for next cycle)
   │
   ├─ Step 3: Match to Next Available
   │  ├─ Find available academic associate (maybe different one)
   │  ├─ Get next slot in rolling queue
   │  ├─ Create NEW session
   │  └─ Link original session to new session
   │
   ├─ Step 4: Notify Student
   │  ├─ "Your session cancelled"
   │  ├─ "Rescheduled for [Date] [Time] with [Associate]"
   │  ├─ Button: "Accept" OR "Hold"
   │  └─ If "Hold": Keep in queue, wait for next match
   │
   └─ RESULT:
      ├─ Original session.status = "cancelled"
      ├─ New session created
      ├─ Student auto-placed in queue
      └─ Different academic associate (better load balance)
```

### Process 6: Queue Priority Calculation

```
PRIORITY ALGORITHM (Used for sorting queue):

For each student in queue:
├─ last_served_timestamp = Student's last completed pair programming session
├─ time_since_last_served = now() - last_served_timestamp
├─ queue_score = time_since_last_served / (queue_position + 1)
│
├─ Example:
│  ├─ Student A: Last paired 7 days ago → score = 7 days / 1 = 7.0
│  ├─ Student B: Last paired 3 days ago, queue_pos = 2 → score = 3 / 3 = 1.0
│  ├─ Student C: Last paired 5 days ago → score = 5 / 2 = 2.5
│  └─ SORTED ORDER: A (7.0) → C (2.5) → B (1.0)
│
├─ Result: Student A gets matched first (longest wait)
├─ Prevents: Any student from being starved
└─ Ensures: Fairness in rolling queue
```

---

## 📋 Implementation Roadmap (Revised)

### Phase 1: Auto-Select Mentor in Direct Booking ⚡ (30 mins)

**File:** `src/components/Student/MenteeSlotBooking.tsx`

**What:**
- Check userData.mentor_id on component load
- If mentor exists → Auto-load and skip Step 1 (mentor selection)
- If NOT exists → Show error: "Please request a mentor first"
- Reduce 4 steps to 3 steps

**Result:** Students don't manually select their own assigned mentor

---

### Phase 2: Admin UI for Academic Associate Assignments 🔧 (2 hours)

**Files:** 
- `src/components/Admin/CampusScheduleAdmin.tsx` (extend)
- `src/services/AcademicAssociateService.ts` (new)

**What:**
- Add new tab: "Academic Associate Assignments"
- Dropdown to select academic associate
- Filters: House [▼] + Phase [▼]
- Checkbox list of matching students
- Show: "Last paired [X days ago]" for each student
- Save button: Updates academic_associate_assignments collection

**Result:** Admin can easily assign student groups by house+phase to academic associates

---

### Phase 3: Pair Programming Queue Service 🚀 (3 hours)

**Files:**
- `src/services/RollingQueueService.ts` (new)
- `src/services/QueueMatchingEngine.ts` (new)
- `src/utils/queuePriorityCalculator.ts` (new)

**What:**
- Create rolling queue system (not daily slots)
- Implement queue matching logic (every 30 seconds)
- Calculate priority based on last_served_timestamp
- Load balance across academic associates
- Store queue state in pair_programming_queue collection

**Key Functions:**
```typescript
// Add student to queue
addToQueue(studentId, duration, timePreference)

// Sort queue by priority
calculateQueuePriority(student, lastServedTime)

// Find best available academic associate
selectAcademicAssociate(student, assignedAssociates)

// Get next available time slot (dynamic)
getNextAvailableSlot(associate, duration)

// Match queue students to slots
matchQueueToSlots() // Runs every 30 seconds
```

---

### Phase 4: Cancellation & Auto-Requeue 🔄 (1.5 hours)

**Files:**
- `src/components/Student/SessionCard.tsx` (update)
- `src/services/CancellationService.ts` (new)
- `src/services/RollingQueueService.ts` (add requeue logic)

**What:**
- Cancellation modal with reason dropdown
- Auto-add to queue on cancellation
- Immediate matching (don't wait 30 seconds)
- Route to different academic associate
- Notify student of new slot
- Log cancellation for tracking

**Result:** No slot wasted, students smoothly rescheduled

---

### Phase 5: Queue Dashboard & Monitoring 📊 (2 hours)

**Files:**
- `src/components/Student/PairProgrammingQueue.tsx` (new)
- `src/components/Admin/QueueManagement.tsx` (new)

**What:**

**Student View:**
- Show: "You're in queue for pair programming"
- Position: "Position 3 of 8"
- Estimated wait: "~30 minutes"
- Last paired: "5 days ago"
- Can "cancel" or "hold" position

**Admin View:**
- Queue status per academic associate
- Students waiting longest
- Matching success rate
- Sessions completed today
- Peak hour analysis

**Result:** Transparency for students, visibility for admins

---

## 🔐 Data Flow: End-to-End

```
USER ACTION → SERVICE LAYER → FIRESTORE → UI UPDATE → USER NOTIFICATION

Example 1: Student Books Direct Session with Mentor
───────────────────────────────────────────────────
User: Click "Book Session"
  ↓
MenteeSlotBooking.tsx checks userData.mentor_id
  ↓
If mentor exists:
  ├─ Auto-select mentor (skip Step 1)
  ├─ Show date/time picker (Step 2)
  └─ Show confirmation (Step 3)
  ↓
User: Select time "Tomorrow 10:00"
  ↓
EnhancedPairProgrammingService.createSession()
  ├─ Validate: Mentor free at time? ✓
  ├─ Validate: Student free? ✓
  └─ Create session document
  ↓
Firestore: sessions collection
  ├─ student_id, mentor_id, scheduled_date, scheduled_time
  ├─ session_type: "mentorship"
  └─ status: "scheduled"
  ↓
StudentDashboard reloads
  ├─ Queries sessions where student_id = this user
  ├─ Shows: "1 session scheduled: Tomorrow 10:00 with John Doe"
  └─ Shows in "My Sessions" section
  ↓
User: Notification "Session booked for tomorrow 10:00!"


Example 2: Student Requests Pair Programming
───────────────────────────────────────────────────
User: Click "Request Pair Programming"
  ↓
RequestPairProgramming.tsx
  ├─ Select duration "60 min"
  ├─ Time preference "ASAP"
  └─ Confirm topic
  ↓
RollingQueueService.addToQueue()
  ├─ Calculate queue_position based on last_served_timestamp
  ├─ Set estimated_wait_time
  └─ Create entry in pair_programming_queue
  ↓
Firestore: pair_programming_queue collection
  ├─ student_id, queue_position, time_added
  ├─ last_served_timestamp (for priority)
  └─ status: "queued"
  ↓
QueueMatchingEngine runs (every 30 seconds)
  ├─ Sort queue by priority (oldest served first)
  ├─ For Student A:
  │  ├─ Get assigned academic associates (from academic_associate_assignments)
  │  ├─ Select least-loaded one
  │  ├─ Get next available slot
  │  └─ Create session
  ├─ Update pair_programming_queue (status="matched")
  └─ Trigger notification
  ↓
Firestore: sessions collection
  ├─ student_id, mentor_id (academic associate), scheduled_date, scheduled_time
  ├─ session_type: "pair_programming"
  ├─ auto_matched: true
  └─ status: "scheduled"
  ↓
StudentDashboard & Notification
  ├─ "Pair programming slot matched!"
  ├─ "Today 14:30 with Academic Associate Jane Smith"
  └─ "Accept" or "Hold for later"
  ↓
User: Sees in dashboard immediately


Example 3: Student Cancels & Gets Auto-Requeued
───────────────────────────────────────────────────
User: Click Cancel on Session
  ↓
CancellationService.cancelSession()
  ├─ Reason: "Conflict with class"
  ├─ Confirms auto-requeue
  └─ User clicks "Confirm Cancel"
  ↓
STEP 1: Log cancellation
  └─ session.status = "cancelled"
     session.cancelled_at = timestamp
     Create session_cancellations_log entry
  ↓
STEP 2: Auto-requeue
  └─ RollingQueueService.addToQueue()
     Set last_served_timestamp to current
     queue_position = high priority (longest wait)
  ↓
Firestore: pair_programming_queue
  └─ Create NEW queue entry (status="queued")
  ↓
STEP 3: Immediate matching (trigger now, don't wait 30 sec)
  └─ QueueMatchingEngine.matchImmediately()
     ├─ Find available academic associate (preferably different one)
     ├─ Get next slot
     └─ Create NEW session
  ↓
Firestore: sessions collection
  ├─ NEW session created
  ├─ link: previous_session_id (to cancelled session)
  └─ is_rescheduled: true
  ↓
StudentDashboard & Notification
  ├─ "Session cancelled"
  ├─ "Auto-rescheduled for Today 16:00 with Bob Wilson"
  ├─ Button: "Accept" or "Hold"
  └─ If "Hold": Stays in queue, waits for next match
```

---

## 🎯 Implementation Checklist

### Phase 1: Direct Booking Auto-Mentor (30 mins) ⚡

- [ ] Modify `MenteeSlotBooking.tsx`
  - [ ] Check `userData.mentor_id` on load
  - [ ] Auto-select if exists
  - [ ] Show error if not assigned
  - [ ] Skip Step 1 (mentor selection)
- [ ] Test: Student with mentor can skip selector
- [ ] Test: Student without mentor sees error
- [ ] Build verification
- [ ] Commit with message: "feat: auto-select mentor in booking"

### Phase 2: Admin Academic Associate Assignments (2 hours) 🔧

- [ ] Create `src/services/AcademicAssociateService.ts`
  - [ ] `getAcademicAssociates(campus)`
  - [ ] `assignStudentsToAssociate(associate, studentIds, house, phase)`
  - [ ] `getAssignedStudents(associate)`
  - [ ] `updateAssignments(assignmentId, updates)`

- [ ] Extend `CampusScheduleAdmin.tsx`
  - [ ] Add "Academic Associates" tab
  - [ ] Select academic associate dropdown
  - [ ] Filter by house + phase
  - [ ] Checkbox list of students
  - [ ] Show last_served_timestamp
  - [ ] Save button

- [ ] Create Firestore collection: `academic_associate_assignments`

- [ ] Test: Admin can assign students by house/phase
- [ ] Build verification
- [ ] Commit with message: "feat: admin UI for academic associate assignments"

### Phase 3: Rolling Queue System (3 hours) 🚀

- [ ] Create `src/services/RollingQueueService.ts`
  - [ ] `addToQueue(student, duration, timePreference)`
  - [ ] `removeFromQueue(queueId)`
  - [ ] `getQueueStatus(studentId)`
  - [ ] `getAllQueued(campus)`

- [ ] Create `src/services/QueueMatchingEngine.ts`
  - [ ] `matchQueueToSlots()` - Runs every 30 seconds
  - [ ] `selectAcademicAssociate(student, assignedAssociates)`
  - [ ] `getNextAvailableSlot(associate, duration)`
  - [ ] `createMatchedSession(student, associate, slot)`

- [ ] Create `src/utils/queuePriorityCalculator.ts`
  - [ ] `calculatePriority(student, lastServedTime)`
  - [ ] `sortByPriority(queueArray)`

- [ ] Create Firestore collection: `pair_programming_queue`

- [ ] Setup background job (Cloud Function or service)
  - [ ] Trigger QueueMatchingEngine every 30 seconds
  - [ ] Log matches

- [ ] Test: Queue sorting by priority
- [ ] Test: Load balancing across associates
- [ ] Test: Queue matching every 30 seconds
- [ ] Build verification
- [ ] Commit with message: "feat: rolling queue system with load balancing"

### Phase 4: Cancellation & Auto-Requeue (1.5 hours) 🔄

- [ ] Create `src/services/CancellationService.ts`
  - [ ] `cancelSession(sessionId, reason)`
  - [ ] `autoRequeueSession(originalSessionId)`
  - [ ] `notifyStudentOfReschedule(student, newSlot)`

- [ ] Update `SessionCard.tsx`
  - [ ] Add cancel button
  - [ ] Show reason dropdown
  - [ ] Confirm auto-requeue warning

- [ ] Create `session_cancellations_log` collection

- [ ] Test: Cancel session → Auto-added to queue
- [ ] Test: Matched to different academic associate
- [ ] Test: Student notified of new slot
- [ ] Build verification
- [ ] Commit with message: "feat: session cancellation with auto-requeue"

### Phase 5: Queue Monitoring Dashboard (2 hours) 📊

- [ ] Create `src/components/Student/PairProgrammingQueue.tsx`
  - [ ] Show queue position
  - [ ] Show estimated wait time
  - [ ] Show last paired timestamp
  - [ ] Can "cancel" or "hold"

- [ ] Create `src/components/Admin/QueueManagement.tsx`
  - [ ] Queue status per associate
  - [ ] Students waiting longest
  - [ ] Matching success rate
  - [ ] Daily completion stats

- [ ] Test: Student sees accurate queue position
- [ ] Test: Admin sees queue metrics
- [ ] Build verification
- [ ] Commit with message: "feat: queue monitoring and dashboard"

---

## 🚀 What Can Be Done Immediately

Based on your clarifications, here's what's ready to implement:

### ✅ READY NOW (Start Today)

1. **Phase 1 - Auto-Mentor Selection** (30 mins)
   - Simplest change, highest impact
   - Reduces friction for 100% of users
   - No new services needed, just UI logic

2. **Phase 2 - Admin UI for Assignments** (2 hours)
   - Data model already clear
   - UI is straightforward (filter + checkbox list)
   - No complex algorithms needed

3. **Phase 3 - Queue Service** (3 hours)
   - You've clarified the algorithm
   - Load balancing approach is clear
   - Priority calculation straightforward

4. **Phase 4 - Cancellation** (1.5 hours)
   - Requeue logic follows from Phase 3
   - Straightforward state management

5. **Phase 5 - Dashboard** (2 hours)
   - Simple UI to display queue state
   - Monitoring and analytics

### ✅ TOTAL TIME: ~8.5 hours (Full-day implementation)

---

## 🎯 Recommended Execution Order

**Day 1:**
1. Start Phase 1 (30 mins) → Build + Test
2. Phase 2 (2 hours) → Build + Test
3. Phase 3 (3 hours) → Build + Test
4. Phase 4 (1.5 hours) → Build + Test
5. Phase 5 (2 hours) → Build + Test

**Result by end of day:** Fully working rolling queue system with all features

---

## ❓ Final Clarifications Still Needed

1. **Dynamic Time Slots:**
   - Default slot duration? (30 min, 45 min, 60 min?)
   - Can students request specific durations? (e.g., 45 min?)

2. **Queue Matching:**
   - Run matching every 30 seconds? (Or different interval?)
   - Allow manual admin override to match specific student?

3. **Student Notification:**
   - Notify in-app only? Or email + SMS too?
   - Notify when queued, or only when matched?

4. **Capacity Management:**
   - What if queue gets too long? (> 100 students waiting?)
   - Should we alert admin?

5. **Session Completion:**
   - How do we track when session actually happens? (Auto at timestamp?)
   - Update last_served_timestamp automatically?

---

**Ready to start coding? Which phase should I begin with? 🚀**

- [ ] Start Phase 1 (Auto-mentor) immediately
- [ ] Start all phases today
- [ ] Want to clarify something first?
