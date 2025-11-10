import { MenteeReview, MentorReview, User } from '../types';
import { getCurrentWeekStart, areSameWeek } from './reviewDateUtils';

/**
 * Time filter options for aggregate calculations
 */
export type TimeFilter = 'current_week' | 'last_4_weeks' | 'all_time';

/**
 * Calculate average score from a single review (5 or 6 criteria)
 */
export const calculateReviewScore = (review: MenteeReview | MentorReview): number => {
  const scores = [
    review.morning_exercise,
    review.communication,
    review.academic_effort,
    review.campus_contribution,
    review.behavioural
  ];
  
  // Add mentorship_level if it exists (MentorReview only)
  if ('mentorship_level' in review) {
    scores.push(review.mentorship_level);
  }
  
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(average * 10) / 10; // Round to 1 decimal
};

/**
 * Filter reviews by time period
 */
export const filterReviewsByTime = (
  reviews: (MenteeReview | MentorReview)[],
  timeFilter: TimeFilter
): (MenteeReview | MentorReview)[] => {
  if (timeFilter === 'all_time') {
    return reviews;
  }

  const currentWeekStart = getCurrentWeekStart();
  
  if (timeFilter === 'current_week') {
    return reviews.filter(review => 
      areSameWeek(new Date(review.week_start), currentWeekStart)
    );
  }

  if (timeFilter === 'last_4_weeks') {
    const fourWeeksAgo = new Date(currentWeekStart);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28); // 4 weeks = 28 days
    
    return reviews.filter(review => {
      const reviewDate = new Date(review.week_start);
      return reviewDate >= fourWeeksAgo && reviewDate <= currentWeekStart;
    });
  }

  return reviews;
};

/**
 * Calculate aggregate score from multiple reviews with time filtering
 */
export const calculateAggregateScore = (
  reviews: (MenteeReview | MentorReview)[],
  timeFilter: TimeFilter = 'all_time'
): number => {
  const filteredReviews = filterReviewsByTime(reviews, timeFilter);
  
  if (filteredReviews.length === 0) return 0;
  
  const totalScore = filteredReviews.reduce((sum, review) => {
    return sum + calculateReviewScore(review);
  }, 0);
  
  return Math.round((totalScore / filteredReviews.length) * 10) / 10;
};

/**
 * Outlier detection result
 */
export interface OutlierInfo {
  reviewId: string;
  reviewerName: string;
  score: number;
  deviationFromMean: number;
  isOutlier: boolean;
  severity: 'extreme' | 'moderate' | 'normal';
}

/**
 * Detect outlier reviews (for admin reporting only - does NOT affect calculations)
 * Uses 2 standard deviations as threshold
 */
export const detectOutliers = (
  reviews: Array<(MenteeReview | MentorReview) & { reviewer_name?: string }>
): OutlierInfo[] => {
  if (reviews.length < 3) {
    // Not enough data for statistical analysis
    return reviews.map(review => ({
      reviewId: review.id,
      reviewerName: review.reviewer_name || 'Unknown',
      score: calculateReviewScore(review),
      deviationFromMean: 0,
      isOutlier: false,
      severity: 'normal' as const
    }));
  }

  const scores = reviews.map(r => calculateReviewScore(r));
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  // Calculate standard deviation
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  return reviews.map((review, index) => {
    const score = scores[index];
    const deviation = Math.abs(score - mean);
    const zScore = stdDev === 0 ? 0 : deviation / stdDev;

    let isOutlier = false;
    let severity: 'extreme' | 'moderate' | 'normal' = 'normal';

    if (zScore > 3) {
      isOutlier = true;
      severity = 'extreme'; // > 3 std deviations
    } else if (zScore > 2) {
      isOutlier = true;
      severity = 'moderate'; // 2-3 std deviations
    }

    return {
      reviewId: review.id,
      reviewerName: review.reviewer_name || 'Unknown',
      score,
      deviationFromMean: Math.round(deviation * 10) / 10,
      isOutlier,
      severity
    };
  });
};

/**
 * Get review score color class
 */
export const getReviewScoreColor = (score: number): string => {
  if (score >= 1.5) return 'text-green-600';
  if (score >= 0.5) return 'text-blue-600';
  if (score >= -0.5) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * Get review score background color class
 */
export const getReviewScoreBgColor = (score: number): string => {
  if (score >= 1.5) return 'bg-green-50 border-green-300';
  if (score >= 0.5) return 'bg-blue-50 border-blue-300';
  if (score >= -0.5) return 'bg-yellow-50 border-yellow-300';
  return 'bg-red-50 border-red-300';
};

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  currentScore: number;
  previousScore: number;
  change: number;
  percentChange: number;
  trend: 'improving' | 'declining' | 'stable';
  trendIcon: '↑' | '↓' | '→';
}

