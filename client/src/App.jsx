import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserLogin from './pages/UserLogin';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserLogin />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </Router>
  );
}

export default App;
