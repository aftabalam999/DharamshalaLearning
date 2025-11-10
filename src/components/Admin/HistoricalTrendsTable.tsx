import React, { useState, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getCurrentWeekStart } from '../../utils/reviewDateUtils';

interface WeeklyTrend {
  weekStart: Date;
  weekLabel: string;
  totalDue: number;
  completed: number;
  onTime: number;
  late: number;
  neverSubmitted: number;
  completionRate: number;
  onTimeRate: number;
  change: number; // vs previous week
  trend: 'improving' | 'declining' | 'stable';
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface Props {
  filters?: {
    campus: string;
    house: string;
    role: 'all' | 'student' | 'mentor';
  };
  weeksToShow?: number; // Default 8
}

const HistoricalTrendsTable: React.FC<Props> = ({ filters, weeksToShow = 8 }) => {
  const [trends, setTrends] = useState<WeeklyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    averageCompletionRate: 0,
    improvingWeeks: 0,
    decliningWeeks: 0,
    criticalWeeks: 0
  });

  useEffect(() => {
    loadHistoricalTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, weeksToShow]);

  const loadHistoricalTrends = async () => {
    setLoading(true);
    try {
      const currentWeek = getCurrentWeekStart();
      const trendsList: WeeklyTrend[] = [];

      // Generate list of past N weeks
      for (let i = 0; i < weeksToShow; i++) {
        const weekStart = new Date(currentWeek);
        weekStart.setDate(weekStart.getDate() - (i * 7));

        const weekData = await calculateWeeklyStats(weekStart);
        trendsList.push(weekData);
      }

      // Calculate week-over-week changes
      for (let i = 0; i < trendsList.length - 1; i++) {
        const current = trendsList[i];
        const previous = trendsList[i + 1];
        current.change = current.completionRate - previous.completionRate;
        
        if (current.change > 5) current.trend = 'improving';
        else if (current.change < -5) current.trend = 'declining';
        else current.trend = 'stable';
      }

      // Calculate overall stats
      const avgCompletion = trendsList.reduce((sum, t) => sum + t.completionRate, 0) / trendsList.length;
      const improving = trendsList.filter(t => t.trend === 'improving').length;
      const declining = trendsList.filter(t => t.trend === 'declining').length;
      const critical = trendsList.filter(t => t.status === 'critical').length;

      setOverallStats({
        averageCompletionRate: Number(avgCompletion.toFixed(1)),
        improvingWeeks: improving,
        decliningWeeks: declining,
        criticalWeeks: critical
      });

      setTrends(trendsList);
    } catch (error) {
      console.error('Error loading historical trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyStats = async (weekStart: Date): Promise<WeeklyTrend> => {
    // Get deadline for this week (Monday 23:59:59)
    const deadline = new Date(weekStart);
    deadline.setDate(deadline.getDate() + 2); // Monday
    deadline.setHours(23, 59, 59, 999);

    let totalDue = 0;
    let completed = 0;
    let onTime = 0;
    let late = 0;

    // Get all users (potential reviewers)
    const usersRef = collection(db, 'users');
    let usersQuery = query(usersRef);

    if (filters?.campus && filters.campus !== 'all') {
      usersQuery = query(usersQuery, where('campus', '==', filters.campus));
    }

    const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          mentees: data.mentees as string[] | undefined,
          mentor_id: data.mentor_id as string | undefined
        };
      });

    // Check mentee_reviews (mentors reviewing mentees)
    for (const user of users) {
      // Skip if filtering by role
      if (filters?.role === 'student') continue; // Only check mentor reviews
      
      // Check if user is a mentor (has mentees)
      if (!user.mentees || user.mentees.length === 0) continue;

      const mentees = user.mentees as string[];
      for (const menteeId of mentees) {
        totalDue++;

        // Check if review was submitted
        const reviewsRef = collection(db, 'mentee_reviews');
        const reviewQuery = query(
          reviewsRef,
          where('reviewer_id', '==', user.id),
          where('reviewee_id', '==', menteeId),
          where('week_start', '==', weekStart)
        );
        const reviewSnapshot = await getDocs(reviewQuery);

        if (reviewSnapshot.size > 0) {
          completed++;
          const review = reviewSnapshot.docs[0].data();
          const submittedAt = review.created_at?.toDate?.() || new Date();
          
          if (submittedAt <= deadline) {
            onTime++;
          } else {
            late++;
          }
        }
      }
    }

    // Check mentor_reviews (students reviewing mentors)
    for (const user of users) {
      // Skip if filtering by role
      if (filters?.role === 'mentor') continue; // Only check student reviews
      
      // Check if user has a mentor (is a student)
      if (!user.mentor_id) continue;

      totalDue++;

      // Check if review was submitted
      const reviewsRef = collection(db, 'mentor_reviews');
      const reviewQuery = query(
        reviewsRef,
        where('student_id', '==', user.id),
        where('mentor_id', '==', user.mentor_id),
        where('week_start', '==', weekStart)
      );
      const reviewSnapshot = await getDocs(reviewQuery);

      if (reviewSnapshot.size > 0) {
        completed++;
        const review = reviewSnapshot.docs[0].data();
        const submittedAt = review.created_at?.toDate?.() || new Date();
        
        if (submittedAt <= deadline) {
          onTime++;
        } else {
          late++;
        }
      }
    }

    const neverSubmitted = totalDue - completed;
    const completionRate = totalDue > 0 ? (completed / totalDue) * 100 : 0;
    const onTimeRate = totalDue > 0 ? (onTime / totalDue) * 100 : 0;

    // Determine status
    let status: WeeklyTrend['status'] = 'good';
    if (completionRate >= 95) status = 'excellent';
    else if (completionRate >= 85) status = 'good';
    else if (completionRate >= 70) status = 'warning';
    else status = 'critical';

    return {
      weekStart,
      weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalDue,
      completed,
      onTime,
      late,
      neverSubmitted,
      completionRate: Number(completionRate.toFixed(1)),
      onTimeRate: Number(onTimeRate.toFixed(1)),
      change: 0, // Will be calculated after all weeks loaded
      trend: 'stable',
      status
    };
  };

  const getStatusColor = (status: WeeklyTrend['status']) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
    }
  };

  const getStatusIcon = (status: WeeklyTrend['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4" />;
      case 'good': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: WeeklyTrend['trend']) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProgressBarColor = (rate: number) => {
    if (rate >= 95) return 'bg-green-500';
    if (rate >= 85) return 'bg-blue-500';
    if (rate >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
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
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Historical Trends ({weeksToShow} Weeks)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Week-by-week completion rate analysis
            </p>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Avg Completion</p>
            <p className="text-2xl font-bold text-gray-900">
              {overallStats.averageCompletionRate}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Improving</p>
            <p className="text-2xl font-bold text-green-600">
              {overallStats.improvingWeeks}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Declining</p>
            <p className="text-2xl font-bold text-red-600">
              {overallStats.decliningWeeks}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Critical Weeks</p>
            <p className="text-2xl font-bold text-orange-600">
              {overallStats.criticalWeeks}
            </p>
          </div>
        </div>
      </div>

      {/* Trends Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week Start
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Due
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                On Time
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Late
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Never Submitted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completion Rate
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Change
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trends.map((trend, index) => (
              <tr 
                key={trend.weekLabel}
                className={`hover:bg-gray-50 ${
                  index === 0 ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {trend.weekLabel}
                        {index === 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {trend.weekStart.toLocaleDateString('en-US', { year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-medium text-gray-900">
                    {trend.totalDue}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-semibold text-green-600">
                    {trend.completed}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm text-blue-600">
                    {trend.onTime}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm text-orange-600">
                    {trend.late}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-semibold text-red-600">
                    {trend.neverSubmitted}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {trend.completionRate}%
                      </span>
                      <span className="text-xs text-gray-500">
                        ({trend.onTimeRate}% on time)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressBarColor(trend.completionRate)}`}
                        style={{ width: `${trend.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {index < trends.length - 1 ? (
                    <div className="flex items-center justify-center">
                      {getTrendIcon(trend.trend)}
                      <span
                        className={`text-sm font-medium ml-1 ${
                          trend.change > 0
                            ? 'text-green-600'
                            : trend.change < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {trend.change > 0 ? '+' : ''}
                        {trend.change.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      trend.status
                    )}`}
                  >
                    {getStatusIcon(trend.status)}
                    <span className="ml-1">
                      {trend.status.charAt(0).toUpperCase() + trend.status.slice(1)}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alerts */}
      {overallStats.decliningWeeks >= 2 && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Declining Trend Detected
              </p>
              <p className="text-sm text-red-700 mt-1">
                {overallStats.decliningWeeks} weeks show declining completion rates. 
                Consider sending bulk reminders or investigating systemic issues.
              </p>
            </div>
          </div>
        </div>
      )}

      {overallStats.averageCompletionRate < 85 && (
        <div className="p-4 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">
                Below Target Completion Rate
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Average completion rate ({overallStats.averageCompletionRate}%) is below the 85% target. 
                Review notification settings and deadline enforcement.
              </p>
            </div>
          </div>
        </div>
      )}

      {trends.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No historical data available.</p>
        </div>
      )}
    </div>
  );
};

export default HistoricalTrendsTable;
