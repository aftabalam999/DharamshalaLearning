import { PairProgrammingSession, AvailableTimeSlot } from '../types';
import { EnhancedPairProgrammingService } from './dataServices';
import { UserService } from './firestore';
import {
  SCHEDULING_CONSTANTS,
  getCampusSchedule,
  getDefaultTimeSlots,
  isWorkingDay,
  SCHEDULING_PRIORITIES
} from '../utils/schedulingConstants';

export class PairProgrammingScheduler {

  /**
   * Find available time slots for a given date range and campus
   */
  static async findAvailableSlots(
    campus: string,
    startDate: Date,
    endDate: Date,
    excludeMentorIds: string[] = []
  ): Promise<AvailableTimeSlot[]> {
    const availableSlots: AvailableTimeSlot[] = [];
    const campusSchedule = getCampusSchedule(campus);
    const timeSlots = getDefaultTimeSlots();

    // Get all mentors for this campus
    const mentors = await UserService.getUsersByCampus(campus);
    const availableMentors = mentors.filter((mentor: any) =>
      (mentor.role === 'mentor' || mentor.role === 'academic_associate' || mentor.role === 'admin') &&
      mentor.status === 'active' &&
      !excludeMentorIds.includes(mentor.id)
    );

    // Check each date in the range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as any;

      // Skip non-working days
      if (!isWorkingDay(campus, dayOfWeek)) continue;

      // Check each time slot
      for (const timeSlot of timeSlots) {
        const slotStart = new Date(date);
        const [hours, minutes] = timeSlot.split(':').map(Number);
        slotStart.setHours(hours, minutes, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + SCHEDULING_CONSTANTS.DEFAULT_SESSION_DURATION_MINUTES);

        // Check if slot is within campus working hours
        if (slotStart.getHours() < parseInt(campusSchedule.start_time.split(':')[0]) ||
            slotEnd.getHours() > parseInt(campusSchedule.end_time.split(':')[0])) {
          continue;
        }

        // Check break time
        if (campusSchedule.break_start && campusSchedule.break_end) {
          const breakStart = parseInt(campusSchedule.break_start.split(':')[0]);
          const breakEnd = parseInt(campusSchedule.break_end.split(':')[0]);
          if (slotStart.getHours() >= breakStart && slotEnd.getHours() <= breakEnd) {
            continue;
          }
        }

        // Check each mentor's availability
        for (const mentor of availableMentors) {
          const isMentorAvailable = await this.checkMentorAvailability(
            mentor.id,
            date,
            timeSlot,
            SCHEDULING_CONSTANTS.DEFAULT_SESSION_DURATION_MINUTES
          );

          if (isMentorAvailable) {
            // Count existing sessions in this slot
            const existingSessions = await this.getSessionsInTimeSlot(
              mentor.id,
              date,
              timeSlot,
              SCHEDULING_CONSTANTS.DEFAULT_SESSION_DURATION_MINUTES
            );

            const slot: AvailableTimeSlot = {
              date: date.toISOString().split('T')[0],
              start_time: timeSlot,
              end_time: this.addMinutesToTime(timeSlot, SCHEDULING_CONSTANTS.DEFAULT_SESSION_DURATION_MINUTES),
              mentor_id: mentor.id,
              mentor_name: mentor.name,
              campus: campus,
              session_count: existingSessions.length,
              max_sessions: SCHEDULING_CONSTANTS.MAX_SESSIONS_PER_SLOT,
              is_available: existingSessions.length < SCHEDULING_CONSTANTS.MAX_SESSIONS_PER_SLOT
            };

            availableSlots.push(slot);
          }
        }
      }
    }

