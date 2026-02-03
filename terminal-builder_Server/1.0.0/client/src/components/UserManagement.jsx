import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

export default function UserManagement({ user }) {
  const [users, setUsers] = useState([]);
  const [userSteamCreds, setUserSteamCreds] = useState({}); // Map of userId -> {username, hasPassword}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingSteamCreds, setEditingSteamCreds] = useState(null);
  
  // Create form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  
  // Edit form
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editMode, setEditMode] = useState(null); // 'password' or 'role'
  
  // STEAM credentials form
  const [steamUsername, setSteamUsername] = useState('');
  const [steamPassword, setSteamPassword] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersAPI.getAll();
      setUsers(response.data.users);
      
      // Load STEAM credentials for all users
      const credsMap = {};
      for (const user of response.data.users) {
        try {
          const credsResponse = await usersAPI.getSteamCredentials(user.id);
          if (credsResponse.data.credentials) {
            credsMap[user.id] = {
              username: credsResponse.data.credentials.username,
              hasPassword: credsResponse.data.credentials.hasPassword
            };
          }
        } catch (err) {
          // User may not have credentials, that's okay
          credsMap[user.id] = null;
        }
      }
      setUserSteamCreds(credsMap);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      await usersAPI.create(newUsername, newPassword, newRole);
      setSuccess('User created successfully');
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setShowCreateForm(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdatePassword = async (userId) => {
    if (!editPassword) {
      setError('Password is required');
      return;
    }
    try {
      setError(null);
      setSuccess(null);
      await usersAPI.updatePassword(userId, editPassword);
      setSuccess('Password updated successfully');
      setEditingUser(null);
      setEditPassword('');
      setEditMode(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
    }
  };

  const handleUpdateRole = async (userId) => {
    try {
      setError(null);
      setSuccess(null);
      await usersAPI.updateRole(userId, editRole);
      setSuccess('Role updated successfully');
      setEditingUser(null);
      setEditRole('');
      setEditMode(null);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    try {
      setError(null);
      setSuccess(null);
      await usersAPI.delete(userId);
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleLoadSteamCreds = async (userId) => {
    try {
      setError(null);
      const response = await usersAPI.getSteamCredentials(userId);
      const creds = response.data.credentials;
      if (creds) {
        setSteamUsername(creds.username || '');
        setSteamPassword(''); // Don't show existing password
      } else {
        setSteamUsername('');
        setSteamPassword('');
      }
      setEditingSteamCreds(userId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load STEAM credentials');
    }
  };

  const handleSaveSteamCreds = async (userId) => {
    if (!steamUsername || !steamPassword) {
      setError('STEAM username and password are required');
      return;
    }
    try {
      setError(null);
      setSuccess(null);
      await usersAPI.setSteamCredentials(userId, steamUsername, steamPassword);
      setSuccess('STEAM credentials saved successfully');
      setEditingSteamCreds(null);
      setSteamUsername('');
      setSteamPassword('');
      // Reload users to refresh STEAM credentials display
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save STEAM credentials');
    }
  };

  const handleDeleteSteamCreds = async (userId) => {
    if (!window.confirm('Are you sure you want to delete STEAM credentials for this user?')) {
      return;
    }
    try {
      setError(null);
      setSuccess(null);
      await usersAPI.deleteSteamCredentials(userId);
      setSuccess('STEAM credentials deleted successfully');
      if (editingSteamCreds === userId) {
        setEditingSteamCreds(null);
        setSteamUsername('');
        setSteamPassword('');
      }
      // Reload users to refresh STEAM credentials display
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete STEAM credentials');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, color: '#1f2937', fontSize: '1.875rem' }}>User Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          {showCreateForm ? 'Cancel' : '+ Create User'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          border: '1px solid #fecaca'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          border: '1px solid #a7f3d0'
        }}>
          {success}
        </div>
      )}

      {showCreateForm && (
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#374151' }}>Create New User</h3>
          <form onSubmit={handleCreateUser}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>
                Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>
                Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Create User
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewUsername('');
                  setNewPassword('');
                  setNewRole('user');
                }}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: '600' }}>Username</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: '600' }}>Role</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: '600' }}>STEAM Username</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: '600' }}>Created</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem', color: '#1f2937' }}>{u.username}</td>
                <td style={{ padding: '1rem' }}>
                  {editingUser === u.id && editMode === 'role' ? (
                    <select
                      value={editRole || u.role}
                      onChange={(e) => setEditRole(e.target.value)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      backgroundColor: u.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                      color: u.role === 'admin' ? '#1e40af' : '#374151'
                    }}>
                      {u.role}
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem', color: '#1f2937', fontSize: '0.875rem' }}>
                  {userSteamCreds[u.id] ? (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      fontFamily: 'monospace'
                    }}>
                      {userSteamCreds[u.id].username}
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not set</span>
                  )}
                </td>
                <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {editingUser === u.id ? (
                      <>
                        {editMode === 'password' ? (
                          <>
                            <input
                              type="password"
                              placeholder="New password"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.25rem',
                                fontSize: '0.875rem',
                                width: '150px'
                              }}
                            />
                            <button
                              onClick={() => handleUpdatePassword(u.id)}
                              style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setEditPassword('');
                                setEditMode(null);
                              }}
                              style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUpdateRole(u.id)}
                              style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Save Role
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setEditRole('');
                                setEditMode(null);
                              }}
                              style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingUser(u.id);
                            setEditPassword('');
                            setEditRole(u.role);
                            setEditMode('role');
                          }}
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Edit Role
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(u.id);
                            setEditPassword('');
                            setEditMode('password');
                          }}
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Change Password
                        </button>
                        <button
                          onClick={() => handleLoadSteamCreds(u.id)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          STEAM
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingSteamCreds && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>
              STEAM Credentials for {users.find(u => u.id === editingSteamCreds)?.username}
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>
                STEAM Username
              </label>
              <input
                type="text"
                value={steamUsername}
                onChange={(e) => setSteamUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>
                STEAM Password
              </label>
              <input
                type="password"
                value={steamPassword}
                onChange={(e) => setSteamPassword(e.target.value)}
                required
                placeholder={steamUsername ? 'Enter new password' : 'Enter password'}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleSaveSteamCreds(editingSteamCreds)}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Save
              </button>
              <button
                onClick={() => handleDeleteSteamCreds(editingSteamCreds)}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setEditingSteamCreds(null);
                  setSteamUsername('');
                  setSteamPassword('');
                }}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
