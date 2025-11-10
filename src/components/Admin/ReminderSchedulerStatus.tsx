import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { ClientReminderScheduler } from '../../services/clientReminderScheduler';

const ReminderSchedulerStatus: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const scheduler = ClientReminderScheduler.getInstance();

  const loadStatus = React.useCallback(() => {
    const currentStatus = scheduler.getStatus();
    setStatus(currentStatus);
  }, [scheduler]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleManualCheck = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await scheduler.manualCheck();
      setMessage({ type: 'success', text: 'Manual check completed! Check console for details.' });
      loadStatus();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to run manual check. Check console for details.' });
      console.error('Manual check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTimers = () => {
    if (window.confirm('Are you sure you want to reset all reminder timers? This will allow reminders to be sent again immediately.')) {
      scheduler.resetTimers();
      setMessage({ type: 'success', text: 'All timers reset! Next check will send reminders if appropriate.' });
      loadStatus();
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (lastSent: string | null) => {
    if (!lastSent) return 'text-gray-400';
    
    const sentDate = new Date(lastSent);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'text-green-600';
    if (daysDiff === 1) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Clock className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Reminder Scheduler Status</h2>
        </div>
        <button
          onClick={loadStatus}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* System Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          ℹ️ Client-Side Scheduler Active
        </h4>
        <p className="text-sm text-blue-700">
          The reminder system runs automatically when the app is open. 
          Reminders are checked every 30 minutes and sent during appropriate time windows:
        </p>
        <ul className="text-sm text-blue-700 mt-2 ml-4 space-y-1">
          <li>• <strong>Monday 9am-11am:</strong> Morning reminder</li>
          <li>• <strong>Monday 6pm-11pm:</strong> Evening reminder</li>
          <li>• <strong>Tuesday-Sunday 10am-12pm:</strong> Overdue escalation</li>
        </ul>
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Last Check Times */}
      {status && (
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg md:col-span-2">
              <div className="text-sm text-gray-600 mb-1">Last System Check</div>
              <div className={`text-lg font-semibold ${getStatusColor(status.lastCheck)}`}>
                {formatDate(status.lastCheck)}
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Morning Reminder (Monday 9am)</div>
              <div className={`text-lg font-semibold ${getStatusColor(status.lastMorningReminder)}`}>
                {formatDate(status.lastMorningReminder)}
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Evening Reminder (Monday 6pm)</div>
              <div className={`text-lg font-semibold ${getStatusColor(status.lastEveningReminder)}`}>
                {formatDate(status.lastEveningReminder)}
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg md:col-span-2">
              <div className="text-sm text-gray-600 mb-1">Overdue Escalation (Daily 10am)</div>
              <div className={`text-lg font-semibold ${getStatusColor(status.lastOverdueReminder)}`}>
                {formatDate(status.lastOverdueReminder)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleManualCheck}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Manual Check Now
            </>
          )}
        </button>

        <button
          onClick={handleResetTimers}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Reset All Timers
        </button>
      </div>

      {/* Warning */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">
          ⚠️ Important Notes
        </h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• This scheduler only works when the app is open in someone's browser</li>
          <li>• For guaranteed delivery, set up external cron jobs (see documentation)</li>
          <li>• Reminders are sent only once per day per type to prevent spam</li>
          <li>• "Reset Timers" is for testing only - use with caution in production</li>
        </ul>
      </div>

      {/* Current Time Info */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <div>Current time: {new Date().toLocaleString()}</div>
        <div>Day: {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]}</div>
      </div>
    </div>
  );
};

export default ReminderSchedulerStatus;
