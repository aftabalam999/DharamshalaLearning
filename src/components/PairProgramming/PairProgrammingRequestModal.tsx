import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EnhancedPairProgrammingService, AdminService } from '../../services/dataServices';
import { PairProgrammingRequest, SessionType, PriorityLevel } from '../../types';
import { X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { CalendarConnection } from '../Student/CalendarConnection';

interface PairProgrammingRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PairProgrammingRequestModal: React.FC<PairProgrammingRequestModalProps> = ({
  onClose,
  onSuccess
}) => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showOptionalPreferences, setShowOptionalPreferences] = useState(false);
  const [studentTopicInfo, setStudentTopicInfo] = useState<{ topic: string; phase: string } | null>(null);
  const [formData, setFormData] = useState<Partial<PairProgrammingRequest>>({
    topic: '',
    description: '',
    session_type: 'one_on_one',
    priority: 'medium',
    preferred_date: '',
    preferred_time: '',
    duration_minutes: 30, // Changed default to 30 minutes
    max_participants: 2,
    tags: [],
    specific_mentor_id: '',
    is_recurring: false,
    recurring_pattern: null,
    student_id: userData?.id || '',
    status: 'pending',
    mentor_id: undefined,
    scheduled_date: undefined,
    scheduled_time: undefined,
    completed_at: undefined,
    feedback_submitted: false,
    notes: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load available mentors and student topic info
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load student's current topic and phase
        if (userData?.id) {
          const topicInfo = await AdminService.getStudentCurrentTopicAndPhase(userData.id);
          if (topicInfo) {
            setStudentTopicInfo({ topic: topicInfo.topic, phase: topicInfo.phase });
            // Auto-populate topic field
            setFormData(prev => ({
              ...prev,
              topic: `${topicInfo.topic} (Phase: ${topicInfo.phase})`
            }));
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [userData?.id]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.topic?.trim()) {
      newErrors.topic = 'Topic is required';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.session_type) {
      newErrors.session_type = 'Session type is required';
    }

    // Optional fields - no validation needed
    // preferred_date, preferred_time, priority, duration_minutes, tags, specific_mentor_id, is_recurring

    if (formData.session_type === 'group' && (!formData.max_participants || formData.max_participants < 2)) {
      newErrors.max_participants = 'Group sessions must have at least 2 participants';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userData || !validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const requestData: Omit<PairProgrammingRequest, 'id' | 'created_at' | 'updated_at'> = {
        student_id: userData.id,
        topic: formData.topic!,
        description: formData.description!,
        session_type: formData.session_type!,
        priority: formData.priority!,
        preferred_date: formData.preferred_date!,
        preferred_time: formData.preferred_time!,
        duration_minutes: formData.duration_minutes!,
        max_participants: formData.max_participants!,
        tags: formData.tags || [],
        specific_mentor_id: formData.specific_mentor_id || undefined,
        is_recurring: formData.is_recurring || false,
        recurring_pattern: formData.recurring_pattern || null,
        status: 'pending',
        mentor_id: undefined,
        scheduled_date: undefined,
        scheduled_time: undefined,
        completed_at: undefined,
        feedback_submitted: false,
        notes: undefined
      };

      await EnhancedPairProgrammingService.createSessionRequest(requestData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating session request:', error);
      setErrors({ submit: 'Failed to create session request. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const sessionTypes: { value: SessionType; label: string; description: string }[] = [
    { value: 'one_on_one', label: 'One-on-One / Personal Mentoring', description: 'Personal mentoring session' },
    { value: 'code_review', label: 'Code/Debug Review', description: 'Review and improve existing code' },
    { value: 'project_planning', label: 'Project Planning', description: 'Plan and architect new projects' }
  ];

  const priorities: { value: PriorityLevel; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Request Pair Programming Session</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Calendar Connection */}
            <CalendarConnection />

            {/* Required Fields */}
            <div className="space-y-6">
              {/* What do you want to work on? */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you want to work on? *
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => handleInputChange('topic', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.topic ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe what you want to work on"
                />
                {studentTopicInfo && (
                  <p className="mt-1 text-sm text-gray-500">
                    Current: {studentTopicInfo.topic} (Phase: {studentTopicInfo.phase})
                  </p>
                )}
                {errors.topic && (
                  <p className="mt-1 text-sm text-red-600">{errors.topic}</p>
                )}
              </div>

              {/* Session Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Session Type *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {sessionTypes.map((type) => (
                    <label key={type.value} className="flex items-center">
                      <input
                        type="radio"
                        name="session_type"
                        value={type.value}
                        checked={formData.session_type === type.value}
                        onChange={(e) => handleInputChange('session_type', e.target.value as SessionType)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">{type.label}</span>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.session_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.session_type}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe what you want to work on, what you're struggling with, or what you want to learn..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Optional Preferences Section */}
            <div className="border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => setShowOptionalPreferences(!showOptionalPreferences)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-medium text-gray-900">Optional Preferences</h3>
                {showOptionalPreferences ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {showOptionalPreferences && (
                <div className="mt-6 space-y-6">
                  {/* Priority Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Priority Level
                    </label>
                    <div className="flex space-x-4">
                      {priorities.map((priority) => (
                        <label key={priority.value} className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value={priority.value}
                            checked={formData.priority === priority.value}
                            onChange={(e) => handleInputChange('priority', e.target.value as PriorityLevel)}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <span className={`ml-2 text-sm font-medium ${priority.color}`}>{priority.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Mentor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Mentor
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Default: Your assigned mentor</span>
                      <button
                        type="button"
                        className="text-primary-600 hover:text-primary-800 text-sm underline"
                        onClick={() => {
                          // TODO: Implement mentor selection modal
                          console.log('Open mentor selection');
                        }}
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Preferred Date & Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Date & Time
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                      We'll check your mentor's availability and suggest the best times
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="date"
                          value={formData.preferred_date}
                          onChange={(e) => handleInputChange('preferred_date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <input
                          type="time"
                          value={formData.preferred_time}
                          onChange={(e) => handleInputChange('preferred_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="180"
                      step="15"
                      value={formData.duration_minutes}
                      onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        errors.duration_minutes ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.duration_minutes && (
                      <p className="mt-1 text-sm text-red-600">{errors.duration_minutes}</p>
                    )}
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={formData.tags?.join(', ')}
                      onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., React, JavaScript, Algorithms (comma-separated)"
                    />
                  </div>

                  {/* Recurring Session */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onChange={(e) => handleInputChange('is_recurring', e.target.checked)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="is_recurring" className="ml-2 text-sm text-gray-700">
                      Make this a recurring session
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PairProgrammingRequestModal;