/**
 * Calculate trend comparing current week vs previous period
 */
export const calculateTrend = (
  reviews: (MenteeReview | MentorReview)[],
  compareWeeks: number = 1
): TrendAnalysis | null => {
  if (reviews.length === 0) return null;

  const currentWeekStart = getCurrentWeekStart();
  
  // Get current week reviews
  const currentReviews = reviews.filter(review =>
    areSameWeek(new Date(review.week_start), currentWeekStart)
  );

  // Get previous period reviews
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - (7 * compareWeeks));
  
  const previousReviews = reviews.filter(review => {
    const reviewDate = new Date(review.week_start);
    if (compareWeeks === 1) {
      return areSameWeek(reviewDate, previousWeekStart);
    } else {
      // For multiple weeks, get all reviews in that period
      const periodStart = new Date(previousWeekStart);
      const periodEnd = new Date(currentWeekStart);
      periodEnd.setDate(periodEnd.getDate() - 7); // Exclude current week
      return reviewDate >= periodStart && reviewDate <= periodEnd;
    }
  });

  if (currentReviews.length === 0 && previousReviews.length === 0) return null;

  const currentScore = calculateAggregateScore(currentReviews);
  const previousScore = calculateAggregateScore(previousReviews);

  const change = Math.round((currentScore - previousScore) * 10) / 10;
  const percentChange = previousScore === 0 ? 0 : 
    Math.round((change / Math.abs(previousScore)) * 100);

  let trend: 'improving' | 'declining' | 'stable';
  let trendIcon: '↑' | '↓' | '→';

  if (Math.abs(change) < 0.2) {
    trend = 'stable';
    trendIcon = '→';
  } else if (change > 0) {
    trend = 'improving';
    trendIcon = '↑';
  } else {
    trend = 'declining';
    trendIcon = '↓';
  }

  return {
    currentScore,
    previousScore,
    change,
    percentChange,
    trend,
    trendIcon
  };
};

/**
 * Calculate moving average over last N weeks
 */
export const getMovingAverage = (
  reviews: (MenteeReview | MentorReview)[],
  weeks: number = 4
): number => {
  if (reviews.length === 0) return 0;

  const currentWeekStart = getCurrentWeekStart();
  const startDate = new Date(currentWeekStart);
  startDate.setDate(startDate.getDate() - (7 * weeks));

  const recentReviews = reviews.filter(review => {
    const reviewDate = new Date(review.week_start);
    return reviewDate >= startDate && reviewDate <= currentWeekStart;
  });

  return calculateAggregateScore(recentReviews);
};

/**
 * Get review status label
 */
export const getReviewStatusLabel = (score: number): string => {
  if (score >= 1.5) return 'Excellent';
  if (score >= 0.5) return 'Good';
  if (score >= -0.5) return 'Needs Improvement';
  return 'Critical';
};

/**
 * Criteria breakdown analysis
 */
export interface CriteriaAnalysis {
  strengths: Array<{ criteria: string; score: number }>;
  weaknesses: Array<{ criteria: string; score: number }>;
  suggestions: string[];
  criteriaScores: Record<string, number>;
}

/**
 * Analyze individual criteria to identify strengths and weaknesses
 */
export const analyzeCriteria = (
  review: MenteeReview | MentorReview
): CriteriaAnalysis => {
  const criteriaScores: Record<string, number> = {
    'Morning Exercise': review.morning_exercise,
    'Communication': review.communication,
    'Academic Effort': review.academic_effort,
    'Campus Contribution': review.campus_contribution,
    'Behavioural': review.behavioural
  };

  if ('mentorship_level' in review) {
    criteriaScores['Mentorship Level'] = review.mentorship_level;
  }

  const strengths: Array<{ criteria: string; score: number }> = [];
  const weaknesses: Array<{ criteria: string; score: number }> = [];
  const suggestions: string[] = [];

  Object.entries(criteriaScores).forEach(([criteria, score]) => {
    if (score >= 1.5) {
      strengths.push({ criteria, score });
    } else if (score <= 0.5) {
      weaknesses.push({ criteria, score });
      
      // Generate suggestions based on weak areas
      if (criteria === 'Morning Exercise' && score < 0) {
        suggestions.push('Improve consistency in morning exercise attendance');
      } else if (criteria === 'Communication' && score < 0) {
        suggestions.push('Work on communication frequency and clarity');
      } else if (criteria === 'Academic Effort' && score < 0) {
        suggestions.push('Dedicate more time to academic work and studies');
      } else if (criteria === 'Campus Contribution' && score < 0) {
        suggestions.push('Participate more in campus activities and initiatives');
      } else if (criteria === 'Behavioural' && score < 0) {
        suggestions.push('Focus on behavioral improvements and campus conduct');
      } else if (criteria === 'Mentorship Level' && score < 0) {
        suggestions.push('Enhance mentorship approach and student support');
      }
    }
  });

  // Sort by score
  strengths.sort((a, b) => b.score - a.score);
  weaknesses.sort((a, b) => a.score - b.score);

  return {
    strengths,
    weaknesses,
    suggestions,
    criteriaScores
  };
};

