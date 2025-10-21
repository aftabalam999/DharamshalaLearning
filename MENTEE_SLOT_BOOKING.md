# Mentee Slot Booking UI Documentation

## Overview
Created a complete slot booking interface for students to schedule pair programming sessions with mentors from their campus. The system integrates with the `SlotAvailabilityService` to respect campus hours, existing bookings, and mentor leave status.

## Component Details

### File Location
- **Component**: `src/components/Student/MenteeSlotBooking.tsx`
- **Route**: `/student/book-session`
- **Access**: Protected route - students only

## Features

### 1. **Mentor Selection (Step 1)**
- Displays all available mentors from the student's campus
- Shows mentor name, email, and skills
- Filters mentors by:
  - Same campus as student
  - Has `isMentor = true`
  - Excludes the student themselves
- Card-based UI with hover effects
- Responsive grid layout (1-2 columns)

### 2. **Date & Time Selection (Step 2)**
- Date navigation with prev/next buttons
- Displays selected date in readable format
- Shows available time slots for the selected mentor on the chosen date
- Time slots respect:
  - Campus working hours
  - Lunch breaks
  - Existing mentor bookings
  - Mentor leave status (approved leave only)
- Each slot displays:
  - Time in HH:MM format
  - Duration (60 minutes default)
- Slots automatically load when mentor selected or date changed
- Empty state messages:
  - "Mentor is on leave" if approved leave covers the date
  - "No slots available" if all slots are booked
- Loading spinner during slot calculation

### 3. **Session Details Entry**
- **Topic** field (required)
  - Examples: "React Hooks", "State Management"
  - Placeholder text for guidance
- **Description** field (optional)
  - Multi-line textarea
  - For detailed session notes
- Fields appear on same screen as slot selection for efficiency

### 4. **Booking Confirmation (Step 3)**
- Comprehensive summary of all booking details:
  - Mentor name and email
  - Full date and time range
  - Session topic and description
  - Campus location
  - Duration in minutes
- Two action buttons:
  - **Cancel** - Go back to date selection
  - **Confirm Booking** - Create the session
- Confirm button disabled until topic is entered
- Shows loading state during booking

### 5. **Success Screen**
- Green success notification
- Shows session date and time
- Redirect message
- Auto-redirects to dashboard after 3 seconds

## Technical Stack

### Dependencies
- React 18+ (hooks: useState, useEffect, useCallback)
- TypeScript for type safety
- Lucide React icons
- Tailwind CSS for styling

### Services Used
1. **SlotAvailabilityService**
   - `getAvailableSlots()` - Calculate slots for single mentor/date
   - `validateSlot()` - Verify slot still available before booking

2. **UserService**
   - `getWhereCompound()` - Query mentors by campus and role

3. **EnhancedPairProgrammingService**
   - `createSession()` - Create booking in Firestore

4. **AuthContext**
   - `userData` - Current user information

### State Management
- **bookingState** - Multi-step workflow tracking
  - Current step: 'mentor-select' | 'date-select' | 'confirm' | 'success'
  - Selected mentor and slot
  - Session topic and description
- **mentors** - Array of available mentors for campus
- **mentorSlots** - Cache of loaded slots by mentor ID
- **selectedDate** - Current date for slot display
- **loading/error** - UI state indicators
- **bookingInProgress** - Prevents double submissions

## UI/UX Flows

### Happy Path: Successful Booking
1. Page loads → Load mentors from campus
2. User clicks mentor → Load slots for today
3. User browses dates → Slots update for each date
4. User selects time slot → Move to confirmation
5. User enters topic → Enable confirm button
6. User confirms → Create session → Show success → Redirect

### Error Handling
- **Campus not found** → Show error message
- **No mentors available** → Display empty state with icon
- **Mentor on leave** → Show leave-specific message
- **No slots available** → Show empty state with "try different date"
- **Slot no longer available** → Error message, return to date picker
- **Booking failed** → Error message, user can retry
- **Network error** → Generic error message with retry option

### Edge Cases
- Date changed mid-booking → Slots reload automatically
- Slot selected by another user simultaneously → Validation catches double-booking
- Mentor goes on leave → Can't select their slots
- Past dates → Date picker should prevent selection (future feature)

## Styling

### Color Scheme
- **Primary**: Blue (mentor selection, navigation)
- **Success**: Green (confirm button, success message)
- **Warning**: Yellow (mentor on leave)
- **Error**: Red (error messages)
- **Neutral**: Gray (empty states, secondary text)

### Responsive Design
- Mobile-first approach
- Grid layouts adapt from 1→2→4 columns
- Touch-friendly button sizes
- Full width on mobile, contained on desktop (max-w-4xl)

## Data Flow

```
Page Load
  ↓
Load Mentors [useEffect]
  ↓
User selects Mentor
  ↓
Load slots for today [useCallback on mentor select]
  ↓
User navigates dates
  ↓
Reload slots for new date [handleDateChange]
  ↓
User selects time slot
  ↓
Move to confirmation step
  ↓
User enters topic & confirms
  ↓
Validate slot still available [validateSlot]
  ↓
Create session in Firestore [createSession]
  ↓
Show success screen
  ↓
Auto-redirect to dashboard
```

