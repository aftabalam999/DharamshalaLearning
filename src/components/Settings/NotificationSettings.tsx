import React, { useState, useEffect } from 'react';
import { Bell, Save, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const NotificationSettings: React.FC = () => {
  const { userData } = useAuth();
  const [discordUserId, setDiscordUserId] = useState('');
  const [preferences, setPreferences] = useState({
    in_app: true,
    discord: false,
    email: false
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userData) {
      setDiscordUserId(userData.discord_user_id || '');
      const prefs = userData.notification_preferences || {};
      setPreferences({
        in_app: prefs.in_app ?? true,
        discord: prefs.discord ?? false,
        email: prefs.email ?? false
      });
    }
  }, [userData]);

  const handleSave = async () => {
    if (!userData) return;

    setSaving(true);
    setSaved(false);

    try {
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, {
        discord_user_id: discordUserId || null,
        notification_preferences: preferences,
        updated_at: new Date()
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Bell className="h-6 w-6 text-purple-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Discord User ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discord User ID
          </label>
          <input
            type="text"
            value={discordUserId}
            onChange={(e) => setDiscordUserId(e.target.value)}
            placeholder="e.g., 123456789012345678"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>How to find your Discord User ID:</strong>
            </p>
            <ol className="text-sm text-blue-700 mt-2 ml-4 space-y-1 list-decimal">
              <li>Open Discord and go to Settings → Advanced</li>
              <li>Enable "Developer Mode"</li>
              <li>Go back and right-click your profile picture</li>
              <li>Select "Copy ID"</li>
              <li>Paste the ID here</li>
            </ol>
          </div>
        </div>

        {/* Notification Channels */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Notification Channels
          </label>
          <div className="space-y-3">
            {/* In-App */}
            <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.in_app}
                onChange={(e) => setPreferences({ ...preferences, in_app: e.target.checked })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">In-App Notifications</span>
                <p className="text-xs text-gray-600">Receive notifications in the dashboard</p>
              </div>
            </label>

            {/* Discord */}
            <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.discord}
                onChange={(e) => setPreferences({ ...preferences, discord: e.target.checked })}
                disabled={!discordUserId}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">Discord Notifications</span>
                <p className="text-xs text-gray-600">
                  {discordUserId 
                    ? 'Get tagged in Discord server' 
                    : 'Add Discord User ID to enable'}
                </p>
              </div>
            </label>

            {/* Email */}
            <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer opacity-50">
              <input
                type="checkbox"
                checked={preferences.email}
                onChange={(e) => setPreferences({ ...preferences, email: e.target.checked })}
                disabled={true}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">Email Notifications</span>
                <p className="text-xs text-gray-600">Coming soon</p>
              </div>
            </label>
          </div>
        </div>

        {/* Reminder Schedule Info */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                Reminder Schedule
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• <strong>Sunday 8:00 PM:</strong> Pre-reminder (reviews due tomorrow)</li>
                <li>• <strong>Monday 9:00 AM:</strong> Morning reminder (reviews due today)</li>
                <li>• <strong>Monday 6:00 PM:</strong> Final reminder (3 hours left)</li>
                <li>• <strong>Tuesday+:</strong> Daily overdue reminders</li>
              </ul>
              <p className="text-xs text-yellow-700 mt-2">
                Maximum: 1 reminder per day per type to avoid spam
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {saved && (
              <span className="flex items-center text-green-600">
                <Check className="h-4 w-4 mr-1" />
                Settings saved successfully!
              </span>
            )}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
