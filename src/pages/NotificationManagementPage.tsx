import React from 'react';
import ReviewReminderPanel from '../components/Admin/ReviewReminderPanel';
import ReminderSchedulerStatus from '../components/Admin/ReminderSchedulerStatus';
import UserNotificationSettings from '../components/Admin/UserNotificationSettings';

/**
 * Complete Notification Management Page
 * 
 * This page combines all notification-related components:
 * 1. Scheduler Status - Shows when reminders were last sent
 * 2. Manual Triggers - Send reminders on demand
 * 3. User Settings - Manage Discord IDs for all users
 * 
 * Add to your routing:
 * <Route path="/admin/notifications" element={<NotificationManagementPage />} />
 */
const NotificationManagementPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Notification Management
        </h1>
        <p className="text-gray-600">
          Manage review reminders, monitor scheduler status, and configure user notification settings.
        </p>
      </div>

      <div className="space-y-8">
        {/* Scheduler Status - Shows when last reminders were sent */}
        <ReminderSchedulerStatus />

        {/* Manual Reminder Triggers - Send reminders on demand */}
        <ReviewReminderPanel />

        {/* User Discord ID Management - Set up Discord notifications */}
        <UserNotificationSettings />
      </div>

      {/* Quick Help */}
      <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Help
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">How Reminders Work</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Reminders run automatically when anyone opens the app</li>
              <li>• Checks happen every 30 minutes</li>
              <li>• Only sent during specific time windows</li>
              <li>• Maximum 1 reminder per user per day per type</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Reminder Schedule</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Sunday 8pm:</strong> Pre-reminder (due tomorrow)</li>
              <li>• <strong>Monday 9am:</strong> Morning reminder</li>
              <li>• <strong>Monday 6pm:</strong> Evening reminder (urgent)</li>
              <li>• <strong>Daily 10am:</strong> Overdue escalation</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Discord Setup</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Users need to add their Discord User ID</li>
              <li>• Enable Developer Mode in Discord settings</li>
              <li>• Right-click profile picture → Copy ID</li>
              <li>• Paste in User Notification Settings below</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Testing</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Use "Run Manual Check" to test scheduler</li>
              <li>• Use manual trigger buttons to send test reminders</li>
              <li>• Check browser console for detailed logs</li>
              <li>• View Firestore review_reminders collection</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-300">
          <h4 className="font-medium text-gray-900 mb-2">Documentation</h4>
          <p className="text-sm text-gray-700">
            For full setup instructions, troubleshooting, and external cron configuration, 
            see <code className="bg-gray-200 px-2 py-1 rounded">REMINDER_SETUP_NO_CLOUD_FUNCTIONS.md</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationManagementPage;
