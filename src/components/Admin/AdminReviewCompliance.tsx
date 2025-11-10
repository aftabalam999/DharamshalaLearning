import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Download, 
  Filter,
  RefreshCw
} from 'lucide-react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getCurrentWeekStart, getReviewDeadline, getDaysOverdue } from '../../utils/reviewDateUtils';
import MentorComplianceTable from './MentorComplianceTable';
import StudentComplianceTable from './StudentComplianceTable';
import ScoreBreakdownTable from './ScoreBreakdownTable';
import HistoricalTrendsTable from './HistoricalTrendsTable';
import ScoreDistributionAnalytics from './ScoreDistributionAnalytics';
import CriteriaPerformanceBreakdown from './CriteriaPerformanceBreakdown';
import BulkReminderPanel from './BulkReminderPanel';
import { User } from '../../types';
import { useDataCache, generateCacheKey } from '../../contexts/DataCacheContext';

// Campus and House constants (must match User type definition)
const CAMPUS_OPTIONS: User['campus'][] = [
  'Dantewada',
  'Dharamshala', 
  'Eternal',
  'Jashpur',
  'Kishanganj',
  'Pune',
  'Raigarh',
  'Sarjapura'
];

const HOUSE_OPTIONS: User['house'][] = [
  'Bageshree',
  'Malhar',
  'Bhairav'
];

