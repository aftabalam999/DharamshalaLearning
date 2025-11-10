import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getCurrentWeekStart } from '../../utils/reviewDateUtils';
import { ReviewReminderService } from '../../services/reviewReminderService';
import { User } from '../../types';
import { Bell, Users, CheckCircle, AlertCircle, Send, History } from 'lucide-react';

interface UserForReminder {
  id: string;
  name: string;
  email: string;
  role: string;
  pendingCount: number;
  lastReminder?: Date;
  selected: boolean;
}

interface ReminderHistory {
  id: string;
  sentAt: Date;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  message: string;
}

interface Props {
  filters?: {
    campus?: string;
    house?: string;
  };
}

const BulkReminderPanel: React.FC<Props> = ({ filters }) => {
  const [users, setUsers] = useState<UserForReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [reminderHistory, setReminderHistory] = useState<ReminderHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadUsersWithPendingReviews();
    loadReminderHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadUsersWithPendingReviews = async () => {
    setLoading(true);
    try {
      const weekStart = getCurrentWeekStart();
      const usersRef = collection(db, 'users');
      
      // Get all users
      const usersSnapshot = await getDocs(usersRef);
      const userList: UserForReminder[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Apply filters
        if (filters?.campus && userData.campus !== filters.campus) continue;
        if (filters?.house && userData.house !== filters.house) continue;

        let pendingCount = 0;

        // Check if mentor has pending mentee reviews
        if (userData.isMentor && userData.mentees) {
          for (const menteeId of userData.mentees) {
            const reviewQuery = query(
              collection(db, 'mentee_reviews'),
              where('reviewer_id', '==', userDoc.id),
              where('reviewee_id', '==', menteeId),
              where('week_start', '==', weekStart)
            );
            const reviewSnapshot = await getDocs(reviewQuery);
            if (reviewSnapshot.empty) pendingCount++;
          }
        }

        // Check if student has pending mentor review
        if (userData.mentor_id) {
          const reviewQuery = query(
            collection(db, 'mentor_reviews'),
            where('reviewer_id', '==', userDoc.id),
            where('reviewee_id', '==', userData.mentor_id),
            where('week_start', '==', weekStart)
          );
          const reviewSnapshot = await getDocs(reviewQuery);
          if (reviewSnapshot.empty) pendingCount++;
        }

        if (pendingCount > 0) {
          // Check last reminder
          const reminderQuery = query(
            collection(db, 'review_reminders'),
            where('user_id', '==', userDoc.id),
            where('status', '==', 'sent')
          );
          const reminderSnapshot = await getDocs(reminderQuery);
          const lastReminder = reminderSnapshot.docs.length > 0
            ? reminderSnapshot.docs[0].data().sent_at?.toDate()
            : undefined;

          userList.push({
            id: userDoc.id,
            name: userData.name || 'Unknown',
            email: userData.email || '',
            role: userData.role || 'student',
            pendingCount,
            lastReminder,
            selected: false
          });
        }
      }

      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReminderHistory = async () => {
    try {
      // Load recent bulk reminders from Firestore
      const historyRef = collection(db, 'bulk_reminder_history');
      const historyQuery = query(historyRef);
      const historySnapshot = await getDocs(historyQuery);
      
      const history: ReminderHistory[] = historySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          sentAt: data.sent_at?.toDate() || new Date(),
          recipientCount: data.recipient_count || 0,
          successCount: data.success_count || 0,
          failureCount: data.failure_count || 0,
          message: data.message || 'Review reminder'
        };
      });

      history.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
      setReminderHistory(history.slice(0, 10)); // Keep last 10
    } catch (error) {
      console.error('Error loading reminder history:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, selected: !u.selected } : u
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = users.every(u => u.selected);
    setUsers(prev => prev.map(u => ({ ...u, selected: !allSelected })));
  };

  const handleSendReminders = async () => {
    const selectedUsers = users.filter(u => u.selected);
    
    if (selectedUsers.length === 0) {
      alert('Please select at least one user.');
      return;
    }

    const confirmed = window.confirm(
      `Send reminders to ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}?`
    );

    if (!confirmed) return;

    setSending(true);
    setSuccessMessage(null);

    try {
      // Fetch full user objects
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userMap: Record<string, User> = {};
      usersSnapshot.docs.forEach(doc => {
        userMap[doc.id] = { id: doc.id, ...(doc.data() as any) } as User;
      });

      let successCount = 0;
      let failCount = 0;

      for (const selectedUser of selectedUsers) {
        const user = userMap[selectedUser.id];
        if (!user) {
          failCount++;
          continue;
        }

        // Get pending reviews
        const pending: Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }> = [];
        const weekStart = getCurrentWeekStart();

        const mentees = (user as any).mentees; // Mentees array from user data
        if (user.isMentor && mentees) {
          for (const menteeId of mentees) {
            const reviewQuery = query(
              collection(db, 'mentee_reviews'),
              where('reviewer_id', '==', user.id),
              where('reviewee_id', '==', menteeId),
              where('week_start', '==', weekStart)
            );
            const reviewSnapshot = await getDocs(reviewQuery);
            if (reviewSnapshot.empty) {
              const menteeSnapshot = await getDocs(
                query(collection(db, 'users'), where('__name__', '==', menteeId))
              );
              const menteeName = menteeSnapshot.docs[0]?.data()?.name || 'Unknown';
              pending.push({ user_id: menteeId, user_name: menteeName, role: 'mentee' });
            }
          }
        }

        if (user.mentor_id) {
          const reviewQuery = query(
            collection(db, 'mentor_reviews'),
            where('reviewer_id', '==', user.id),
            where('reviewee_id', '==', user.mentor_id),
            where('week_start', '==', weekStart)
          );
          const reviewSnapshot = await getDocs(reviewQuery);
          if (reviewSnapshot.empty) {
            const mentorSnapshot = await getDocs(
              query(collection(db, 'users'), where('__name__', '==', user.mentor_id))
            );
            const mentorName = mentorSnapshot.docs[0]?.data()?.name || 'Unknown';
            pending.push({ user_id: user.mentor_id, user_name: mentorName, role: 'mentor' });
          }
        }

        if (pending.length === 0) continue;

        const sent = await ReviewReminderService.sendReminder(
          user,
          'morning_reminder',
          pending,
          undefined
        );

        if (sent) successCount++;
        else failCount++;
      }

      // Save to history
      await addDoc(collection(db, 'bulk_reminder_history'), {
        sent_at: Timestamp.fromDate(new Date()),
        recipient_count: selectedUsers.length,
        success_count: successCount,
        failure_count: failCount,
        message: customMessage || 'Review reminder',
        filters: filters || {}
      });

      setSuccessMessage(`✅ Sent ${successCount} reminder${successCount !== 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`);
      
      // Clear selection and reload
      setUsers(prev => prev.map(u => ({ ...u, selected: false })));
      await loadReminderHistory();
      
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      alert('Failed to send reminders. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const selectedCount = users.filter(u => u.selected).length;

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
              <Bell className="h-5 w-5 mr-2 text-purple-600" />
              Bulk Reminder System
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Select users and send review reminders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <History className="h-4 w-4 mr-1" />
              History
            </button>
            <button
              onClick={handleSendReminders}
              disabled={sending || selectedCount === 0}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center ${
                selectedCount === 0 || sending
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              <Send className="h-4 w-4 mr-1" />
              {sending ? 'Sending...' : `Send to ${selectedCount} Selected`}
            </button>
          </div>
        </div>
        
        {successMessage && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}
      </div>

      {/* Reminder History Panel */}
      {showHistory && reminderHistory.length > 0 && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Reminder History</h4>
          <div className="space-y-2">
            {reminderHistory.map(history => (
              <div key={history.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">
                    {history.sentAt.toLocaleDateString()} {history.sentAt.toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    {history.recipientCount} recipients • {history.successCount} sent • {history.failureCount} failed
                  </p>
                </div>
                <div className="flex items-center">
                  {history.failureCount === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No users with pending reviews found.</p>
        </div>
      ) : (
        <div className="p-6">
          {/* Custom Message */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a custom note to the reminder..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              rows={2}
            />
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && users.every(u => u.selected)}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Reminder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={user.selected}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-orange-600">
                        {user.pendingCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-gray-500">
                      {user.lastReminder 
                        ? user.lastReminder.toLocaleDateString()
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkReminderPanel;
