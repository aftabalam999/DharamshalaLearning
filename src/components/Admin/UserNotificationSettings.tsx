import React, { useState, useEffect } from 'react';
import { Bell, Search, Check, X } from 'lucide-react';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'mentor' | 'academic_associate' | 'admin';
  discord_user_id?: string;
  notification_preferences?: {
    in_app?: boolean;
    discord?: boolean;
    email?: boolean;
  };
}

const UserNotificationSettings: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editDiscordId, setEditDiscordId] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.discord_user_id?.includes(searchTerm)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user.id);
    setEditDiscordId(user.discord_user_id || '');
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditDiscordId('');
  };

  const handleSave = async (userId: string) => {
    setSaving(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        discord_user_id: editDiscordId || null,
        updated_at: new Date()
      });

      // Update local state
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, discord_user_id: editDiscordId || undefined }
          : u
      ));

      setEditingUser(null);
      setEditDiscordId('');
    } catch (error) {
      console.error('Error saving Discord ID:', error);
      alert('Failed to save Discord ID. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'academic_associate': return 'bg-blue-100 text-blue-800';
      case 'mentor': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Bell className="h-6 w-6 text-purple-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">User Notification Settings</h2>
        </div>
        <div className="text-sm text-gray-600">
          {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or Discord ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Discord Setup Instructions */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          How to find Discord User ID:
        </h4>
        <ol className="text-sm text-blue-700 ml-4 space-y-1 list-decimal">
          <li>Open Discord and go to Settings → Advanced</li>
          <li>Enable "Developer Mode"</li>
          <li>Right-click on a user's profile picture</li>
          <li>Select "Copy ID"</li>
          <li>Paste the ID in the table below</li>
        </ol>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Discord User ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preferences
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <input
                      type="text"
                      value={editDiscordId}
                      onChange={(e) => setEditDiscordId(e.target.value)}
                      placeholder="Discord User ID"
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">
                      {user.discord_user_id ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {user.discord_user_id}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2 text-xs">
                    {user.notification_preferences?.in_app !== false && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                        App
                      </span>
                    )}
                    {user.notification_preferences?.discord && user.discord_user_id && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        Discord
                      </span>
                    )}
                    {user.notification_preferences?.email && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        Email
                      </span>
                    )}
                    {!user.notification_preferences?.in_app && 
                     !user.notification_preferences?.discord && 
                     !user.notification_preferences?.email && (
                      <span className="text-gray-400 italic">Default</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingUser === user.id ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleSave(user.id)}
                        disabled={saving === user.id}
                        className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {saving === user.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={saving === user.id}
                        className="inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found matching your search.
        </div>
      )}
    </div>
  );
};

export default UserNotificationSettings;