interface ComplianceStats {
  totalUsers: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

interface FilterOptions {
  campus: string;
  house: string;
  role: 'all' | 'student' | 'mentor';
  dateRange: 'current_week' | 'last_4_weeks' | 'all_time';
}

const AdminReviewCompliance: React.FC = () => {
  const { getCachedData, invalidateCache } = useDataCache();
  
  const [stats, setStats] = useState<ComplianceStats>({
    totalUsers: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0
  });

  const [filters, setFilters] = useState<FilterOptions>({
    campus: 'all',
    house: 'all',
    role: 'all',
    dateRange: 'current_week'
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchComplianceData = React.useCallback(async () => {
    // Fetch fresh data (this function will be wrapped by cache)
    try {
      // Fetch users
      const usersRef = collection(db, 'users');
      let usersQuery = query(usersRef, where('role', 'in', ['student', 'mentor']));
      
      if (filters.role !== 'all') {
        usersQuery = query(usersRef, where('role', '==', filters.role));
      }

      const usersSnapshot = await getDocs(usersQuery);
      const totalUsers = usersSnapshot.size;

      // Get current week for review checking
      const weekStart = getCurrentWeekStart();
      const deadline = getReviewDeadline(weekStart);
      const daysOverdue = getDaysOverdue(deadline);

      // Count completed, pending, overdue
      let completed = 0;
      let pending = 0;
      let overdue = 0;

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        
        // Check if user submitted reviews this week
        // For mentors: check mentee_reviews
        if (user.role === 'mentor') {
          const reviewsRef = collection(db, 'mentee_reviews');
          const reviewsQuery = query(
            reviewsRef,
            where('reviewer_id', '==', userDoc.id),
            where('week_start', '==', weekStart)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          
          // A mentor needs to review all their mentees
          const menteesCount = user.mentees?.length || 0;
          const submittedCount = reviewsSnapshot.size;

          if (submittedCount >= menteesCount && menteesCount > 0) {
            completed++;
          } else if (daysOverdue > 0) {
            overdue++;
          } else {
            pending++;
          }
        }

        // For students: check mentor_reviews
        if (user.role === 'student') {
          const reviewsRef = collection(db, 'mentor_reviews');
          const reviewsQuery = query(
            reviewsRef,
            where('reviewer_id', '==', userDoc.id),
            where('week_start', '==', weekStart)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          
          if (reviewsSnapshot.size > 0) {
            completed++;
          } else if (daysOverdue > 0) {
            overdue++;
          } else {
            pending++;
          }
        }
      }

      const completionRate = totalUsers > 0 ? (completed / totalUsers) * 100 : 0;

      return {
        totalUsers,
        completed,
        pending,
        overdue,
        completionRate
      };

    } catch (error) {
      console.error('Error loading compliance data:', error);
      throw error;
    }
  }, [filters]);

  const loadComplianceData = React.useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      // Generate cache key based on filters
      const cacheKey = generateCacheKey('admin_compliance_stats', {
        role: filters.role,
        campus: filters.campus,
        house: filters.house,
        dateRange: filters.dateRange
      });

      // If force refresh, invalidate cache first
      if (forceRefresh) {
        console.log('[AdminReviewCompliance] Force refresh - clearing cache');
        invalidateCache(cacheKey);
      }

      // Get data from cache or fetch fresh (5 minute TTL)
      const data = await getCachedData(
        cacheKey,
        fetchComplianceData,
        5 * 60 * 1000 // 5 minutes
      );

      setStats(data);
    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, getCachedData, invalidateCache, fetchComplianceData]);

  useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  const handleRefresh = () => {
    setRefreshing(true);
    // Force refresh clears cache and fetches fresh data
    loadComplianceData(true);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming in next task!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Compliance</h1>
          <p className="text-gray-600 mt-1">Monitor review submission status across campus</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Campus Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campus
            </label>
            <select
              value={filters.campus}
              onChange={(e) => setFilters({ ...filters, campus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Campuses</option>
              {CAMPUS_OPTIONS.map(campus => (
                <option key={campus} value={campus}>{campus}</option>
              ))}
            </select>
          </div>

          {/* House Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              House
            </label>
            <select
              value={filters.house}
              onChange={(e) => setFilters({ ...filters, house: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Houses</option>
              {HOUSE_OPTIONS.map(house => (
                <option key={house} value={house}>{house}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value as FilterOptions['role'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="mentor">Mentors</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as FilterOptions['dateRange'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="current_week">Current Week</option>
              <option value="last_4_weeks">Last 4 Weeks</option>
              <option value="all_time">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Overdue</p>
              <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-purple-600">{stats.completionRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  stats.completionRate >= 85 ? 'bg-green-600' :
                  stats.completionRate >= 70 ? 'bg-yellow-600' :
                  'bg-red-600'
                }`}
                style={{ width: `${stats.completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {stats.completionRate < 85 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Low Completion Rate Alert
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Current completion rate is {stats.completionRate.toFixed(1)}%. Target is 85% or higher.
                Consider sending bulk reminders to pending users.
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.overdue > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Overdue Reviews Detected
              </p>
              <p className="text-sm text-red-700 mt-1">
                {stats.overdue} user{stats.overdue > 1 ? 's have' : ' has'} overdue reviews. 
                Send escalation reminders or follow up individually.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mentor Compliance Table */}
      <div className="mt-6">
        <MentorComplianceTable filters={filters} />
      </div>

      {/* Student Compliance Table */}
      <div className="mt-6">
        <StudentComplianceTable filters={filters} />
      </div>

      {/* Score Breakdown Table */}
      <div className="mt-6">
        <ScoreBreakdownTable 
          viewType="all" 
          filters={filters}
        />
      </div>

        {/* Historical Trends Table */}
        <div className="mt-6">
          <HistoricalTrendsTable filters={filters} weeksToShow={8} />
        </div>

        {/* Score Distribution Analytics */}
        <div className="mt-6">
          {/* Uses current week + last 4 weeks for aggregate comparison */}
          <ScoreDistributionAnalytics filters={filters} weeksLookback={4} />
        </div>

        {/* Criteria Performance Breakdown */}
        <div className="mt-6">
          <CriteriaPerformanceBreakdown filters={filters} weeksLookback={4} />
        </div>

        {/* Bulk Reminder Panel */}
        <div className="mt-6">
          <BulkReminderPanel filters={filters} />
        </div>
    </div>
  );
};

export default AdminReviewCompliance;
