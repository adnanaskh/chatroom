import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, UserPlus } from 'lucide-react';
import api from '../services/api';

export default function UserLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token') && localStorage.getItem('user')) {
      navigate('/chat', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.userLogin(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>ChatRoom</h1>
        <p className="subtitle">Sign in to continue</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input className="input" type="text" placeholder="Enter your username"
              value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input className="input" type="password" placeholder="Enter your password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <div className="auth-links" style={{ justifyContent: 'center' }}>
          <a href="/register" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <UserPlus size={13} /> Create Account
          </a>
        </div>
      </div>
    </div>
  );
}
