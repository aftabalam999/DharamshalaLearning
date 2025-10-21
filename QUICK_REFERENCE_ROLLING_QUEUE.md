# 🎯 QUICK SUMMARY: Clarifications Integrated

**Date:** October 21, 2025  
**Status:** Ready to Implement (8.5 hours of work identified)

---

## What Changed Based on Your Answers

### ❌ What We Thought Before
- Daily fixed slots (1 per student)
- Manual mentor assignment needed
- Academic associates only for pair programming

### ✅ What We Know Now
| Aspect | Update |
|--------|--------|
| **Mentor Assignment** | ✅ Already done - all students have mentors |
| **Session Rules** | Regular mentors: only with mentees; Academic Associates: with anyone |
| **Academic Associates** | Special mentors with expanded scope (6-10 sessions/day) |
| **Queue System** | **ROLLING** (not daily slots) - continuous throughout day |
| **Time Slots** | **DYNAMIC** - not fixed 9:00, 10:00, etc. |
| **Student Grouping** | **Admin assigns by House + Phase** to academic associates |
| **Cancellations** | **Auto-requeue** to next available with different associate |
| **Workload Balance** | System automatically routes to least-loaded associate |
| **Priority** | Students waiting longest get next slot ("last served" tracking) |

---

## Architecture Change: From Daily to Rolling Queue

```
BEFORE (Fixed Daily Slots):
├─ Student 1: 09:00 with Jane
├─ Student 2: 10:00 with Jane
├─ Student 3: 11:00 with Jane
├─ ...
└─ Student 8: 17:00 with Bob
   Then EMPTY until next day

AFTER (Rolling Queue):
├─ Stream of sessions: 09:00, 09:50, 10:40, 11:25...
├─ Dynamic times based on associate availability
├─ Priority: Student waiting longest gets next slot
├─ Auto-requeue on cancellation
├─ Load balanced automatically
└─ Continuous all day (unlimited capacity)
```

---

## Implementation Phases (8.5 Hours Total)

### Phase 1: Auto-Select Mentor (30 mins) ⚡

**What:** When student books, auto-select their assigned mentor instead of forcing manual selection

**Impact:**
- Reduces 4 steps → 3 steps
- Better UX, faster booking
- Ready today

### Phase 2: Admin UI for Grouping (2 hours) 🔧

**What:** Admin can assign student groups to academic associates by filtering House + Phase

**Impact:**
- Admin picks: Academic Associate + House + Phase
- System auto-selects matching students
- Save button links students to associate
- Ready today

### Phase 3: Rolling Queue System (3 hours) 🚀

**What:** Replace daily slots with continuous rolling queue

**Key Features:**
- ✅ Students added to queue
- ✅ Priority by last_served_timestamp (no starvation)
- ✅ Matching engine runs every 30 seconds
- ✅ Automatically balances load across academic associates
- ✅ Uses admin's student grouping for routing
- Ready today

### Phase 4: Cancellation + Auto-Requeue (1.5 hours) 🔄

**What:** When student cancels, auto-add to queue and match to next available

