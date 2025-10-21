# 🏗️ COMPLETE SYSTEM ARCHITECTURE: Rolling Queue Pair Programming

**Document Date:** October 21, 2025  
**Status:** Ready for Implementation  
**All Clarifications:** ✅ Integrated

---

## 📋 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMPUS LEARNING DASHBOARD                         │
│                    Pair Programming System v2.0                      │
└─────────────────────────────────────────────────────────────────────┘

LAYER 1: USER INTERFACES
├─ StudentDashboard
│  ├─ My Sessions (with auto-assigned ones)
│  ├─ Book Session button (direct mentor booking)
│  ├─ Request Pair Programming (queue entry)
│  └─ Queue Status (position, wait time, last served)
│
├─ PairProgrammingQueue.tsx (Student View)
│  ├─ Position in queue
│  ├─ Estimated wait time
│  ├─ Last paired timestamp
│  └─ Cancel/Hold options
│
├─ CampusScheduleAdmin.tsx (Admin Config)
│  ├─ Academic Associates tab ← NEW
│  ├─ Filter by House + Phase
│  ├─ Assign students to associates
│  └─ Save grouping configuration
│
└─ QueueManagement.tsx (Admin Monitoring)
   ├─ Queue status per associate
   ├─ Longest waiting students
   ├─ Matching metrics
   └─ Daily analytics

LAYER 2: SERVICES
├─ MenteeSlotBooking.tsx (ENHANCED Phase 1)
│  ├─ Auto-select mentor logic ← NEW
│  ├─ Check userData.mentor_id
│  ├─ Skip Step 1 if mentor exists
│  └─ Reduce 4 steps → 3 steps
│
├─ RollingQueueService.ts (NEW Phase 3)
│  ├─ addToQueue(student, duration, preference)
│  ├─ getQueueStatus(studentId)
│  ├─ removeFromQueue(queueId)
│  └─ calculatePriority(lastServedTime)
│
├─ QueueMatchingEngine.ts (NEW Phase 3)
│  ├─ matchQueueToSlots() ← Runs every 30 seconds
│  ├─ selectAcademicAssociate(student, grouping)
│  ├─ getNextAvailableSlot(associate, duration)
│  └─ createMatchedSession(student, associate, slot)
│
├─ AcademicAssociateService.ts (NEW Phase 2)
│  ├─ getAcademicAssociates(campus)
│  ├─ assignStudentsToAssociate(associate, students, house, phase)
│  ├─ getAssignedStudents(associate)
│  └─ updateAssignments(assignmentId, updates)
│
├─ CancellationService.ts (NEW Phase 4)
│  ├─ cancelSession(sessionId, reason)
│  ├─ autoRequeueSession(originalSessionId)
│  ├─ logCancellation(sessionId, reason)
│  └─ notifyStudentOfReschedule(student, newSlot)
│
└─ EnhancedPairProgrammingService (EXISTING + ENHANCED)
   ├─ createSession() ← Use for all session creation
   ├─ createSessionRequest()
   └─ updateSessionStatus()

LAYER 3: DATA ACCESS
├─ SlotAvailabilityService (EXISTING + REUSED)
│  ├─ getAvailableSlots(mentorId, campus, date)
│  ├─ Respects: campus_schedules, leave_requests
│  └─ Dynamic time calculation ← Supports Phase 3
│
└─ Firebase Firestore Collections

