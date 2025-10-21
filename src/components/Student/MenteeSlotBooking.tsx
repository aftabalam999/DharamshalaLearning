import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SlotAvailabilityService } from '../../services/slotAvailabilityService';
import { UserService } from '../../services/firestore';
import { EnhancedPairProgrammingService } from '../../services/dataServices';
import { User, AvailableSlot } from '../../types';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Loader,
  MapPin,
} from 'lucide-react';

interface MentorSlotInfo {
  mentor: User;
  slots: AvailableSlot[];
  loading: boolean;
  onLeave: boolean;
}

interface BookingState {
  step: 'mentor-select' | 'date-select' | 'confirm' | 'success';
  selectedMentor?: User;
  selectedSlot?: AvailableSlot;
  topic: string;
  description: string;
}

const MenteeSlotBooking: React.FC = () => {
  const { userData } = useAuth();
  const [bookingState, setBookingState] = useState<BookingState>({
    step: 'mentor-select',
    topic: '',
    description: '',
  });

  const [mentorSlots, setMentorSlots] = useState<Record<string, MentorSlotInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [assignedMentor, setAssignedMentor] = useState<User | null>(null);

  const loadSlotsForMentor = useCallback(
    async (mentor: User, date: Date) => {
      try {
        const slots = await SlotAvailabilityService.getAvailableSlots({
          mentorId: mentor.id,
          campus: userData?.campus || '',
          date,
          slotDurationMinutes: 60,
        });

        setMentorSlots((prev) => ({
          ...prev,
          [mentor.id]: {
            mentor,
            slots,
            loading: false,
            onLeave: slots.length === 0,
          },
        }));
      } catch (err) {
        console.error(`Error loading slots for mentor ${mentor.id}:`, err);
        setMentorSlots((prev) => ({
          ...prev,
          [mentor.id]: {
            mentor,
            slots: [],
            loading: false,
            onLeave: true,
          },
        }));
      }
    },
    [userData?.campus]
  );

  const loadMentors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userData?.campus) {
        setError('Campus information not found');
        return;
      }

      // Check if user has an assigned mentor
      if (userData?.mentor_id) {
        // Load the assigned mentor
        const mentor = await UserService.getUserById(userData.mentor_id);
        if (mentor) {
          setAssignedMentor(mentor);
          // Auto-select the mentor and move to date selection
          setBookingState({
            step: 'date-select',
            selectedMentor: mentor,
            topic: '',
            description: '',
          });
          // Load slots for the assigned mentor
          await loadSlotsForMentor(mentor, new Date());
          setLoading(false);
          return;
        }
      }

      // If no assigned mentor, show error
      setError('You do not have an assigned mentor. Please request a mentor first.');
      setLoading(false);
    } catch (err) {
      console.error('Error loading mentors:', err);
      setError('Failed to load mentor information. Please try again.');
      setLoading(false);
    }
  }, [userData?.campus, userData?.mentor_id, loadSlotsForMentor]);

  // Load mentor info for current user
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (userData?.campus) {
      loadMentors();
    }
  }, [userData, loadMentors]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);

    // Reload slots for new date if mentor is selected
    if (bookingState.selectedMentor) {
      loadSlotsForMentor(bookingState.selectedMentor, newDate);
    }
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setBookingState({
      ...bookingState,
      selectedSlot: slot,
      step: 'confirm',
    });
  };

  const handleConfirmBooking = async () => {
    if (
      !bookingState.selectedMentor ||
      !bookingState.selectedSlot ||
      !userData?.id
    ) {
      setError('Missing required booking information');
      return;
    }

    try {
      setBookingInProgress(true);
      setError(null);

      // Validate slot is still available
      const isAvailable = await SlotAvailabilityService.validateSlot(
        bookingState.selectedMentor.id,
        bookingState.selectedSlot.startTime,
        bookingState.selectedSlot.endTime
      );

      if (!isAvailable) {
        setError('This slot is no longer available. Please select another slot.');
        setBookingState({ ...bookingState, step: 'date-select' });
        return;
      }

      // Create session
      await EnhancedPairProgrammingService.createSession({
        student_id: userData.id,
        mentor_id: bookingState.selectedMentor.id,
        topic: bookingState.topic || 'Pair Programming Session',
        description: bookingState.description,
        scheduled_date: new Date(bookingState.selectedSlot.startTime),
        scheduled_time: new Date(bookingState.selectedSlot.startTime)
          .toTimeString()
          .slice(0, 5),
        duration_minutes: bookingState.selectedSlot.duration,
        status: 'scheduled',
        session_type: 'scheduled',
        priority: 'medium',
      });

      setSuccessMessage(
        `Session booked successfully! Meeting scheduled for ${new Date(
          bookingState.selectedSlot.startTime
        ).toLocaleDateString()} at ${new Date(
          bookingState.selectedSlot.startTime
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );

      setBookingState({
        step: 'success',
        topic: '',
        description: '',
      });

      // Reset after 3 seconds
      setTimeout(() => {
        resetBooking();
      }, 3000);
    } catch (err) {
      console.error('Error booking session:', err);
      setError('Failed to book session. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  const resetBooking = () => {
    setBookingState({
      step: 'date-select', // Go back to date select since we have assigned mentor
      topic: '',
      description: '',
      selectedMentor: assignedMentor || undefined,
    });
    setSelectedDate(new Date());
    setMentorSlots({});
  };

  const handleBackStep = () => {
    if (bookingState.step === 'confirm') {
      setBookingState({ ...bookingState, step: 'date-select' });
    }
    // No back from date-select since mentor is pre-selected
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Schedule Pair Programming Session
          </h1>
          <p className="text-gray-600">Book a session with an available mentor from your campus</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {bookingState.step === 'success' && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg flex items-start gap-4">
            <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-lg">Booking Confirmed!</p>
              <p className="text-green-700 mt-1">{successMessage}</p>
              <p className="text-green-600 text-sm mt-2">Redirecting to your sessions...</p>
            </div>
          </div>
        )}

        {/* Step 1: Mentor Selection - SKIPPED: Auto-selected from userData.mentor_id */}
        
        {/* Step 2: Date & Time Selection */}
        {bookingState.step === 'date-select' && bookingState.selectedMentor && (
          <div className="space-y-6">
            {/* Note: Back button hidden - mentor is auto-selected */}

            {/* Selected Mentor Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {bookingState.selectedMentor.display_name || bookingState.selectedMentor.name}
                  </h3>
                  <p className="text-gray-600 text-sm">{bookingState.selectedMentor.email}</p>
                </div>
              </div>
            </div>

            {/* Date Picker */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Select Date & Time</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDateChange('prev')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-48 text-center">
                    <p className="font-semibold text-lg">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDateChange('next')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Available Slots */}
              {mentorSlots[bookingState.selectedMentor.id]?.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Loading available slots...</span>
                </div>
              ) : mentorSlots[bookingState.selectedMentor.id]?.slots.length === 0 ? (
                <div className="p-8 bg-gray-50 rounded-lg text-center">
                  {mentorSlots[bookingState.selectedMentor.id]?.onLeave ? (
                    <>
                      <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Mentor is on leave</p>
                      <p className="text-gray-500 text-sm mt-1">No slots available on this date</p>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">No slots available</p>
                      <p className="text-gray-500 text-sm mt-1">Try selecting a different date</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mentorSlots[bookingState.selectedMentor.id]?.slots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSlotSelect(slot)}
                      className="p-3 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-center"
                    >
                      <Clock className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                      <p className="font-semibold text-gray-900">
                        {new Date(slot.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-gray-600">
                        {slot.duration} min
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Session Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Session Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bookingState.topic}
                    onChange={(e) => setBookingState({ ...bookingState, topic: e.target.value })}
                    placeholder="e.g., React Hooks, State Management"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={bookingState.description}
                    onChange={(e) => setBookingState({ ...bookingState, description: e.target.value })}
                    placeholder="Describe what you want to work on..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {bookingState.step === 'confirm' &&
          bookingState.selectedMentor &&
          bookingState.selectedSlot && (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={handleBackStep}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Date Selection
              </button>

              {/* Booking Summary */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Confirm Your Booking</h2>

                <div className="space-y-6">
                  {/* Mentor Info */}
                  <div className="pb-6 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-600 uppercase mb-3">Mentor</p>
                    <h3 className="text-xl font-bold text-gray-900">
                      {bookingState.selectedMentor.display_name || bookingState.selectedMentor.name}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">{bookingState.selectedMentor.email}</p>
                  </div>

                  {/* Date & Time */}
                  <div className="pb-6 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-600 uppercase mb-3">Date & Time</p>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-bold text-gray-900">
                          {new Date(bookingState.selectedSlot.startTime).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-gray-600">
                          {new Date(bookingState.selectedSlot.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(bookingState.selectedSlot.endTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          <span className="ml-2 text-sm">
                            ({bookingState.selectedSlot.duration} minutes)
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Topic & Description */}
                  <div className="pb-6 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-600 uppercase mb-3">Session Details</p>
                    <div>
                      <p className="text-sm text-gray-600">Topic</p>
                      <p className="font-bold text-gray-900">{bookingState.topic || '(No topic specified)'}</p>
                    </div>
                    {bookingState.description && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">Description</p>
                        <p className="text-gray-700">{bookingState.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Campus Info */}
                  <div>
                    <p className="text-sm font-semibold text-gray-600 uppercase mb-3">Campus</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <p className="font-bold text-gray-900">{userData?.campus}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={handleBackStep}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    disabled={!bookingState.topic || bookingInProgress}
                    className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {bookingInProgress ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirm Booking
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default MenteeSlotBooking;
