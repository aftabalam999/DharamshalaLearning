import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getCurrentWeekStart } from '../../utils/reviewDateUtils';
import { calculateReviewScore, getReviewStatusLabel, calculateTrend } from '../../utils/reviewCalculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, AlertTriangle, Gauge, Award, BarChart3, Bell, Percent, Hash } from 'lucide-react';
import { ReviewReminderService } from '../../services/reviewReminderService';
import { User } from '../../types';

interface RawReview {
  id: string;
  reviewer_id: string;
  reviewer_name?: string;
  reviewer_email?: string;
  reviewee_id: string;
  reviewee_name?: string;
  week_start: any; // Firestore Timestamp
  created_at?: any;
  morning_exercise: number;
  communication: number;
  academic_effort: number;
  campus_contribution: number;
  behavioural: number;
  mentorship_level?: number;
}

interface PerformerEntry {
  userId: string;
  name: string;
  averageScore: number;
  status: string;
}

interface ScoreBucket {
  key: string;
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  color: string;
}

interface DistributionStats {
  totalReviews: number;
  averageScore: number;
  buckets: ScoreBucket[];
  topPerformers: PerformerEntry[];
  bottomPerformers: PerformerEntry[];
  criticalCount: number;
  goodOrExcellentCount: number;
  trendLabel?: string;
  trendChange?: number;
  trendPercent?: number;
  trendIcon?: '↑' | '↓' | '→';
  trendType?: 'improving' | 'declining' | 'stable';
}

interface Props {
  filters?: {
    campus?: string;
    house?: string;
  };
  weeksLookback?: number; // For aggregate comparison (default 4)
}