LAYER 4: FIRESTORE
├─ students (ENHANCED)
│  ├─ user_id
│  ├─ mentor_id ← Already exists ✅
│  ├─ academic_associate_id (optional override)
│  ├─ house ← For Phase 2 filtering
│  ├─ phase ← For Phase 2 filtering
│  ├─ last_pairing_timestamp ← NEW (For queue priority)
│  └─ active_sessions: number
│
├─ users (ENHANCED)
│  ├─ user_id
│  ├─ name
│  ├─ is_mentor
│  ├─ is_academic_associate ← NEW (TRUE for AAs)
│  ├─ campus
│  ├─ working_hours: {start, end}
│  ├─ concurrent_sessions: number
│  └─ current_queue_count: number
│
├─ sessions (UNCHANGED but used differently)
│  ├─ session_id
│  ├─ student_id
│  ├─ mentor_id (can be academic associate now)
│  ├─ scheduled_date
│  ├─ scheduled_time ← Dynamic times
│  ├─ session_type: "mentorship" | "pair_programming"
│  ├─ status: "scheduled" | "completed" | "cancelled"
│  ├─ is_rescheduled: boolean ← For Phase 4
│  ├─ previous_session_id ← Link to cancelled session
│  └─ created_at
│
├─ campus_schedules (ENHANCED)
│  ├─ campus_name
│  ├─ working_hours: {start, end}
│  ├─ breaks: [{start, end}]
│  └─ academic_associates: [
│       {
│         associate_id,
│         name,
│         sessions_per_day_capacity: 6,
│         current_queue_count,
│       }
│     ]
│
├─ pair_programming_queue (NEW - Phase 3)
│  ├─ queue_id
│  ├─ campus
│  ├─ student_id
│  ├─ queue_position: number
│  ├─ time_added: timestamp
│  ├─ last_served_timestamp ← For priority calculation
│  ├─ preferred_duration: 30|45|60
│  ├─ preferred_academic_associate? (optional)
│  ├─ estimated_wait_time: minutes
│  ├─ status: "queued" | "matched" | "completed"
│  └─ created_at
│
├─ academic_associate_assignments (NEW - Phase 2)
│  ├─ assignment_id
│  ├─ campus
│  ├─ academic_associate_id
│  ├─ assigned_house: string
│  ├─ assigned_phase: number
│  ├─ assigned_students: [string] ← Explicit list
│  ├─ created_by: admin_id
│  ├─ created_at: timestamp
│  └─ updated_at: timestamp
│
└─ session_cancellations_log (NEW - Phase 4)
   ├─ log_id
   ├─ original_session_id
   ├─ student_id
   ├─ cancelled_by: student_id
   ├─ reason: string
   ├─ cancelled_at: timestamp
   ├─ rescheduled_to: new_session_id ← Phase 4
   ├─ rescheduled_at: timestamp
   └─ requeue_status: "pending" | "assigned" | "declined"
```

---

## 🔄 Data Flow Sequences

### Sequence 1: Book Direct Mentor Session (Phase 1)

```
USER CLICKS "BOOK SESSION"
│
├─ MenteeSlotBooking.tsx loads
│
├─ CHECK: userData.mentor_id exists?
│  │
│  ├─ YES ✅
│  │  ├─ Load mentor data: getMentor(userData.mentor_id)
│  │  ├─ Set: bookingState.selectedMentor = mentor
│  │  ├─ Set: step = 'date-select' (SKIP step 1)
│  │  └─ Display: "Booking with [Mentor Name]"
│  │
│  └─ NO ❌
│     └─ Show error: "Please request a mentor first"
│        └─ Exit
│
├─ STEP 2: Pick Date & Time
│  ├─ Query SlotAvailabilityService.getAvailableSlots(mentor_id, campus, date)
│  ├─ Display calendar with available times
│  └─ User selects: Tomorrow 10:00
│
├─ STEP 3: Confirm
│  ├─ Topic auto-populated from student phase
│  ├─ User clicks "Confirm Booking"
│  └─ Call: EnhancedPairProgrammingService.createSession()
│
├─ CREATE SESSION
│  ├─ Validate: Mentor free? ✓
│  ├─ Validate: Student free? ✓
│  └─ Firestore: Create sessions document
│     {
│       student_id: S1,
│       mentor_id: John,
│       scheduled_date: "2025-10-22",
│       scheduled_time: "10:00",
│       session_type: "mentorship",
│       status: "scheduled",
│       created_at: now()
│     }
│
├─ UI UPDATE
│  └─ StudentDashboard reloads
│     └─ "My Sessions: 1 scheduled"
│        └─ "Tomorrow 10:00 with John Doe"
│
└─ NOTIFY STUDENT
   └─ "Session booked for tomorrow 10:00!"
