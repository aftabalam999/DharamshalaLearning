/**
 * Review Date & Deadline Utilities
 * Centralized functions for calculating week starts, deadlines, and review status
 */

/**
 * Get the Monday of the current week (week starts on Monday)
 * This is the foundation for all review deadline calculations
 * 
 * @returns Date object representing Monday at 00:00:00
 */
export const getCurrentWeekStart = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days since Monday (offset to make Monday = 0)
  // Sunday (0) -> 6 days since Monday
  // Monday (1) -> 0 days since Monday
  // Tuesday (2) -> 1 day since Monday, etc.
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  return weekStart;
};

/**
 * Get Monday of a specific date's week
 * 
 * @param date - The date to find the week start for
 * @returns Date object representing Monday of that week at 00:00:00
 */
export const getWeekStartForDate = (date: Date): Date => {
  const dayOfWeek = date.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  return weekStart;
};

/**
 * Get the review submission deadline (Monday at 23:59:59)
 * Reviews are DUE every Monday
 * 
 * @param weekStart - The Monday (week start) date
 * @returns Date object representing Monday at 23:59:59 (end of Monday)
 */
export const getReviewDeadline = (weekStart: Date): Date => {
  const deadline = new Date(weekStart);
  // Same day (Monday), but end of day
  deadline.setHours(23, 59, 59, 999);
  
  return deadline;
};

/**
 * Check if a review is overdue based on current date
 * 
 * @param weekStart - The week the review is for
 * @returns boolean - true if past Monday deadline
 */
export const isReviewOverdue = (weekStart: Date): boolean => {
  const deadline = getReviewDeadline(weekStart);
  const now = new Date();
  
  return now > deadline;
};

/**
 * Calculate how many days a review is overdue
 * 
 * @param weekStart - The week the review is for
 * @returns number - Days overdue (0 if not overdue)
 */
export const getDaysOverdue = (weekStart: Date): number => {
  if (!isReviewOverdue(weekStart)) {
    return 0;
  }
  
  const deadline = getReviewDeadline(weekStart);
  const now = new Date();
  
  const diffMs = now.getTime() - deadline.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Get days remaining until deadline
 * 
 * @param weekStart - The week the review is for
 * @returns number - Days remaining (negative if overdue)
 */
export const getDaysUntilDeadline = (weekStart: Date): number => {
  const deadline = getReviewDeadline(weekStart);
  const now = new Date();
  
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Review status types with urgency levels
 */
export type ReviewStatus = 
  | 'completed'           // Review submitted for current week
  | 'due_in_week'        // Due this week (Saturday-Sunday)
  | 'due_tomorrow'       // Due tomorrow (Sunday)
  | 'due_today'          // Due today (Monday)
  | 'overdue_1d'         // 1 day overdue (Tuesday)
  | 'overdue_2d'         // 2 days overdue (Wednesday)
  | 'overdue_3plus'      // 3+ days overdue (Thursday+)
  | 'exempt';            // Exempt from review (e.g., on leave)

/**
 * Get detailed review status with urgency level
 * 
 * @param weekStart - The week the review is for
 * @param reviewSubmitted - Whether review has been submitted
 * @param isExempt - Whether user is exempt (e.g., on leave)
 * @returns ReviewStatus - Detailed status with urgency
 */
export const getReviewStatus = (
  weekStart: Date,
  reviewSubmitted: boolean,
  isExempt: boolean = false
): ReviewStatus => {
  if (isExempt) {
    return 'exempt';
  }
  
  if (reviewSubmitted) {
    return 'completed';
  }
  
  const daysUntilDeadline = getDaysUntilDeadline(weekStart);
  
  // Check if overdue
  if (daysUntilDeadline < 0) {
    const daysOverdue = Math.abs(daysUntilDeadline);
    
    if (daysOverdue === 1) return 'overdue_1d';
    if (daysOverdue === 2) return 'overdue_2d';
    return 'overdue_3plus';
  }
  
  // Check urgency before deadline
  if (daysUntilDeadline === 0) return 'due_today';
  if (daysUntilDeadline === 1) return 'due_tomorrow';
  
  return 'due_in_week';
};

/**
 * Get human-readable status message
 * 
 * @param status - ReviewStatus
 * @param daysCount - Optional days count for display
 * @returns string - User-friendly message
 */
export const getStatusMessage = (status: ReviewStatus, daysCount?: number): string => {
  switch (status) {
    case 'completed':
      return '✅ Completed';
    case 'due_in_week':
      return daysCount ? `📅 Due in ${daysCount} days` : '📅 Due this week';
    case 'due_tomorrow':
      return '⚠️ Due Tomorrow';
    case 'due_today':
      return '🔴 DUE TODAY';
    case 'overdue_1d':
      return '🚨 Overdue (1 day)';
    case 'overdue_2d':
      return '🚨 Overdue (2 days)';
    case 'overdue_3plus':
      return daysCount ? `🚨 Overdue (${daysCount} days)` : '🚨 Seriously Overdue';
    case 'exempt':
      return '✓ Exempt';
    default:
      return 'Unknown';
  }
};

/**
 * Get CSS color class for status
 * 
 * @param status - ReviewStatus
 * @returns string - Tailwind color classes
 */
export const getStatusColorClass = (status: ReviewStatus): string => {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-50 border-green-300';
    case 'due_in_week':
      return 'text-blue-600 bg-blue-50 border-blue-300';
    case 'due_tomorrow':
      return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    case 'due_today':
      return 'text-orange-600 bg-orange-50 border-orange-300';
    case 'overdue_1d':
    case 'overdue_2d':
    case 'overdue_3plus':
      return 'text-red-600 bg-red-50 border-red-300';
    case 'exempt':
      return 'text-gray-600 bg-gray-50 border-gray-300';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-300';
  }
};

/**
 * Check if review was submitted on time
 * 
 * @param weekStart - The week the review is for
 * @param submittedAt - When the review was actually submitted
 * @returns boolean - true if submitted by Monday deadline
 */
export const wasSubmittedOnTime = (weekStart: Date, submittedAt: Date): boolean => {
  const deadline = getReviewDeadline(weekStart);
  return submittedAt <= deadline;
};

/**
 * Get all Mondays (week starts) for a date range
 * Useful for generating reports or checking historical compliance
 * 
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Date[] - Array of all Mondays in the range
 */
export const getWeekStartsInRange = (startDate: Date, endDate: Date): Date[] => {
  const weekStarts: Date[] = [];
  let currentWeekStart = getWeekStartForDate(startDate);
  
  while (currentWeekStart <= endDate) {
    weekStarts.push(new Date(currentWeekStart));
    // Move to next Monday
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
  
  return weekStarts;
};

/**
 * Check if two dates are in the same week (same Monday)
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns boolean - true if same week
 */
export const areSameWeek = (date1: Date, date2: Date): boolean => {
  const week1 = getWeekStartForDate(date1);
  const week2 = getWeekStartForDate(date2);
  
  return week1.getTime() === week2.getTime();
};