const ScoreDistributionAnalytics: React.FC<Props> = ({ filters, weeksLookback = 4 }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DistributionStats | null>(null);
  const [aggregateBuckets, setAggregateBuckets] = useState<ScoreBucket[]>([]);
  const [showPercentage, setShowPercentage] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);
  const [lowPerformers, setLowPerformers] = useState<Array<{ userId: string; name: string; score: number }>>([]);

  useEffect(() => {
    loadDistribution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, weeksLookback]);

  const loadDistribution = async () => {
    setLoading(true);
    try {
      const weekStart = getCurrentWeekStart();

      // Query current week reviews from both collections
      const menteeReviewsRef = collection(db, 'mentee_reviews');
      const mentorReviewsRef = collection(db, 'mentor_reviews');

      const menteeQuery = query(menteeReviewsRef, where('week_start', '==', weekStart));
      const mentorQuery = query(mentorReviewsRef, where('week_start', '==', weekStart));

      const [menteeSnapshot, mentorSnapshot] = await Promise.all([
        getDocs(menteeQuery),
        getDocs(mentorQuery)
      ]);

      const currentWeekReviews: RawReview[] = [];

      menteeSnapshot.docs.forEach(doc => {
        const data = doc.data();
        currentWeekReviews.push({ id: doc.id, ...(data as any) });
      });
      mentorSnapshot.docs.forEach(doc => {
        const data = doc.data();
        currentWeekReviews.push({ id: doc.id, ...(data as any) });
      });

      // Apply campus/house filters if provided (by looking up user documents)
      let filteredCurrent = currentWeekReviews;
      if (filters?.campus || filters?.house) {
        // Fetch users for mapping
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const userMap: Record<string, any> = {};
        usersSnapshot.docs.forEach(u => userMap[u.id] = u.data());
        filteredCurrent = currentWeekReviews.filter(r => {
          const user = userMap[r.reviewee_id] || userMap[r.reviewer_id];
          if (!user) return false;
          if (filters.campus && user.campus !== filters.campus) return false;
          if (filters.house && user.house !== filters.house) return false;
          return true;
        });
      }

      // Fetch lookback weeks reviews (for aggregate + trend comparison)
      const lookbackReviews: RawReview[] = [];
      for (let i = 1; i <= weeksLookback; i++) {
        const priorWeek = new Date(weekStart);
        priorWeek.setDate(priorWeek.getDate() - i * 7);
        const menteeQ = query(menteeReviewsRef, where('week_start', '==', priorWeek));
        const mentorQ = query(mentorReviewsRef, where('week_start', '==', priorWeek));
        const [mSnap, mrSnap] = await Promise.all([getDocs(menteeQ), getDocs(mentorQ)]);
        mSnap.docs.forEach(doc => lookbackReviews.push({ id: doc.id, ...(doc.data() as any) }));
        mrSnap.docs.forEach(doc => lookbackReviews.push({ id: doc.id, ...(doc.data() as any) }));
      }

      // Calculate scores per review
      const currentScores = filteredCurrent.map(r => ({
        review: r,
        score: calculateReviewScore(r as any)
      }));

      // Group by reviewee for performer lists (use average if multiple entries)
      const performerMap: Record<string, { name: string; scores: number[] }> = {};
      currentScores.forEach(({ review, score }) => {
        const name = review.reviewee_name || review.reviewee_id || 'Unknown';
        if (!performerMap[review.reviewee_id]) {
          performerMap[review.reviewee_id] = { name, scores: [] };
        }
        performerMap[review.reviewee_id].scores.push(score);
      });

      const performers: PerformerEntry[] = Object.entries(performerMap).map(([userId, info]) => {
        const avg = info.scores.reduce((s, v) => s + v, 0) / info.scores.length;
        return {
          userId,
          name: info.name,
          averageScore: Math.round(avg * 10) / 10,
          status: getReviewStatusLabel(avg)
        };
      });

      performers.sort((a, b) => b.averageScore - a.averageScore);
      const topPerformers = performers.slice(0, 5);
      const bottomPerformers = performers.slice(-5).reverse();

      // Define buckets
      const bucketDefs: Array<{ key: string; label: string; min: number; max: number; color: string }> = [
        { key: 'excellent', label: 'Excellent (1.5 – 2.0)', min: 1.5, max: 2.01, color: '#16a34a' },
        { key: 'good', label: 'Good (0.5 – 1.49)', min: 0.5, max: 1.5, color: '#2563eb' },
        { key: 'needs_improvement', label: 'Needs Improvement (-0.5 – 0.49)', min: -0.5, max: 0.5, color: '#d97706' },
        { key: 'critical', label: 'Critical (-2.0 – -0.51)', min: -2.01, max: -0.5, color: '#dc2626' }
      ];

      const bucketCounts: ScoreBucket[] = bucketDefs.map(def => ({
        key: def.key,
        label: def.label,
        min: def.min,
        max: def.max,
        count: 0,
        percentage: 0,
        color: def.color
      }));

      currentScores.forEach(({ score }) => {
        const bucket = bucketCounts.find(b => score >= b.min && score < b.max);
        if (bucket) bucket.count += 1;
      });

      const totalReviews = currentScores.length;
      bucketCounts.forEach(b => {
        b.percentage = totalReviews === 0 ? 0 : Math.round((b.count / totalReviews) * 1000) / 10;
      });

      const avgScore = totalReviews === 0 ? 0 : Math.round((currentScores.reduce((s, r) => s + r.score, 0) / totalReviews) * 10) / 10;

      // Trend calculation (using reviewCalculations helper on combined data)
      const trend = calculateTrend([...filteredCurrent as any, ...lookbackReviews as any]);

      // Aggregate buckets over lookback period
      const lookbackScores = lookbackReviews.map(r => calculateReviewScore(r as any));
      const aggregateBucketCounts: ScoreBucket[] = bucketDefs.map(def => ({
        key: def.key,
        label: def.label,
        min: def.min,
        max: def.max,
        count: 0,
        percentage: 0,
        color: def.color
      }));
      lookbackScores.forEach(score => {
        const bucket = aggregateBucketCounts.find(b => score >= b.min && score < b.max);
        if (bucket) bucket.count += 1;
      });
      const totalLookback = lookbackScores.length;
      aggregateBucketCounts.forEach(b => {
        b.percentage = totalLookback === 0 ? 0 : Math.round((b.count / totalLookback) * 1000) / 10;
      });

      // Critical & Good+ counts
      const criticalCount = bucketCounts.find(b => b.key === 'critical')?.count || 0;
      const goodOrExcellentCount = (bucketCounts.find(b => b.key === 'excellent')?.count || 0) + (bucketCounts.find(b => b.key === 'good')?.count || 0);

      const distStats: DistributionStats = {
        totalReviews,
        averageScore: avgScore,
        buckets: bucketCounts,
        topPerformers,
        bottomPerformers,
        criticalCount,
        goodOrExcellentCount,
        trendLabel: trend ? trend.trend : undefined,
        trendChange: trend ? trend.change : undefined,
        trendPercent: trend ? trend.percentChange : undefined,
        trendIcon: trend ? trend.trendIcon : undefined,
        trendType: trend ? trend.trend : undefined
      };

      // Identify low performers (critical or needs improvement)
      const lowPerformerList = performers.filter(p => p.averageScore < 0.5).map(p => ({
        userId: p.userId,
        name: p.name,
        score: p.averageScore
      }));

      setStats(distStats);
      setAggregateBuckets(aggregateBucketCounts);
      setLowPerformers(lowPerformerList);
    } catch (e) {
      console.error('Error loading score distribution analytics:', e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIconComponent = () => {
    if (!stats?.trendType) return <Minus className="h-5 w-5 text-gray-400" />;
    if (stats.trendType === 'improving') return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (stats.trendType === 'declining') return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-400" />;
  };

  const handleBulkReminder = async () => {
    if (lowPerformers.length === 0) {
      alert('No low performers to send reminders to.');
      return;
    }

    const confirmed = window.confirm(
      `Send review reminders to ${lowPerformers.length} low performer${lowPerformers.length > 1 ? 's' : ''} (score < 0.5)?\n\nThis will notify them to improve their review scores.`
    );

    if (!confirmed) return;

    setSendingReminders(true);
    setReminderSuccess(null);

    try {
      // Fetch full user objects for low performers
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap: Record<string, User> = {};
      usersSnapshot.docs.forEach(doc => {
        userMap[doc.id] = { id: doc.id, ...(doc.data() as any) } as User;
      });

      let successCount = 0;
      let failCount = 0;

      for (const performer of lowPerformers) {
        const user = userMap[performer.userId];
        if (!user) {
          failCount++;
          continue;
        }

        // Get pending reviews for this user
        const pending: Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }> = [];

        // Check if mentor needs to review mentees
        if (user.isMentor) {
          const menteesRef = collection(db, 'users');
          const menteesQuery = query(menteesRef, where('mentor_id', '==', user.id));
          const menteesSnapshot = await getDocs(menteesQuery);
          
          for (const menteeDoc of menteesSnapshot.docs) {
            const mentee = { id: menteeDoc.id, ...menteeDoc.data() } as User;
            pending.push({
              user_id: mentee.id,
              user_name: mentee.name,
              role: 'mentee'
            });
          }
        }

        // Check if student needs to review mentor
        if (user.mentor_id) {
          const mentorSnapshot = await getDocs(
            query(collection(db, 'users'), where('__name__', '==', user.mentor_id))
          );
          if (!mentorSnapshot.empty) {
            const mentor = mentorSnapshot.docs[0].data() as User;
            pending.push({
              user_id: user.mentor_id,
              user_name: mentor.name,
              role: 'mentor'
            });
          }
        }

        if (pending.length === 0) {
          continue; // Skip if no pending reviews
        }

        // Send reminder via ReviewReminderService
        const sent = await ReviewReminderService.sendReminder(
          user,
          'morning_reminder',
          pending,
          undefined
        );

        if (sent) {
          successCount++;
        } else {
          failCount++;
        }
      }

      setReminderSuccess(`✅ Reminders sent to ${successCount} user${successCount !== 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setReminderSuccess(null), 5000);

    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      alert('Failed to send reminders. Please try again.');
    } finally {
      setSendingReminders(false);
    }
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
              Score Distribution Analytics
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Current week review score distribution across all criteria averages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle for Percentage/Count View */}
            <button
              onClick={() => setShowPercentage(!showPercentage)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center ${
                showPercentage
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Toggle between count and percentage view"
            >
              {showPercentage ? (
                <>
                  <Percent className="h-4 w-4 mr-1" />
                  Percentage
                </>
              ) : (
                <>
                  <Hash className="h-4 w-4 mr-1" />
                  Count
                </>
              )}
            </button>

            {/* Bulk Reminder Button */}
            <button
              onClick={handleBulkReminder}
              disabled={sendingReminders || lowPerformers.length === 0}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center ${
                lowPerformers.length === 0 || sendingReminders
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
              title={`Send reminders to ${lowPerformers.length} low performer${lowPerformers.length !== 1 ? 's' : ''}`}
            >
              <Bell className="h-4 w-4 mr-1" />
              {sendingReminders ? 'Sending...' : `Remind Low Performers (${lowPerformers.length})`}
            </button>
          </div>
        </div>
        
        {/* Success Message */}
        {reminderSuccess && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">{reminderSuccess}</p>
          </div>
        )}
      </div>

      {!stats || stats.totalReviews === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No review scores available for the current week.</p>
        </div>
      ) : (
        <div className="p-6 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-700">Avg Score</span>
                <Gauge className="h-4 w-4 text-purple-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-purple-900">{stats.averageScore.toFixed(1)}</p>
              {stats.trendChange !== undefined && (
                <p className="text-xs mt-1 flex items-center">
                  {getTrendIconComponent()}
                  <span className={`ml-1 ${stats.trendType === 'improving' ? 'text-green-600' : stats.trendType === 'declining' ? 'text-red-600' : 'text-gray-600'}`}>Week {stats.trendType === 'improving' ? 'up' : stats.trendType === 'declining' ? 'down' : 'stable'} {stats.trendChange > 0 ? '+' : ''}{stats.trendChange.toFixed(1)}</span>
                </p>
              )}
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Good / Excellent</span>
                <Award className="h-4 w-4 text-green-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-green-900">{stats.goodOrExcellentCount}</p>
              <p className="text-xs text-green-700 mt-1">{Math.round(((stats.goodOrExcellentCount)/(stats.totalReviews||1))*100)}% of reviews</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">Critical</span>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-red-900">{stats.criticalCount}</p>
              <p className="text-xs text-red-700 mt-1">{Math.round(((stats.criticalCount)/(stats.totalReviews||1))*100)}% require attention</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700">Total Reviews</span>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-blue-900">{stats.totalReviews}</p>
              <p className="text-xs text-blue-700 mt-1">Current week coverage</p>
            </div>
          </div>

          {/* Alerts */}
          {(stats.criticalCount / stats.totalReviews > 0.2) && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-800">High Critical Proportion</p>
                  <p className="text-xs text-red-700 mt-1">{Math.round((stats.criticalCount / stats.totalReviews) * 100)}% of reviews are in Critical range. Consider targeted interventions.</p>
                </div>
              </div>
            </div>
          )}

          {/* Bucket Distribution Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Week Distribution</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.buckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} label={{ value: showPercentage ? 'Percentage (%)' : 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => {
                      if (showPercentage) {
                        return [`${value}%`, 'Percentage'];
                      }
                      return [`${value} reviews`, 'Count'];
                    }} 
                  />
                  <Bar dataKey={showPercentage ? 'percentage' : 'count'}>
                    {stats.buckets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Aggregate Lookback Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Last {weeksLookback} Weeks Aggregate Distribution</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregateBuckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} label={{ value: showPercentage ? 'Percentage (%)' : 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                  <Tooltip 
                    formatter={(value: any) => {
                      if (showPercentage) {
                        return [`${value}%`, 'Percentage'];
                      }
                      return [`${value} reviews`, 'Count'];
                    }} 
                  />
                  <Bar dataKey={showPercentage ? 'percentage' : 'count'}>
                    {aggregateBuckets.map((entry, index) => (
                      <Cell key={`cell-agg-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top & Bottom Performers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Performers</h4>
              <ul className="divide-y divide-gray-200">
                {stats.topPerformers.map(p => (
                  <li key={p.userId} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.status}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{p.averageScore.toFixed(1)}</span>
                  </li>
                ))}
                {stats.topPerformers.length === 0 && (
                  <li className="py-2 text-sm text-gray-500">No data</li>
                )}
              </ul>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Lowest Performers</h4>
              <ul className="divide-y divide-gray-200">
                {stats.bottomPerformers.map(p => (
                  <li key={p.userId} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.status}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600">{p.averageScore.toFixed(1)}</span>
                  </li>
                ))}
                {stats.bottomPerformers.length === 0 && (
                  <li className="py-2 text-sm text-gray-500">No data</li>
                )}
              </ul>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ScoreDistributionAnalytics;
