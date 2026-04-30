import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowLeft, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
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
    if (!token) {
      navigate('/');
      return;
    }

    api.getProfile().then((profile) => {
      setUser(profile);
      setDisplayName(profile.displayName || '');
    }).catch((err) => {
      console.error(err);
      navigate('/');
    });
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.updateProfile({ displayName: displayName.trim(), password: password || undefined });
      const updatedUser = response.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setPassword('');
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Unable to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.deleteAccount();
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Unable to delete account.');
      setLoading(false);
    }
  };

  const goBack = () => navigate('/chat');

  if (!user) {
    return <div className="page-loader"><div className="spinner" /></div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <button type="button" className="btn btn-ghost" onClick={goBack} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back to chat
        </button>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <User size={36} style={{ color: '#6366f1' }} />
        </div>
        <h1>My Profile</h1>
        <p className="subtitle">Manage your display name and password securely</p>

        {success && <div className="auth-error" style={{ background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)', color: 'var(--success)' }}>{success}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input className="input" type="text" value={user.username} disabled />
          </div>
          <div className="input-group">
            <label>Display Name</label>
            <input
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>New Password (leave blank to keep current)</label>
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <><CheckCircle2 size={18} /> Save Changes</>}
          </button>
        </form>

        {/* Danger Zone */}
        <div style={{ marginTop: '40px', padding: '24px', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', background: 'rgba(239,68,68,0.05)' }}>
          <h3 style={{ color: 'var(--danger)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} />
            Danger Zone
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Once you delete your account, there is no going back. This will permanently delete your account and remove all your messages from our servers.
          </p>
          <button
            className="btn btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
          >
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
              <h2 style={{ color: 'var(--danger)' }}>Delete Account</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                This action cannot be undone. This will permanently delete your account and remove all your messages.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                className="input"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                autoFocus
              />
            </div>

            {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setError(''); }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmText !== 'DELETE'}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