**Flow:**
1. Student clicks "Cancel Session"
2. Log cancellation
3. Auto-add to queue
4. Immediate matching (don't wait 30 seconds)
5. Route to different academic associate (load balance)
6. Notify: "Rescheduled for [time] with [associate]"

### Phase 5: Queue Dashboard (2 hours) 📊

**What:** Student and admin dashboards to see queue status

**Student Sees:**
- Position in queue
- Estimated wait time
- Last paired: X days ago

**Admin Sees:**
- Queue status per associate
- Longest waiting students
- Matching success rate

---

## 🗄️ New Collections Needed

### 1. `pair_programming_queue`
Tracks students waiting for sessions
```
{
  student_id: string,
  queue_position: number,
  last_served_timestamp: number,      // For priority
  estimated_wait_time: number,
  status: "queued" | "matched" | "completed",
}
```

### 2. `academic_associate_assignments`
Admin's student grouping configuration
```
{
  academic_associate_id: string,
  assigned_house: string,
  assigned_phase: number,
  assigned_students: [string],        // Explicit list
  created_at: number,
}
```

### 3. `session_cancellations_log`
Track all cancellations and requeues
```
{
  original_session_id: string,
  student_id: string,
  reason: string,
  rescheduled_to: string,             // New session ID
  cancelled_at: number,
}
```

### Updates to Existing Collections

**`students` collection - Add:**
```
last_pairing_timestamp: number,    // For queue priority
academic_associate_id?: string,    // Optional override
```

**`users` collection - Add:**
```
is_academic_associate: boolean,    // TRUE for AAs
concurrent_sessions: number,       // Usually 1
```

**`campus_schedules` collection - Add:**
```
academic_associates: [{
  associate_id: string,
  sessions_per_day_capacity: number,  // Default 6-10
  current_queue_position: number,
}]
```

---

## 🔄 Core Processes at a Glance

### Process 1: Direct Booking (Mentee → Mentor)
```
Student → "Book Session"
  → Auto-select mentor ✅ (Phase 1)
  → Pick date/time
  → Confirm
  → Session created with assigned mentor
```

### Process 2: Pair Programming Request (Any Student)
```
Student → "Request Pair Programming"
  → Select duration (30/45/60 min)
  → Time preference (ASAP or specific)
  → Add to rolling queue ✅ (Phase 3)
  → Matching engine finds available academic associate ✅ (Phase 3)
  → Admin grouping used for routing ✅ (Phase 2)
  → Session auto-created when slot available
  → Student notified
```

### Process 3: Admin Configures
```
Admin → "Academic Associates" tab ✅ (Phase 2)
  → Select academic associate
  → Filter by House + Phase
  → Check students to assign
  → Save
  → System uses for queue routing
```

### Process 4: Cancellation Flow
```
Student → Cancel session
  → Reason dropdown ✅ (Phase 4)
  → Confirm auto-requeue
  → Log cancellation ✅ (Phase 4)
  → Add to queue immediately ✅ (Phase 4)
  → Matching engine picks next slot ✅ (Phase 4)
  → Route to different associate (load balance)
  → Notify student of new slot ✅ (Phase 4)
  → Can Accept or Hold
```

### Process 5: Queue Priority (No Starvation)
```
Every 30 seconds:
├─ Sort queue by: last_served_timestamp (oldest first)
├─ For each student in queue:
│  ├─ Get assigned academic associates (from Phase 2 config)
│  ├─ Select the one with LEAST students in current slots
│  ├─ Find next available time
│  ├─ Create session
│  └─ Update queue status
├─ Result: Load balanced, fair, no starvation
```

---

## 📊 Load Balancing Example

**Setup (from Phase 2 admin UI):**
- Academic Associate Jane: 18 students assigned
- Academic Associate Bob: 22 students assigned

**Queue:** 10 students waiting

**Rolling Match (Phase 3):**
```
Student 1: Last paired 5 days ago → Jane (has 1 slot open)
Student 2: Last paired 3 days ago → Bob (has 2 slots open)
Student 3: Last paired 7 days ago → Jane (has 0 slots, adds to queue)
Student 4: Last paired 2 days ago → Bob (has 1 slot open)
...

Result: Balanced load, no one overworked
```

**Cancellation (Phase 4):**
```
Student X cancels at 10:00 slot with Jane

Before: Jane (4/6 slots full) Bob (5/6 slots full)
After:  
  ├─ Log cancellation
  ├─ Add Student X to queue
  ├─ Matching engine runs immediately
  ├─ Sees: Jane free NOW but already near capacity
  ├─ Routes to: Bob (more underloaded)
  └─ Result: Better distribution
```

---

## 🚀 What Can Start Today

### Immediate (No Blockers)

✅ **Phase 1: Auto-Mentor** (30 mins)
- Modify `MenteeSlotBooking.tsx`
- Check `userData.mentor_id`
- Auto-select if exists
- Ready to start NOW

✅ **Phase 2: Admin UI** (2 hours)
- Extend `CampusScheduleAdmin.tsx`
- Add filters: House + Phase
- Checkbox list of students
- Ready to start after Phase 1

✅ **Phase 3: Queue System** (3 hours)
- Create `RollingQueueService.ts`
- Implement matching logic
- Ready to start after Phase 2

✅ **Phase 4: Cancellation** (1.5 hours)
- Create `CancellationService.ts`
- Auto-requeue logic
- Ready after Phase 3

✅ **Phase 5: Dashboard** (2 hours)
- Create UI components
- Display queue state
- Ready after Phase 4

---

## ⏱️ Timeline Estimate

| Phase | Time | Blocker | When |
|-------|------|---------|------|
| 1 | 30 min | None | NOW |
| 2 | 2 hrs | Phase 1 done | +30 min |
| 3 | 3 hrs | Phase 2 done | +2.5 hrs |
| 4 | 1.5 hrs | Phase 3 done | +5.5 hrs |
| 5 | 2 hrs | Phase 4 done | +7 hrs |
| **Total** | **8.5 hrs** | Sequential | **Same day** |

---

## 📝 Key Decisions Made

| Decision | What We Chose | Why |
|----------|---------------|----|
| **Queue Type** | Rolling (not daily) | Continuous availability, no fixed slots |
| **Priority** | last_served_timestamp | Prevents starvation, fair to all students |
| **Load Balancing** | Route to least-loaded associate | Prevents overwork, even distribution |
| **Cancellation** | Auto-requeue + route differently | No wasted slots, better balance |
| **Admin Control** | Group by House + Phase | Simplest way to manage assignments |
| **Time Slots** | Dynamic (not fixed) | Flexible, realistic for actual availability |
| **Grouping** | Optional (admin can override) | Flexibility for special cases |

---

## ⚠️ Questions Still Open (Nice-to-Have, Not Blockers)

1. **Default slot duration:** 30/45/60 min? (Can be configured later)
2. **Matching frequency:** Every 30 seconds? (Configurable)
3. **Notification channels:** In-app only or email too? (Can add later)
4. **Queue alert:** Max length before alerting admin? (Monitoring feature)
5. **Session completion:** Auto-tracked or manual? (Can enhance later)

---

## ✅ Go/No-Go Decision

**Status:** ✅ **READY TO START**

All clarifications received. Architecture clear. Data model defined. No blockers.

**Ready to implement all 5 phases in one day? (8.5 hours)**

- [ ] **YES** - Start Phase 1 immediately
- [ ] **CLARIFY** - Need to answer some open questions first
- [ ] **REVIEW** - Need more review time

**Which one? 👇**