```

---

### Sequence 2: Request Pair Programming (Phase 3)

```
USER CLICKS "REQUEST PAIR PROGRAMMING"
│
├─ PairProgrammingRequest.tsx opens (NEW)
│
├─ STEP 1: Select Duration
│  ├─ Options: 30 min / 45 min / 60 min
│  ├─ User selects: 60 min
│  └─ Store: preference.duration = 60
│
├─ STEP 2: Time Preference
│  ├─ Options: ASAP / Pick specific time
│  ├─ User selects: ASAP
│  └─ Store: preference.time = "asap"
│
├─ STEP 3: Confirm Topic
│  ├─ Auto-populated from student phase
│  ├─ User reviews and clicks "Submit"
│  └─ Call: RollingQueueService.addToQueue()
│
├─ ADD TO QUEUE
│  ├─ Query: Student's last_pairing_timestamp
│  ├─ Calculate: Queue priority (time since last pairing)
│  ├─ Calculate: Queue position based on priority
│  ├─ Firestore: Create pair_programming_queue document
│  │  {
│  │    student_id: S5,
│  │    queue_position: 3,
│  │    time_added: now(),
│  │    last_served_timestamp: 5 days ago,
│  │    preferred_duration: 60,
│  │    status: "queued",
│  │    campus: "Dharamshala"
│  │  }
│  └─ Calculate: estimated_wait_time = 45 minutes
│
├─ NOTIFY STUDENT
│  └─ "Added to queue!"
│     └─ "Position: 3"
│     └─ "Estimated wait: 45 minutes"
│     └─ "Last paired: 5 days ago (priority: high)"
│
├─ DISPLAY QUEUE STATUS
│  └─ PairProgrammingQueue.tsx shows:
│     ├─ Position: 3 of 8
│     ├─ Estimated wait: 45 min
│     ├─ Last paired: 5 days ago
│     └─ [Hold] [Cancel]
│
└─ [BACKGROUND - PHASE 3] QueueMatchingEngine runs every 30 seconds
   └─ See Sequence 4 below
```

---

### Sequence 3: Admin Assigns Students (Phase 2)

```
ADMIN OPENS CAMPUS SCHEDULE ADMIN
│
├─ Click: "Academic Associates" tab ← NEW
│
├─ SELECT ACADEMIC ASSOCIATE
│  ├─ Dropdown: [Jane Smith ▼]
│  ├─ Load: Campus config → academic_associates array
│  ├─ Display: "Jane Smith (9-18) - Capacity: 6/day - Currently: 3 students"
│  └─ Load: Existing assignments for Jane
│
├─ FILTER STUDENTS
│  ├─ Filter 1: House [All ▼] → Select "House A"
│  ├─ Filter 2: Phase [All ▼] → Select "2"
│  ├─ Query: academic_associate_assignments
│     WHERE academic_associate_id = Jane
│        AND assigned_house = "House A"
│        AND assigned_phase = 2
│  ├─ Result: 8 students matched
│  └─ Display: Student list with checkboxes
│     ☑ Student 1 (Last paired: 3 days ago)
│     ☐ Student 2 (Last paired: 1 week ago)
│     ☑ Student 3 (Last paired: 2 days ago)
│     etc.
│
├─ MODIFY ASSIGNMENTS
│  ├─ Admin: Check/uncheck to add/remove
│  ├─ Admin: Click "Update Assignments"
│  └─ Confirmation: "Save changes?"
│
├─ SAVE TO FIRESTORE
│  ├─ Firestore: Update academic_associate_assignments
│  │  {
│  │    academic_associate_id: Jane,
│  │    assigned_house: "House A",
│  │    assigned_phase: 2,
│  │    assigned_students: [S1, S3, S5, S7],
│  │    updated_by: admin_id,
│  │    updated_at: now()
│  │  }
│  ├─ Cache: Update in-memory mapping
│  └─ Firestore: Update campus_schedules.academic_associates[Jane]
│     {
│       associate_id: Jane,
│       assigned_house: "House A",
│       assigned_phase: 2
│     }
│
├─ NOTIFY ADMIN
│  └─ "Assignments updated"
│     └─ "Jane Smith: 4 students (House A, Phase 2)"
│
└─ [USAGE] QueueMatchingEngine uses this for routing
   └─ When Student 1 (House A, Phase 2) needs matching:
      └─ System routes to Jane only (per this config)
