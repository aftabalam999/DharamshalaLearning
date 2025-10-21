import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PairProgrammingSession, MentorFeedback, MenteeFeedback } from '../../types';
import { X, User, MessageSquare, Star } from 'lucide-react';

interface SessionDetailsModalProps {
  session: PairProgrammingSession;
  onClose: () => void;
  onFeedback?: () => void;
}

const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  session,
  onClose,
  onFeedback
}) => {
  const { userData } = useAuth();
  const [mentorFeedback, setMentorFeedback] = useState<MentorFeedback | null>(null);
  const [menteeFeedback, setMenteeFeedback] = useState<MenteeFeedback | null>(null);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        // Load feedback data if available
        // This would be implemented to fetch feedback from the database
        setMentorFeedback(null);
        setMenteeFeedback(null);
      } catch (error) {
        console.error('Error loading feedback:', error);
      }
    };

    loadFeedback();
  }, [session.id]);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canProvideFeedback = () => {
    if (!userData) return false;

    const isMentor = session.mentor_id === userData.id;
    const isMentee = session.student_id === userData.id;
    const sessionCompleted = session.status === 'completed';

    return sessionCompleted && (isMentor || isMentee);
  };

  const hasProvidedFeedback = () => {
    if (!userData) return false;

    const isMentor = session.mentor_id === userData.id;
    const isMentee = session.student_id === userData.id;

    if (isMentor && mentorFeedback) return true;
    if (isMentee && menteeFeedback) return true;

    return false;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Session Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Session Header */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{session.topic}</h3>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                {session.status}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(session.priority)}`}>
                {session.priority}
              </span>
            </div>
          </div>

          {session.description && (
            <p className="text-gray-600 mb-4">{session.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Duration:</span>
              <span className="ml-2 text-gray-600">{session.duration_minutes} minutes</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <span className="ml-2 text-gray-600">{new Date(session.created_at).toLocaleDateString()}</span>
            </div>
            {session.scheduled_date && (
              <div>
                <span className="font-medium text-gray-700">Scheduled:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(session.scheduled_date).toLocaleDateString()}
                  {session.scheduled_time && ` at ${session.scheduled_time}`}
                </span>
              </div>
            )}
            {session.started_at && (
              <div>
                <span className="font-medium text-gray-700">Started:</span>
                <span className="ml-2 text-gray-600">{new Date(session.started_at).toLocaleString()}</span>
              </div>
            )}
            {session.completed_at && (
              <div>
                <span className="font-medium text-gray-700">Completed:</span>
                <span className="ml-2 text-gray-600">{new Date(session.completed_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Participants</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">Mentee</p>
                <p className="text-sm text-gray-600">Student ID: {session.student_id}</p>
              </div>
            </div>
            {session.mentor_id && (
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900">Mentor</p>
                  <p className="text-sm text-gray-600">Mentor ID: {session.mentor_id}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Meeting Link */}
        {session.meeting_link && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Meeting Link</h4>
            <a
              href={session.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {session.meeting_link}
            </a>
          </div>
        )}

        {/* Feedback Section */}
        {(mentorFeedback || menteeFeedback) && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Feedback</h4>

            {mentorFeedback && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Mentor Feedback</h5>
                <div className="flex items-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < mentorFeedback.overall_rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-blue-700">
                    {mentorFeedback.overall_rating}/5 Overall
                  </span>
                </div>
                <p className="text-sm text-blue-800">{mentorFeedback.comments}</p>
              </div>
            )}

            {menteeFeedback && (
              <div className="p-3 bg-green-50 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2">Mentee Feedback</h5>
                <div className="flex items-center mb-2">
                  <Star
                    className={`h-4 w-4 ${
                      menteeFeedback.self_rating >= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                  <span className="ml-2 text-sm text-green-700">
                    Self Rating: {menteeFeedback.self_rating}/5
                  </span>
                </div>
                <p className="text-sm text-green-800">{menteeFeedback.additional_comments}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {canProvideFeedback() && !hasProvidedFeedback() && onFeedback && (
            <button
              onClick={onFeedback}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Provide Feedback
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailsModal;