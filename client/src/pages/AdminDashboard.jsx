import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, MessageSquare, Settings, LogOut, UserPlus, Trash2, KeyRound,
  Clock, AlertTriangle, BarChart3, RefreshCw
} from 'lucide-react';
import api from '../services/api';

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, todayCount: 0 });
  const [settings, setSettings] = useState({ messageTTL: 86400 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '' });
  const [newPassword, setNewPassword] = useState('');
  const [ttlInput, setTtlInput] = useState('24');
  const [ttlUnit, setTtlUnit] = useState('hours');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/admin'); return; }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [usersData, statsData, settingsData] = await Promise.all([
        api.getUsers(), api.getMessageStats(), api.getSettings()
      ]);
      setUsers(usersData);
      setStats(statsData);
      setSettings(settingsData);
      const ttl = settingsData.messageTTL || 86400;
      if (ttl >= 86400 && ttl % 86400 === 0) { setTtlInput(String(ttl / 86400)); setTtlUnit('days'); }
      else if (ttl >= 3600 && ttl % 3600 === 0) { setTtlInput(String(ttl / 3600)); setTtlUnit('hours'); }
      else { setTtlInput(String(ttl / 60)); setTtlUnit('minutes'); }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({ username: '', password: '', displayName: '' });
      setSuccess('User created successfully!');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.deleteUser(id);
      setShowDeleteConfirm(null);
      setSuccess('User deleted.');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleResetPassword = async (id) => {
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    try {
      await api.resetPassword(id, newPassword);
      setShowResetModal(null);
      setNewPassword('');
      setSuccess('Password reset successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleUpdateTTL = async () => {
    const multiplier = ttlUnit === 'days' ? 86400 : ttlUnit === 'hours' ? 3600 : 60;
    const ttl = parseInt(ttlInput) * multiplier;
    if (isNaN(ttl) || ttl < 60) { setError('Minimum TTL is 1 minute.'); return; }
    try {
      const res = await api.updateTTL(ttl);
      setSuccess(res.message);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleClearMessages = async () => {
    if (!window.confirm('Delete ALL messages? This cannot be undone.')) return;
    try {
      const res = await api.clearMessages();
      setSuccess(res.message);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin');
  };

  const navItems = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>⚡ Admin Panel</h2>
          <p>Chat Management</p>
        </div>
        <div className="admin-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`admin-nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => { setTab(id); setError(''); }}>
              <Icon size={18} /> <span>{label}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleLogout}>
            <LogOut size={16} /> <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="admin-main">
        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', padding: '10px 14px', borderRadius: '8px', color: 'var(--success)', fontSize: '0.85rem', marginBottom: '16px' }}>
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <>
            <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1>User Management</h1>
                <p>Create, manage, and remove chat users</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={loadData}><RefreshCw size={14} /></button>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowCreateModal(true); setError(''); }}>
                  <UserPlus size={14} /> Create User
                </button>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><Users size={20} /></div>
                <div className="stat-value">{users.length}</div>
                <div className="stat-label">Total Users</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}><Users size={20} /></div>
                <div className="stat-value">{users.filter(u => u.isOnline).length}</div>
                <div className="stat-label">Online Now</div>
              </div>
            </div>

            <div className="card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>User</th><th>Username</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={u.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                          {u.displayName}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.username}</td>
                        <td><span className={`badge ${u.isOnline ? 'badge-success' : 'badge-muted'}`}>{u.isOnline ? 'Online' : 'Offline'}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-ghost btn-sm" title="Reset Password" onClick={() => { setShowResetModal(u); setNewPassword(''); setError(''); }}>
                              <KeyRound size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} title="Delete" onClick={() => setShowDeleteConfirm(u)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No users created yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* MESSAGES TAB */}
        {tab === 'messages' && (
          <>
            <div className="admin-page-header">
              <h1>Message Stats</h1>
              <p>Monitor chat activity and message retention</p>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><MessageSquare size={20} /></div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Messages</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}><BarChart3 size={20} /></div>
                <div className="stat-value">{stats.todayCount}</div>
                <div className="stat-label">Messages Today</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}><Clock size={20} /></div>
                <div className="stat-value">{((settings.messageTTL || 86400) / 3600).toFixed(0)}h</div>
                <div className="stat-label">Auto-Delete After</div>
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <AlertTriangle size={32} style={{ color: 'var(--danger)', marginBottom: '12px' }} />
              <h3 style={{ marginBottom: '8px' }}>Danger Zone</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Clear all messages from the database. This cannot be undone.</p>
              <button className="btn btn-danger" onClick={handleClearMessages}>
                <Trash2 size={16} /> Clear All Messages
              </button>
            </div>
          </>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <>
            <div className="admin-page-header">
              <h1>Settings</h1>
              <p>Configure message retention and other options</p>
            </div>
            <div className="settings-section">
              <h3>Message Retention</h3>
              <div className="setting-row">
                <div className="setting-info">
                  <h4>Auto-Delete Messages</h4>
                  <p>Messages will be automatically deleted after this period</p>
                </div>
                <div className="setting-control">
                  <input className="input" type="number" min="1" value={ttlInput}
                    onChange={(e) => setTtlInput(e.target.value)} />
                  <select className="input" style={{ width: 'auto' }} value={ttlUnit}
                    onChange={(e) => setTtlUnit(e.target.value)}>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={handleUpdateTTL}>Save</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* CREATE USER MODAL */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Create New User</h2>
              <p className="modal-subtitle">This user will be able to login and chat</p>
              {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
              <form className="modal-form" onSubmit={handleCreateUser}>
                <div className="input-group">
                  <label>Display Name</label>
                  <input className="input" placeholder="e.g. John Doe" value={newUser.displayName}
                    onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Username</label>
                  <input className="input" placeholder="e.g. john" value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Password</label>
                  <input className="input" type="password" placeholder="Min 6 characters" value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <span className="spinner" /> : <><UserPlus size={16} /> Create</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RESET PASSWORD MODAL */}
        {showResetModal && (
          <div className="modal-overlay" onClick={() => setShowResetModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Reset Password</h2>
              <p className="modal-subtitle">Set new password for {showResetModal.displayName}</p>
              <div className="modal-form">
                <div className="input-group">
                  <label>New Password</label>
                  <input className="input" type="password" placeholder="Min 6 characters"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowResetModal(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => handleResetPassword(showResetModal._id)}>
                    <KeyRound size={16} /> Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRM MODAL */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Delete User</h2>
              <p className="modal-subtitle">Are you sure you want to delete <strong>{showDeleteConfirm.displayName}</strong>? This cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDeleteUser(showDeleteConfirm._id)}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
