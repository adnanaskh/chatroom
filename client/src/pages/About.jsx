import { Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';

export default function About() {
  return (
    <div className="auth-page" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ maxWidth: '800px', width: '100%', margin: '0 auto', background: 'var(--bg-secondary)' }}>
        <Link to="/" className="btn btn-ghost" style={{ marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Info size={32} style={{ color: 'var(--accent)' }} />
          <h1 style={{ margin: 0 }}>About ChatRoom</h1>
        </div>
        
        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '1.1rem' }}>
          <p>
            Welcome to ChatRoom, a secure and real-time messaging application built for fast, reliable, and private communication.
          </p>
          <br/>
          <p>
            <strong>Ownership & Copyright</strong><br/>
            This site is designed, developed and owned by Adnan Ahmad. All copyright only he holds.
          </p>
          <br/>
          <p>
            <strong>Jurisdiction</strong><br/>
            This service and its operations fall strictly under Indian jurisdiction. 
          </p>
          <br/>
          <p>
            <strong>Security & Privacy</strong><br/>
            We prioritize user safety. Messages are encrypted via AES, and comprehensive activity logging is maintained securely for documentation to protect against misuse and for compliance with legal regulations if any case is filed.
          </p>
        </div>
      </div>
    </div>
  );
}
