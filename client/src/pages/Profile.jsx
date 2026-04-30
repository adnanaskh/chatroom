import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
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
      </div>
    </div>
  );
}
