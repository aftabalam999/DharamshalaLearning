import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EnhancedPairProgrammingService } from '../../services/dataServices';
import { PairProgrammingSession, MentorFeedback, MenteeFeedback } from '../../types';
import { X, Star, AlertTriangle } from 'lucide-react';

interface FeedbackModalProps {
  session: PairProgrammingSession;
  onClose: () => void;
  onSuccess: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  session,
  onClose,
  onSuccess
}) => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine if user is mentor or mentee
  const isMentor = userData?.id === session.mentor_id;
  const isMentee = userData?.id === session.student_id;

  // Mentor feedback state
  const [mentorFeedback, setMentorFeedback] = useState({
    engagement_rating: 0,
    creativity_rating: 0,
    problem_solving_rating: 0,
    overall_rating: 0,
    strengths: [] as string[],
    improvement_areas: [] as string[],
    comments: ''
  });

  // Mentee feedback state
  const [menteeFeedback, setMenteeFeedback] = useState({
    what_learned: '',
    challenges_faced: '',
    self_rating: 0,
    additional_comments: ''
  });

  const validateMentorFeedback = () => {
    const newErrors: Record<string, string> = {};

    if (mentorFeedback.overall_rating === 0) {
      newErrors.overall_rating = 'Overall rating is required';
    }

    if (!mentorFeedback.comments.trim()) {
      newErrors.comments = 'Comments are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateMenteeFeedback = () => {
    const newErrors: Record<string, string> = {};

    if (!menteeFeedback.what_learned.trim()) {
      newErrors.what_learned = 'Please describe what you learned';
    }

    if (menteeFeedback.self_rating === 0) {
      newErrors.self_rating = 'Self rating is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleMentorSubmit = async () => {
    if (!validateMentorFeedback() || !userData) return;

    setLoading(true);

    try {
      const feedbackData: Omit<MentorFeedback, 'id'> = {
        session_id: session.id,
        mentor_id: userData.id,
        engagement_rating: mentorFeedback.engagement_rating,
        creativity_rating: mentorFeedback.creativity_rating,
        problem_solving_rating: mentorFeedback.problem_solving_rating,
        overall_rating: mentorFeedback.overall_rating,
        strengths: mentorFeedback.strengths,
        improvement_areas: mentorFeedback.improvement_areas,
        comments: mentorFeedback.comments,
        submitted_at: new Date()
      };

      await EnhancedPairProgrammingService.submitMentorFeedback(feedbackData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting mentor feedback:', error);
      setErrors({ submit: 'Failed to submit feedback. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMenteeSubmit = async () => {
    if (!validateMenteeFeedback() || !userData) return;

    setLoading(true);

    try {
      const feedbackData: Omit<MenteeFeedback, 'id'> = {
        session_id: session.id,
        student_id: userData.id,
        what_learned: menteeFeedback.what_learned,
        challenges_faced: menteeFeedback.challenges_faced,
        self_rating: menteeFeedback.self_rating,
        additional_comments: menteeFeedback.additional_comments,
        submitted_at: new Date()
      };

      await EnhancedPairProgrammingService.submitMenteeFeedback(feedbackData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting mentee feedback:', error);
      setErrors({ submit: 'Failed to submit feedback. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (field: string, rating: number) => {
    if (isMentor) {
      setMentorFeedback(prev => ({ ...prev, [field]: rating }));
    } else {
      setMenteeFeedback(prev => ({ ...prev, [field]: rating }));
    }
    // Clear error when user selects rating
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTextChange = (field: string, value: string) => {
    if (isMentor) {
      setMentorFeedback(prev => ({ ...prev, [field]: value }));
    } else {
      setMenteeFeedback(prev => ({ ...prev, [field]: value }));
    }
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleArrayChange = (field: string, values: string[]) => {
    setMentorFeedback(prev => ({ ...prev, [field]: values }));
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (rating: number) => void; label: string }) => (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-5 w-5 ${
                star <= value ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-gray-500">({value}/5)</span>
    </div>
  );

  if (!isMentor && !isMentee) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Feedback</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="text-gray-600">You are not authorized to provide feedback for this session.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {isMentor ? 'Mentor Feedback' : 'Mentee Feedback'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900">{session.topic}</h3>
        <p className="text-sm text-gray-600 mt-1">
          Session completed on {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : 'Unknown'}
        </p>
      </div>

      {isMentor ? (
        // Mentor Feedback Form
        <div className="space-y-6">
          {/* Ratings */}
          <div className="space-y-4">
            <StarRating
              value={mentorFeedback.engagement_rating}
              onChange={(rating) => handleRatingChange('engagement_rating', rating)}
              label="Engagement"
            />
            <StarRating
              value={mentorFeedback.creativity_rating}
              onChange={(rating) => handleRatingChange('creativity_rating', rating)}
              label="Creativity"
            />
            <StarRating
              value={mentorFeedback.problem_solving_rating}
              onChange={(rating) => handleRatingChange('problem_solving_rating', rating)}
              label="Problem Solving"
            />
            <StarRating
              value={mentorFeedback.overall_rating}
              onChange={(rating) => handleRatingChange('overall_rating', rating)}
              label="Overall Performance"
            />
            {errors.overall_rating && (
              <p className="text-sm text-red-600">{errors.overall_rating}</p>
            )}
          </div>

          {/* Strengths */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strengths (Optional)
            </label>
            <input
              type="text"
              value={mentorFeedback.strengths.join(', ')}
              onChange={(e) => handleArrayChange('strengths', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Quick learner, Good communication, Creative solutions"
            />
          </div>

          {/* Improvement Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Areas for Improvement (Optional)
            </label>
            <input
              type="text"
              value={mentorFeedback.improvement_areas.join(', ')}
              onChange={(e) => handleArrayChange('improvement_areas', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Code organization, Testing practices, Documentation"
            />
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments *
            </label>
            <textarea
              value={mentorFeedback.comments}
              onChange={(e) => handleTextChange('comments', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.comments ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Provide detailed feedback about the session..."
            />
            {errors.comments && (
              <p className="mt-1 text-sm text-red-600">{errors.comments}</p>
            )}
          </div>
        </div>
      ) : (
        // Mentee Feedback Form
        <div className="space-y-6">
          {/* What Learned */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What did you learn? *
            </label>
            <textarea
              value={menteeFeedback.what_learned}
              onChange={(e) => handleTextChange('what_learned', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.what_learned ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe the key concepts, skills, or insights you gained..."
            />
            {errors.what_learned && (
              <p className="mt-1 text-sm text-red-600">{errors.what_learned}</p>
            )}
          </div>

          {/* Challenges Faced */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Challenges Faced (Optional)
            </label>
            <textarea
              value={menteeFeedback.challenges_faced}
              onChange={(e) => handleTextChange('challenges_faced', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="What difficulties did you encounter during the session?"
            />
          </div>

          {/* Self Rating */}
          <div>
            <StarRating
              value={menteeFeedback.self_rating}
              onChange={(rating) => handleRatingChange('self_rating', rating)}
              label="Your Self-Assessment"
            />
            {errors.self_rating && (
              <p className="mt-1 text-sm text-red-600">{errors.self_rating}</p>
            )}
          </div>

          {/* Additional Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={menteeFeedback.additional_comments}
              onChange={(e) => handleTextChange('additional_comments', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Any other feedback about the session or mentor?"
            />
          </div>
        </div>
      )}

      {/* Submit Error */}
      {errors.submit && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
          <p className="text-sm text-red-700">{errors.submit}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          onClick={isMentor ? handleMentorSubmit : handleMenteeSubmit}
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
};

export default FeedbackModal;