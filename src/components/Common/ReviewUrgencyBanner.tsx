import React, { useState, useMemo } from 'react';
import { AlertCircle, X, Clock, Calendar } from 'lucide-react';
import { 
  getCurrentWeekStart, 
  getReviewStatus, 
  getDaysOverdue,
  getDaysUntilDeadline,
  getStatusMessage 
} from '../../utils/reviewDateUtils';

interface ReviewUrgencyBannerProps {
  pendingReviews: Array<{
    id: string;
    name: string;
    type: 'mentee' | 'mentor';
  }>;
  onNavigateToReview: (userId: string, type: 'mentee' | 'mentor') => void;
  isDismissible?: boolean;
}

const ReviewUrgencyBanner: React.FC<ReviewUrgencyBannerProps> = ({
  pendingReviews,
  onNavigateToReview,
  isDismissible = true
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Calculate urgency state (memoized for performance)
  const urgencyState = useMemo(() => {
    if (pendingReviews.length === 0) return null;

    const currentWeekStart = getCurrentWeekStart();
    const status = getReviewStatus(currentWeekStart, false, false);
    const daysOver = getDaysOverdue(currentWeekStart);
    const daysUntil = getDaysUntilDeadline(currentWeekStart);

    return {
      status,
      daysOver,
      daysUntil,
      count: pendingReviews.length,
      message: getStatusMessage(status, daysOver > 0 ? daysOver : daysUntil)
    };
  }, [pendingReviews.length]);

  // Don't show if dismissed or no pending reviews
  if (isDismissed || !urgencyState) return null;

  // Determine styling based on urgency
  const getBannerStyle = () => {
    switch (urgencyState.status) {
      case 'overdue_1d':
      case 'overdue_2d':
      case 'overdue_3plus':
        return {
          bg: 'bg-red-50 border-red-200',
          border: 'border-l-4 border-l-red-500',
          text: 'text-red-900',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          animate: 'animate-pulse'
        };
      case 'due_today':
        return {
          bg: 'bg-orange-50 border-orange-200',
          border: 'border-l-4 border-l-orange-500',
          text: 'text-orange-900',
          icon: 'text-orange-600',
          button: 'bg-orange-600 hover:bg-orange-700 text-white',
          animate: 'animate-pulse'
        };
      case 'due_tomorrow':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          border: 'border-l-4 border-l-yellow-500',
          text: 'text-yellow-900',
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          animate: ''
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          border: 'border-l-4 border-l-blue-500',
          text: 'text-blue-900',
          icon: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          animate: ''
        };
    }
  };

  const style = getBannerStyle();

  // Get primary message
  const getPrimaryMessage = () => {
    const { status, daysOver, count } = urgencyState;
    
    if (status === 'overdue_1d' || status === 'overdue_2d' || status === 'overdue_3plus') {
      return (
        <>
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span className="font-bold">
            {count === 1 
              ? `Your review is ${daysOver} day${daysOver > 1 ? 's' : ''} overdue!`
              : `You have ${count} reviews that are ${daysOver} day${daysOver > 1 ? 's' : ''} overdue!`
            }
          </span>
        </>
      );
    }

    if (status === 'due_today') {
      return (
        <>
          <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
          <span className="font-bold">
            {count === 1 
              ? 'Your review is DUE TODAY by 11:59 PM!'
              : `You have ${count} reviews DUE TODAY by 11:59 PM!`
            }
          </span>
        </>
      );
    }

    if (status === 'due_tomorrow') {
      return (
        <>
          <Calendar className="h-5 w-5 mr-2 flex-shrink-0" />
          <span className="font-semibold">
            {count === 1 
              ? 'Your review is due tomorrow!'
              : `You have ${count} reviews due tomorrow!`
            }
          </span>
        </>
      );
    }

    return (
      <>
        <Calendar className="h-5 w-5 mr-2 flex-shrink-0" />
        <span className="font-medium">
          {count === 1 
            ? 'You have 1 pending review'
            : `You have ${count} pending reviews`
          }
        </span>
      </>
    );
  };

  return (
    <div className={`${style.bg} border ${style.border} ${style.animate} rounded-lg p-4 mb-6 shadow-sm`}>
      <div className="flex items-start justify-between">
        {/* Left side - Icon + Message */}
        <div className="flex-1">
          <div className={`flex items-center ${style.text} mb-2`}>
            {getPrimaryMessage()}
          </div>
          
          {/* Secondary message */}
          <p className={`text-sm ${style.text} opacity-90 ml-7`}>
            Reviews must be submitted by Monday at 11:59 PM. Don't miss the deadline!
          </p>

          {/* Action buttons */}
          <div className="mt-3 ml-7 flex flex-wrap gap-2">
            {pendingReviews.slice(0, 3).map((review) => (
              <button
                key={review.id}
                onClick={() => onNavigateToReview(review.id, review.type)}
                className={`${style.button} px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm hover:shadow-md`}
              >
                Review {review.name} →
              </button>
            ))}
            
            {pendingReviews.length > 3 && (
              <span className={`${style.text} px-3 py-2 text-sm font-medium`}>
                +{pendingReviews.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Right side - Dismiss button */}
        {isDismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className={`${style.icon} hover:opacity-70 transition-opacity ml-4 flex-shrink-0`}
            aria-label="Dismiss banner"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ReviewUrgencyBanner;