    return availableSlots.sort((a, b) => {
      // Sort by date, then time, then availability
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
      return b.is_available ? 1 : -1;
    });
  }

  /**
   * Check if a mentor is available for a specific time slot
   */
  static async checkMentorAvailability(
    mentorId: string,
    date: Date,
    startTime: string,
    durationMinutes: number
  ): Promise<boolean> {
    try {
      // Check if mentor is on leave
      const mentor = await UserService.getUserById(mentorId);
      if (!mentor) return false;

      if (mentor.status === 'on_leave' && mentor.leave_from && mentor.leave_to) {
        const leaveStart = new Date(mentor.leave_from);
        const leaveEnd = new Date(mentor.leave_to);
        if (date >= leaveStart && date <= leaveEnd) {
          return false;
        }
      }

      // Check for existing sessions in this time slot
      const existingSessions = await this.getSessionsInTimeSlot(mentorId, date, startTime, durationMinutes);
      if (existingSessions.length >= SCHEDULING_CONSTANTS.MAX_SESSIONS_PER_SLOT) {
        return false;
      }

      // Check mentor's availability preferences
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const mentorAvailability = await UserService.getMentorAvailability(mentorId);
      
      // If mentor has availability preferences set, check them
      if (mentorAvailability.length > 0) {
        const slotAvailability = mentorAvailability.find(slot => 
          slot.day_of_week === dayOfWeek && slot.start_time === startTime
        );
        
        // If a preference is set for this slot, use it; otherwise assume available
        if (slotAvailability) {
          return slotAvailability.is_available;
        }
      }

      // If no preferences set, assume available during campus working hours
      return true;
    } catch (error) {
      console.error('Error checking mentor availability:', error);
      return false;
    }
  }

  /**
   * Get existing sessions in a specific time slot
   */
  static async getSessionsInTimeSlot(
    mentorId: string,
    date: Date,
    startTime: string,
    durationMinutes: number
  ): Promise<PairProgrammingSession[]> {
    try {
      const slotStart = new Date(date);
      const [hours, minutes] = startTime.split(':').map(Number);
      slotStart.setHours(hours, minutes, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

      // Get all sessions for this mentor on this date
      const sessions = await EnhancedPairProgrammingService.getSessionsByUser(mentorId, 'mentor');

      return sessions.filter(session => {
        if (!session.scheduled_date || !session.scheduled_time) return false;

        const sessionDate = new Date(session.scheduled_date);
        if (sessionDate.toDateString() !== date.toDateString()) return false;

        const [sessionHours, sessionMinutes] = session.scheduled_time.split(':').map(Number);
        const sessionStart = new Date(sessionDate);
        sessionStart.setHours(sessionHours, sessionMinutes, 0, 0);

        const sessionEnd = new Date(sessionStart);
        sessionEnd.setMinutes(sessionEnd.getMinutes() + (session.duration_minutes || SCHEDULING_CONSTANTS.DEFAULT_SESSION_DURATION_MINUTES));

        // Check for overlap
        return !(sessionEnd <= slotStart || sessionStart >= slotEnd);
      });
    } catch (error) {
      console.error('Error getting sessions in time slot:', error);
      return [];
    }
  }

  /**
   * Auto-schedule a session request
   */
  static async autoScheduleSession(
    sessionId: string,
    campus: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<boolean> {
    try {
      const session = await EnhancedPairProgrammingService.getSessionById(sessionId);
      if (!session) return false;

      // Determine search window based on priority
      const priorityConfig = SCHEDULING_PRIORITIES[priority];
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + priorityConfig.max_wait_days);

      // Find available slots
      const availableSlots = await this.findAvailableSlots(campus, startDate, endDate);

      if (availableSlots.length === 0) return false;

      // Pick the first available slot
      const selectedSlot = availableSlots.find(slot => slot.is_available);
      if (!selectedSlot) return false;

      // Schedule the session
      const scheduledDate = new Date(selectedSlot.date);
      await EnhancedPairProgrammingService.assignMentorToSession(sessionId, selectedSlot.mentor_id);
      await EnhancedPairProgrammingService.updateSession(sessionId, {
        scheduled_date: scheduledDate,
        scheduled_time: selectedSlot.start_time,
        status: 'scheduled'
      });

      return true;
    } catch (error) {
      console.error('Error auto-scheduling session:', error);
      return false;
    }
  }

  /**
   * Get upcoming sessions for a user (student or mentor)
   */
  static async getUpcomingSessions(
    userId: string,
    userRole: 'student' | 'mentor' | 'admin' | 'academic_associate',
    limit: number = SCHEDULING_CONSTANTS.UPCOMING_SESSIONS_LIMIT
  ): Promise<PairProgrammingSession[]> {
    try {
      // Map roles to the expected format
      const mappedRole = userRole === 'student' ? 'mentee' : userRole === 'mentor' ? 'mentor' : 'all';
      const sessions = await EnhancedPairProgrammingService.getSessionsByUser(userId, mappedRole);

      const upcomingSessions = sessions
        .filter(session => {
          // Include scheduled sessions in the future
          if (session.status === 'scheduled' && session.scheduled_date) {
            return new Date(session.scheduled_date) >= new Date();
          }
          // Include assigned sessions (waiting for scheduling)
          if (session.status === 'assigned') {
            return true;
          }
          // Include pending sessions for mentors/admins
          if ((userRole === 'mentor' || userRole === 'admin' || userRole === 'academic_associate') && session.status === 'pending') {
            return true;
          }
          return false;
        })
        .sort((a, b) => {
          // Sort by scheduled date first, then by creation date for unscheduled sessions
          const aDate = a.scheduled_date ? new Date(a.scheduled_date).getTime() : new Date(a.created_at).getTime();
          const bDate = b.scheduled_date ? new Date(b.scheduled_date).getTime() : new Date(b.created_at).getTime();
          
          if (aDate !== bDate) return aDate - bDate;

          // If same date, sort by scheduled time or creation time
          const timeA = a.scheduled_time || '00:00';
          const timeB = b.scheduled_time || '00:00';
          return timeA.localeCompare(timeB);
        })
        .slice(0, limit);

      return upcomingSessions;
    } catch (error) {
      console.error('Error getting upcoming sessions:', error);
      return [];
    }
  }

  /**
   * Check if a user is available (not on leave) for scheduling
   */
  static async isUserAvailable(userId: string, date: Date): Promise<boolean> {
    try {
      const user = await UserService.getUserById(userId);
      if (!user) return false;

      // Check leave status
      if (user.status === 'on_leave' && user.leave_from && user.leave_to) {
        const leaveStart = new Date(user.leave_from);
        const leaveEnd = new Date(user.leave_to);
        if (date >= leaveStart && date <= leaveEnd) {
          return false;
        }
      }

      return user.status === 'active';
    } catch (error) {
      console.error('Error checking user availability:', error);
      return false;
    }
  }

    /**
   * Get all sessions for a user (for history view)
   */
  static async getSessionsByUser(
    userId: string,
    userRole: 'mentee' | 'mentor' | 'all' = 'all'
  ): Promise<PairProgrammingSession[]> {
    return EnhancedPairProgrammingService.getSessionsByUser(userId, userRole);
  }

  /**
   * Helper function to add minutes to a time string
   */
  private static addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);
    return date.toTimeString().slice(0, 5);
  }
}