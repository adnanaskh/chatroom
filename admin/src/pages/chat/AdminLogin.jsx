import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, ArrowLeft } from 'lucide-react';
import api from '../../services/api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('adminToken')) {
      navigate('/chat/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.adminLogin(username, password);
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      navigate('/chat/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <Shield size={32} style={{ color: 'var(--accent)' }} />
        </div>
        <h1>Admin Access</h1>
        <p className="subtitle">Authorized personnel only</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Admin Username</label>
            <input className="input" type="text" placeholder="Username"
              value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="input-group">
            <label>Admin Password</label>
            <input className="input" type="password" placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <><LogIn size={16} /> Login</>}
          </button>
        </form>

        <div className="auth-links">
          <a href="/">← User Login</a>
        </div>
      </div>
    </div>
  );
}
