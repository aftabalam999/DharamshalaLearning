import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { getCurrentWeekStart, getReviewDeadline, getDaysUntilDeadline, getDaysOverdue } from '../../utils/reviewDateUtils';

interface Props {
  hasSubmitted: boolean;
  onReviewClick: () => void;
  reviewType: 'mentor' | 'mentee';
  revieweeName?: string;
}

const ReviewDeadlineEnforcement: React.FC<Props> = ({ 
  hasSubmitted, 
  onReviewClick, 
  reviewType,
  revieweeName 
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [urgencyLevel, setUrgencyLevel] = useState<'safe' | 'warning' | 'urgent' | 'overdue'>('safe');

  useEffect(() => {
    const updateTimer = () => {
      const weekStart = getCurrentWeekStart();
      const deadline = getReviewDeadline(weekStart);
      const now = new Date();
      
      if (hasSubmitted) {
        setUrgencyLevel('safe');
        setTimeRemaining('Submitted');
        return;
      }

      // Check if overdue
      if (now > deadline) {
        const daysOverdue = getDaysOverdue(deadline);
        setUrgencyLevel('overdue');
        setTimeRemaining(`${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`);
        return;
      }

      // Calculate time remaining
      const diff = deadline.getTime() - now.getTime();
      const daysUntil = getDaysUntilDeadline(deadline);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Set urgency level
      if (hours < 3) {
        setUrgencyLevel('urgent');
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (daysUntil === 0) {
        setUrgencyLevel('urgent');
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (daysUntil === 1) {
        setUrgencyLevel('warning');
        setTimeRemaining('Due tomorrow');
      } else {
        setUrgencyLevel('safe');
        setTimeRemaining(`${daysUntil} days left`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [hasSubmitted]);

  const getStyles = () => {
    switch (urgencyLevel) {
      case 'overdue':
        return {
          bg: 'bg-red-100 border-red-400',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'urgent':
        return {
          bg: 'bg-orange-100 border-orange-400',
          text: 'text-orange-800',
          icon: 'text-orange-600',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100 border-yellow-400',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'safe':
        return {
          bg: 'bg-green-100 border-green-400',
          text: 'text-green-800',
          icon: 'text-green-600',
          button: 'bg-green-600 hover:bg-green-700'
        };
    }
  };

  const styles = getStyles();

  if (hasSubmitted) {
    return (
      <div className={`border-l-4 p-4 rounded-lg ${styles.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className={`h-5 w-5 ${styles.icon} mr-3`} />
            <div>
              <p className={`text-sm font-semibold ${styles.text}`}>
                ✅ {reviewType === 'mentor' ? 'Mentor' : 'Mentee'} Review Submitted
              </p>
              <p className={`text-xs ${styles.text} mt-1`}>
                Week of {getCurrentWeekStart().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-l-4 p-4 rounded-lg ${styles.bg}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center flex-1">
          {urgencyLevel === 'overdue' ? (
            <AlertTriangle className={`h-5 w-5 ${styles.icon} mr-3 animate-pulse`} />
          ) : (
            <Clock className={`h-5 w-5 ${styles.icon} mr-3`} />
          )}
          <div>
            <p className={`text-sm font-semibold ${styles.text}`}>
              {urgencyLevel === 'overdue' && '🚨 OVERDUE: '}
              {reviewType === 'mentor' ? 'Mentor' : 'Mentee'} Review Pending
              {revieweeName && ` - ${revieweeName}`}
            </p>
            <p className={`text-xs ${styles.text} mt-1 flex items-center`}>
              <Calendar className="h-3 w-3 mr-1" />
              <span className="font-medium">{timeRemaining}</span>
              <span className="mx-2">•</span>
              <span>Deadline: Monday 11:59 PM</span>
            </p>
          </div>
        </div>
        <button
          onClick={onReviewClick}
          className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${styles.button} ${
            urgencyLevel === 'urgent' || urgencyLevel === 'overdue' ? 'animate-pulse' : ''
          }`}
        >
          {urgencyLevel === 'overdue' ? 'Submit Now!' : 'Complete Review'}
        </button>
      </div>
      
      {/* Progress indicator */}
      {urgencyLevel !== 'overdue' && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                urgencyLevel === 'urgent' ? 'bg-orange-600' :
                urgencyLevel === 'warning' ? 'bg-yellow-600' :
                'bg-green-600'
              }`}
              style={{
                width: `${Math.max(5, Math.min(100, 100 - (getDaysUntilDeadline(getReviewDeadline(getCurrentWeekStart())) / 7 * 100)))}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDeadlineEnforcement;
