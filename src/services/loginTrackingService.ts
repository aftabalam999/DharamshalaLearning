/**
 * Login Tracking Service
 * 
 * Tracks daily user logins for attendance and Discord notifications
 */

import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { User } from '../types';
import { DiscordService, DiscordUser } from './discordService';

export interface LoginRecord {
  user_id: string;
  user_name: string;
  user_email: string;
  campus?: string;
  house?: string;
  role?: string;
  discord_user_id?: string;
  login_time: Date;
  date: string; // YYYY-MM-DD format
}

export class LoginTrackingService {
  private static LOGIN_STORAGE_KEY = 'last_login_date';
  private static DISCORD_NOTIFICATIONS_ENABLED = true;

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private static getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Check if user has already been tracked today
   */
  private static hasLoggedInToday(userId: string): boolean {
    try {
      const lastLoginDate = localStorage.getItem(`${this.LOGIN_STORAGE_KEY}_${userId}`);
      const today = this.getTodayDate();
      return lastLoginDate === today;
    } catch (error) {
      console.error('Error checking localStorage:', error);
      return false;
    }
  }

  /**
   * Mark user as logged in today in localStorage
   */
  private static markLoggedInToday(userId: string): void {
    try {
      const today = this.getTodayDate();
      localStorage.setItem(`${this.LOGIN_STORAGE_KEY}_${userId}`, today);
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
  }

  /**
   * Record user login in Firestore
   */
  private static async recordLoginInFirestore(user: User): Promise<void> {
    const today = this.getTodayDate();
    const loginTime = new Date();

    const loginRecord: Partial<LoginRecord> = {
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      campus: user.campus,
      house: user.house,
      role: user.role || (user.isAdmin ? 'admin' : user.isMentor ? 'mentor' : 'student'),
      discord_user_id: user.discord_user_id,
      login_time: loginTime,
      date: today,
    };

    try {
      // Store in daily_logins/{date}/logins/{user_id}
      const loginDocRef = doc(db, 'daily_logins', today, 'logins', user.id);
      
      await setDoc(loginDocRef, {
        ...loginRecord,
        login_time: serverTimestamp(),
        updated_at: serverTimestamp(),
      }, { merge: true });

      console.log('✅ Login recorded in Firestore');
    } catch (error) {
      console.error('❌ Failed to record login in Firestore:', error);
      throw error;
    }
  }

  /**
   * Send Discord notification for login
   */
  private static async sendDiscordNotification(user: User): Promise<void> {
    if (!this.DISCORD_NOTIFICATIONS_ENABLED) {
      console.log('Discord notifications disabled, skipping');
      return;
    }

    try {
      const discordUser: DiscordUser = {
        name: user.name,
        discord_user_id: user.discord_user_id,
        campus: user.campus,
        role: user.role || (user.isAdmin ? 'Admin' : user.isMentor ? 'Mentor' : 'Student'),
        login_time: new Date(),
      };

      await DiscordService.sendLoginNotification(discordUser);
      console.log('✅ Discord notification sent');
    } catch (error) {
      // Don't throw - Discord notifications are non-critical
      console.error('❌ Failed to send Discord notification:', error);
    }
  }

  /**
   * Track user login
   * Called once when user successfully logs in
   */
  static async trackLogin(user: User): Promise<void> {
    if (!user || !user.id) {
      console.warn('Invalid user data, cannot track login');
      return;
    }

    // Check if already tracked today
    if (this.hasLoggedInToday(user.id)) {
      console.log('User already tracked today, skipping');
      return;
    }

    console.log('🔄 Tracking login for:', user.name);

    try {
      // Record in Firestore
      await this.recordLoginInFirestore(user);

      // Send Discord notification (non-blocking)
      this.sendDiscordNotification(user).catch(err => {
        console.error('Discord notification error (non-blocking):', err);
      });

      // Mark as logged in today
      this.markLoggedInToday(user.id);

      console.log('✅ Login tracking complete');
    } catch (error) {
      console.error('❌ Login tracking failed:', error);
      // Don't throw - we don't want to block the user from logging in
    }
  }

  /**
   * Get today's login count
   */
  static async getTodayLoginCount(): Promise<number> {
    const today = this.getTodayDate();

    try {
      const loginsRef = collection(db, 'daily_logins', today, 'logins');
      const snapshot = await getDocs(loginsRef);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting login count:', error);
      return 0;
    }
  }

  /**
   * Get today's logins
   */
  static async getTodayLogins(): Promise<LoginRecord[]> {
    const today = this.getTodayDate();

    try {
      const loginsRef = collection(db, 'daily_logins', today, 'logins');
      const snapshot = await getDocs(loginsRef);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          login_time: data.login_time?.toDate() || new Date(),
        } as LoginRecord;
      });
    } catch (error) {
      console.error('Error getting today\'s logins:', error);
      return [];
    }
  }

  /**
   * Get logins for a specific date range
   */
  static async getLoginsInRange(startDate: string, endDate: string): Promise<LoginRecord[]> {
    const logins: LoginRecord[] = [];

    try {
      // Get all documents in the date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const dayLogins = await this.getLoginsByDate(dateStr);
        logins.push(...dayLogins);
      }

      return logins;
    } catch (error) {
      console.error('Error getting logins in range:', error);
      return [];
    }
  }

  /**
   * Get logins for a specific date
   */
  static async getLoginsByDate(date: string): Promise<LoginRecord[]> {
    try {
      const loginsRef = collection(db, 'daily_logins', date, 'logins');
      const snapshot = await getDocs(loginsRef);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          login_time: data.login_time?.toDate() || new Date(),
        } as LoginRecord;
      });
    } catch (error) {
      console.error(`Error getting logins for ${date}:`, error);
      return [];
    }
  }

  /**
   * Send daily summary to Discord
   * Should be called at end of day or on-demand
   */
  static async sendDailySummary(date?: string): Promise<void> {
    const targetDate = date || this.getTodayDate();
    
    try {
      const logins = await this.getLoginsByDate(targetDate);

      // Group by campus
      const byCampus: Record<string, number> = {};
      const byRole: Record<string, number> = {};

      logins.forEach(login => {
        const campus = login.campus || 'Unknown';
        const role = login.role || 'Student';
        
        byCampus[campus] = (byCampus[campus] || 0) + 1;
        byRole[role] = (byRole[role] || 0) + 1;
      });

      const users = logins.map(login => ({
        name: login.user_name,
        discord_user_id: login.discord_user_id,
        campus: login.campus,
        role: login.role,
        login_time: login.login_time,
      }));

      await DiscordService.sendDailySummary({
        date: targetDate,
        total_logins: logins.length,
        users,
        by_campus: byCampus,
        by_role: byRole,
      });

      console.log('✅ Daily summary sent to Discord');
    } catch (error) {
      console.error('❌ Failed to send daily summary:', error);
      throw error;
    }
  }

  /**
   * Enable/disable Discord notifications
   */
  static setDiscordNotificationsEnabled(enabled: boolean): void {
    this.DISCORD_NOTIFICATIONS_ENABLED = enabled;
    console.log(`Discord notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear localStorage login tracking (for testing)
   */
  static clearLocalStorage(): void {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.LOGIN_STORAGE_KEY)) {
          localStorage.removeItem(key);
        }
      });
      console.log('✅ Login tracking localStorage cleared');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}
