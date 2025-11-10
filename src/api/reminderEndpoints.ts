/**
 * API Endpoint for External Cron Services
 * 
 * This file provides HTTP endpoints that can be called by external cron services
 * like cron-job.org, UptimeRobot, or GitHub Actions.
 * 
 * Setup Instructions:
 * 1. Deploy this as a serverless function (Vercel, Netlify, etc.)
 * 2. Set up cron jobs at cron-job.org to call these URLs:
 *    - Sunday 8pm: POST /api/reminders/sunday
 *    - Monday 9am: POST /api/reminders/monday-morning
 *    - Monday 6pm: POST /api/reminders/monday-evening
 *    - Daily 10am (Tue-Sun): POST /api/reminders/overdue
 * 
 * Security: Add API key authentication to prevent unauthorized access
 */

import { ReviewReminderService } from '../services/reviewReminderService';

// Simple API key validation
const API_KEY = process.env.REACT_APP_CRON_API_KEY || 'your-secret-api-key-here';

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Validate API key from request
 */
function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return apiKey === API_KEY;
}

/**
 * Create a standardized API response
 */
function createResponse(
  success: boolean, 
  message: string, 
  data?: any, 
  error?: string
): ApiResponse {
  return { success, message, data, error };
}

/**
 * Sunday Reminder Endpoint
 * Call this at Sunday 8:00 PM
 */
export async function handleSundayReminder(apiKey: string | null): Promise<ApiResponse> {
  try {
    // Validate API key
    if (!validateApiKey(apiKey)) {
      return createResponse(false, 'Unauthorized', undefined, 'Invalid API key');
    }

    console.log('[API] Triggering Sunday reminder...');
    const result = await ReviewReminderService.sendSundayReminder();

    return createResponse(
      true,
      'Sunday reminder sent successfully',
      {
        sent: result.sent,
        failed: result.failed,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('[API] Error in Sunday reminder:', error);
    return createResponse(
      false,
      'Failed to send Sunday reminder',
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Monday Morning Reminder Endpoint
 * Call this at Monday 9:00 AM
 */
export async function handleMondayMorningReminder(apiKey: string | null): Promise<ApiResponse> {
  try {
    if (!validateApiKey(apiKey)) {
      return createResponse(false, 'Unauthorized', undefined, 'Invalid API key');
    }

    console.log('[API] Triggering Monday morning reminder...');
    const result = await ReviewReminderService.sendMondayMorningReminder();

    return createResponse(
      true,
      'Monday morning reminder sent successfully',
      {
        sent: result.sent,
        failed: result.failed,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('[API] Error in Monday morning reminder:', error);
    return createResponse(
      false,
      'Failed to send Monday morning reminder',
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Monday Evening Reminder Endpoint
 * Call this at Monday 6:00 PM
 */
export async function handleMondayEveningReminder(apiKey: string | null): Promise<ApiResponse> {
  try {
    if (!validateApiKey(apiKey)) {
      return createResponse(false, 'Unauthorized', undefined, 'Invalid API key');
    }

    console.log('[API] Triggering Monday evening reminder...');
    const result = await ReviewReminderService.sendMondayEveningReminder();

    return createResponse(
      true,
      'Monday evening reminder sent successfully',
      {
        sent: result.sent,
        failed: result.failed,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('[API] Error in Monday evening reminder:', error);
    return createResponse(
      false,
      'Failed to send Monday evening reminder',
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Overdue Reminder Endpoint
 * Call this daily at 10:00 AM (Tuesday through Sunday)
 */
export async function handleOverdueReminder(apiKey: string | null): Promise<ApiResponse> {
  try {
    if (!validateApiKey(apiKey)) {
      return createResponse(false, 'Unauthorized', undefined, 'Invalid API key');
    }

    console.log('[API] Triggering overdue reminder...');
    const result = await ReviewReminderService.sendOverdueReminder();

    return createResponse(
      true,
      'Overdue reminder sent successfully',
      {
        sent: result.sent,
        failed: result.failed,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('[API] Error in overdue reminder:', error);
    return createResponse(
      false,
      'Failed to send overdue reminder',
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Health check endpoint
 */
export async function handleHealthCheck(): Promise<ApiResponse> {
  return createResponse(
    true,
    'API is running',
    {
      timestamp: new Date().toISOString(),
      status: 'healthy'
    }
  );
}
