import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, LogOut, Users, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { navigate('/'); return; }

    const parsed = JSON.parse(userData);
    setUser(parsed);

    // Load messages
    api.getMessages().then((data) => {
      setMessages(data.messages);
      setTimeout(scrollToBottom, 100);
    }).catch(console.error);

    // Connect socket
    const socket = connectSocket(token);

    socket.on('message:new', (msg) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(scrollToBottom, 50);
    });

    socket.on('users:online', (users) => setOnlineUsers(users));

    socket.on('typing:start', ({ username }) => {
      setTypingUsers((prev) => prev.includes(username) ? prev : [...prev, username]);
    });

    socket.on('typing:stop', ({ username }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== username));
    });

    return () => disconnectSocket();
  }, [navigate, scrollToBottom]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('message:send', {
      content: newMessage.trim(),
      senderName: user.displayName,
    });

    setNewMessage('');
    socket.emit('typing:stop', { username: user.displayName });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    const socket = getSocket();
    if (!socket) return;

    socket.emit('typing:start', { username: user.displayName });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { username: user.displayName });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  if (!user) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2><span className="logo-dot" /> ChatRoom</h2>
        </div>

        <div style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          <Users size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Online — {onlineUsers.length}
        </div>

        <div className="user-list">
          {onlineUsers.map((u) => (
            <div className="user-item" key={u.socketId}>
              <div className="user-avatar">
                {getInitials(u.username)}
                <span className="status-dot online" />
              </div>
              <div className="user-info">
                <div className="name">{u.username}</div>
                <div className="status">Online</div>
              </div>
            </div>
          ))}
          {onlineUsers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No users online
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="current-user">
            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
              {getInitials(user.displayName)}
            </div>
            <div>
              <div className="name">{user.displayName}</div>
              <div className="role">User</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="main-content">
        <div className="chat-header">
          <h3>
            <MessageCircle size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent)' }} />
            General Chat
          </h3>
          <div className="online-count">
            <span className="dot" /> {onlineUsers.length} online
          </div>
        </div>

        <div className="messages-area">
          {messages.length === 0 && (
            <div className="empty-state">
              <MessageCircle size={48} />
              <h3>No messages yet</h3>
              <p>Start the conversation!</p>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.type === 'system') {
              return <div key={msg._id} className="system-message">{msg.content}</div>;
            }
            const isOwn = msg.sender === user.id;
            return (
              <div key={msg._id} className={`message-group ${isOwn ? 'own' : ''}`}>
                <div className="message-avatar">{getInitials(msg.senderName)}</div>
                <div className="message-content">
                  <span className="message-sender">{msg.senderName}</span>
                  <div className="message-bubble">{msg.content}</div>
                  <span className="message-time">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="typing-indicator">
          {typingUsers.length > 0 && (
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          )}
        </div>

        <div className="chat-input-area">
          <form className="chat-input-wrapper" onSubmit={handleSend}>
            <input
              className="input" placeholder="Type a message..."
              value={newMessage} onChange={handleTyping} onKeyDown={handleKeyDown}
              autoFocus maxLength={2000}
            />
            <button className="btn btn-primary btn-icon" type="submit" disabled={!newMessage.trim()}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
