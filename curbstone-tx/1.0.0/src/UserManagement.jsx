import React, { useState, useEffect } from 'react';
import { usersAPI } from './api';

const ALL_TRANSACTION_TYPES = ['Auth', 'Capture', 'Sale', 'ReferentialSale', 'Reversal', 'Return', 'Settle', 'Ticket', 'Void'];

export default function UserManagement({ currentUser, onUserUpdate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAllowedTypes, setNewAllowedTypes] = useState(ALL_TRANSACTION_TYPES);
  const [newRole, setNewRole] = useState('user');
  
  // Edit user state
  const [editingUserId, setEditingUserId] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [editAllowedTypes, setEditAllowedTypes] = useState([]);
  const [editRole, setEditRole] = useState('user');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await usersAPI.list();
      setUsers(response.users);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUsername.trim() || !newPassword.trim()) {
      setError('Username and password are required');
      return;
    }

    try {
      const response = await usersAPI.create(newUsername.trim(), newPassword, newAllowedTypes, newRole);
      setSuccess(`User "${response.user.username}" created successfully`);
      setNewUsername('');
      setNewPassword('');
      setNewAllowedTypes(ALL_TRANSACTION_TYPES);
      setNewRole('user');
      setShowCreateForm(false);
      await loadUsers();
      if (onUserUpdate) onUserUpdate();
    } catch (err) {
      console.error('Create user error:', err);
      setError(err.message || 'Failed to create user');
    }
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setEditPassword('');
    setEditAllowedTypes(user.allowedTransactionTypes || []);
    setEditRole(user.role);
  };

  const handleSaveEdit = async (userId) => {
    setError('');
    setSuccess('');

    try {
      const updates = {};
      if (editPassword) {
        updates.password = editPassword;
      }
      if (currentUser.role === 'admin') {
        updates.allowedTransactionTypes = editAllowedTypes;
        updates.role = editRole;
      }

      console.log('Sending update:', { userId, updates });
      console.log('editAllowedTypes being sent:', editAllowedTypes);
      const response = await usersAPI.update(userId, updates);
      console.log('Update response:', response);
      console.log('Response user allowedTransactionTypes:', response?.user?.allowedTransactionTypes);
      
      if (response.requiresReauth) {
        setSuccess('Password changed. Please log in again.');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSuccess('User updated successfully');
        setEditingUserId(null);
        setEditPassword('');
        await loadUsers();
        if (onUserUpdate) onUserUpdate();
      }
    } catch (err) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update user');
    }
  };

  const toggleTransactionType = (type, allowedTypes, setAllowedTypes) => {
    if (allowedTypes.includes(type)) {
      setAllowedTypes(allowedTypes.filter(t => t !== type));
    } else {
      setAllowedTypes([...allowedTypes, type]);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-6 space-y-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">User Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all font-medium"
        >
          {showCreateForm ? 'Cancel' : '+ Create User'}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateUser} className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl space-y-4 border border-gray-200">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="px-3 py-2 rounded-xl border"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Allowed Transaction Types</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_TRANSACTION_TYPES.map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newAllowedTypes.includes(type)}
                    onChange={() => toggleTransactionType(type, newAllowedTypes, setNewAllowedTypes)}
                    className="rounded"
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all font-medium"
          >
            Create User
          </button>
        </form>
      )}

      <div className="space-y-3">
        {users.map(user => (
          <div key={user.id} className="border rounded-xl p-4">
            {editingUserId === user.id ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{user.username}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                    {user.role}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Change Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border"
                    placeholder="New password"
                  />
                </div>

                {currentUser.role === 'admin' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="px-3 py-2 rounded-xl border"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Allowed Transaction Types</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {ALL_TRANSACTION_TYPES.map(type => (
                          <label key={type} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editAllowedTypes.includes(type)}
                              onChange={() => toggleTransactionType(type, editAllowedTypes, setEditAllowedTypes)}
                              className="rounded"
                            />
                            <span className="text-sm">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(user.id)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingUserId(null);
                      setEditPassword('');
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{user.username}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Allowed: {user.allowedTransactionTypes?.join(', ') || 'None'}
                  </div>
                </div>
                <button
                  onClick={() => handleEditUser(user)}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors font-medium"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

