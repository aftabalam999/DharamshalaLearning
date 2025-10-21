import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, CheckCircle, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { googleCalendarService } from '../../services/googleCalendarService';
import { auth } from '../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const CalendarAuth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'not_connected'>('checking');

  const returnTo = location.state?.returnTo || '/dashboard';
  const action = location.state?.action || 'connect';

  const handleConnect = useCallback(async () => {
    if (!user) {
      setError('Please sign in first');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const success = await googleCalendarService.authenticateWithGoogle();
      if (success) {
        setConnectionStatus('connected');
        // Redirect back after successful connection
        setTimeout(() => {
          navigate(returnTo, { replace: true });
        }, 2000);
      } else {
        // Authentication may have initiated a redirect
        // Check if we're in a redirect flow
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthParams = urlParams.has('code') || urlParams.has('state') || urlParams.has('access_token');

        if (hasAuthParams) {
          // We're coming back from a redirect, check auth status
          setConnectionStatus('checking');
          setTimeout(async () => {
            const isAuthenticated = googleCalendarService.isCalendarAuthenticated();
            if (isAuthenticated) {
              setConnectionStatus('connected');
              navigate(returnTo, { replace: true });
            } else {
              setConnectionStatus('not_connected');
              setError('Authentication failed. Please try again.');
              setIsConnecting(false);
            }
          }, 1000);
        } else {
          // No redirect params, authentication failed
          setConnectionStatus('not_connected');
          setError('Failed to connect to Google Calendar. Please try again.');
          setIsConnecting(false);
        }
      }
    } catch (error) {
      console.error('Calendar connection failed:', error);
      setConnectionStatus('not_connected');
      setError('Failed to connect to Google Calendar. Please check your permissions and try again.');
      setIsConnecting(false);
    }
  }, [user, navigate, returnTo]);

  useEffect(() => {
    const checkRedirectCallback = async () => {
      // Check if we're coming back from a Google OAuth redirect
      const urlParams = new URLSearchParams(window.location.search);
      const hasAuthParams = urlParams.has('code') || urlParams.has('state') || urlParams.has('access_token');

      if (hasAuthParams) {
        // We're coming back from Google OAuth, check authentication status
        setConnectionStatus('checking');
        try {
          // Give GAPI time to initialize and process the auth callback
          setTimeout(async () => {
            const isAuthenticated = googleCalendarService.isCalendarAuthenticated();
            if (isAuthenticated) {
              setConnectionStatus('connected');
              // Clean up URL parameters
              window.history.replaceState({}, document.title, window.location.pathname);
              // Redirect back after successful connection
              setTimeout(() => {
                navigate(returnTo, { replace: true });
              }, 2000);
            } else {
              setConnectionStatus('not_connected');
              setError('Authentication failed. Please try again.');
            }
          }, 2000);
        } catch (error) {
          console.error('Error checking auth status:', error);
          setConnectionStatus('not_connected');
          setError('Authentication failed. Please try again.');
        }
        return;
      }

      // Normal flow - check Firebase auth status
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser && action === 'connect') {
          // Automatically start connection process
          handleConnect();
        }
      });

      return () => unsubscribe();
    };

    checkRedirectCallback();
  }, [action, handleConnect, navigate, returnTo]);

  const handleBack = () => {
    navigate(returnTo, { replace: true });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to connect your Google Calendar.</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <Calendar className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Google Calendar Integration</h1>
          <p className="text-gray-600 mt-2">
            Connect your Google Calendar to schedule and manage pair programming sessions
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {connectionStatus === 'checking' && (
            <div className="text-center py-8">
              <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Checking connection status...</p>
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Successfully Connected!</h2>
              <p className="text-gray-600 mb-6">Your Google Calendar is now connected.</p>
              <p className="text-sm text-gray-500">Redirecting you back...</p>
            </div>
          )}

          {connectionStatus === 'not_connected' && (
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar Not Connected</h2>
              <p className="text-gray-600 mb-6">
                Click the button below to connect your Google Calendar and enable scheduling features.
              </p>

              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <Loader className="h-5 w-5 mr-3 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Calendar className="h-5 w-5 mr-3" />
                    Connect Google Calendar
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleBack}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel and Go Back
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p className="mb-2">
            <strong>What we'll access:</strong>
          </p>
          <ul className="space-y-1">
            <li>• Read your calendar events to check availability</li>
            <li>• Create events for scheduled sessions</li>
            <li>• Update existing events when sessions change</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CalendarAuth;