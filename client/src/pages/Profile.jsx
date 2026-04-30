import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }
    api.getProfile().then((profile) => {
      setUser(profile);
      setDisplayName(profile.displayName || '');
    }).catch(() => navigate('/'));
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const response = await api.updateProfile({ displayName: displayName.trim(), password: password || undefined });
      const updatedUser = response.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser); setPassword('');
      setSuccess('Profile updated.'); setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Unable to update profile.');
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') { setError('Type "DELETE" to confirm.'); return; }
    setLoading(true); setError('');
    try {
      await api.deleteAccount();
      localStorage.removeItem('token'); localStorage.removeItem('user');
      navigate('/');
    } catch (err) { setError(err.message); setLoading(false); }
  };

  if (!user) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/chat')} style={{ marginBottom: '14px' }}>
          <ArrowLeft size={14} /> Back to chat
        </button>
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <User size={28} style={{ color: 'var(--accent)' }} />
        </div>
        <h1>My Profile</h1>
        <p className="subtitle">Update your display name and password</p>

        {success && <div className="auth-error" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}>{success}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input className="input" type="text" value={user.username} disabled style={{ opacity: 0.5 }} />
          </div>
          <div className="input-group">
            <label>Display Name</label>
            <input className="input" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>New Password (leave blank to keep current)</label>
            <input className="input" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <><CheckCircle2 size={16} /> Save Changes</>}
          </button>
        </form>

        <div style={{ marginTop: '32px', padding: '20px', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '12px', background: 'rgba(239,68,68,0.04)' }}>
          <h3 style={{ color: 'var(--danger)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <AlertTriangle size={16} /> Danger Zone
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '14px' }}>
            Permanently delete your account and all messages.
          </p>
          <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
            <Trash2 size={14} /> Delete Account
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <AlertTriangle size={36} style={{ color: 'var(--danger)', marginBottom: '12px' }} />
              <h2 style={{ color: 'var(--danger)' }}>Delete Account</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.85rem' }}>
                This cannot be undone. All data will be permanently removed.
              </p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '500' }}>
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input className="input" type="text" value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" autoFocus />
            </div>
            {error && <div className="auth-error" style={{ marginBottom: '14px' }}>{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setError(''); }} disabled={loading}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={loading || deleteConfirmText !== 'DELETE'}>
                {loading ? <><div className="spinner" style={{ width: '14px', height: '14px' }} /> Deleting...</> : <><Trash2 size={14} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
