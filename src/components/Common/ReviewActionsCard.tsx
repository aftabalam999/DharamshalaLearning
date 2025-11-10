import React, { useState } from 'react';
import { Star, UserCircle, ChevronDown, ChevronUp, TrendingUp, Clock } from 'lucide-react';
import { calculateAggregateScore } from '../../utils/reviewCalculations';
import { 
  getCurrentWeekStart,
  getReviewStatus,
  getStatusMessage,
  getDaysUntilDeadline,
  getDaysOverdue
} from '../../utils/reviewDateUtils';
import { MenteeReview, MentorReview } from '../../types';

interface ReviewItem {
  id: string;
  name: string;
  score: number | null;
  review?: MenteeReview | MentorReview; // Full review object for time-based calculations
}

interface ReviewActionsCardProps {
  // Section 1: Reviews received (your performance)
  receivedReviews: ReviewItem[];
  receivedTitle: string;
  onViewReceivedDetails: (reviewerId: string) => void;
  
  // Section 2: Reviews to submit (review others)
  toReviewUsers: ReviewItem[];
  toReviewTitle: string;
  onSubmitReview: (userId: string) => void;
}

const ReviewActionsCard: React.FC<ReviewActionsCardProps> = ({
  receivedReviews,
  receivedTitle,
  onViewReceivedDetails,
  toReviewUsers,
  toReviewTitle,
  onSubmitReview,
}) => {
  const [expandedReceived, setExpandedReceived] = useState(false);
  const [expandedToReview, setExpandedToReview] = useState(false);

  // Get time-based scores
  const getTimeBasedScores = (reviewItems: ReviewItem[]) => {
    const fullReviews = reviewItems
      .filter(r => r.review)
      .map(r => r.review as MenteeReview | MentorReview);
    
    if (fullReviews.length === 0) {
      return {
        thisWeek: null,
        allTime: null,
        thisWeekCount: 0,
        allTimeCount: 0
      };
    }

    const thisWeekScore = calculateAggregateScore(fullReviews, 'current_week');
    const allTimeScore = calculateAggregateScore(fullReviews, 'all_time');
    
    // Count reviews for each period using consistent week start calculation
    const currentWeekStart = getCurrentWeekStart();
    
    const thisWeekReviews = fullReviews.filter(r => {
      const reviewWeekStart = r.week_start instanceof Date ? r.week_start : new Date(r.week_start);
      // Compare dates by comparing their time values (removes timezone issues)
      return reviewWeekStart.getTime() >= currentWeekStart.getTime();
    });

    return {
      thisWeek: thisWeekScore,
      allTime: allTimeScore,
      thisWeekCount: thisWeekReviews.length,
      allTimeCount: fullReviews.length
    };
  };

  const receivedScores = getTimeBasedScores(receivedReviews);
  const hasThisWeekData = receivedScores.thisWeek !== null;
  const hasAllTimeData = receivedScores.allTime !== null;

  // Get urgency state for reviews to submit
  const getUrgencyBadge = () => {
    if (toReviewUsers.length === 0) return null;

    const currentWeekStart = getCurrentWeekStart();
    const status = getReviewStatus(currentWeekStart, false, false);
    const daysUntil = getDaysUntilDeadline(currentWeekStart);
    const daysOver = getDaysOverdue(currentWeekStart);
    const message = getStatusMessage(status, daysOver > 0 ? daysOver : daysUntil);

    // Determine badge style based on status
    let badgeClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ';
    let icon = '📅';
    
    switch (status) {
      case 'due_today':
        badgeClasses += 'bg-orange-100 text-orange-800 animate-pulse';
        icon = '🔴';
        break;
      case 'due_tomorrow':
        badgeClasses += 'bg-yellow-100 text-yellow-800';
        icon = '⚠️';
        break;
      case 'due_in_week':
        badgeClasses += 'bg-green-100 text-green-800';
        icon = '✅';
        break;
      case 'overdue_1d':
      case 'overdue_2d':
      case 'overdue_3plus':
        badgeClasses += 'bg-red-100 text-red-800 animate-pulse';
        icon = '🚨';
        break;
      default:
        return null;
    }

    return (
      <div className={badgeClasses}>
        <span className="mr-1">{icon}</span>
        {message}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <Star className="h-5 w-5 mr-2" />
        Performance Reviews
      </h3>

      {/* Section 1: Reviews You Received */}
      <div className="mb-4 p-3 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <p className="text-xs font-medium opacity-90">{receivedTitle}</p>
            <p className="text-xs opacity-75">
              {receivedReviews.length} {receivedReviews.length === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          
          {/* Time-based scores display */}
          <div className="text-right">
            {hasThisWeekData && (
              <div className="flex items-center justify-end space-x-2 mb-1">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 opacity-75" />
                  <span className="text-xs opacity-75">This Week:</span>
                </div>
                <span className="text-xl font-bold">
                  {receivedScores.thisWeek!.toFixed(1)}
                </span>
                <span className="text-xs opacity-75 bg-white bg-opacity-20 px-1.5 py-0.5 rounded">
                  {receivedScores.thisWeekCount}
                </span>
              </div>
            )}
            {hasAllTimeData && (
              <div className="flex items-center justify-end space-x-2">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 opacity-75" />
                  <span className="text-xs opacity-75">All Time:</span>
                </div>
                <span className={`${hasThisWeekData ? 'text-base' : 'text-2xl'} font-bold`}>
                  {receivedScores.allTime!.toFixed(1)}
                </span>
                <span className="text-xs opacity-75 bg-white bg-opacity-20 px-1.5 py-0.5 rounded">
                  {receivedScores.allTimeCount}
                </span>
              </div>
            )}
            {!hasThisWeekData && !hasAllTimeData && (
              <span className="text-2xl font-bold opacity-50">N/A</span>
            )}
          </div>
        </div>

        {receivedReviews.length === 1 ? (
          // Single review - show directly
          <button
            onClick={() => onViewReceivedDetails(receivedReviews[0].id)}
            className="w-full py-2 px-3 bg-white bg-opacity-30 hover:bg-opacity-40 rounded text-sm font-medium transition-all"
          >
            View Details →
          </button>
        ) : receivedReviews.length > 1 ? (
          // Multiple reviews - show expandable list
          <>
            <button
              onClick={() => setExpandedReceived(!expandedReceived)}
              className="w-full py-2 px-3 bg-white bg-opacity-30 hover:bg-opacity-40 rounded text-sm font-medium transition-all flex items-center justify-between"
            >
              <span>View All Reviews</span>
              {expandedReceived ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {expandedReceived && (
              <div className="mt-2 space-y-2">
                {receivedReviews.map((review) => (
                  <button
                    key={review.id}
                    onClick={() => onViewReceivedDetails(review.id)}
                    className="w-full py-2 px-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm transition-all flex items-center justify-between"
                  >
                    <span className="text-left truncate">{review.name}</span>
                    <span className={`font-bold ml-2 ${review.score !== null ? '' : 'opacity-50'}`}>
                      {review.score !== null ? review.score.toFixed(1) : 'N/A'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="py-2 px-3 text-sm text-center opacity-75">
            No reviews yet
          </div>
        )}
      </div>

      {/* Section 2: Users to Review */}
      {toReviewUsers.length > 0 && (
        <div className="p-3 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-xs font-medium opacity-90">{toReviewTitle}</p>
                <p className="text-xs opacity-75">
                  {toReviewUsers.length} {toReviewUsers.length === 1 ? 'person' : 'people'} to review
                </p>
              </div>
            </div>
            {/* Urgency Badge */}
            {getUrgencyBadge()}
          </div>

          {toReviewUsers.length === 1 ? (
            // Single user - show directly
            <div className="mb-2">
              <div className="flex items-center space-x-2">
                <UserCircle className="h-4 w-4" />
                <p className="text-sm font-semibold">{toReviewUsers[0].name}</p>
              </div>
            </div>
          ) : (
            // Multiple users - show expandable list
            <button
              onClick={() => setExpandedToReview(!expandedToReview)}
              className="w-full py-2 px-3 bg-white bg-opacity-30 hover:bg-opacity-40 rounded text-sm font-medium transition-all flex items-center justify-between mb-2"
            >
              <span>View All</span>
              {expandedToReview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}

          {(toReviewUsers.length === 1 || expandedToReview) && (
            <div className="space-y-2">
              {toReviewUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSubmitReview(user.id)}
                  className="w-full py-2 px-3 bg-white text-purple-600 hover:bg-opacity-90 rounded text-sm font-medium transition-all flex items-center justify-between"
                >
                  <span className="flex items-center space-x-2">
                    <UserCircle className="h-4 w-4" />
                    <span>{user.name}</span>
                  </span>
                  <span>⭐</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewActionsCard;
