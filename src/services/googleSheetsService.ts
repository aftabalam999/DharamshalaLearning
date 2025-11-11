/**
 * Google Sheets Sync Service (Client-Side)
 * 
 * Provides manual sync functionality for admins to export data to Google Sheets
 * Note: Automated sync happens via GitHub Actions (see scripts/sync-sheets.js)
 */

import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { DailyGoal, DailyReflection } from '../types';
import { LoginRecord } from './loginTrackingService';

export interface SyncMetadata {
  last_sync_time?: Date;
  last_sync_status?: 'success' | 'failed' | 'never';
  goals_synced?: number;
  reflections_synced?: number;
  logins_synced?: number;
  last_error?: string;
  last_error_time?: Date;
}

export interface SyncResult {
  success: boolean;
  synced: {
    goals: number;
    reflections: number;
    logins: number;
  };
  error?: string;
}

export class GoogleSheetsService {
  /**
   * Get last sync metadata
   */
  static async getLastSyncMetadata(): Promise<SyncMetadata> {
    try {
      const metaDocRef = doc(db, 'system_metadata', 'sheets_sync');
      const metaDoc = await getDoc(metaDocRef);

      if (!metaDoc.exists()) {
        return {
          last_sync_status: 'never',
        };
      }

      const data = metaDoc.data();
      return {
        last_sync_time: data.last_sync_time?.toDate(),
        last_sync_status: data.last_sync_status || 'never',
        goals_synced: data.goals_synced || 0,
        reflections_synced: data.reflections_synced || 0,
        logins_synced: data.logins_synced || 0,
        last_error: data.last_error,
        last_error_time: data.last_error_time?.toDate(),
      };
    } catch (error) {
      console.error('Error getting sync metadata:', error);
      throw error;
    }
  }