/**
 * Compare individual criteria to campus averages
 */
export const getCriteriaComparison = (
  review: MenteeReview | MentorReview,
  allReviews: (MenteeReview | MentorReview)[]
): Record<string, { personal: number; average: number; difference: number }> => {
  if (allReviews.length === 0) {
    return {};
  }

  const criteria = [
    'morning_exercise',
    'communication',
    'academic_effort',
    'campus_contribution',
    'behavioural'
  ];

  if ('mentorship_level' in review) {
    criteria.push('mentorship_level');
  }

  const comparison: Record<string, { personal: number; average: number; difference: number }> = {};

  criteria.forEach(criterion => {
    const personalScore = review[criterion as keyof typeof review] as number;
    const scores = allReviews.map(r => r[criterion as keyof typeof r] as number).filter(s => typeof s === 'number');
    const average = scores.length > 0 
      ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
      : 0;
    const difference = Math.round((personalScore - average) * 10) / 10;

    comparison[criterion] = {
      personal: personalScore,
      average,
      difference
    };
  });

  return comparison;
};

/**
 * Group mentee reviews by student with their info
 */
export interface MenteeReviewWithUser {
  student: User;
  latestReview: MenteeReview;
  allReviews: MenteeReview[];
  averageScore: number;
}

/**
 * Group mentor reviews by mentor with their info
 */
export interface MentorReviewWithUser {
  mentor: User;
  latestReview: MentorReview;
  allReviews: MentorReview[];
  averageScore: number;
}

/**
 * Comparative metrics result
 */
export interface ComparativeMetrics {
  personalScore: number;
  campusAverage: number;
  difference: number;
  percentile: number;
  stdDeviationsFromMean: number;
  label: string; // 'Top 10%', 'Above Average', 'Average', 'Below Average'
}

/**
 * Compare individual score to campus average and calculate percentile
 */
export const compareToAverage = (
  personalScore: number,
  allScores: number[]
): ComparativeMetrics => {
  if (allScores.length === 0) {
    return {
      personalScore,
      campusAverage: 0,
      difference: 0,
      percentile: 50,
      stdDeviationsFromMean: 0,
      label: 'No Data'
    };
  }

  const campusAverage = Math.round(
    (allScores.reduce((sum, score) => sum + score, 0) / allScores.length) * 10
  ) / 10;

  const difference = Math.round((personalScore - campusAverage) * 10) / 10;

  // Calculate standard deviation
  const squaredDiffs = allScores.map(score => Math.pow(score - campusAverage, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / allScores.length;
  const stdDev = Math.sqrt(variance);
  const stdDeviationsFromMean = stdDev === 0 ? 0 : 
    Math.round((difference / stdDev) * 10) / 10;

  // Calculate percentile
  const percentile = getPercentileRank(personalScore, allScores);

  // Determine label
  let label: string;
  if (percentile >= 90) {
    label = 'Top 10%';
  } else if (percentile >= 75) {
    label = 'Top 25%';
  } else if (percentile >= 60) {
    label = 'Above Average';
  } else if (percentile >= 40) {
    label = 'Average';
  } else if (percentile >= 25) {
    label = 'Below Average';
  } else {
    label = 'Bottom 25%';
  }

  return {
    personalScore,
    campusAverage,
    difference,
    percentile,
    stdDeviationsFromMean,
    label
  };
};

/**
 * Calculate percentile rank for a score among all scores
 */
export const getPercentileRank = (score: number, allScores: number[]): number => {
  if (allScores.length === 0) return 50;

  const scoresAtOrBelow = allScores.filter(s => s <= score).length;
  const percentile = Math.round((scoresAtOrBelow / allScores.length) * 100);

  return percentile;
};

/**
 * Get all scores from reviews for comparative analysis
 */
export const extractScores = (reviews: (MenteeReview | MentorReview)[]): number[] => {
  return reviews.map(review => calculateReviewScore(review));
};
