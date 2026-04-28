import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, MessageCircle } from 'lucide-react';
import api from '../services/api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.adminLogin(username, password);
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      navigate('/admin/dashboard');
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
          <Shield size={40} style={{ color: '#6366f1' }} />
        </div>
        <h1>Admin Access</h1>
        <p className="subtitle">Restricted — authorized personnel only</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Admin Username</label>
            <input
              className="input" type="text" placeholder="Enter admin username"
              value={username} onChange={(e) => setUsername(e.target.value)}
              required autoFocus
            />
          </div>
          <div className="input-group">
            <label>Admin Password</label>
            <input
              className="input" type="password" placeholder="Enter admin password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <><LogIn size={18} /> Login as Admin</>}
          </button>
        </form>

        <div className="auth-links">
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageCircle size={14} /> User Login
          </a>
        </div>
      </div>
    </div>
  );
}