  /**
   * Get new goals since last sync
   */
  static async getNewGoals(since?: Date): Promise<DailyGoal[]> {
    try {
      const goalsRef = collection(db, 'daily_goals');
      
      if (since) {
        const q = query(
          goalsRef,
          where('updated_at', '>', Timestamp.fromDate(since)),
          orderBy('updated_at', 'asc')
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate(),
          updated_at: doc.data().updated_at?.toDate(),
        })) as DailyGoal[];
      } else {
        // Get all goals
        const snapshot = await getDocs(goalsRef);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate(),
          updated_at: doc.data().updated_at?.toDate(),
        })) as DailyGoal[];
      }
    } catch (error) {
      console.error('Error getting new goals:', error);
      throw error;
    }
  }

  /**
   * Get new reflections since last sync
   */
  static async getNewReflections(since?: Date): Promise<DailyReflection[]> {
    try {
      const reflectionsRef = collection(db, 'daily_reflections');
      
      if (since) {
        const q = query(
          reflectionsRef,
          where('updated_at', '>', Timestamp.fromDate(since)),
          orderBy('updated_at', 'asc')
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate(),
          updated_at: doc.data().updated_at?.toDate(),
        })) as DailyReflection[];
      } else {
        // Get all reflections
        const snapshot = await getDocs(reflectionsRef);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate(),
          updated_at: doc.data().updated_at?.toDate(),
        })) as DailyReflection[];
      }
    } catch (error) {
      console.error('Error getting new reflections:', error);
      throw error;
    }
  }

  /**
   * Get new logins since last sync
   */
  static async getNewLogins(since?: Date): Promise<LoginRecord[]> {
    try {
      // Get all dates in the date range
      const today = new Date().toISOString().split('T')[0];
      const sinceDate = since ? since.toISOString().split('T')[0] : today;

      const logins: LoginRecord[] = [];

      // Iterate through dates
      const start = new Date(sinceDate);
      const end = new Date(today);

      for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const loginsRef = collection(db, 'daily_logins', dateStr, 'logins');
        
        try {
          const snapshot = await getDocs(loginsRef);
          
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            logins.push({
              ...data,
              login_time: data.login_time?.toDate() || new Date(),
            } as LoginRecord);
          });
        } catch (error) {
          // Date might not exist, continue
          console.log(`No logins for ${dateStr}`);
        }
      }

      return logins;
    } catch (error) {
      console.error('Error getting new logins:', error);
      throw error;
    }
  }

  /**
   * Format data for Google Sheets CSV export
   * This can be used by admins to download CSV and manually upload to Sheets
   */
  static formatGoalsAsCSV(goals: DailyGoal[]): string {
    const headers = [
      'Date',
      'Student ID',
      'Student Name',
      'Goal Text',
      'Target Percentage',
      'Status',
      'Reviewed By',
      'Mentor Comment',
      'Campus',
      'House',
    ];

    const rows = goals.map((goal: any) => [
      goal.created_at?.toLocaleDateString('en-IN') || '',
      goal.student_id || '',
      goal.student_name || '',
      goal.goal_text || '',
      goal.target_percentage || '',
      goal.status || '',
      goal.reviewed_by || '',
      goal.mentor_comment || '',
      goal.campus || '',
      goal.house || '',
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  static formatReflectionsAsCSV(reflections: DailyReflection[]): string {
    const headers = [
      'Date',
      'Student ID',
      'Student Name',
      'Goal ID',
      'Reflection Answers',
      'Status',
      'Mentor Notes',
      'Campus',
    ];

    const rows = reflections.map((reflection: any) => [
      reflection.created_at?.toLocaleDateString('en-IN') || '',
      reflection.student_id || '',
      reflection.student_name || '',
      reflection.goal_id || '',
      JSON.stringify(reflection.reflection_answers || {}),
      reflection.status || '',
      reflection.mentor_notes || '',
      reflection.campus || '',
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  static formatLoginsAsCSV(logins: LoginRecord[]): string {
    const headers = [
      'Date',
      'User Name',
      'Email',
      'Campus',
      'House',
      'Role',
      'Discord ID',
      'Login Time',
    ];

    const rows = logins.map(login => [
      login.date || '',
      login.user_name || '',
      login.user_email || '',
      login.campus || '',
      login.house || '',
      login.role || '',
      login.discord_user_id || '',
      login.login_time?.toLocaleTimeString('en-IN') || '',
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Download CSV file (browser only)
   */
  static downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export goals to CSV (manual download)
   */
  static async exportGoalsToCSV(since?: Date): Promise<void> {
    const goals = await this.getNewGoals(since);
    const csv = this.formatGoalsAsCSV(goals);
    const filename = `goals_${since ? 'incremental_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadCSV(csv, filename);
  }

  /**
   * Export reflections to CSV (manual download)
   */
  static async exportReflectionsToCSV(since?: Date): Promise<void> {
    const reflections = await this.getNewReflections(since);
    const csv = this.formatReflectionsAsCSV(reflections);
    const filename = `reflections_${since ? 'incremental_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadCSV(csv, filename);
  }

  /**
   * Export logins to CSV (manual download)
   */
  static async exportLoginsToCSV(since?: Date): Promise<void> {
    const logins = await this.getNewLogins(since);
    const csv = this.formatLoginsAsCSV(logins);
    const filename = `attendance_${since ? 'incremental_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadCSV(csv, filename);
  }

  /**
   * Get sync statistics
   */
  static async getSyncStatistics(): Promise<{
    totalGoals: number;
    totalReflections: number;
    todayLogins: number;
    lastSyncTime?: Date;
    newSinceLastSync: {
      goals: number;
      reflections: number;
      logins: number;
    };
  }> {
    try {
      const metadata = await this.getLastSyncMetadata();

      // Get totals
      const [allGoals, allReflections, newGoals, newReflections, newLogins] = await Promise.all([
        getDocs(collection(db, 'daily_goals')),
        getDocs(collection(db, 'daily_reflections')),
        this.getNewGoals(metadata.last_sync_time),
        this.getNewReflections(metadata.last_sync_time),
        this.getNewLogins(metadata.last_sync_time),
      ]);

      // Get today's logins
      const today = new Date().toISOString().split('T')[0];
      let todayLogins = 0;
      try {
        const todayLoginsSnap = await getDocs(collection(db, 'daily_logins', today, 'logins'));
        todayLogins = todayLoginsSnap.size;
      } catch (error) {
        // Today's logins might not exist
        todayLogins = 0;
      }

      return {
        totalGoals: allGoals.size,
        totalReflections: allReflections.size,
        todayLogins,
        lastSyncTime: metadata.last_sync_time,
        newSinceLastSync: {
          goals: newGoals.length,
          reflections: newReflections.length,
          logins: newLogins.length,
        },
      };
    } catch (error) {
      console.error('Error getting sync statistics:', error);
      throw error;
    }
  }
}