## Integration Points

### Frontend Routes
- Add navigation link in StudentDashboard
- Add link in main navigation menu under "Sessions" or "Pair Programming"

### Sample Navigation Button
```tsx
<button onClick={() => navigate('/student/book-session')}>
  Book Session
</button>
```

### Firestore Collections
- **users** - Read mentors with isMentor=true
- **campus_schedules** - Read campus hours and breaks
- **leave_requests** - Check approved leave status
- **pair_programming_sessions** - Write new session

## API Usage Examples

### Load Available Mentors
```typescript
const mentors = await UserService.getWhereCompound<User>(
  COLLECTIONS.USERS,
  [
    { field: 'isMentor', operator: '==', value: true },
    { field: 'campus', operator: '==', value: userData.campus },
  ]
);
```

### Get Available Slots
```typescript
const slots = await SlotAvailabilityService.getAvailableSlots({
  mentorId: mentor.id,
  campus: userData.campus,
  date: new Date('2025-10-25'),
  slotDurationMinutes: 60,
});
```

### Validate and Book
```typescript
const isAvailable = await SlotAvailabilityService.validateSlot(
  mentorId,
  slotStart,
  slotEnd
);

if (isAvailable) {
  await EnhancedPairProgrammingService.createSession({
    student_id: userData.id,
    mentor_id: mentorId,
    topic: 'React Hooks',
    description: 'Need help with state management',
    scheduled_date: slotStart,
    scheduled_time: '14:00',
    duration_minutes: 60,
    status: 'scheduled',
    session_type: 'scheduled',
    priority: 'medium',
  });
}
```

## Performance Considerations

### Optimizations Implemented
1. **useCallback** - Memoizes loadMentors to prevent unnecessary re-renders
2. **Slot Caching** - mentorSlots stored by mentor ID to avoid reloading
3. **Lazy Loading** - Slots only loaded when mentor selected
4. **Conditional Rendering** - Steps only render active content

### Future Optimizations
1. Add pagination for mentors if campus has 50+ mentors
2. Implement infinite scroll for future dates
3. Cache mentor list and refresh periodically
4. Debounce date changes to reduce slot queries
5. Pre-load slots for next 7 days in background

## Known Limitations

1. **Single timezone** - No timezone conversion (uses campus timezone)
2. **Slot duration** - Fixed to 60 minutes (can be made configurable)
3. **No recurring bookings** - Single session only
4. **No advanced filtering** - Can't filter mentors by skill or availability
5. **No waiting list** - If no slots available, no way to wait for cancellation

## Future Enhancements

### Short Term (v1.1)
- Add "Book ASAP" button using `getNextAvailableSlot()`
- Show mentor availability summary (e.g., "2 slots available today")
- Add search/filter for mentors by name or skills
- Display mentor ratings/reviews

### Medium Term (v1.2)
- Implement calendar view for full month of availability
- Add session reminders (email/push notification)
- Allow rescheduling of booked sessions
- Show cancellation reason if no slots (mentor on leave, etc.)

### Long Term (v1.3)
- AI-powered mentor recommendation based on topic
- Implement waiting list for fully booked slots
- Add session templates (React, Node.js, Project Review, etc.)
- Integration with Google Calendar for sync
- Automated meeting link generation (Zoom, Meet)

## Testing Checklist

- [ ] Load page as student
- [ ] Verify mentors from same campus load
- [ ] Select mentor → verify slots load for today
- [ ] Change date → verify slots update
- [ ] Select slot → move to confirmation
- [ ] Enter topic → enable confirm button
- [ ] Confirm → create session → show success
- [ ] Test error: No mentors available
- [ ] Test error: Mentor on leave (all slots empty)
- [ ] Test error: Slot becomes unavailable mid-booking
- [ ] Test responsive design on mobile/tablet/desktop
- [ ] Test navigation back buttons at each step
- [ ] Test session creation in Firestore

## File Structure
```
src/
├── components/
│   └── Student/
│       └── MenteeSlotBooking.tsx (this component)
├── services/
│   ├── slotAvailabilityService.ts (calculates slots)
│   ├── dataServices.ts (creates sessions)
│   └── firestore.ts (queries mentors)
└── App.tsx (route configuration)
```

## Configuration

### Default Values
- Slot duration: 60 minutes
- Session priority: 'medium'
- Session type: 'scheduled'
- Session status: 'scheduled'

### Customizable Values
```typescript
// In MenteeSlotBooking.tsx, adjust in loadSlotsForMentor():
slotDurationMinutes: 60, // Change to 30, 45, 90, etc.
```

## Monitoring & Logging

### Events to Log
- "Mentor selected" - User chose a mentor
- "Date changed" - User navigated dates
- "Slot selected" - User chose a time
- "Session confirmed" - Booking created
- "Session failed" - Booking error
- "Back button clicked" - User navigation

### Errors to Monitor
- Failed to load mentors
- Failed to load slots
- Slot validation failed
- Session creation failed
- Network timeouts
