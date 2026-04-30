import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminHub from './pages/AdminHub';
import ChatAdminLogin from './pages/chat/AdminLogin';
import ChatAdminDashboard from './pages/chat/AdminDashboard';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminHub />} />
        <Route path="/chat" element={<ChatAdminLogin />} />
        <Route path="/chat/dashboard" element={<ChatAdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
