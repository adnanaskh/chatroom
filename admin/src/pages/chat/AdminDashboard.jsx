import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MessageSquare, LogOut, UserPlus, Trash2, KeyRound, AlertTriangle, RefreshCw, ShieldOff, ShieldCheck, Search, Activity, Globe, Monitor, X, Eye } from 'lucide-react';
import api from '../../services/api';
import RefreshButton from '../../components/RefreshButton';

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, todayCount: 0 });
  const [tracking, setTracking] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) { navigate('/chat'); return; }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [usersData, statsData] = await Promise.all([api.getUsers(), api.getMessageStats()]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) { console.error(err); }
  };

  const loadTracking = async () => {
    try {
      const [summary, logsData] = await Promise.all([
        api.getTrackingSummary(),
        api.getAllActivityLogs(1, 50, logFilter)
      ]);
      setTracking(summary);
      setAllLogs(logsData.logs || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (tab === 'tracking') loadTracking(); }, [tab, logFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.createUser(newUser);
      setShowCreateModal(false); setNewUser({ username: '', password: '', displayName: '' });
      setSuccess('User created.'); loadData(); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.deleteUser(id); setShowDeleteConfirm(null);
      setSuccess('User deleted.'); loadData(); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleResetPassword = async (id) => {
    if (newPassword.length < 6) { setError('Min 6 characters.'); return; }
    try {
      await api.resetPassword(id, newPassword); setShowResetModal(null); setNewPassword('');
      setSuccess('Password reset.'); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleBanToggle = async (user) => {
    try {
      await api.banUser(user._id, !user.isBanned, user.isBanned ? '' : 'Violation');
      setSuccess(`User ${user.isBanned ? 'unbanned' : 'banned'}.`); loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleViewActivity = async (user) => {
    try {
      setShowActivityModal(user);
      setActivityLogs(await api.getActivityLogs(user._id));
    } catch (err) { setError('Failed to fetch logs.'); }
  };

  const handleClearMessages = async () => {
    if (!window.confirm('Delete ALL messages? Cannot be undone.')) return;
    try {
      const res = await api.clearMessages();
      setSuccess(res.message); loadData(); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleClearUsers = async () => {
    if (!window.confirm('Delete ALL standard users? This cannot be undone.')) return;
    try {
      const res = await api.clearUsers();
      setSuccess(res.message); loadData(); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Delete ALL tracking and activity logs?')) return;
    try {
      const res = await api.clearActivityLogs();
      setSuccess(res.message); loadTracking(); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const v = searchQuery.toLowerCase();
    return u.username.toLowerCase().includes(v) || u.displayName.toLowerCase().includes(v);
  });

  const parseBrowser = (ua) => {
    if (!ua || ua === 'Unknown') return 'Unknown';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return ua.slice(0, 30) + '...';
  };

  const navItems = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'tracking', label: 'Tracking', icon: Eye },
  ];

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>⚡ Admin</h2><p>Management</p>
        </div>
        <div className="admin-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`admin-nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => { setTab(id); setError(''); }}>
              <Icon size={16} /> <span>{label}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: '14px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => {
            localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); navigate('/chat');
          }}><LogOut size={14} /> <span>Logout</span></button>
        </div>
      </div>

      <div className="admin-main">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
          <RefreshButton />
        </div>
        {success && <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', padding: '10px 14px', borderRadius: '8px', color: 'var(--success)', fontSize: '0.8rem', marginBottom: '14px' }}>✓ {success}</div>}
        {error && <div className="auth-error" style={{ marginBottom: '14px' }}>{error}</div>}

        {/* USERS TAB */}
        {tab === 'users' && (<>
          <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div><h1>Users</h1><p>Manage accounts and permissions</p></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={loadData}><RefreshCw size={14} /></button>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowCreateModal(true); setError(''); }}>
                <UserPlus size={14} /> Create
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <input className="input" type="search" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {filteredUsers.length}/{users.length}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><Users size={18} /></div>
              <div className="stat-value">{users.length}</div><div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}><Users size={18} /></div>
              <div className="stat-value">{users.filter(u => u.isOnline).length}</div><div className="stat-label">Online</div>
            </div>
          </div>

          <div className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>User</th><th>Username</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={u.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                        {u.displayName}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.username}</td>
                      <td>
                        <span className={`badge ${u.isOnline ? 'badge-success' : 'badge-muted'}`}>{u.isOnline ? 'On' : 'Off'}</span>
                        {u.isBanned && <span className="badge badge-danger" style={{ marginLeft: 4 }}>Ban</span>}
                        {u.isDeleted && <span className="badge badge-muted" style={{ marginLeft: 4 }}>Del</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost btn-sm" title="Reset Password" onClick={() => { setShowResetModal(u); setNewPassword(''); setError(''); }}><KeyRound size={13} /></button>
                          <button className="btn btn-ghost btn-sm" title="Activity" onClick={() => handleViewActivity(u)}><Activity size={13} /></button>
                          <button className="btn btn-ghost btn-sm" style={{ color: u.isBanned ? 'var(--success)' : 'var(--warning)' }} title={u.isBanned ? 'Unban' : 'Ban'} onClick={() => handleBanToggle(u)}>
                            {u.isBanned ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} title="Delete" onClick={() => setShowDeleteConfirm(u)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '32px', marginTop: '24px' }}>
            <AlertTriangle size={28} style={{ color: 'var(--danger)', marginBottom: '10px' }} />
            <h3 style={{ marginBottom: '6px', fontSize: '1rem' }}>Danger Zone</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>Clear all standard user accounts permanently.</p>
            <button className="btn btn-danger btn-sm" onClick={handleClearUsers}><Trash2 size={14} /> Clear All Users</button>
          </div>
        </>)}

        {/* MESSAGES TAB */}
        {tab === 'messages' && (<>
          <div className="admin-page-header"><h1>Messages</h1><p>Monitor chat activity</p></div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><MessageSquare size={18} /></div>
              <div className="stat-value">{stats.total}</div><div className="stat-label">Total Messages</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}><MessageSquare size={18} /></div>
              <div className="stat-value">{stats.todayCount}</div><div className="stat-label">Today</div>
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <AlertTriangle size={28} style={{ color: 'var(--danger)', marginBottom: '10px' }} />
            <h3 style={{ marginBottom: '6px', fontSize: '1rem' }}>Danger Zone</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>Clear all messages permanently.</p>
            <button className="btn btn-danger btn-sm" onClick={handleClearMessages}><Trash2 size={14} /> Clear All</button>
          </div>
        </>)}

        {/* TRACKING TAB */}
        {tab === 'tracking' && (<>
          <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div><h1>User Tracking</h1><p>IPs, sessions, activity logs</p></div>
            <button className="btn btn-secondary btn-sm" onClick={loadTracking}><RefreshCw size={14} /></button>
          </div>

          {tracking && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><Activity size={18} /></div>
                <div className="stat-value">{tracking.totalLogs}</div><div className="stat-label">Total Logs</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}><Users size={18} /></div>
                <div className="stat-value">{tracking.todayLogins}</div><div className="stat-label">Logins Today</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}><Monitor size={18} /></div>
                <div className="stat-value">{tracking.weekLogins}</div><div className="stat-label">This Week</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}><Globe size={18} /></div>
                <div className="stat-value">{tracking.uniqueIPCount}</div><div className="stat-label">Unique IPs</div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['', 'LOGIN', 'REGISTER', 'NAME_CHANGE', 'PASSWORD_CHANGE', 'ACCOUNT_DELETED'].map(f => (
              <button key={f} className={`btn btn-sm ${logFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setLogFilter(f)}>{f || 'All'}</button>
            ))}
          </div>

          <div className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>IP Address</th><th>Browser</th><th>Country</th><th>Details</th></tr></thead>
                <tbody>
                  {allLogs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ fontWeight: 500 }}>{log.username}</td>
                      <td><span className={`badge ${log.action === 'LOGIN' ? 'badge-success' : log.action === 'ACCOUNT_DELETED' ? 'badge-danger' : 'badge-muted'}`}>{log.action}</span></td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>{log.ipAddress}</td>
                      <td style={{ fontSize: '0.75rem' }} title={log.browser}>{parseBrowser(log.browser)}</td>
                      <td style={{ fontSize: '0.75rem' }}>{log.country}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.details || '—'}</td>
                    </tr>
                  ))}
                  {allLogs.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No logs found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '32px', marginTop: '24px' }}>
            <AlertTriangle size={28} style={{ color: 'var(--danger)', marginBottom: '10px' }} />
            <h3 style={{ marginBottom: '6px', fontSize: '1rem' }}>Danger Zone</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>Clear all tracking data and activity logs permanently.</p>
            <button className="btn btn-danger btn-sm" onClick={handleClearLogs}><Trash2 size={14} /> Clear All Logs</button>
          </div>
        </>)}

        {/* MODALS */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Create User</h2><p className="modal-subtitle">New user account</p>
              {error && <div className="auth-error" style={{ marginBottom: '14px' }}>{error}</div>}
              <form className="modal-form" onSubmit={handleCreateUser}>
                <div className="input-group"><label>Display Name</label><input className="input" placeholder="John Doe" value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} required /></div>
                <div className="input-group"><label>Username</label><input className="input" placeholder="john" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required /></div>
                <div className="input-group"><label>Password</label><input className="input" type="password" placeholder="Min 6 chars" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} /></div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : <><UserPlus size={14} /> Create</>}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showResetModal && (
          <div className="modal-overlay" onClick={() => setShowResetModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Reset Password</h2><p className="modal-subtitle">For {showResetModal.displayName}</p>
              <div className="modal-form">
                <div className="input-group"><label>New Password</label><input className="input" type="password" placeholder="Min 6 chars" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowResetModal(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => handleResetPassword(showResetModal._id)}><KeyRound size={14} /> Reset</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Delete User</h2><p className="modal-subtitle">Delete <strong>{showDeleteConfirm.displayName}</strong> permanently?</p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDeleteUser(showDeleteConfirm._id)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </div>
        )}

        {showActivityModal && (
          <div className="modal-overlay" onClick={() => setShowActivityModal(null)}>
            <div className="modal" style={{ maxWidth: '800px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2>Activity: {showActivityModal.displayName}</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowActivityModal(null)}><X size={18} /></button>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Action</th><th>IP</th><th>Browser</th><th>Country</th><th>Details</th></tr></thead>
                  <tbody>
                    {activityLogs.map((log) => (
                      <tr key={log._id}>
                        <td style={{ fontSize: '0.75rem' }}>{new Date(log.createdAt).toLocaleString()}</td>
                        <td><span className="badge badge-muted">{log.action}</span></td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>{log.ipAddress}</td>
                        <td style={{ fontSize: '0.7rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.browser}>{parseBrowser(log.browser)}</td>
                        <td style={{ fontSize: '0.75rem' }}>{log.country}</td>
                        <td style={{ fontSize: '0.75rem' }}>{log.details || '—'}</td>
                      </tr>
                    ))}
                    {activityLogs.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No logs</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
