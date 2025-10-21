import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { googleCalendarService } from '../../services/googleCalendarService';
import { auth } from '../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface CalendarConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

export const CalendarConnection: React.FC<CalendarConnectionProps> = ({
  onConnectionChange
}) => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user has Google Calendar connected
        // Add a small delay to allow redirect result to be processed
        setTimeout(() => {
          checkConnectionStatus();
        }, 1000);
      } else {
        setIsConnected(false);
      }
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkConnectionStatus = async () => {
    try {
      // Check if calendar service is authenticated by trying to get a test event
      // This is more reliable than just checking the internal state
      await googleCalendarService.getCalendarEvents(
        new Date(),
        new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
      );
      // If we can get events without error, we're connected
      setIsConnected(true);
      onConnectionChange?.(true);
    } catch (error) {
      console.log('Calendar not connected or error checking status:', error);
      setIsConnected(false);
      onConnectionChange?.(false);
    }
  };

  const handleConnect = async () => {
    if (!user) {
      setError('Please sign in first');
      return;
    }

    // Navigate to dedicated calendar auth page instead of using popup/redirect
    navigate('/calendar-auth', {
      state: {
        returnTo: window.location.pathname,
        action: 'connect'
      }
    });
  };

  const handleDisconnect = () => {
    // Clear stored tokens
    if (user) {
      localStorage.removeItem(`google_oauth_${user.uid}`);
    }
    setIsConnected(false);
    onConnectionChange?.(false);
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
          <p className="text-sm text-yellow-700">
            Please sign in to connect your Google Calendar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Google Calendar Integration
            </h3>
            <p className="text-sm text-gray-600">
              Connect your Google Calendar to schedule pair programming sessions
            </p>
          </div>
        </div>

        <div className="flex items-center">
          {isConnected ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">Not Connected</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-4">
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Disconnect Calendar
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Connect Google Calendar
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          By connecting your Google Calendar, you allow the app to:
        </p>
        <ul className="mt-1 list-disc list-inside space-y-1">
          <li>Read your calendar events to check availability</li>
          <li>Create events for scheduled pair programming sessions</li>
          <li>Update existing events when sessions are modified</li>
        </ul>
      </div>
    </div>
  );
};