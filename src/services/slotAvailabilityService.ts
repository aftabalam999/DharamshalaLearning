import { FirestoreService, COLLECTIONS } from './firestore';
import { CampusSchedule, AvailableSlot, PairProgrammingSession, LeaveRequest } from '../types';

interface SlotCalculationParams {
  mentorId: string;
  campus: string;
  date: Date;
  slotDurationMinutes?: number;
}

export class SlotAvailabilityService extends FirestoreService {
  /**
   * Calculate available time slots for a mentor on a specific date
   * Respects campus hours, breaks, existing bookings, and leave status
   */
  static async getAvailableSlots({
    mentorId,
    campus,
    date,
    slotDurationMinutes = 60,
  }: SlotCalculationParams): Promise<AvailableSlot[]> {
    try {
      // 1. Check if mentor is on leave
      const isOnLeave = await this.isMentorOnLeave(mentorId, date);
      if (isOnLeave) {
        return []; // No slots available if mentor is on leave
      }

      // 2. Get campus schedule
      const campusSchedule = await this.getCampusSchedule(campus);
      if (!campusSchedule) {
        throw new Error(`No schedule found for campus: ${campus}`);
      }

      // 3. Check if it's a working day
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (!campusSchedule.working_days.includes(dayOfWeek as any)) {
        return [];
      }

      // 4. Get existing bookings for this mentor on this day
      const bookings = await this.getExistingBookings(mentorId, date);

      // 5. Calculate available slots
      const availableSlots = this.calculateAvailableSlots(
        campusSchedule.start_time,
        campusSchedule.end_time,
        slotDurationMinutes,
        bookings,
        campusSchedule.break_start,
        campusSchedule.break_end,
        date
      );

      return availableSlots;
    } catch (error) {
      console.error('Error calculating available slots:', error);
      throw error;
    }
  }

  /**
   * Get available slots for multiple mentors (for mentee to choose from)
   */
  static async getAvailableSlotsByMentors(
    mentorIds: string[],
    campus: string,
    date: Date,
    slotDurationMinutes: number = 60
  ): Promise<Record<string, AvailableSlot[]>> {
    const slotsByMentor: Record<string, AvailableSlot[]> = {};

    for (const mentorId of mentorIds) {
      try {
        const slots = await this.getAvailableSlots({
          mentorId,
          campus,
          date,
          slotDurationMinutes,
        });
        slotsByMentor[mentorId] = slots;
      } catch (error) {
        console.error(`Error fetching slots for mentor ${mentorId}:`, error);
        slotsByMentor[mentorId] = [];
      }
    }

    return slotsByMentor;
  }

  /**
   * Get available slots for a date range
   */
  static async getAvailableSlotsForDateRange(
    mentorId: string,
    campus: string,
    startDate: Date,
    endDate: Date,
    slotDurationMinutes: number = 60
  ): Promise<Record<string, AvailableSlot[]>> {
    const slotsByDate: Record<string, AvailableSlot[]> = {};
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      try {
        const slots = await this.getAvailableSlots({
          mentorId,
          campus,
          date: new Date(currentDate),
          slotDurationMinutes,
        });
        slotsByDate[dateKey] = slots;
      } catch (error) {
        console.error(`Error fetching slots for ${dateKey}:`, error);
        slotsByDate[dateKey] = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slotsByDate;
  }

  /**
   * Check if mentor is on approved leave for a given date
   */
  private static async isMentorOnLeave(mentorId: string, date: Date): Promise<boolean> {
    try {
      // Normalize date to start of day for comparison
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);

      // Query for approved leave requests that cover this date
      const leaveRequests = await this.getWhereCompound<LeaveRequest>(
        COLLECTIONS.LEAVE_REQUESTS,
        [
          { field: 'user_id', operator: '==', value: mentorId },
          { field: 'status', operator: '==', value: 'approved' },
          { field: 'start_date', operator: '<=', value: checkDate },
          { field: 'end_date', operator: '>=', value: checkDate },
        ]
      );

      return leaveRequests.length > 0;
    } catch (error) {
      console.error('Error checking mentor leave status:', error);
      return false;
    }
  }

  /**
   * Get campus schedule by campus name
   */
  private static async getCampusSchedule(campus: string): Promise<CampusSchedule | null> {
    try {
      const schedules = await this.getWhereCompound<CampusSchedule>(
        COLLECTIONS.CAMPUS_SCHEDULES,
        [{ field: 'campus', operator: '==', value: campus }]
      );
      return schedules.length > 0 ? schedules[0] : null;
    } catch (error) {
      console.error('Error fetching campus schedule:', error);
      return null;
    }
  }

  /**
   * Get existing bookings (scheduled sessions) for a mentor on a specific date
   */
  private static async getExistingBookings(
    mentorId: string,
    date: Date
  ): Promise<{ startTime: string; endTime: string }[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Query for sessions with this mentor on this date (only scheduled/in_progress)
      const sessions = await this.getWhereCompound<PairProgrammingSession>(
        COLLECTIONS.PAIR_PROGRAMMING_SESSIONS,
        [
          { field: 'mentor_id', operator: '==', value: mentorId },
          { field: 'scheduled_date', operator: '>=', value: startOfDay },
          { field: 'scheduled_date', operator: '<=', value: endOfDay },
          { field: 'status', operator: 'in', value: ['scheduled', 'in_progress'] },
        ]
      );

      return sessions.map((session: PairProgrammingSession) => {
        const startTime = session.scheduled_time || '00:00';
        const [hours, mins] = startTime.split(':').map(Number);
        const endDate = new Date(0, 0, 0, hours, mins);
        endDate.setMinutes(endDate.getMinutes() + (session.duration_minutes || 60));

        const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(
          endDate.getMinutes()
        ).padStart(2, '0')}`;

        return { startTime, endTime };
      });
    } catch (error) {
      console.error('Error fetching existing bookings:', error);
      return [];
    }
  }

  /**
   * Calculate available time slots for the given parameters
   * Respects working hours, breaks, and existing bookings
   */
  private static calculateAvailableSlots(
    startTime: string,
    endTime: string,
    slotDurationMinutes: number,
    bookings: { startTime: string; endTime: string }[],
    breakStart?: string,
    breakEnd?: string,
    date?: Date
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

      // Calculate slot end time
      const slotEndDate = new Date(0, 0, 0, currentHour, currentMin);
      slotEndDate.setMinutes(slotEndDate.getMinutes() + slotDurationMinutes);

      const slotEnd = `${String(slotEndDate.getHours()).padStart(2, '0')}:${String(
        slotEndDate.getMinutes()
      ).padStart(2, '0')}`;

      // Check if slot end time exceeds working hours
      if (slotEndDate.getHours() > endHour || (slotEndDate.getHours() === endHour && slotEndDate.getMinutes() > endMin)) {
        break;
      }

      // Skip break time
      if (breakStart && breakEnd && this.isTimeInBreak(slotStart, breakStart, breakEnd)) {
        currentMin += slotDurationMinutes;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
        continue;
      }

      // Check for conflicts with existing bookings
      const hasConflict = bookings.some((booking) => this.hasTimeConflict(slotStart, slotEnd, booking.startTime, booking.endTime));

      if (!hasConflict) {
        const dateString = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        slots.push({
          startTime: new Date(`${dateString}T${slotStart}:00`),
          endTime: new Date(`${dateString}T${slotEnd}:00`),
          duration: slotDurationMinutes,
        });
      }

      // Move to next slot
      currentMin += slotDurationMinutes;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }

    return slots;
  }

  /**
   * Check if a time falls within a break period
   */
  private static isTimeInBreak(slotStart: string, breakStart: string, breakEnd: string): boolean {
    return slotStart >= breakStart && slotStart < breakEnd;
  }

  /**
   * Check if two time slots have a conflict
   */
  private static hasTimeConflict(
    slotStart: string,
    slotEnd: string,
    bookingStart: string,
    bookingEnd: string
  ): boolean {
    return !(slotEnd <= bookingStart || slotStart >= bookingEnd);
  }

  /**
   * Validate if a slot is still available (no double booking)
   */
  static async validateSlot(
    mentorId: string,
    slotStart: Date,
    slotEnd: Date,
    sessionId?: string
  ): Promise<boolean> {
    try {
      const bookings = await this.getExistingBookings(mentorId, slotStart);

      const slotStartTime = slotStart.toTimeString().slice(0, 5);
      const slotEndTime = slotEnd.toTimeString().slice(0, 5);

      const hasConflict = bookings.some(
        (booking) =>
          // Exclude current session if provided
          !(slotEndTime <= booking.startTime || slotStartTime >= booking.endTime)
      );

      return !hasConflict;
    } catch (error) {
      console.error('Error validating slot:', error);
      return false;
    }
  }

  /**
   * Get next available slot for a mentor within N days
   */
  static async getNextAvailableSlot(
    mentorId: string,
    campus: string,
    fromDate: Date,
    daysToCheck: number = 7,
    slotDurationMinutes: number = 60
  ): Promise<AvailableSlot | null> {
    try {
      const currentDate = new Date(fromDate);

      for (let i = 0; i < daysToCheck; i++) {
        const slots = await this.getAvailableSlots({
          mentorId,
          campus,
          date: new Date(currentDate),
          slotDurationMinutes,
        });

        if (slots.length > 0) {
          // Return the first available slot
          return slots[0];
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return null;
    } catch (error) {
      console.error('Error finding next available slot:', error);
      return null;
    }
  }

  /**
   * Get slot availability summary for a mentor
   */
  static async getSlotAvailabilitySummary(
    mentorId: string,
    campus: string,
    fromDate: Date,
    daysToCheck: number = 30,
    slotDurationMinutes: number = 60
  ): Promise<{
    totalDays: number;
    daysWithSlots: number;
    totalSlots: number;
    daysOnLeave: number;
    averageSlotsPerDay: number;
  }> {
    try {
      let daysWithSlots = 0;
      let totalSlots = 0;
      let daysOnLeave = 0;

      const currentDate = new Date(fromDate);

      for (let i = 0; i < daysToCheck; i++) {
        const isOnLeave = await this.isMentorOnLeave(mentorId, currentDate);
        if (isOnLeave) {
          daysOnLeave++;
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        const slots = await this.getAvailableSlots({
          mentorId,
          campus,
          date: new Date(currentDate),
          slotDurationMinutes,
        });

        if (slots.length > 0) {
          daysWithSlots++;
          totalSlots += slots.length;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        totalDays: daysToCheck,
        daysWithSlots,
        totalSlots,
        daysOnLeave,
        averageSlotsPerDay: daysWithSlots > 0 ? Math.round(totalSlots / daysWithSlots * 10) / 10 : 0,
      };
    } catch (error) {
      console.error('Error calculating slot availability summary:', error);
      throw error;
    }
  }
}
