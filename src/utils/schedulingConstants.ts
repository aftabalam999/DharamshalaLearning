// ===== PAIR PROGRAMMING SCHEDULING CONSTANTS =====

// Default scheduling configuration
export const SCHEDULING_CONSTANTS = {
  DEFAULT_SESSION_DURATION_MINUTES: 30,
  MAX_SESSIONS_PER_DAY: 8,
  MAX_SESSIONS_PER_SLOT: 1, // One session per time slot
  UPCOMING_SESSIONS_LIMIT: 10, // Show next 10 sessions in dashboard
  DEFAULT_TIME_SLOTS: [
    '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
  ],
  WORKING_DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
} as const;

// Campus schedule configurations
export const CAMPUS_SCHEDULES = {
  'Dharamshala': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Dantewada': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Eternal': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Jashpur': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Kishanganj': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Pune': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Raigarh': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Sarjapura': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Bageshree': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Malhar': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
  'Bhairav': {
    timezone: 'Asia/Kolkata',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '13:00',
    break_end: '14:00',
    max_sessions_per_day: 6,
  },
} as const;

// Session scheduling priorities
export const SCHEDULING_PRIORITIES = {
  urgent: { weight: 4, max_wait_days: 1 },
  high: { weight: 3, max_wait_days: 2 },
  medium: { weight: 2, max_wait_days: 3 },
  low: { weight: 1, max_wait_days: 7 },
} as const;

// Helper functions
export const getCampusSchedule = (campus: string) => {
  return CAMPUS_SCHEDULES[campus as keyof typeof CAMPUS_SCHEDULES] || CAMPUS_SCHEDULES.Dharamshala;
};

export const getDefaultTimeSlots = () => {
  return SCHEDULING_CONSTANTS.DEFAULT_TIME_SLOTS;
};

export const isWorkingDay = (campus: string, dayOfWeek: string) => {
  const schedule = getCampusSchedule(campus);
  return schedule.working_days.includes(dayOfWeek as any);
};