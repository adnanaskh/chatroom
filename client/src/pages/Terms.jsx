import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Terms() {
  return (
    <div className="auth-page" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ maxWidth: '800px', width: '100%', margin: '0 auto', background: 'var(--bg-secondary)' }}>
        <Link to="/" className="btn btn-ghost" style={{ marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <FileText size={32} style={{ color: 'var(--accent)' }} />
          <h1 style={{ margin: 0 }}>Terms and Conditions</h1>
        </div>
        
        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing and using ChatRoom, you accept and agree to be bound by the terms and provision of this agreement.</p>
          <br/>
          
          <h3>2. User Conduct</h3>
          <p>You agree to use the service only for lawful purposes. You agree not to take any action that might compromise the security of the site, render the site inaccessible to others, or otherwise cause damage to the site or the content.</p>
          <br/>

          <h3>3. Data Privacy and Logging</h3>
          <p>To comply with legal requirements and ensure the safety of our users, we log certain account activities including but not limited to IP addresses, login timings, browser information, and account changes. Message content remains encrypted.</p>
          <br/>

          <h3>4. Copyright and Ownership</h3>
          <p>This site is designed, developed and owned by Adnan Ahmad. All copyright only he holds. Unauthorized copying, modification, or distribution is strictly prohibited.</p>
          <br/>

          <h3>5. Jurisdiction</h3>
          <p>This agreement falls under Indian jurisdiction. Any disputes arising out of this agreement shall be subject to the exclusive jurisdiction of the courts in India.</p>
        </div>
      </div>
    </div>
  );
}
