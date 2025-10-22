import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../hooks/useModal';
import { EnhancedPairProgrammingService, EnhancedLeaveService } from '../../services/dataServices';
import { PairProgrammingSession, UserRole, RolePermissions, CalendarEvent } from '../../types/index';
import { Plus, Calendar, Users, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import PairProgrammingRequestModal from './PairProgrammingRequestModal';
import SessionDetailsModal from './SessionDetailsModal';
import FeedbackModal from './FeedbackModal';
import CalendarView from './CalendarView';
import Leaderboard from './Leaderboard';

const PairProgrammingDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'calendar' | 'leaderboard'>('overview');
  const [sessions, setSessions] = useState<PairProgrammingSession[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('mentee');
  const [permissions, setPermissions] = useState<RolePermissions>({
    can_view_all_sessions: false,
    can_manage_leaves: false,
    can_reassign_sessions: false,
    can_view_analytics: false,
    can_manage_goals: false,
    viewable_users: 'self_only'
  });

  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PairProgrammingSession | null>(null);

  // Modal hooks
  const requestModal = useModal(showRequestModal, () => setShowRequestModal(false));
  const sessionModal = useModal(showSessionModal, () => setShowSessionModal(false));
  const feedbackModal = useModal(showFeedbackModal, () => setShowFeedbackModal(false));

  // Handle calendar event clicks
  const handleCalendarEventClick = (event: CalendarEvent) => {
    if (event.session_id) {
      const session = sessions.find(s => s.id === event.session_id);
      if (session) {
        setSelectedSession(session);
        setShowSessionModal(true);
      }
    }
  };

  // Determine user role and permissions
  useEffect(() => {
    if (!userData) return;

    let role: UserRole = 'mentee';
    if (userData.isSuperMentor) role = 'super_mentor';
    else if (userData.isMentor) role = 'mentor';
    else if (userData.role === 'academic_associate') role = 'academic_associate';
    else if (userData.role === 'admin') role = 'admin';

    setUserRole(role);

    // Set permissions based on role
    const perms: RolePermissions = {
      can_view_all_sessions: ['admin', 'academic_associate'].includes(role),
      can_manage_leaves: ['admin', 'mentor', 'academic_associate'].includes(role),
      can_reassign_sessions: ['admin', 'academic_associate'].includes(role),
      can_view_analytics: ['admin', 'academic_associate'].includes(role),
      can_manage_goals: ['admin', 'academic_associate', 'mentor'].includes(role),
      viewable_users: role === 'admin' ? 'all' : role === 'mentor' ? 'mentees_only' : 'self_only'
    };

    setPermissions(perms);
  }, [userData]);


  // Optimized: Fetch all sessions once, cache in state, and useMemo for derived data
  const loadDashboardData = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    try {
      let fetchedSessions: PairProgrammingSession[] = [];
      if (permissions.viewable_users === 'all') {
        fetchedSessions = await EnhancedPairProgrammingService.getPendingSessions();
      } else if (permissions.viewable_users === 'mentees_only') {
        fetchedSessions = await EnhancedPairProgrammingService.getSessionsByUser(userData.id, 'mentor');
      } else {
        fetchedSessions = await EnhancedPairProgrammingService.getSessionsByUser(userData.id, 'all');
      }
      setSessions(fetchedSessions);
      // Compute stats locally
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sessionsThisWeek = fetchedSessions.filter(s => new Date(s.created_at) >= weekAgo);
      setUserStats({
        total_sessions_all_time: fetchedSessions.length,
        sessions_last_7_days: sessionsThisWeek.length,
        sessions_this_week: sessionsThisWeek.length,
        expected_sessions_this_week: 0,
        pending_sessions: fetchedSessions.filter(s => ['pending', 'assigned'].includes(s.status)).length,
        overdue_sessions: 0,
        mentees_with_overdue_sessions: 0,
        average_sessions_per_mentee: userRole === 'mentor' ? 0 : fetchedSessions.length,
        average_sessions_per_mentor: userRole === 'mentee' ? 0 : fetchedSessions.length
      });
      // Get leave data
      const leaves = await EnhancedLeaveService.getLeavesToday();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [userData, userRole, permissions]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, userRole, permissions]);

  const handleTakeSession = async (session: PairProgrammingSession) => {
    if (!userData) return;
    try {
      await EnhancedPairProgrammingService.assignMentorToSession(session.id, userData.id);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error taking session:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };





  // Memoized derived data (must be before any return)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const upcomingStatuses = useMemo(() => ['pending', 'assigned', 'scheduled', 'in_progress'], []);
  const upcomingSessions = useMemo(() =>
    sessions.filter(session => {
      if (!session.scheduled_date) return false;
      const sessionDate = new Date(session.scheduled_date);
      return sessionDate >= today && upcomingStatuses.includes(session.status);
    }).sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime())
  , [sessions, today, upcomingStatuses]);
  const pastSessions = useMemo(() =>
    sessions.filter(s => ['completed', 'cancelled'].includes(s.status))
      .sort((a, b) => {
        const aDate = a.status === 'completed' ? new Date(a.completed_at || 0) : new Date(a.cancelled_at || 0);
        const bDate = b.status === 'completed' ? new Date(b.completed_at || 0) : new Date(b.cancelled_at || 0);
        return bDate.getTime() - aDate.getTime();
      })
  , [sessions]);
  const todaysSessions = useMemo(() =>
    upcomingSessions.filter(session => {
      if (!session.scheduled_date) return false;
      const sessionDate = new Date(session.scheduled_date);
      return sessionDate >= today && sessionDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    })
  , [upcomingSessions, today]);
  const pendingRequests = useMemo(() =>
    sessions.filter(s => s.status === 'pending' && !s.mentor_id)
  , [sessions]);

  // If loading, show spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Memoized derived data

  // Mock leaderboard and calendar events (unchanged)


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pair Programming</h1>
              <p className="text-gray-600 mt-1">Collaborate, learn, and grow together</p>
            </div>
            <button
              onClick={() => setShowRequestModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Session
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'sessions', label: 'My Sessions', icon: Users },
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'leaderboard', label: 'Leaderboard', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-1 py-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-semibold text-gray-900">{userStats?.total_sessions_all_time ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-2xl font-semibold text-gray-900">{userStats?.sessions_this_week ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-semibold text-gray-900">{userStats?.pending_sessions ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today</p>
                    <p className="text-2xl font-semibold text-gray-900">{todaysSessions.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Sessions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Today's Sessions</h3>
              </div>
              <div className="p-6">
                {todaysSessions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No sessions scheduled for today</p>
                ) : (
                  <div className="space-y-4">
                    {todaysSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(session.status)}
                          <div>
                            <p className="font-medium text-gray-900">{session.topic}</p>
                            <p className="text-sm text-gray-600">
                              {session.scheduled_time} • {userRole === 'mentee' ? 'Mentor' : 'Mentee'}: {session.mentor_id || session.student_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowSessionModal(true);
                            }}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Requests (for mentors/admins) */}
            {permissions.can_reassign_sessions && pendingRequests.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Open Requests</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {pendingRequests.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="font-medium text-gray-900">{session.topic}</p>
                            <p className="text-sm text-gray-600">{session.description}</p>
                            <p className="text-xs text-gray-500">Requested {new Date(session.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleTakeSession(session)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          Take Session
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {/* Upcoming Sessions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Upcoming Sessions</h3>
                <p className="text-sm text-gray-500 mt-1">Sessions scheduled for future dates</p>
              </div>
              <div className="p-6">
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No upcoming sessions scheduled</p>
                    <button
                      onClick={() => setShowRequestModal(true)}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Request a Session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          {getStatusIcon(session.status)}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{session.topic}</p>
                            {session.description && (
                              <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              {session.scheduled_date && (
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {new Date(session.scheduled_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              )}
                              {session.scheduled_time && (
                                <span className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {session.scheduled_time}
                                </span>
                              )}
                              <span>
                                {userRole === 'mentee' ? 'Mentor' : 'Mentee'}: {session.mentor_id || session.student_id}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowSessionModal(true);
                            }}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium px-3 py-1 hover:bg-primary-50 rounded"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Past Sessions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Past Sessions</h3>
                <p className="text-sm text-gray-500 mt-1">Completed and cancelled sessions</p>
              </div>
              <div className="p-6">
                {pastSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No past sessions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          {getStatusIcon(session.status)}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{session.topic}</p>
                            {session.description && (
                              <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              {session.completed_at && (
                                <span className="flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Completed {new Date(session.completed_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              )}
                              {session.cancelled_at && (
                                <span className="flex items-center">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancelled {new Date(session.cancelled_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              )}
                              <span>
                                {userRole === 'mentee' ? 'Mentor' : 'Mentee'}: {session.mentor_id || session.student_id}
                              </span>
                            </div>
                            {session.notes && (
                              <p className="text-sm text-gray-600 mt-2 italic">"{session.notes}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowSessionModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-1 hover:bg-gray-50 rounded"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <CalendarView onEventClick={handleCalendarEventClick} />
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard />
        )}
      </div>

      {/* Modals */}
      {showRequestModal && (
        <div
          ref={requestModal.modalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={requestModal.handleOutsideClick}
        >
          <div
            ref={requestModal.contentRef}
            className="bg-white rounded-lg max-w-md w-full"
            onClick={requestModal.handleContentClick}
          >
            <PairProgrammingRequestModal onClose={() => setShowRequestModal(false)} onSuccess={loadDashboardData} />
          </div>
        </div>
      )}

      {showSessionModal && selectedSession && (
        <div
          ref={sessionModal.modalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={sessionModal.handleOutsideClick}
        >
          <div
            ref={sessionModal.contentRef}
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={sessionModal.handleContentClick}
          >
            <SessionDetailsModal
              session={selectedSession}
              onClose={() => setShowSessionModal(false)}
              onFeedback={() => {
                setShowSessionModal(false);
                setShowFeedbackModal(true);
              }}
            />
          </div>
        </div>
      )}

      {showFeedbackModal && selectedSession && (
        <div
          ref={feedbackModal.modalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={feedbackModal.handleOutsideClick}
        >
          <div
            ref={feedbackModal.contentRef}
            className="bg-white rounded-lg max-w-2xl w-full"
            onClick={feedbackModal.handleContentClick}
          >
            <FeedbackModal
              session={selectedSession}
              onClose={() => setShowFeedbackModal(false)}
              onSuccess={loadDashboardData}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PairProgrammingDashboard;