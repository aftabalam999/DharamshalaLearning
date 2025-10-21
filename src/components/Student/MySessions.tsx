import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PairProgrammingScheduler } from '../../services/pairProgrammingScheduler';
import { UserService } from '../../services/firestore';
import { PairProgrammingSession, User } from '../../types';
import {
  Calendar,
  Clock,
  User as UserIcon,
  MessageSquare,
  BookOpen,
  ChevronRight,
  History,
  X
} from 'lucide-react';

interface SessionWithDetails extends PairProgrammingSession {
  otherParticipant: User;
  lastComment?: string;
  currentPhase?: string;
}

const MySessions: React.FC = () => {
  const { userData } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<SessionWithDetails[]>([]);
  const [pastSessions, setPastSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  useEffect(() => {
    if (userData?.id) {
      loadSessions();
    }
  }, [userData?.id]); // Only depend on userData.id to avoid infinite loops

  const loadSessions = useCallback(async () => {
    const enrichSessionsWithDetails = async (sessions: PairProgrammingSession[]): Promise<SessionWithDetails[]> => {
      const userRole = userData!.role;
      const isStudent = !userRole || (userRole as any) === 'student'; // If no role or explicitly student

      return Promise.all(
        sessions.map(async (session) => {
          const otherParticipantId = isStudent ? session.mentor_id : session.student_id;
          const otherParticipant = otherParticipantId ? await UserService.getUserById(otherParticipantId) : null;

          return {
            ...session,
            otherParticipant: otherParticipant!,
            lastComment: 'No comments yet', // TODO: Add feedback/notes system
            currentPhase: otherParticipant?.current_phase_name || 'Not specified'
          };
        })
      );
    };

    try {
      setLoading(true);

      // Get upcoming sessions
      const userRole = (userData!.role === 'super_mentor' ? 'mentor' : userData!.role) || 'student';
      const upcoming = await PairProgrammingScheduler.getUpcomingSessions(
        userData!.id,
        userRole as 'student' | 'mentor' | 'admin' | 'academic_associate'
      );

      // Get past sessions (last 20 for history)
      const isStudent = !userData!.role || (userData!.role as any) === 'student';
      const roleForHistory: 'mentee' | 'mentor' = isStudent ? 'mentee' : 'mentor';
      const allSessions = await PairProgrammingScheduler.getSessionsByUser(
        userData!.id,
        roleForHistory
      );

      const past = allSessions
        .filter((session: PairProgrammingSession) => session.status === 'completed')
        .sort((a: PairProgrammingSession, b: PairProgrammingSession) =>
          new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
        )
        .slice(0, 20);

      // Enrich sessions with participant details
      const [upcomingWithDetails, pastWithDetails] = await Promise.all([
        enrichSessionsWithDetails(upcoming),
        enrichSessionsWithDetails(past)
      ]);

      setUpcomingSessions(upcomingWithDetails);
      setPastSessions(pastWithDetails);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  const handleCancelSession = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to cancel this session?')) {
      try {
        // Import the service dynamically to avoid circular imports
        const { EnhancedPairProgrammingService } = await import('../../services/dataServices');
        await EnhancedPairProgrammingService.updateSession(sessionId, {
          status: 'cancelled',
          cancelled_at: new Date(),
          cancel_reason: 'Cancelled by student'
        });
        await loadSessions(); // Refresh data
      } catch (error) {
        console.error('Error cancelling session:', error);
        alert('Failed to cancel session. Please try again.');
      }
    }
  };

  useEffect(() => {
    if (userData?.id) {
      loadSessions();
    }
  }, [userData?.id, loadSessions]);

  const enrichSessionsWithDetails = async (sessions: PairProgrammingSession[]): Promise<SessionWithDetails[]> => {
    const userRole = userData!.role;
    const isStudent = !userRole || (userRole as any) === 'student'; // If no role or explicitly student

    return Promise.all(
      sessions.map(async (session) => {
        const otherParticipantId = isStudent ? session.mentor_id : session.student_id;
        const otherParticipant = otherParticipantId ? await UserService.getUserById(otherParticipantId) : null;

        return {
          ...session,
          otherParticipant: otherParticipant!,
          lastComment: session.notes || 'No comments yet',
          currentPhase: otherParticipant?.current_phase_name || 'Not specified'
        };
      })
    );
  };

  const formatDateTime = (date: Date | undefined, time: string | undefined) => {
    if (!date) return 'Not scheduled';
    const dateStr = date.toLocaleDateString();
    const timeStr = time || 'TBD';
    return `${dateStr} at ${timeStr}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'in_progress': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Sessions</h1>
        <p className="text-gray-600">Manage your pair programming sessions</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Upcoming ({upcomingSessions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="h-4 w-4 inline mr-2" />
          History ({pastSessions.length})
        </button>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {(activeTab === 'upcoming' ? upcomingSessions : pastSessions).map((session) => (
          <div key={session.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {/* Participant Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {session.otherParticipant?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                </div>

                {/* Session Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {session.topic}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Participant Info */}
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <UserIcon className="h-4 w-4 mr-1" />
                    <span className="mr-4">{session.otherParticipant?.name || 'Unknown'}</span>
                    <BookOpen className="h-4 w-4 mr-1" />
                    <span className="mr-4">{session.currentPhase}</span>
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{session.duration_minutes} min</span>
                  </div>

                  {/* Schedule Info */}
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{formatDateTime(session.scheduled_date, session.scheduled_time)}</span>
                  </div>

                  {/* Description */}
                  {session.description && (
                    <p className="text-gray-700 text-sm mb-3">{session.description}</p>
                  )}

                  {/* Last Comment */}
                  {session.lastComment && (
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="italic">"{session.lastComment}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 ml-4">
                <div className="flex space-x-2">
                  <button className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium">
                    View Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                  {session.status === 'scheduled' && (
                    <button
                      onClick={() => handleCancelSession(session.id)}
                      className="flex items-center text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {(activeTab === 'upcoming' ? upcomingSessions : pastSessions).length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No {activeTab} sessions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'upcoming'
                ? "You don't have any upcoming pair programming sessions."
                : "You haven't completed any sessions yet."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySessions;