import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertCircle,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getCurrentWeekStart } from '../../utils/reviewDateUtils';

interface CriteriaScore {
  name: string;
  key: string;
  score: number;
  previousScore?: number;
  change?: number;
  campusAverage?: number;
  vsAverage?: number;
  status: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  trend: 'improving' | 'declining' | 'stable';
}

interface ReviewBreakdown {
  userId: string;
  userName: string;
  userEmail: string;
  revieweeId: string;
  revieweeName: string;
  weekStart: Date;
  submittedAt: Date;
  overallScore: number;
  previousOverallScore?: number;
  criteria: CriteriaScore[];
  notes?: string;
  hasRedFlags: boolean;
  redFlagCount: number;
  strengths: string[];
  needsAttention: string[];
}

interface Props {
  viewType: 'mentor' | 'student' | 'all';
  userId?: string; // Specific user to view
  filters?: {
    campus: string;
    house: string;
    dateRange: string;
  };
}

const ScoreBreakdownTable: React.FC<Props> = ({ viewType, userId, filters }) => {
  const [breakdowns, setBreakdowns] = useState<ReviewBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  const criteriaNames = {
    morning_exercise: 'Morning Exercise',
    communication: 'Communication',
    academic_effort: 'Academic Effort',
    campus_contribution: 'Campus Contribution',
    behavioural: 'Behavioural',
    mentorship_level: 'Mentorship Level'
  };

  useEffect(() => {
    loadScoreBreakdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewType, userId, filters]);

  const loadScoreBreakdowns = async () => {
    setLoading(true);
    try {
      const weekStart = getCurrentWeekStart();
      const breakdownList: ReviewBreakdown[] = [];

      if (viewType === 'mentor' && userId) {
        // Load mentor's reviews of their mentees
        await loadMentorBreakdowns(userId, weekStart, breakdownList);
      } else if (viewType === 'student' && userId) {
        // Load student's reviews from their mentor
        await loadStudentBreakdowns(userId, weekStart, breakdownList);
      } else {
        // Load all reviews (admin view)
        await loadAllBreakdowns(weekStart, breakdownList);
      }

      setBreakdowns(breakdownList);
    } catch (error) {
      console.error('Error loading score breakdowns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMentorBreakdowns = async (
    mentorId: string,
    weekStart: Date,
    breakdownList: ReviewBreakdown[]
  ) => {
    // Get current week reviews
    const reviewsRef = collection(db, 'mentee_reviews');
    const reviewsQuery = query(
      reviewsRef,
      where('reviewer_id', '==', mentorId),
      where('week_start', '==', weekStart)
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);

    for (const reviewDoc of reviewsSnapshot.docs) {
      const review = reviewDoc.data();
      
      // Get mentee info
      const menteeSnapshot = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', review.reviewee_id))
      );
      const menteeName = menteeSnapshot.docs[0]?.data()?.name || 'Unknown';

      // Get previous week's review for comparison
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevReviewQuery = query(
        reviewsRef,
        where('reviewer_id', '==', mentorId),
        where('reviewee_id', '==', review.reviewee_id),
        where('week_start', '==', prevWeekStart)
      );
      const prevReviewSnapshot = await getDocs(prevReviewQuery);
      const prevReview = prevReviewSnapshot.docs[0]?.data();

      // Get campus averages for comparison
      const campusAvg = await calculateCampusAverages(weekStart);

      const breakdown = buildReviewBreakdown(
        mentorId,
        review.reviewer_name || 'Mentor',
        review.reviewer_email || '',
        review.reviewee_id,
        menteeName,
        review,
        prevReview,
        campusAvg
      );

      breakdownList.push(breakdown);
    }
  };

  const loadStudentBreakdowns = async (
    studentId: string,
    weekStart: Date,
    breakdownList: ReviewBreakdown[]
  ) => {
    // Get student's mentor
    const studentSnapshot = await getDocs(
      query(collection(db, 'users'), where('__name__', '==', studentId))
    );
    const studentData = studentSnapshot.docs[0]?.data();
    const mentorId = studentData?.mentor_id;

    if (!mentorId) return;

    // Get mentor's review of this student
    const reviewsRef = collection(db, 'mentee_reviews');
    const reviewsQuery = query(
      reviewsRef,
      where('reviewer_id', '==', mentorId),
      where('reviewee_id', '==', studentId),
      where('week_start', '==', weekStart)
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);

    if (reviewsSnapshot.empty) return;

    const review = reviewsSnapshot.docs[0].data();

    // Get mentor info
    const mentorSnapshot = await getDocs(
      query(collection(db, 'users'), where('__name__', '==', mentorId))
    );
    const mentorName = mentorSnapshot.docs[0]?.data()?.name || 'Unknown';
    const mentorEmail = mentorSnapshot.docs[0]?.data()?.email || '';

    // Get previous week's review
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevReviewQuery = query(
      reviewsRef,
      where('reviewer_id', '==', mentorId),
      where('reviewee_id', '==', studentId),
      where('week_start', '==', prevWeekStart)
    );
    const prevReviewSnapshot = await getDocs(prevReviewQuery);
    const prevReview = prevReviewSnapshot.docs[0]?.data();

    // Get campus averages
    const campusAvg = await calculateCampusAverages(weekStart);

    const breakdown = buildReviewBreakdown(
      mentorId,
      mentorName,
      mentorEmail,
      studentId,
      studentData?.name || 'Student',
      review,
      prevReview,
      campusAvg
    );

    breakdownList.push(breakdown);
  };

  const loadAllBreakdowns = async (
    weekStart: Date,
    breakdownList: ReviewBreakdown[]
  ) => {
    // Get all current week reviews
    const reviewsRef = collection(db, 'mentee_reviews');
    const reviewsQuery = query(
      reviewsRef,
      where('week_start', '==', weekStart)
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);

    const campusAvg = await calculateCampusAverages(weekStart);

    for (const reviewDoc of reviewsSnapshot.docs) {
      const review = reviewDoc.data();

      // Get user info
      const reviewerSnapshot = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', review.reviewer_id))
      );
      const revieweeSnapshot = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', review.reviewee_id))
      );

      const reviewerName = reviewerSnapshot.docs[0]?.data()?.name || 'Unknown';
      const reviewerEmail = reviewerSnapshot.docs[0]?.data()?.email || '';
      const revieweeName = revieweeSnapshot.docs[0]?.data()?.name || 'Unknown';

      // Get previous week's review
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevReviewQuery = query(
        reviewsRef,
        where('reviewer_id', '==', review.reviewer_id),
        where('reviewee_id', '==', review.reviewee_id),
        where('week_start', '==', prevWeekStart)
      );
      const prevReviewSnapshot = await getDocs(prevReviewQuery);
      const prevReview = prevReviewSnapshot.docs[0]?.data();

      const breakdown = buildReviewBreakdown(
        review.reviewer_id,
        reviewerName,
        reviewerEmail,
        review.reviewee_id,
        revieweeName,
        review,
        prevReview,
        campusAvg
      );

      breakdownList.push(breakdown);
    }
  };

  const calculateCampusAverages = async (weekStart: Date) => {
    const reviewsRef = collection(db, 'mentee_reviews');
    const reviewsQuery = query(reviewsRef, where('week_start', '==', weekStart));
    const snapshot = await getDocs(reviewsQuery);

    if (snapshot.empty) {
      return {
        morning_exercise: 0,
        communication: 0,
        academic_effort: 0,
        campus_contribution: 0,
        behavioural: 0,
        mentorship_level: 0
      };
    }

    const totals = {
      morning_exercise: 0,
      communication: 0,
      academic_effort: 0,
      campus_contribution: 0,
      behavioural: 0,
      mentorship_level: 0
    };

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totals.morning_exercise += data.morning_exercise || 0;
      totals.communication += data.communication || 0;
      totals.academic_effort += data.academic_effort || 0;
      totals.campus_contribution += data.campus_contribution || 0;
      totals.behavioural += data.behavioural || 0;
      totals.mentorship_level += data.mentorship_level || 0;
    });

    const count = snapshot.size;
    return {
      morning_exercise: totals.morning_exercise / count,
      communication: totals.communication / count,
      academic_effort: totals.academic_effort / count,
      campus_contribution: totals.campus_contribution / count,
      behavioural: totals.behavioural / count,
      mentorship_level: totals.mentorship_level / count
    };
  };

  const buildReviewBreakdown = (
    userId: string,
    userName: string,
    userEmail: string,
    revieweeId: string,
    revieweeName: string,
    review: any,
    prevReview: any,
    campusAvg: any
  ): ReviewBreakdown => {
    const criteria: CriteriaScore[] = [];
    let redFlagCount = 0;
    const strengths: string[] = [];
    const needsAttention: string[] = [];

    // Process each criteria
    Object.entries(criteriaNames).forEach(([key, name]) => {
      const score = review[key] || 0;
      const previousScore = prevReview?.[key];
      const change = previousScore !== undefined ? score - previousScore : undefined;
      const campusAverage = campusAvg[key] || 0;
      const vsAverage = score - campusAverage;

      // Determine status
      let status: CriteriaScore['status'] = 'average';
      if (score >= 1.5) status = 'excellent';
      else if (score >= 0.5) status = 'good';
      else if (score >= -0.5) status = 'average';
      else if (score >= -1.5) status = 'poor';
      else status = 'critical';

      // Determine trend
      let trend: CriteriaScore['trend'] = 'stable';
      if (change !== undefined) {
        if (change > 0.3) trend = 'improving';
        else if (change < -0.3) trend = 'declining';
      }

      // Check for red flags
      if (score < -1.0 || (change !== undefined && change < -0.5)) {
        redFlagCount++;
        needsAttention.push(name);
      }

      // Check for strengths
      if (score >= 1.5 || vsAverage >= 0.5) {
        strengths.push(name);
      }

      criteria.push({
        name,
        key,
        score,
        previousScore,
        change,
        campusAverage,
        vsAverage,
        status,
        trend
      });
    });

    // Calculate overall scores
    const scores = criteria.map(c => c.score);
    const overallScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const prevScores = criteria
      .map(c => c.previousScore)
      .filter(s => s !== undefined) as number[];
    const previousOverallScore =
      prevScores.length > 0
        ? prevScores.reduce((sum, s) => sum + s, 0) / prevScores.length
        : undefined;

    return {
      userId,
      userName,
      userEmail,
      revieweeId,
      revieweeName,
      weekStart: review.week_start?.toDate() || new Date(),
      submittedAt: review.created_at?.toDate() || new Date(),
      overallScore: Number(overallScore.toFixed(2)),
      previousOverallScore: previousOverallScore
        ? Number(previousOverallScore.toFixed(2))
        : undefined,
      criteria,
      notes: review.notes,
      hasRedFlags: redFlagCount > 0,
      redFlagCount,
      strengths,
      needsAttention
    };
  };

  const toggleRowExpansion = (revieweeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(revieweeId)) {
      newExpanded.delete(revieweeId);
    } else {
      newExpanded.add(revieweeId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(breakdowns.map(b => b.revieweeId)));
    }
    setExpandAll(!expandAll);
  };

  const getStatusIcon = (status: CriteriaScore['status']) => {
    switch (status) {
      case 'excellent':
        return <Award className="h-4 w-4 text-green-600" />;
      case 'good':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'average':
        return <Minus className="h-4 w-4 text-yellow-600" />;
      case 'poor':
        return <TrendingDown className="h-4 w-4 text-orange-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: CriteriaScore['status']) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 font-semibold';
      case 'good':
        return 'text-green-500 font-medium';
      case 'average':
        return 'text-yellow-600';
      case 'poor':
        return 'text-orange-600 font-medium';
      case 'critical':
        return 'text-red-600 font-semibold';
    }
  };

  const getTrendIcon = (trend: CriteriaScore['trend'], change?: number) => {
    if (trend === 'stable') {
      return <Minus className="h-3 w-3 text-gray-400" />;
    }
    if (trend === 'improving') {
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    }
    return <TrendingDown className="h-3 w-3 text-red-600" />;
  };

  const formatScore = (score: number) => {
    return score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1);
  };

  const formatChange = (change?: number) => {
    if (change === undefined) return 'N/A';
    if (change === 0) return 'Same';
    return change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
              Detailed Score Breakdown
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {breakdowns.length} review{breakdowns.length !== 1 ? 's' : ''} found
              {breakdowns.filter(b => b.hasRedFlags).length > 0 && (
                <span className="ml-2 text-red-600 font-medium">
                  • {breakdowns.filter(b => b.hasRedFlags).length} with red flags
                </span>
              )}
            </p>
          </div>
          <button
            onClick={toggleExpandAll}
            className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors flex items-center"
          >
            {expandAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand All
              </>
            )}
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {breakdowns.map((breakdown) => (
          <div key={breakdown.revieweeId} className="hover:bg-gray-50 transition-colors">
            {/* Header Row */}
            <div
              className="p-6 cursor-pointer flex items-center justify-between"
              onClick={() => toggleRowExpansion(breakdown.revieweeId)}
            >
              <div className="flex items-center space-x-4 flex-1">
                <button className="text-gray-400 hover:text-gray-600">
                  {expandedRows.has(breakdown.revieweeId) ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-base font-semibold text-gray-900">
                      {breakdown.revieweeName}
                    </h4>
                    {breakdown.hasRedFlags && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {breakdown.redFlagCount} Red Flag{breakdown.redFlagCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Reviewed by {breakdown.userName} • Overall: {formatScore(breakdown.overallScore)}
                    {breakdown.previousOverallScore !== undefined && (
                      <span className="ml-2">
                        (
                        {breakdown.overallScore > breakdown.previousOverallScore ? (
                          <span className="text-green-600">
                            ↑ +{(breakdown.overallScore - breakdown.previousOverallScore).toFixed(1)}
                          </span>
                        ) : breakdown.overallScore < breakdown.previousOverallScore ? (
                          <span className="text-red-600">
                            ↓ {(breakdown.overallScore - breakdown.previousOverallScore).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-500">Same</span>
                        )}
                        )
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {breakdown.submittedAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedRows.has(breakdown.revieweeId) && (
              <div className="px-6 pb-6 bg-gray-50">
                {/* Criteria Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Criteria
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Score
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          vs Campus Avg
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          vs Prev Week
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {breakdown.criteria.map((criteria) => (
                        <tr key={criteria.key} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              {getStatusIcon(criteria.status)}
                              <span className="ml-2 text-sm font-medium text-gray-900">
                                {criteria.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-semibold ${getStatusColor(criteria.status)}`}>
                              {formatScore(criteria.score)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center">
                              <span
                                className={`text-sm ${
                                  criteria.vsAverage && criteria.vsAverage > 0
                                    ? 'text-green-600'
                                    : criteria.vsAverage && criteria.vsAverage < 0
                                    ? 'text-red-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {criteria.vsAverage
                                  ? formatScore(criteria.vsAverage)
                                  : '—'}
                              </span>
                              {criteria.vsAverage && criteria.vsAverage > 0 && (
                                <TrendingUp className="h-3 w-3 ml-1 text-green-600" />
                              )}
                              {criteria.vsAverage && criteria.vsAverage < 0 && (
                                <TrendingDown className="h-3 w-3 ml-1 text-red-600" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center">
                              {getTrendIcon(criteria.trend, criteria.change)}
                              <span
                                className={`text-sm ml-1 ${
                                  criteria.trend === 'improving'
                                    ? 'text-green-600'
                                    : criteria.trend === 'declining'
                                    ? 'text-red-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {formatChange(criteria.change)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                criteria.status === 'excellent'
                                  ? 'bg-green-100 text-green-800'
                                  : criteria.status === 'good'
                                  ? 'bg-green-50 text-green-700'
                                  : criteria.status === 'average'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : criteria.status === 'poor'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {criteria.status === 'excellent' && '🌟 '}
                              {criteria.status === 'critical' && '🚨 '}
                              {criteria.status.charAt(0).toUpperCase() + criteria.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Insights Section */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  {breakdown.strengths.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-green-900 flex items-center mb-2">
                        <Award className="h-4 w-4 mr-2" />
                        Strengths
                      </h5>
                      <ul className="space-y-1">
                        {breakdown.strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm text-green-800">
                            • {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Needs Attention */}
                  {breakdown.needsAttention.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-red-900 flex items-center mb-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Needs Attention
                      </h5>
                      <ul className="space-y-1">
                        {breakdown.needsAttention.map((item, idx) => (
                          <li key={idx} className="text-sm text-red-800">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {breakdown.notes && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-blue-900 flex items-center mb-2">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Mentor Notes
                    </h5>
                    <p className="text-sm text-blue-800">{breakdown.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {breakdowns.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No reviews found for the selected criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ScoreBreakdownTable;
