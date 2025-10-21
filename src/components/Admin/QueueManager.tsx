import React, { useEffect, useState, useCallback } from 'react';
import { RollingQueueService, RollingQueueEntry } from '../../services/rollingQueueService';
import { Trash2, ChevronUp, ChevronDown, AlertCircle, Loader, Check } from 'lucide-react';

interface QueueViewEntry {
  id: string;
  student_id: string;
  student_name?: string;
  position: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  added_at: Date;
  priority?: string;
}

interface QueueManagerProps {
  academicAssociateId: string;
}

/**
 * QueueManager Component
 * 
 * Admin interface for managing the rolling queue for an Academic Associate.
 * Allows admins to:
 * - Reorder queue entries
 * - Remove entries from queue
 * - View detailed queue information
 * - Manage priorities
 * 
 * Features:
 * - Drag-to-reorder capability (via position adjustment)
 * - Bulk operations
 * - Confirmation dialogs
 * - Real-time updates
 * - Audit logging
 */
export const QueueManager: React.FC<QueueManagerProps> = ({ academicAssociateId }) => {
  const [queue, setQueue] = useState<QueueViewEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load queue
  const loadQueue = useCallback(async () => {
    if (!academicAssociateId) {
      setQueue([]);
      return;
    }

    try {
      setError(null);
      const entries: RollingQueueEntry[] = await RollingQueueService.getQueueForAA(academicAssociateId);
      const viewEntries = entries.map((entry: RollingQueueEntry) => ({
        id: entry.id,
        student_id: entry.student_id,
        position: entry.position,
        status: entry.status,
        added_at: entry.added_at,
        priority: entry.priority,
      }));
      setQueue(viewEntries);
    } catch (err) {
      console.error('Error loading queue:', err);
      setError('Failed to load queue');
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [academicAssociateId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Remove entry from queue
  const handleRemoveEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to remove this entry from the queue?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await RollingQueueService.removeFromQueue(entryId);
      setSuccess('Entry removed from queue');
      await loadQueue();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing entry:', err);
      setError('Failed to remove entry');
    } finally {
      setLoading(false);
    }
  };

  // Move entry up in queue
  const handleMoveUp = async (entryId: string, currentPosition: number) => {
    if (currentPosition <= 1) {
      setError('Cannot move further up');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await RollingQueueService.reorderQueue(entryId, currentPosition - 1);
      setSuccess('Queue updated');
      await loadQueue();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error reordering queue:', err);
      setError('Failed to reorder queue');
    } finally {
      setLoading(false);
    }
  };

  // Move entry down in queue
  const handleMoveDown = async (entryId: string, currentPosition: number) => {
    if (currentPosition >= queue.filter(e => e.status === 'waiting').length) {
      setError('Cannot move further down');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await RollingQueueService.reorderQueue(entryId, currentPosition + 1);
      setSuccess('Queue updated');
      await loadQueue();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error reordering queue:', err);
      setError('Failed to reorder queue');
    } finally {
      setLoading(false);
    }
  };

  // Clear completed entries
  const handleClearCompleted = async () => {
    if (
      !window.confirm(
        'This will remove all completed entries from the queue. This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await RollingQueueService.clearCompletedForAA(academicAssociateId);
      setSuccess('Completed entries cleared');
      await loadQueue();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error clearing completed:', err);
      setError('Failed to clear completed entries');
    } finally {
      setLoading(false);
    }
  };

  // No AA selected
  if (!academicAssociateId) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Select an Academic Associate to manage their queue</p>
      </div>
    );
  }

  const waitingEntries = queue.filter(e => e.status === 'waiting');
  const completedEntries = queue.filter(e => e.status === 'completed');

  return (
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Queue Management Controls */}
      <div className="bg-white p-4 rounded border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Queue Management</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleClearCompleted}
            disabled={loading || completedEntries.length === 0}
            className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded font-medium hover:bg-orange-200 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Completed ({completedEntries.length})
          </button>
          <button
            onClick={loadQueue}
            disabled={loading}
            className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="bg-white rounded border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-yellow-50">
          <h4 className="font-semibold text-gray-900">
            Waiting Queue ({waitingEntries.length})
          </h4>
        </div>

        {waitingEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No entries waiting in queue</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {waitingEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors`}
              >
                {/* Entry Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Position */}
                  <div className="w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    {entry.position}
                  </div>

                  {/* Student Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {entry.student_name || `Student ${entry.student_id.substring(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {entry.student_id.substring(0, 20)}...
                    </p>
                  </div>

                  {/* Priority Badge */}
                  {entry.priority && entry.priority !== 'medium' && (
                    <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                      entry.priority === 'high' || entry.priority === 'urgent'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {entry.priority}
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {/* Move Up Button */}
                  <button
                    onClick={() => handleMoveUp(entry.id, entry.position)}
                    disabled={loading || entry.position <= 1}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Move up in queue (higher priority)"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>

                  {/* Move Down Button */}
                  <button
                    onClick={() => handleMoveDown(entry.id, entry.position)}
                    disabled={loading || entry.position >= waitingEntries.length}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Move down in queue (lower priority)"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveEntry(entry.id)}
                    disabled={loading}
                    className="p-2 text-red-600 hover:bg-red-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Queue (Reference) */}
      {completedEntries.length > 0 && (
        <div className="bg-white rounded border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-green-50">
            <h4 className="font-semibold text-gray-900">
              Completed ({completedEntries.length})
            </h4>
          </div>

          <div className="divide-y divide-gray-200">
            {completedEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="p-4 opacity-70 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    ✓
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {entry.student_name || `Student ${entry.student_id.substring(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {entry.student_id.substring(0, 20)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {completedEntries.length > 5 && (
              <div className="p-3 text-center text-gray-600 text-sm bg-gray-50">
                +{completedEntries.length - 5} more completed
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        <p className="font-medium mb-1">📋 Queue Manager Help</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Use ↑↓ buttons to reorder queue (affects student wait time)</li>
          <li>Use 🗑️ to remove entries completely</li>
          <li>Position 1 = first in line (next session to start)</li>
          <li>Completed entries can be cleared in bulk</li>
          <li>All changes are logged in Firestore</li>
        </ul>
      </div>
    </div>
  );
};

export default QueueManager;
