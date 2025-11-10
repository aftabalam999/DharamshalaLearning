import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getCurrentWeekStart } from '../../utils/reviewDateUtils';
import { TrendingUp, TrendingDown, Minus, BarChart2, Award, AlertCircle, Target, TrendingDown as Declining } from 'lucide-react';
import { useDataCache, generateCacheKey } from '../../contexts/DataCacheContext';

interface CriteriaPerformance {
  name: string;
  key: string;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  trend: 'improving' | 'declining' | 'stable';
  trendChange: number;
  reviewCount: number;
  status: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
}

interface Props {
  filters?: {
    campus?: string;
    house?: string;
  };
  weeksLookback?: number;
}

const CriteriaPerformanceBreakdown: React.FC<Props> = ({ filters, weeksLookback = 4 }) => {
  const { getCachedData } = useDataCache();
  const [loading, setLoading] = useState(true);
  const [criteriaData, setCriteriaData] = useState<CriteriaPerformance[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  const criteriaNames: Record<string, string> = {
    morning_exercise: 'Morning Exercise',
    communication: 'Communication',
    academic_effort: 'Academic Effort',
    campus_contribution: 'Campus Contribution',
    behavioural: 'Behavioural',
    mentorship_level: 'Mentorship Level'
  };

  useEffect(() => {
    loadCriteriaPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, weeksLookback]);

  const fetchCriteriaData = async () => {
    // Fetch fresh data (will be wrapped by cache)
    try {
      const weekStart = getCurrentWeekStart();
      
      // Get current week reviews
      const menteeReviewsRef = collection(db, 'mentee_reviews');
      const mentorReviewsRef = collection(db, 'mentor_reviews');
      
      const currentMenteeQuery = query(menteeReviewsRef, where('week_start', '==', weekStart));
      const currentMentorQuery = query(mentorReviewsRef, where('week_start', '==', weekStart));
      
      const [currentMenteeSnap, currentMentorSnap] = await Promise.all([
        getDocs(currentMenteeQuery),
        getDocs(currentMentorQuery)
      ]);

      // Get previous period reviews for trend
      const prevWeek = new Date(weekStart);
      prevWeek.setDate(prevWeek.getDate() - 7 * weeksLookback);
      
      const prevMenteeQuery = query(menteeReviewsRef, where('week_start', '>=', prevWeek), where('week_start', '<', weekStart));
      const prevMentorQuery = query(mentorReviewsRef, where('week_start', '>=', prevWeek), where('week_start', '<', weekStart));
      
      const [prevMenteeSnap, prevMentorSnap] = await Promise.all([
        getDocs(prevMenteeQuery),
        getDocs(prevMentorQuery)
      ]);

      // Apply filters if provided
      const applyFilters = (docs: any[]) => {
        if (!filters?.campus && !filters?.house) return docs;
        return docs.filter(doc => {
          const data = doc.data();
          if (filters.campus && data.campus !== filters.campus) return false;
          if (filters.house && data.house !== filters.house) return false;
          return true;
        });
      };

      const currentReviews = [
        ...applyFilters(currentMenteeSnap.docs),
        ...applyFilters(currentMentorSnap.docs)
      ];
      
      const prevReviews = [
        ...applyFilters(prevMenteeSnap.docs),
        ...applyFilters(prevMentorSnap.docs)
      ];

      // Calculate performance for each criteria
      const performances: CriteriaPerformance[] = [];
      const insightsList: string[] = [];

      Object.entries(criteriaNames).forEach(([key, name]) => {
        // Current period scores
        const currentScores = currentReviews
          .map(doc => doc.data()[key])
          .filter(score => typeof score === 'number') as number[];
        
        // Previous period scores
        const prevScores = prevReviews
          .map(doc => doc.data()[key])
          .filter(score => typeof score === 'number') as number[];

        if (currentScores.length === 0) return;

        const avgScore = currentScores.reduce((sum, s) => sum + s, 0) / currentScores.length;
        const highestScore = Math.max(...currentScores);
        const lowestScore = Math.min(...currentScores);

        // Calculate trend
        const prevAvg = prevScores.length > 0 
          ? prevScores.reduce((sum, s) => sum + s, 0) / prevScores.length 
          : avgScore;
        const trendChange = avgScore - prevAvg;
        
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (trendChange > 0.2) trend = 'improving';
        else if (trendChange < -0.2) trend = 'declining';

        // Determine status
        let status: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
        if (avgScore >= 1.5) status = 'excellent';
        else if (avgScore >= 0.5) status = 'good';
        else if (avgScore >= -0.5) status = 'average';
        else if (avgScore >= -1.5) status = 'poor';
        else status = 'critical';

        performances.push({
          name,
          key,
          averageScore: Math.round(avgScore * 10) / 10,
          highestScore: Math.round(highestScore * 10) / 10,
          lowestScore: Math.round(lowestScore * 10) / 10,
          trend,
          trendChange: Math.round(trendChange * 10) / 10,
          reviewCount: currentScores.length,
          status
        });

        // Generate insights
        if (status === 'critical') {
          insightsList.push(`🚨 ${name} is critical (avg: ${avgScore.toFixed(1)}). Requires immediate campus-wide intervention.`);
        } else if (trend === 'declining' && trendChange < -0.3) {
          insightsList.push(`⚠️ ${name} declining significantly (-${Math.abs(trendChange).toFixed(1)}). Review campus policies.`);
        } else if (status === 'excellent' && trend === 'improving') {
          insightsList.push(`🌟 ${name} excelling (${avgScore.toFixed(1)}) and improving. Share best practices!`);
        }
      });

      // Sort by average score descending
      performances.sort((a, b) => b.averageScore - a.averageScore);

      // Overall insights
      const excellentCount = performances.filter(p => p.status === 'excellent').length;
      const criticalCount = performances.filter(p => p.status === 'critical').length;
      const improvingCount = performances.filter(p => p.trend === 'improving').length;
      const decliningCount = performances.filter(p => p.trend === 'declining').length;

      if (excellentCount === performances.length) {
        insightsList.unshift('🎉 All criteria performing excellently! Outstanding campus performance.');
      } else if (criticalCount > performances.length / 2) {
        insightsList.unshift('🚨 URGENT: Majority of criteria critical. Campus-wide action plan needed.');
      } else if (improvingCount > decliningCount) {
        insightsList.unshift('✅ Positive trend: More criteria improving than declining.');
      } else if (decliningCount > improvingCount) {
        insightsList.unshift('⚠️ Concern: More criteria declining. Review recent campus changes.');
      }

      return { performances, insights: insightsList };
    } catch (error) {
      console.error('Error loading criteria performance:', error);
      throw error;
    }
  };

  const loadCriteriaPerformance = async () => {
    setLoading(true);
    try {
      // Generate cache key
      const cacheKey = generateCacheKey('criteria_performance', {
        campus: filters?.campus,
        house: filters?.house,
        weeksLookback
      });

      // Get data from cache or fetch fresh (5 minute TTL)
      const data = await getCachedData(
        cacheKey,
        fetchCriteriaData,
        5 * 60 * 1000
      );

      setCriteriaData(data.performances);
      setInsights(data.insights);
    } catch (error) {
      console.error('Error loading criteria performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-300';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'average': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getRecommendation = (perf: CriteriaPerformance): string => {
    if (perf.status === 'critical') {
      return `Launch campus-wide initiative focusing on ${perf.name.toLowerCase()}. Consider workshops, mentorship programs, or policy changes.`;
    } else if (perf.trend === 'declining') {
      return `Investigate recent changes affecting ${perf.name.toLowerCase()}. Survey students and mentors for feedback.`;
    } else if (perf.status === 'excellent' && perf.trend === 'improving') {
      return `Document and share successful strategies for ${perf.name.toLowerCase()} across other campuses.`;
    } else if (perf.status === 'poor') {
      return `Provide additional support and resources for ${perf.name.toLowerCase()}. Consider targeted interventions.`;
    } else {
      return `Maintain current approach for ${perf.name.toLowerCase()}. Monitor for changes.`;
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart2 className="h-5 w-5 mr-2 text-purple-600" />
              Campus-Wide Criteria Performance
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Analysis of all review criteria across {filters?.campus || 'all campuses'}
            </p>
          </div>
        </div>
      </div>

      {criteriaData.length === 0 ? (
        <div className="text-center py-12">
          <BarChart2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No criteria data available for analysis.</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Key Insights */}
          {insights.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 flex items-center mb-3">
                <Target className="h-4 w-4 mr-2" />
                Key Insights & Recommendations
              </h4>
              <ul className="space-y-2">
                {insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Criteria Performance Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criteria
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Score
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Range
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reviews
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {criteriaData.map((perf) => (
                  <tr key={perf.key} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {perf.status === 'excellent' && <Award className="h-4 w-4 text-green-600 mr-2" />}
                        {perf.status === 'critical' && <AlertCircle className="h-4 w-4 text-red-600 mr-2" />}
                        <span className="text-sm font-medium text-gray-900">{perf.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-semibold ${
                        perf.averageScore >= 1.5 ? 'text-green-600' :
                        perf.averageScore >= 0.5 ? 'text-blue-600' :
                        perf.averageScore >= -0.5 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {perf.averageScore > 0 ? '+' : ''}{perf.averageScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-gray-600">
                        {perf.lowestScore.toFixed(1)} to {perf.highestScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        {getTrendIcon(perf.trend, perf.trendChange)}
                        <span className={`ml-1 text-sm ${
                          perf.trend === 'improving' ? 'text-green-600' :
                          perf.trend === 'declining' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {perf.trendChange > 0 ? '+' : ''}{perf.trendChange.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(perf.status)}`}>
                        {perf.status.charAt(0).toUpperCase() + perf.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                      {perf.reviewCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed Recommendations */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center">
              <Declining className="h-4 w-4 mr-2 text-purple-600" />
              Action Recommendations
            </h4>
            {criteriaData.map((perf) => (
              <div key={perf.key} className={`border rounded-lg p-4 ${
                perf.status === 'critical' ? 'border-red-300 bg-red-50' :
                perf.status === 'excellent' ? 'border-green-300 bg-green-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{perf.name}</span>
                  <span className={`text-xs font-semibold ${getStatusColor(perf.status)} px-2 py-1 rounded`}>
                    {perf.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{getRecommendation(perf)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CriteriaPerformanceBreakdown;
