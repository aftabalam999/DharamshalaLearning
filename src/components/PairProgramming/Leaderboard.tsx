import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp, Users, Star } from 'lucide-react';

const Leaderboard: React.FC = () => {
  const [data, setData] = useState({
    mentors: [],
    mentees: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mentors' | 'mentees'>('mentors');

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        // TODO: Implement leaderboard data fetching
        // For now, show empty leaderboard
        setData({
          mentors: [],
          mentees: []
        });
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-gray-500">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const renderLeaderboard = (entries: any[], type: 'mentors' | 'mentees') => {
    if (!entries || entries.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {type} data available
          </h3>
          <p className="text-gray-500">
            Leaderboard data will appear as sessions are completed and rated.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div
            key={entry.rank || index + 1}
            className={`flex items-center space-x-4 p-4 rounded-lg border ${
              entry.rank <= 3 ? 'bg-gradient-to-r from-white to-gray-50 border-gray-300' : 'bg-white border-gray-200'
            }`}
          >
            {/* Rank */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${getRankBadgeColor(entry.rank)}`}>
              {getRankIcon(entry.rank)}
            </div>

            {/* Avatar/Initials */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {(entry.mentor_name || entry.mentee_name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {entry.mentor_name || entry.mentee_name || 'Unknown User'}
              </h4>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center text-xs text-gray-500">
                  <Users className="h-3 w-3 mr-1" />
                  {entry.total_sessions || 0} sessions
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {entry.sessions_this_week || 0} this week
                </div>
                {type === 'mentors' && entry.average_rating && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Star className="h-3 w-3 mr-1" />
                    {entry.average_rating.toFixed(1)} avg rating
                  </div>
                )}
                {type === 'mentees' && entry.average_self_rating && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Star className="h-3 w-3 mr-1" />
                    {entry.average_self_rating.toFixed(1)} self rating
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                {entry.rank <= 3 && '🏆 '}
                {type === 'mentors' ? (entry.mentees_helped || 0) : (entry.goals_achieved || 0)}
              </div>
              <div className="text-xs text-gray-500">
                {type === 'mentors' ? 'mentees helped' : 'goals achieved'}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Leaderboard</h2>
        <p className="text-sm text-gray-600 mt-1">
          Top performers in pair programming sessions
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('mentors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mentors'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Top Mentors
          </button>
          <button
            onClick={() => setActiveTab('mentees')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mentees'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Top Mentees
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'mentors' ? (
          renderLeaderboard(data.mentors, 'mentors')
        ) : (
          renderLeaderboard(data.mentees, 'mentees')
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
              <span>1st Place</span>
            </div>
            <div className="flex items-center">
              <Medal className="h-4 w-4 text-gray-400 mr-1" />
              <span>2nd Place</span>
            </div>
            <div className="flex items-center">
              <Award className="h-4 w-4 text-amber-600 mr-1" />
              <span>3rd Place</span>
            </div>
          </div>
          <div className="text-xs">
            Rankings updated daily
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;