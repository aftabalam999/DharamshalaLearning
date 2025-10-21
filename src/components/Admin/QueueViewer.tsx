import React, { useEffect, useState, useCallback } from 'react';
import { RollingQueueService, RollingQueueEntry } from '../../services/rollingQueueService';
import { Clock, Users, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface QueueViewEntry {
  id: string;
  student_id: string;
  student_name?: string;
  position: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  added_at: Date;
  started_at?: Date;
  completed_at?: Date;
  priority?: string;
}

interface QueueViewerProps {
  academicAssociateId: string;
  refreshInterval?: number; // milliseconds, 0 to disable auto-refresh
}

/**
 * QueueViewer Component
 * 
 * Displays the rolling queue for a specific Academic Associate (AA).
 * Shows queue position, status, wait times, and current session information.
 * 
 * Features:
 * - Real-time queue updates
 * - Visual status indicators (waiting/in_progress/completed)
 * - Wait time calculations
 * - Current session highlighting
 * - Empty state messaging
 * - Loading states
 */
export const QueueViewer: React.FC<QueueViewerProps> = ({
  academicAssociateId,
  refreshInterval = 5000,
}) => {
  const [queue, setQueue] = useState<QueueViewEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load queue data
  const loadQueue = useCallback(async () => {
    if (!academicAssociateId) {
      setQueue([]);
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [queueEntries, queueStats] = await Promise.all([
        RollingQueueService.getQueueForAA(academicAssociateId),
        RollingQueueService.getQueueStats(academicAssociateId),
      ]);

      // Map RollingQueueEntry to QueueViewEntry
      const viewEntries = queueEntries.map((entry: RollingQueueEntry) => ({
        id: entry.id,
        student_id: entry.student_id,
        position: entry.position,
        status: entry.status,
        added_at: entry.added_at,
        started_at: entry.started_at,
        completed_at: entry.completed_at,
        priority: entry.priority,
      }));

      setQueue(viewEntries);
      setStats(queueStats);
    } catch (err) {
      console.error('Error loading queue:', err);
      setError('Failed to load queue. Please try again.');
      setQueue([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [academicAssociateId]);

  // Initial load
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0 || !academicAssociateId) return;

    const interval = setInterval(loadQueue, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, academicAssociateId, loadQueue]);

  // Calculate wait time in minutes
  const calculateWaitTime = (entry: QueueViewEntry): string => {
    if (!entry.added_at) return 'N/A';
    const now = new Date();
    const added = new Date(entry.added_at);
    const diffMs = now.getTime() - added.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return '< 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Calculate session duration
  const calculateDuration = (entry: QueueViewEntry): string => {
    if (entry.status !== 'in_progress' || !entry.started_at) return 'N/A';
    const now = new Date();
    const started = new Date(entry.started_at);
    const diffMs = now.getTime() - started.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return '< 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'in_progress':
        return {
          icon: <Clock className="w-5 h-5 text-blue-600" />,
          badge: 'bg-blue-100 text-blue-800',
          label: 'In Progress',
        };
      case 'waiting':
        return {
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          badge: 'bg-yellow-100 text-yellow-800',
          label: 'Waiting',
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          badge: 'bg-green-100 text-green-800',
          label: 'Completed',
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5 text-gray-600" />,
          badge: 'bg-gray-100 text-gray-800',
          label: status,
        };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <Loader className="w-8 h-8 text-blue-600 animate-spin mb-2" />
        <p className="text-gray-600">Loading queue...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">{error}</p>
        <button
          onClick={loadQueue}
          className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // No AA selected
  if (!academicAssociateId) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Select an Academic Associate to view their queue</p>
      </div>
    );
  }

  // Empty queue
  if (queue.length === 0) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No sessions in queue</p>
      </div>
    );
  }

  // Queue statistics
  const activeEntry = queue.find(e => e.status === 'in_progress');
  const waitingCount = queue.filter(e => e.status === 'waiting').length;
  const avgWaitTime = stats?.avg_wait_time_minutes
    ? `${Math.round(stats.avg_wait_time_minutes)} min`
    : 'N/A';

  return (
    <div className="space-y-4">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <p className="text-xs text-blue-600 font-medium">In Progress</p>
          <p className="text-2xl font-bold text-blue-900">
            {activeEntry ? 1 : 0}
          </p>
        </div>
        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
          <p className="text-xs text-yellow-600 font-medium">Waiting</p>
          <p className="text-2xl font-bold text-yellow-900">{waitingCount}</p>
        </div>
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <p className="text-xs text-green-600 font-medium">Completed</p>
          <p className="text-2xl font-bold text-green-900">
            {queue.filter(e => e.status === 'completed').length}
          </p>
        </div>
        <div className="bg-purple-50 p-3 rounded border border-purple-200">
          <p className="text-xs text-purple-600 font-medium">Avg Wait</p>
          <p className="text-2xl font-bold text-purple-900">{avgWaitTime}</p>
        </div>
      </div>

      {/* Queue Entries */}
      <div className="space-y-2">
        {queue.map((entry, index) => {
          const status = getStatusDisplay(entry.status);
          const isActive = entry.status === 'in_progress';
          const isCompleted = entry.status === 'completed';

          return (
            <div
              key={entry.id}
              className={`p-4 rounded border-2 transition-colors ${
                isActive
                  ? 'bg-blue-50 border-blue-400 shadow-md'
                  : isCompleted
                  ? 'bg-gray-50 border-gray-300 opacity-70'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                {/* Position Badge */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    isActive
                      ? 'bg-blue-600'
                      : isCompleted
                      ? 'bg-gray-400'
                      : 'bg-yellow-500'
                  }`}>
                    {entry.position}
                  </div>

                  {/* Entry Info */}
                  <div>
                    <p className="font-medium text-gray-900">
                      {entry.student_name || `Student ${entry.student_id.substring(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      ID: {entry.student_id.substring(0, 12)}...
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.badge}`}>
                  {status.icon}
                  <span className="text-xs font-medium">{status.label}</span>
                </div>
              </div>

              {/* Timing Info */}
              <div className="flex gap-4 text-sm text-gray-600 ml-13">
                {entry.status === 'waiting' && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Waiting: {calculateWaitTime(entry)}</span>
                  </div>
                )}
                {entry.status === 'in_progress' && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600">Duration: {calculateDuration(entry)}</span>
                  </div>
                )}
                {entry.status === 'completed' && entry.completed_at && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">
                      Completed {new Date(entry.completed_at).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Priority Badge */}
              {entry.priority && entry.priority !== 'medium' && (
                <div className="mt-2 inline-block">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    entry.priority === 'high' || entry.priority === 'urgent'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {entry.priority.charAt(0).toUpperCase() + entry.priority.slice(1)} Priority
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadQueue}
        disabled={loading}
        className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Refreshing...' : 'Refresh Queue'}
      </button>

      {/* Info Box */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        <p className="font-medium mb-1">ℹ️ Queue Information</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Position 1 is next in line</li>
          <li>Auto-refreshes every {refreshInterval / 1000}s</li>
          <li>Click an entry to manage (coming soon)</li>
          <li>Completed entries shown for reference</li>
        </ul>
      </div>
    </div>
  );
};

export default QueueViewer;
