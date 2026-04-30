import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserLogin from './pages/UserLogin';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Terms from './pages/Terms';
import About from './pages/About';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