```

---

### Sequence 4: Queue Matching Engine (Phase 3 - Every 30 Seconds)

```
BACKGROUND TRIGGER: Every 30 seconds
│
├─ LOAD QUEUE
│  ├─ Query: pair_programming_queue WHERE status = "queued"
│  ├─ Count: 8 students waiting
│  └─ Load: Each student's last_served_timestamp
│
├─ CALCULATE PRIORITIES
│  ├─ Student A: Last served 7 days ago → Priority score: 7.0
│  ├─ Student B: Last served 3 days ago, position 2 → Priority: 1.0
│  ├─ Student C: Last served 5 days ago → Priority: 2.5
│  ├─ Student D: Last served 1 day ago → Priority: 0.5
│  └─ SORT: A (7.0) > C (2.5) > B (1.0) > D (0.5)
│
├─ FOR EACH STUDENT IN PRIORITY ORDER:
│  │
│  ├─ STUDENT A:
│  │  ├─ Get assigned academic associates (from academic_associate_assignments)
│  │  │  └─ Academic Associates: [Jane, Bob] (House A, Phase 2)
│  │  │
│  │  ├─ CHECK: Who's available now?
│  │  │  ├─ Jane: Capacity 6/day, currently has 3 sessions → AVAILABLE (3 slots)
│  │  │  ├─ Bob: Capacity 6/day, currently has 5 sessions → LIMITED (1 slot)
│  │  │  └─ SELECT: Bob (least loaded = most need to fill)
│  │  │     OR SELECT: Jane (PREFER less loaded = distribute evenly)
│  │  │     → Let's say Jane (better load balancing)
│  │  │
│  │  ├─ GET NEXT SLOT: SlotAvailabilityService.getNextAvailableSlot(Jane, 60min)
│  │  │  └─ Next slot: TODAY 14:00 (Jane's schedule allows)
│  │  │
│  │  ├─ CREATE SESSION
│  │  │  └─ Firestore: Create sessions document
│  │  │     {
│  │  │       student_id: A,
│  │  │       mentor_id: Jane,
│  │  │       scheduled_date: "2025-10-21",
│  │  │       scheduled_time: "14:00",
│  │  │       session_type: "pair_programming",
│  │  │       auto_matched: true,
│  │  │       status: "scheduled"
│  │  │     }
│  │  │
│  │  ├─ UPDATE QUEUE
│  │  │  └─ Firestore: Update pair_programming_queue[A]
│  │  │     {
│  │  │       status: "matched",
│  │  │       matched_associate_id: Jane,
│  │  │       matched_time: "14:00"
│  │  │     }
│  │  │
│  │  ├─ NOTIFY STUDENT
│  │  │  └─ Push notification: "Pair programming matched!"
│  │  │     └─ "Today 14:00 with Jane Smith"
│  │  │     └─ [Accept] [Hold]
│  │  │
│  │  └─ UPDATE UI
│  │     └─ StudentDashboard shows new session
│  │
│  ├─ STUDENT B:
│  │  ├─ [Similar process as A]
│  │  ├─ Assigned to: [Bob, Carol]
│  │  ├─ Select: Bob (load balanced check)
│  │  ├─ Get next slot: TODAY 15:00
│  │  └─ Create session & notify
│  │
│  └─ REPEAT for all queued students until:
│     ├─ All queued students matched, OR
│     ├─ No more slots available from associates
│
├─ LOG MATCHING RESULTS
│  └─ Firestore: Update QueueManagement metrics
│     {
│       timestamp: now(),
│       students_matched: 5,
│       students_still_queued: 3,
│       avg_wait_time_minutes: 45,
│       matching_success_rate: 94%
│     }
│
└─ LOOP: Repeat every 30 seconds
   └─ Keep queue moving, no delays
```

---

### Sequence 5: Student Cancels Session (Phase 4)

```
STUDENT CLICKS CANCEL on Session
│
├─ CancellationModal.tsx opens
│
├─ STEP 1: Reason Selection
│  ├─ Options:
│  │  ├─ Conflict with class
│  │  ├─ Not feeling well
│  │  ├─ Schedule conflict
│  │  ├─ Other: [text box]
│  ├─ User selects: "Conflict with class"
│  └─ Store: reason = "Conflict with class"
│
├─ STEP 2: Confirmation
│  ├─ Warning: "This session will be cancelled"
│  ├─ Note: "You'll be auto-added to the queue for next available"
│  ├─ User clicks: "Confirm Cancel"
│  └─ Call: CancellationService.cancelSession()
│
├─ STEP 1: LOG CANCELLATION
│  ├─ Firestore: Update sessions document
│  │  {
│  │    status: "cancelled",
│  │    cancelled_at: now(),
│  │    cancelled_by: student_id,
│  │    cancellation_reason: "Conflict with class"
│  │  }
│  └─ Firestore: Create session_cancellations_log
│     {
│       original_session_id: S123,
│       student_id: A,
│       cancelled_by: A,
│       reason: "Conflict with class",
│       cancelled_at: now()
│     }
│
├─ STEP 2: AUTO-REQUEUE
│  ├─ Get: Student's last_served_timestamp
│  ├─ Get: Current queue length
│  ├─ Calculate: Queue priority (high because just cancelled)
│  ├─ Firestore: Create NEW pair_programming_queue entry
│  │  {
│  │    student_id: A,
│  │    queue_position: 2 (high priority),
│  │    time_added: now(),
│  │    last_served_timestamp: same,
│  │    preferred_duration: 60,
│  │    status: "queued"
│  │  }
│  └─ Log: Queue entry created for requeue
│
├─ STEP 3: IMMEDIATE MATCHING (Don't wait 30 seconds)
│  ├─ Call: QueueMatchingEngine.matchImmediately(studentA)
│  │  ├─ Check: Available academic associates
│  │  ├─ Prefer: Different associate than original
│  │  │  (Spread load, avoid same person)
│  │  ├─ Get: Next available slot (TODAY or tomorrow)
│  │  ├─ Create: NEW session with new associate
│  │  │  {
│  │    │    student_id: A,
│  │    │    mentor_id: Bob (different from Jane),
│  │    │    scheduled_date: "2025-10-21",
│  │    │    scheduled_time: "16:00",
│  │    │    session_type: "pair_programming",
│  │    │    is_rescheduled: true,
│  │    │    previous_session_id: S123,
│  │    │    status: "scheduled"
│  │    │  }
│  │  │
│  │  ├─ Update: session_cancellations_log
│  │  │  {
│  │  │    rescheduled_to: S456 (new session id),
│  │  │    rescheduled_at: now(),
│  │  │    requeue_status: "assigned"
│  │  │  }
│  │  │
│  │  └─ Remove: From pair_programming_queue (status="matched")
│  │
│
├─ STEP 4: NOTIFY STUDENT
│  ├─ Notification: "Session cancelled"
│  ├─ Notification: "Auto-rescheduled for Today 16:00"
│  ├─ Notification: "New session with Bob Wilson"
│  ├─ Options: [Accept] [Hold for later]
│  └─ If "Accept": Session confirmed
│     If "Hold": Goes back in queue, waits for next match
│
├─ UI UPDATE
│  ├─ StudentDashboard updates
│  ├─ Old session removed
│  ├─ New session appears: "Today 16:00 with Bob Wilson"
│  └─ "My Sessions: 1 scheduled"
│
└─ RESULT
   ├─ Original session cancelled (logged)
   ├─ Student added to queue
   ├─ Immediately matched to different associate
   ├─ Load balanced across associates
   ├─ No slot wasted
   └─ Student notified with new time
```

---

## 🎯 State Diagram: Queue Entry Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│  PAIR_PROGRAMMING_QUEUE - Entry State Machine               │
└─────────────────────────────────────────────────────────────┘

                 addToQueue()
                      ↓
            ┌──────────────────┐
            │    QUEUED        │  ← Student waiting for slot
            └────────┬─────────┘
                     │
        [Every 30 sec: QueueMatchingEngine]
                     │
        ┌────────────┴────────────┐
        │                         │
        ↓                         ↓
    ┌─────────┐           ┌──────────────┐
    │ MATCHED │           │MATCHED       │ → Session created
    │ ← Slot  │           │ ← Slot still │   Waiting for session
    │  found  │           │   available  │   to happen
    └────┬────┘           └──────────────┘
         │
    [At scheduled time]
         │
         ↓
    ┌──────────┐
    │COMPLETED │  ← Session happened
    │ Status   │     last_served_timestamp updated
    └──────────┘

[If cancelled before matching]
         │
    [cancelSession()]
         │
         ↓
    ┌──────────┐           ┌──────────────────┐
    │CANCELLED │  ──────→  │ NEW QUEUED entry │  ← Auto-requeue
    │ Session  │  requeue()│ Higher priority  │
    └──────────┘           └──────────────────┘

[If cancelled after matching]
         │
    [cancelSession()]
         │
         ↓
    ┌──────────┐           ┌──────────────────┐
    │CANCELLED │  ──────→  │ NEW MATCHED      │  ← Immediate match
    │ Session  │  requeue()│ Different assoc. │     to different slot
    └──────────┘           └──────────────────┘
```

---

## 📊 Database Schema Summary

### Collections to Create/Modify

```typescript
// ✅ NEW - pair_programming_queue
firestore.collection('pair_programming_queue').doc(queueId).set({
  campus: 'Dharamshala',
  student_id: 'S1',
  queue_position: 3,
  time_added: Timestamp.now(),
  last_served_timestamp: 1697203200000,  // Last pair programming session
  preferred_duration: 60,                  // minutes
  preferred_academic_associate: undefined,
  estimated_wait_time: 45,
  status: 'queued' | 'matched' | 'completed' | 'cancelled',
  created_at: Timestamp.now()
})

// ✅ NEW - academic_associate_assignments
firestore.collection('academic_associate_assignments').doc(assignmentId).set({
  campus: 'Dharamshala',
  academic_associate_id: 'Jane',
  assigned_house: 'House A',
  assigned_phase: 2,
  assigned_students: ['S1', 'S3', 'S5', 'S7'],
  created_by: 'admin_id',
  created_at: Timestamp.now(),
  updated_at: Timestamp.now()
})

// ✅ NEW - session_cancellations_log
firestore.collection('session_cancellations_log').doc(logId).set({
  original_session_id: 'SESSION_123',
  student_id: 'S1',
  cancelled_by: 'S1',
  reason: 'Conflict with class',
  cancelled_at: Timestamp.now(),
  rescheduled_to: 'SESSION_456',     // New session ID
  rescheduled_at: Timestamp.now(),
  requeue_status: 'pending' | 'assigned' | 'declined'
})

// ✅ MODIFY - sessions (add fields)
firestore.collection('sessions').doc(sessionId).set({
  // ... existing fields ...
  is_rescheduled: false,
  previous_session_id: undefined,     // If rescheduled
  auto_matched: false,                // TRUE if from queue
  created_at: Timestamp.now()
})

// ✅ MODIFY - students (add fields)
firestore.collection('students').doc(userId).set({
  // ... existing fields ...
  last_pairing_timestamp: 1697203200000,  // NEW
  academic_associate_id: undefined,       // NEW - override if needed
  active_sessions: 0                      // NEW - session count
})

// ✅ MODIFY - users (add fields)
firestore.collection('users').doc(userId).set({
  // ... existing fields ...
  is_academic_associate: false,           // NEW
  concurrent_sessions: 1,                 // NEW
  current_queue_count: 0                  // NEW
})

// ✅ MODIFY - campus_schedules
firestore.collection('campus_schedules').doc('Dharamshala').set({
  // ... existing fields ...
  academic_associates: [{
    associate_id: 'Jane',
    name: 'Jane Smith',
    sessions_per_day_capacity: 6,
    current_queue_count: 2,
    assigned_house: 'House A',
    assigned_phase: 2
  }]
})
```

---

## 🚀 Implementation Order & Effort

```
PHASE 1 (30 min)
├─ File: MenteeSlotBooking.tsx
├─ Change: Auto-detect mentor, skip selector
└─ Build & Test

        ↓

PHASE 2 (2 hours)
├─ File: CampusScheduleAdmin.tsx + AcademicAssociateService.ts
├─ Change: Add grouping UI, save assignments
└─ Build & Test

        ↓

PHASE 3 (3 hours)
├─ Files: RollingQueueService, QueueMatchingEngine, queuePriorityCalculator
├─ Change: Queue system, matching engine, load balancing
├─ Setup: Background job trigger (every 30 sec)
└─ Build & Test

        ↓

PHASE 4 (1.5 hours)
├─ File: CancellationService.ts, SessionCard.tsx
├─ Change: Cancellation UI, auto-requeue logic
└─ Build & Test

        ↓

PHASE 5 (2 hours)
├─ Files: PairProgrammingQueue.tsx, QueueManagement.tsx
├─ Change: Dashboard UIs for student & admin
└─ Build & Test

TOTAL: 8.5 HOURS
```

---

## ✅ Readiness Checklist

- [x] All clarifications received
- [x] Architecture designed
- [x] Data model defined
- [x] Service layer architected
- [x] Implementation phases sequenced
- [x] No blockers identified
- [x] Build status: ✅ PASSING

**Status:** 🟢 **READY TO IMPLEMENT**

---

## 📝 Next Steps

Which phase should I start with?

- [ ] **PHASE 1** - Auto-mentor selection (Start here, 30 min)
- [ ] **ALL PHASES** - Full implementation today (8.5 hrs)
- [ ] **CLARIFY** - Have more questions first

**Your choice? 👇**
