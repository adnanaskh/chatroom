import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, MessageCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.registerUser({ username, displayName, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <MessageCircle size={40} style={{ color: '#6366f1' }} />
        </div>
        <h1>Create Account</h1>
        <p className="subtitle">Sign up and start chatting instantly</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input
              className="input"
              type="text"
              placeholder="Pick a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="input-group">
            <label>Display Name</label>
            <input
              className="input"
              type="text"
              placeholder="What should people call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <><UserPlus size={18} /> Register</>}
          </button>
        </form>

        <div className="auth-links" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/')}
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={14} /> Back to Sign In
          </button>
          <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Admin Panel
          </a>
        </div>
      </div>
    </div>
  );
}
