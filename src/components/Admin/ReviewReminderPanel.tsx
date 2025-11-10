import React, { useState } from 'react';
import { Bell, Send, CheckCircle, XCircle, RefreshCw, Users } from 'lucide-react';
import { ReviewReminderService, ReminderType } from '../../services/reviewReminderService';

const ReviewReminderPanel: React.FC = () => {
  const [loading, setLoading] = useState<ReminderType | null>(null);
  const [results, setResults] = useState<{ type: string; sent: number; failed: number } | null>(null);

  const handleSendReminder = async (type: ReminderType) => {
    setLoading(type);
    setResults(null);

    try {
      let result;
      switch (type) {
        case 'pre_reminder':
          result = await ReviewReminderService.sendSundayReminder();
          break;
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

      setResults({
        type: type.replace(/_/g, ' ').toUpperCase(),
        ...result
      });
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('Failed to send reminders. Check console for details.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Bell className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-900">Review Reminders</h2>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 text-sm">
          Manually trigger review reminder notifications. The system automatically sends these at scheduled times:
        </p>
        <ul className="mt-2 text-sm text-gray-600 space-y-1">
          <li>• <strong>Monday 9:00 AM:</strong> Morning reminder (due today)</li>
          <li>• <strong>Monday 6:00 PM:</strong> Evening reminder (3 hours left)</li>
          <li>• <strong>Tuesday+:</strong> Overdue escalation (daily)</li>
        </ul>
      </div>

      {/* Reminder Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Morning Reminder */}
        <button
          onClick={() => handleSendReminder('morning_reminder')}
          disabled={loading !== null}
          className="flex items-center justify-between p-4 border-2 border-orange-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg mr-3">
              <Bell className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Morning Reminder</h3>
              <p className="text-sm text-gray-600">Monday 9:00 AM</p>
            </div>
          </div>
          {loading === 'morning_reminder' ? (
            <RefreshCw className="h-5 w-5 text-orange-600 animate-spin" />
          ) : (
            <Send className="h-5 w-5 text-orange-600" />
          )}
        </button>

        {/* Evening Reminder */}
        <button
          onClick={() => handleSendReminder('evening_reminder')}
          disabled={loading !== null}
          className="flex items-center justify-between p-4 border-2 border-red-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg mr-3">
              <Bell className="h-5 w-5 text-red-600 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Evening Reminder</h3>
              <p className="text-sm text-gray-600">Monday 6:00 PM</p>
            </div>
          </div>
          {loading === 'evening_reminder' ? (
            <RefreshCw className="h-5 w-5 text-red-600 animate-spin" />
          ) : (
            <Send className="h-5 w-5 text-red-600" />
          )}
        </button>

        {/* Overdue Escalation */}
        <button
          onClick={() => handleSendReminder('overdue_escalation')}
          disabled={loading !== null}
          className="flex items-center justify-between p-4 border-2 border-red-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center">
            <div className="p-2 bg-red-200 rounded-lg mr-3">
              <Users className="h-5 w-5 text-red-700" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Overdue Escalation</h3>
              <p className="text-sm text-gray-600">Tuesday+</p>
            </div>
          </div>
          {loading === 'overdue_escalation' ? (
            <RefreshCw className="h-5 w-5 text-red-700 animate-spin" />
          ) : (
            <Send className="h-5 w-5 text-red-700" />
          )}
        </button>
      </div>

      {/* Results Display */}
      {results && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">
            {results.type} Results
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-green-600">{results.sent}</p>
              </div>
            </div>
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{results.failed}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discord Setup Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
          <Bell className="h-4 w-4 mr-2" />
          Discord Integration Setup
        </h3>
        <ol className="text-sm text-blue-800 space-y-2 ml-4 list-decimal">
          <li>
            <strong>Create Discord Webhook:</strong>
            <ul className="ml-4 mt-1 space-y-1 list-disc">
              <li>Go to your Discord server settings → Integrations → Webhooks</li>
              <li>Click "New Webhook" and copy the URL</li>
            </ul>
          </li>
          <li>
            <strong>Add to Environment:</strong>
            <ul className="ml-4 mt-1 space-y-1 list-disc">
              <li>Add <code className="bg-blue-100 px-1 rounded">REACT_APP_DISCORD_WEBHOOK_URL</code> to your <code className="bg-blue-100 px-1 rounded">.env</code> file</li>
            </ul>
          </li>
          <li>
            <strong>Get Discord User IDs:</strong>
            <ul className="ml-4 mt-1 space-y-1 list-disc">
              <li>Enable Developer Mode in Discord (Settings → Advanced)</li>
              <li>Right-click user → Copy ID</li>
              <li>Add to user profiles in the dashboard</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default ReviewReminderPanel;
