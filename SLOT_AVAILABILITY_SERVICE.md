# Slot Availability Service Implementation

## Overview
Created a comprehensive `SlotAvailabilityService` that calculates available time slots for mentors based on campus schedules, existing bookings, and leave status.

## Key Features

### 1. **Core Slot Calculation**
- `getAvailableSlots()` - Calculate available slots for a single mentor on a specific date
- Respects campus working hours, breaks, and existing bookings
- Returns array of `AvailableSlot` objects with start/end times

### 2. **Leave Status Integration**
- `isMentorOnLeave()` - Checks if mentor has approved leave covering the date
- Queries `LEAVE_REQUESTS` collection with status = 'approved'
- Returns empty slot array if mentor is on leave

### 3. **Multi-Mentor Slot Queries**
- `getAvailableSlotsByMentors()` - Get available slots for multiple mentors at once
- Returns `Record<mentorId, AvailableSlot[]>` for mentee selection

### 4. **Date Range Queries**
- `getAvailableSlotsForDateRange()` - Get slots across multiple days
- Useful for showing mentee a calendar of available slots
- Returns slots organized by date

### 5. **Slot Validation**
- `validateSlot()` - Verify a slot is still available (no double booking)
- `hasTimeConflict()` - Check if two time periods overlap
- Prevents booking conflicts

### 6. **Smart Slot Suggestions**
- `getNextAvailableSlot()` - Find first available slot within N days
- Useful for "Book ASAP" functionality
- Configurable search window (default 7 days)

### 7. **Availability Summary**
- `getSlotAvailabilitySummary()` - Analytics for mentor availability
- Returns:
  - Total days checked
  - Days with available slots
  - Total slot count
  - Days on leave
  - Average slots per working day

## Technical Details

### Campus Schedule Integration
```
Campus Working Hours: 08:00 - 17:00
Break Time: 12:00 - 13:00 (lunch)
Slot Duration: 60 minutes (configurable)
Available Days: Mon-Fri (configurable per campus)
```

### Leave Status Handling
```
Query Conditions:
- user_id = mentorId
- status = 'approved'
- start_date <= checkDate
- end_date >= checkDate
```

### Existing Booking Conflict Detection
```
Conflicts checked against PAIR_PROGRAMMING_SESSIONS with:
- status = 'scheduled' or 'in_progress'
- mentor_id = mentorId
- scheduled_date matching the date
```

## Usage Examples

### Get slots for a mentor on a specific day
```typescript
const slots = await SlotAvailabilityService.getAvailableSlots({
  mentorId: 'mentor-123',
  campus: 'Dharamshala',
  date: new Date('2025-10-25'),
  slotDurationMinutes: 60
});
```

### Show available slots for mentee to choose from
```typescript
const slotsByMentor = await SlotAvailabilityService.getAvailableSlotsByMentors(
  ['mentor-1', 'mentor-2', 'mentor-3'],
  'Dharamshala',
  new Date('2025-10-25'),
  60
);
```

### Get availability summary for mentor dashboard
```typescript
const summary = await SlotAvailabilityService.getSlotAvailabilitySummary(
  'mentor-123',
  'Dharamshala',
  new Date(),
  30  // check next 30 days
);

// Returns: { totalDays: 30, daysWithSlots: 24, totalSlots: 48, daysOnLeave: 2, averageSlotsPerDay: 2 }
```

## Leave Status Handling in Workflow

1. **When mentee requests mentor**: System checks if mentor is on leave
2. **If on leave**: Mentor not available in slot picker
3. **If pending leave**: Still shows as available (only approved leave blocks slots)
4. **Leave ends**: Immediately available for booking

## API Methods Summary

| Method | Purpose | Returns |
|--------|---------|---------|
| `getAvailableSlots()` | Single mentor, single date | `AvailableSlot[]` |
| `getAvailableSlotsByMentors()` | Multiple mentors, single date | `Record<mentorId, AvailableSlot[]>` |
| `getAvailableSlotsForDateRange()` | Single mentor, date range | `Record<date, AvailableSlot[]>` |
| `getNextAvailableSlot()` | Find first available slot | `AvailableSlot \| null` |
| `validateSlot()` | Check slot availability | `boolean` |
| `getSlotAvailabilitySummary()` | Analytics | `SummaryObject` |
| `isMentorOnLeave()` | Check leave status | `boolean` |

## Integration Points

### Firestore Collections Used
- `campus_schedules` - Campus working hours and configuration
- `leave_requests` - Mentor leave status (approved only)
- `pair_programming_sessions` - Existing mentor bookings

### Frontend Components to Use
- **Mentee Request UI**: Call `getAvailableSlotsByMentors()` when showing mentor options
- **Mentor Dashboard**: Call `getSlotAvailabilitySummary()` for analytics
- **Slot Calendar**: Call `getAvailableSlotsForDateRange()` for week/month view

## Next Steps
1. Create mentee slot request UI using `getAvailableSlotsByMentors()`
2. Build slot calendar component for visual slot selection
3. Add session booking confirmation after mentee picks slot
4. Display mentor availability on mentor dashboard
5. Implement post-session feedback and rating

## File Location
- Service: `src/services/slotAvailabilityService.ts`
- Collections updated: `src/services/firestore.ts` (added CAMPUS_SCHEDULES)
