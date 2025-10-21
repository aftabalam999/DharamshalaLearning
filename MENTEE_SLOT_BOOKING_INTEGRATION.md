# Quick Navigation Integration Guide

## Add "Book Session" Button to StudentDashboard

To make the slot booking feature easily accessible, add a navigation button to the StudentDashboard.

### Option 1: Add to Dashboard Header (Recommended)

In `src/components/Student/StudentDashboard.tsx`, add a button next to the Refresh button:

```tsx
import { useNavigate } from 'react-router-dom';

// Inside component
const navigate = useNavigate();

// In the JSX header section, add:
<button
  onClick={() => navigate('/student/book-session')}
  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
  title="Book a pair programming session"
>
  <Calendar className="h-4 w-4" />
  <span>Book Session</span>
</button>
```

### Option 2: Add to Quick Actions Card

Create a new card in the Quick Stats section:

```tsx
<div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
  onClick={() => navigate('/student/book-session')}
>
  <div className="flex items-center">
    <div className="p-2 bg-green-100 rounded-lg">
      <Calendar className="h-6 w-6 text-green-600" />
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-600">Book Session</p>
      <p className="text-lg font-bold text-gray-900">Schedule Now</p>
    </div>
  </div>
</div>
```

### Option 3: Add to Main Navigation Menu

In `src/components/Common/Layout.tsx` (or wherever your navigation menu is), add a link under "Pair Programming" or "Sessions":

```tsx
<NavLink to="/student/book-session" className="...">
  <Calendar className="w-4 h-4" />
  Book Session
</NavLink>
```

## Add to MySessions Page

In `src/components/Student/MySessions.tsx`, add a button at the top to create a new session:

```tsx
<div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold">My Sessions</h1>
  <button
    onClick={() => navigate('/student/book-session')}
    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  >
    <Plus className="w-4 h-4" />
    Book New Session
  </button>
</div>
```

## Access URL Directly

Students can access the booking page directly:
```
http://localhost:3001/student/book-session
```

## Testing the Integration

1. Login as a student
2. Navigate to the booking page
3. Verify:
   - Mentors from same campus load
   - Can select a mentor
   - Can see available slots
   - Can book a session
   - Success message appears
   - Session appears in "My Sessions"

## Troubleshooting

### "No mentors available" message
- Check that mentors in the database have:
  - `isMentor: true`
  - `campus: 'same as student'`
  - `status: 'active'`

### "No slots available" for all dates
- Check campus schedule is created (Admin Dashboard → Campus Schedules)
- Verify campus working hours are configured
- Ensure mentor doesn't have all-day approved leave

### Can't see the button
- Verify route is added in `App.tsx`
- Check user is logged in as a student (not mentor/admin)
- Clear browser cache

## Navigation Component Example

Complete example to add to StudentDashboard:

```tsx
import { Calendar, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BookSessionButton: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate('/student/book-session')}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
      title="Book a pair programming session with a mentor"
    >
      <Calendar className="w-4 h-4" />
      <span className="font-medium">Book Session</span>
    </button>
  );
};
```

Then use it in the dashboard:
```tsx
<BookSessionButton />
```

## Component Import Path

```tsx
import MenteeSlotBooking from '../Student/MenteeSlotBooking';

// Or use with React Router:
<Route path="/student/book-session" element={
  <ProtectedRoute>
    <Layout>
      <MenteeSlotBooking />
    </Layout>
  </ProtectedRoute>
} />
```

## Success Metrics

After integration, track:
- How many students book sessions
- Average time to book (should be < 2 minutes)
- Booking success rate (should be > 95%)
- Common errors (if any)
