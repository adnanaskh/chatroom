import { MessageSquare, Briefcase, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RefreshButton from '../components/RefreshButton';

export default function AdminHub() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Lock size={32} color="var(--accent)" />
          <h1 style={{ margin: 0 }}>Admin Hub</h1>
        </div>
        <RefreshButton />
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Secure management portal for all connected applications.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        <div 
          onClick={() => navigate('/chat')}
          className="card"
          style={{ 
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '30px',
            textAlign: 'center'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <MessageSquare size={40} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0' }}>Chat App Admin</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage users, messages, and tracking</p>
        </div>

        <div 
          className="card"
          style={{ 
            cursor: 'not-allowed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '30px',
            textAlign: 'center',
            opacity: 0.6
          }}
        >
          <Briefcase size={40} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0' }}>Portfolio Admin</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>(Coming Soon)</p>
        </div>
      </div>
    </div>
  );
}
