/**
 * Client-Side Reminder Scheduler
 * 
 * This service runs reminder checks when users log in or when the app loads.
 * It checks if reminders should be sent based on the current time and day.
 * 
 * Since we don't have Cloud Functions, this provides a "best effort" reminder system
 * that runs whenever someone accesses the application.
 */

import { ReviewReminderService } from './reviewReminderService';
import { 
  getCurrentWeekStart, 
  getReviewDeadline,
  getDaysOverdue 
} from '../utils/reviewDateUtils';

export class ClientReminderScheduler {
  private static instance: ClientReminderScheduler;
  private lastCheckKey = 'last_reminder_check';
  private checkIntervalMinutes = 30; // Check every 30 minutes

  private constructor() {
    // ReviewReminderService uses static methods
  }

  public static getInstance(): ClientReminderScheduler {
    if (!ClientReminderScheduler.instance) {
      ClientReminderScheduler.instance = new ClientReminderScheduler();
    }
    return ClientReminderScheduler.instance;
  }

  /**
   * Start the reminder scheduler
   * Call this when the app initializes (App.tsx useEffect)
   */
  public start(): void {
    console.log('[ClientReminderScheduler] Starting reminder scheduler...');
    
    // Run immediately on start
    this.checkAndSendReminders();

    // Set up periodic checks (every 30 minutes)
    setInterval(() => {
      this.checkAndSendReminders();
    }, this.checkIntervalMinutes * 60 * 1000);
  }

  /**
   * Check if reminders should be sent and send them
   */
  private async checkAndSendReminders(): Promise<void> {
    try {
      // Only check if we haven't checked recently
      if (!this.shouldRunCheck()) {
        console.log('[ClientReminderScheduler] Skipping check - too soon since last check');
        return;
      }

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const hour = now.getHours();
      
      console.log(`[ClientReminderScheduler] Running check - Day: ${dayOfWeek}, Hour: ${hour}`);

      // Monday morning (9am-11am) - Morning reminder
      if (dayOfWeek === 1 && hour >= 9 && hour < 11) {
        await this.sendIfNotSentToday('morning_reminder');
      }

      // Monday evening (6pm-11pm) - Evening reminder
      if (dayOfWeek === 1 && hour >= 18 && hour < 23) {
        await this.sendIfNotSentToday('evening_reminder');
      }

      // Tuesday through Sunday (10am-12pm) - Overdue reminder
      if (dayOfWeek >= 2 || dayOfWeek === 0) {
        const deadline = getReviewDeadline(getCurrentWeekStart());
        const daysOverdue = getDaysOverdue(deadline);
        
        if (daysOverdue > 0 && hour >= 10 && hour < 12) {
          await this.sendIfNotSentToday('overdue_escalation');
        }
      }

      // Update last check time
      this.updateLastCheck();

    } catch (error) {
      console.error('[ClientReminderScheduler] Error in reminder check:', error);
    }
  }

  /**
   * Send reminder if not already sent today
   */
  private async sendIfNotSentToday(
    reminderType: 'morning_reminder' | 'evening_reminder' | 'overdue_escalation'
  ): Promise<void> {
    try {
      const lastSentKey = `last_${reminderType}_sent`;
      const lastSent = localStorage.getItem(lastSentKey);
      const today = new Date().toDateString();

      if (lastSent === today) {
        console.log(`[ClientReminderScheduler] ${reminderType} already sent today`);
        return;
      }

      console.log(`[ClientReminderScheduler] Sending ${reminderType}...`);

      // Send the reminder using static methods
      let result;
      switch (reminderType) {
        case 'morning_reminder':
          result = await ReviewReminderService.sendMondayMorningReminder();
          break;
        case 'evening_reminder':
          result = await ReviewReminderService.sendMondayEveningReminder();
          break;
        case 'overdue_escalation':
          result = await ReviewReminderService.sendOverdueReminder();
          break;
      }

      // Mark as sent today
      localStorage.setItem(lastSentKey, today);
      console.log(`[ClientReminderScheduler] ${reminderType} sent successfully:`, result);

    } catch (error) {
      console.error(`[ClientReminderScheduler] Error sending ${reminderType}:`, error);
    }
  }

  /**
   * Check if enough time has passed since last check
   */
  private shouldRunCheck(): boolean {
    const lastCheck = localStorage.getItem(this.lastCheckKey);
    if (!lastCheck) return true;

    const lastCheckTime = new Date(lastCheck).getTime();
    const now = new Date().getTime();
    const minutesSinceLastCheck = (now - lastCheckTime) / (1000 * 60);

    return minutesSinceLastCheck >= this.checkIntervalMinutes;
  }

  /**
   * Update the last check timestamp
   */
  private updateLastCheck(): void {
    localStorage.setItem(this.lastCheckKey, new Date().toISOString());
  }

  /**
   * Manually trigger a reminder check (for testing or admin use)
   */
  public async manualCheck(): Promise<void> {
    console.log('[ClientReminderScheduler] Manual check triggered');
    await this.checkAndSendReminders();
  }

  /**
   * Reset all reminder timers (for testing)
   */
  public resetTimers(): void {
    localStorage.removeItem(this.lastCheckKey);
    localStorage.removeItem('last_morning_reminder_sent');
    localStorage.removeItem('last_evening_reminder_sent');
    localStorage.removeItem('last_overdue_escalation_sent');
    console.log('[ClientReminderScheduler] All timers reset');
  }

  /**
   * Get scheduler status (for debugging)
   */
  public getStatus(): {
    lastCheck: string | null;
    lastMorningReminder: string | null;
    lastEveningReminder: string | null;
    lastOverdueReminder: string | null;
  } {
    return {
      lastCheck: localStorage.getItem(this.lastCheckKey),
      lastMorningReminder: localStorage.getItem('last_morning_reminder_sent'),
      lastEveningReminder: localStorage.getItem('last_evening_reminder_sent'),
      lastOverdueReminder: localStorage.getItem('last_overdue_escalation_sent')
    };
  }
}
