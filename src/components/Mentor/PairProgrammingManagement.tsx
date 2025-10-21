import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EnhancedPairProgrammingService } from '../../services/dataServices';
import { UserService } from '../../services/firestore';
import { PairProgrammingSession, User, MentorAvailability } from '../../types';
import { 
  Code, 
  Clock, 
  CheckCircle, 
  Users, 
  Calendar,
  Play,
  XCircle,
  Settings
} from 'lucide-react';

interface RequestWithStudent extends PairProgrammingSession {
  student: User;
}

const PairProgrammingManagement: React.FC = () => {
  const { userData } = useAuth();
  const [requests, setRequests] = useState<RequestWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'assigned' | 'scheduled' | 'completed'>('all');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<RequestWithStudent | null>(null);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<'sessions' | 'availability'>('sessions');
  const [availability, setAvailability] = useState<MentorAvailability[]>([]);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const loadPairProgrammingRequests = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('Loading sessions for user:', userData);
      
      // Get all sessions for this mentor (assigned to them)
      const assignedSessions = await EnhancedPairProgrammingService.getSessionsByUser(userData!.id, 'mentor');
      console.log('Assigned sessions:', assignedSessions.length);
      
      // Also get pending sessions that mentors can claim
      const pendingSessions = await EnhancedPairProgrammingService.getPendingSessions();
      console.log('All pending/assigned sessions:', pendingSessions.length);
      
      // Filter to only truly pending sessions (no mentor assigned)
      const trulyPendingSessions = pendingSessions.filter(session => !session.mentor_id);
      console.log('Truly pending sessions (no mentor):', trulyPendingSessions.length);
      
      // Combine and deduplicate (in case some assigned sessions are also in pending)
      const allSessions = [...assignedSessions, ...trulyPendingSessions];
      const uniqueSessions = allSessions.filter((session, index, self) => 
        index === self.findIndex(s => s.id === session.id)
      );
      
      console.log('Total unique sessions to display:', uniqueSessions.length);
      
      // Get student details for each request
      const requestsWithStudents = await Promise.all(
        uniqueSessions.map(async (request) => {
          const student = await UserService.getUserById(request.student_id);
          return {
            ...request,
            student: student!
          } as RequestWithStudent;
        })
      );

      setRequests(requestsWithStudents);
    } catch (error) {
      console.error('Error loading pair programming requests:', error);
      // Show error to user
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  const loadMentorAvailability = useCallback(async () => {
    try {
      const savedAvailability = await UserService.getMentorAvailability(userData!.id);
      
      if (savedAvailability.length > 0) {
        setAvailability(savedAvailability);
      } else {
        // Initialize with default slots if none saved
        const defaultSlots: MentorAvailability[] = [];
        const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
        const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

        daysOfWeek.forEach(day => {
          timeSlots.forEach(time => {
            defaultSlots.push({
              id: `${userData!.id}-${day}-${time}`,
              mentor_id: userData!.id,
              campus: userData!.campus || 'Dharamshala',
              day_of_week: day,
              start_time: time,
              end_time: time, // For now, assume 1-hour slots
              is_available: true, // Default to available
              max_sessions_per_slot: 1,
              created_at: new Date(),
              updated_at: new Date()
            });
          });
        });

        setAvailability(defaultSlots);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      // Fall back to default slots
      const defaultSlots: MentorAvailability[] = [];
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
      const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

      daysOfWeek.forEach(day => {
        timeSlots.forEach(time => {
          defaultSlots.push({
            id: `${userData!.id}-${day}-${time}`,
            mentor_id: userData!.id,
            campus: userData!.campus || 'Dharamshala',
            day_of_week: day,
            start_time: time,
            end_time: time,
            is_available: true,
            max_sessions_per_slot: 1,
            created_at: new Date(),
            updated_at: new Date()
          });
        });
      });

      setAvailability(defaultSlots);
    }
  }, [userData]);

  const saveMentorAvailability = async () => {
    try {
      setSavingAvailability(true);
      await UserService.saveBulkMentorAvailability(availability);
      alert('Availability settings saved successfully!');
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Error saving availability settings');
    } finally {
      setSavingAvailability(false);
    }
  };

  const toggleAvailability = (day: string, time: string) => {
    setAvailability(prev => prev.map(slot => {
      if (slot.day_of_week === day && slot.start_time === time) {
        return { ...slot, is_available: !slot.is_available };
      }
      return slot;
    }));
  };

  // Check if user is a mentor
  const isMentor = userData?.isMentor || userData?.role === 'mentor' || userData?.role === 'super_mentor' || userData?.isSuperMentor;

  useEffect(() => {
    if (userData?.id && isMentor) {
      loadPairProgrammingRequests();
    } else {
      console.log('User is not a mentor or not loaded:', { userData, isMentor });
      setLoading(false);
    }
  }, [userData, isMentor, loadPairProgrammingRequests]);

  useEffect(() => {
    if (activeTab === 'availability' && userData?.id) {
      loadMentorAvailability();
    }
  }, [activeTab, userData, loadMentorAvailability]);

  const handleAssignSession = async (requestId: string) => {
    try {
      await EnhancedPairProgrammingService.assignMentorToSession(requestId, userData!.id);
      await loadPairProgrammingRequests(); // Refresh data
    } catch (error) {
      console.error('Error assigning session:', error);
    }
  };

  const handleCompleteSession = async (sessionId: string, feedbackText: string) => {
    try {
      await EnhancedPairProgrammingService.updateSession(sessionId, {
        status: 'completed',
        completed_at: new Date(),
        notes: feedbackText
      });
      await loadPairProgrammingRequests(); // Refresh data
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  const openFeedbackModal = (session: RequestWithStudent) => {
    setSelectedSession(session);
    setFeedback('');
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setSelectedSession(null);
    setFeedback('');
  };

  const submitFeedback = async () => {
    if (selectedSession && feedback.trim()) {
      await handleCompleteSession(selectedSession.id, feedback);
      closeFeedbackModal();
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await EnhancedPairProgrammingService.updateSession(requestId, {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancel_reason: 'Cancelled by mentor'
      });
      await loadPairProgrammingRequests(); // Refresh data
    } catch (error) {
      console.error('Error cancelling session:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'assigned': return 'text-blue-600 bg-blue-100';
      case 'scheduled': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'assigned': return <Play className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (activeFilter === 'all') return true;
    return request.status === activeFilter;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    assigned: requests.filter(r => r.status === 'assigned').length,
    scheduled: requests.filter(r => r.status === 'scheduled').length,
    completed: requests.filter(r => r.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isMentor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-xl text-gray-600 mb-4">You need mentor privileges to access this page.</p>
          <p className="text-gray-500">Please contact an administrator if you believe this is an error.</p>
          <div className="mt-4 text-sm text-gray-400">
            User role: {userData?.role || 'none'} | isMentor: {userData?.isMentor ? 'true' : 'false'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Pair Programming Management</h1>
            <p className="mt-2 text-gray-600">Manage student pair programming requests</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Code className="h-5 w-5 inline mr-2" />
              Session Management
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'availability'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="h-5 w-5 inline mr-2" />
              Availability Settings
            </button>
          </nav>
        </div>
                {/* Tab Content */}
        {activeTab === 'sessions' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Code className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Play className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Assigned</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.assigned}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Scheduled</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.scheduled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex space-x-4">
              {(['all', 'pending', 'assigned', 'scheduled', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeFilter === filter
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  {filter !== 'all' && (
                    <span className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded-full">
                      {stats[filter]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {request.student.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {request.topic}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{request.status}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <Users className="h-4 w-4 mr-1" />
                        <span className="mr-4">{request.student.name}</span>
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {request.description && (
                        <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                      )}

                      {request.assigned_at && (
                        <p className="text-xs text-gray-500">
                          Assigned: {new Date(request.assigned_at).toLocaleString()}
                        </p>
                      )}

                      {request.scheduled_date && request.scheduled_time && (
                        <p className="text-xs text-purple-600">
                          Scheduled: {new Date(request.scheduled_date).toLocaleDateString()} at {request.scheduled_time}
                        </p>
                      )}

                      {request.completed_at && (
                        <p className="text-xs text-gray-500">
                          Completed: {new Date(request.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex-shrink-0 ml-4">
                    {request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAssignSession(request.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors"
                        >
                          Assign to Me
                        </button>
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    
                    {request.status === 'assigned' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openFeedbackModal(request)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors"
                        >
                          Complete Session
                        </button>
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {request.status === 'scheduled' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openFeedbackModal(request)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors"
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <Code className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No {activeFilter === 'all' ? '' : activeFilter} requests
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeFilter === 'all' 
                    ? "No pair programming requests have been made yet."
                    : `No ${activeFilter} pair programming requests at the moment.`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
        </>
        ) : (
          /* Availability Settings Tab */
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Availability Settings</h2>
                <p className="text-gray-600 mt-1">
                  Set your weekly availability for pair programming sessions. Click on time slots to toggle availability.
                </p>
              </div>
              <button
                onClick={saveMentorAvailability}
                disabled={savingAvailability}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {savingAvailability ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            </div>

            {/* Availability Grid */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day
                    </th>
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                      <th key={time} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {time}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                    <tr key={day}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                        {day}
                      </td>
                      {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map(time => {
                        const slot = availability.find(s => s.day_of_week === day && s.start_time === time);
                        const isAvailable = slot?.is_available ?? true;
                        return (
                          <td key={time} className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => toggleAvailability(day, time)}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                isAvailable
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {isAvailable ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Available
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Unavailable
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    How it works
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Green slots indicate when you're available for pair programming sessions</li>
                      <li>Red slots indicate when you're unavailable</li>
                      <li>Students can only schedule sessions during your available time slots</li>
                      <li>Changes take effect immediately after saving</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && selectedSession && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Complete Session: {selectedSession.topic}
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Feedback/Notes
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Enter your feedback and notes about the session..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={closeFeedbackModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitFeedback}
                    disabled={!feedback.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Complete Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PairProgrammingManagement;