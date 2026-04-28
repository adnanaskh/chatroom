import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, LogOut, Search, MessageCircle, ArrowLeft, X, Menu } from 'lucide-react';
import api from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const activeChatRef = useRef(null);
  const navigate = useNavigate();

  const isMobile = () => window.innerWidth <= 768;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { navigate('/'); return; }

    const parsed = JSON.parse(userData);
    setUser(parsed);

    loadConversations();

    const socket = connectSocket(token);

    socket.on('message:new', (msg) => {
      const currentChat = activeChatRef.current;
      const isInCurrentChat = currentChat && (
        (msg.sender === currentChat._id && msg.receiver === parsed.id) ||
        (msg.sender === parsed.id && msg.receiver === currentChat._id)
      );

      if (isInCurrentChat) {
        setMessages((prev) => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setTimeout(scrollToBottom, 50);
      }

      setConversations(prev => {
        const otherUserId = msg.sender === parsed.id ? msg.receiver : msg.sender;
        const existing = prev.find(c => c.user._id === otherUserId);
        if (existing) {
          const updated = prev.map(c =>
            c.user._id === otherUserId
              ? { ...c, lastMessage: msg.content, lastMessageAt: msg.createdAt }
              : c
          );
          return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        }
        loadConversations();
        return prev;
      });
    });

    socket.on('users:online', (users) => setOnlineUsers(users));

    socket.on('typing:start', ({ username, userId }) => {
      setTypingUsers((prev) => prev.includes(username) ? prev : [...prev, username]);
    });

    socket.on('typing:stop', ({ username, userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== username));
    });

    return () => disconnectSocket();
  }, [navigate, scrollToBottom]);

  const loadConversations = async () => {
    try {
      const [convData, usersData] = await Promise.all([
        api.getConversations(),
        api.getAllUsers()
      ]);
      setConversations(convData);
      setAllUsers(usersData);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const openChat = async (chatUser) => {
    setActiveChat(chatUser);
    setMessages([]);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setTypingUsers([]);
    if (isMobile()) setShowSidebar(false);

    try {
      const data = await api.getConversation(chatUser._id);
      setMessages(data.messages);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const goBackToList = () => {
    setActiveChat(null);
    setMessages([]);
    setShowSidebar(true);
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    clearTimeout(searchTimeoutRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await api.searchUsers(value);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('message:send', {
      content: newMessage.trim(),
      senderName: user.displayName,
      receiverId: activeChat._id,
    });

    setNewMessage('');
    socket.emit('typing:stop', { receiverId: activeChat._id });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!activeChat) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('typing:start', { username: user.displayName, receiverId: activeChat._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { username: user.displayName, receiverId: activeChat._id });
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
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMsgTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const isUserOnline = (userId) => {
    return onlineUsers.some(u => u.userId === userId);
  };

  if (!user) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      <div className={`sidebar ${!showSidebar ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <h2><span className="logo-dot" /> ChatRoom</h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); setSearchResults([]); }}
            title="Search users"
          >
            {showSearch ? <X size={18} /> : <Search size={18} />}
          </button>
        </div>

        {showSearch && (
          <div style={{ padding: '8px 12px' }}>
            <input
              className="input"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            {searchResults.length > 0 && (
              <div className="user-list" style={{ maxHeight: '200px', marginTop: '4px' }}>
                {searchResults.map((u) => (
                  <div
                    className="user-item"
                    key={u._id}
                    onClick={() => openChat(u)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="user-avatar">
                      {u.avatar ? <img src={u.avatar} alt="" /> : getInitials(u.displayName)}
                      <span className={`status-dot ${isUserOnline(u._id) ? 'online' : 'offline'}`} />
                    </div>
                    <div className="user-info">
                      <div className="name">{u.displayName}</div>
                      <div className="status">@{u.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No users found
              </div>
            )}
          </div>
        )}

        <div style={{ padding: '8px 16px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          Conversations
        </div>

        <div className="user-list">
          {conversations.map((conv) => (
            <div
              className="user-item"
              key={conv.user._id}
              onClick={() => openChat(conv.user)}
              style={{
                cursor: 'pointer',
                background: activeChat?._id === conv.user._id ? 'var(--accent-glow)' : undefined,
                borderLeft: activeChat?._id === conv.user._id ? '3px solid var(--accent)' : '3px solid transparent'
              }}
            >
              <div className="user-avatar">
                {conv.user.avatar ? <img src={conv.user.avatar} alt="" /> : getInitials(conv.user.displayName)}
                <span className={`status-dot ${isUserOnline(conv.user._id) ? 'online' : 'offline'}`} />
              </div>
              <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="name">{conv.user.displayName}</div>
                <div className="status" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.lastMessage}
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                {formatTime(conv.lastMessageAt)}
              </div>
            </div>
          ))}
          {conversations.length === 0 && !showSearch && allUsers.length > 0 && (
            <>
              <div style={{ padding: '8px 16px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                All Users
              </div>
              {allUsers.map((u) => (
                <div
                  className="user-item"
                  key={u._id}
                  onClick={() => openChat(u)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="user-avatar">
                    {u.avatar ? <img src={u.avatar} alt="" /> : getInitials(u.displayName)}
                    <span className={`status-dot ${isUserOnline(u._id) ? 'online' : 'offline'}`} />
                  </div>
                  <div className="user-info">
                    <div className="name">{u.displayName}</div>
                    <div className="status">@{u.username}</div>
                  </div>
                </div>
              ))}
            </>
          )}
          {conversations.length === 0 && !showSearch && allUsers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Search size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p>No users available</p>
              <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Ask admin to create accounts</p>
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
              <div className="role">@{user.username}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className={`main-content ${activeChat ? 'active' : ''}`}>
        {activeChat ? (
          <>
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={goBackToList}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>
                  {activeChat.avatar ? <img src={activeChat.avatar} alt="" /> : getInitials(activeChat.displayName)}
                  <span className={`status-dot ${isUserOnline(activeChat._id) ? 'online' : 'offline'}`} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem' }}>{activeChat.displayName}</h3>
                  <div style={{ fontSize: '0.75rem', color: isUserOnline(activeChat._id) ? 'var(--success)' : 'var(--text-muted)' }}>
                    {isUserOnline(activeChat._id) ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
            </div>

            <div className="messages-area">
              {messages.length === 0 && (
                <div className="empty-state">
                  <MessageCircle size={48} />
                  <h3>Start a conversation</h3>
                  <p>Send a message to {activeChat.displayName}</p>
                </div>
              )}

              {messages.map((msg) => {
                const isOwn = msg.sender === user.id;
                return (
                  <div key={msg._id} className={`message-group ${isOwn ? 'own' : ''}`}>
                    <div className="message-avatar">{getInitials(isOwn ? user.displayName : activeChat.displayName)}</div>
                    <div className="message-content">
                      <span className="message-sender">{isOwn ? 'You' : activeChat.displayName}</span>
                      <div className="message-bubble">{msg.content}</div>
                      <span className="message-time">{formatMsgTime(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="typing-indicator">
              {typingUsers.length > 0 && (
                <span>{activeChat.displayName} is typing...</span>
              )}
            </div>

            <div className="chat-input-area">
              <form className="chat-input-wrapper" onSubmit={handleSend}>
                <input
                  className="input" placeholder={`Message ${activeChat.displayName}...`}
                  value={newMessage} onChange={handleTyping} onKeyDown={handleKeyDown}
                  autoFocus maxLength={2000}
                />
                <button className="btn btn-primary btn-icon" type="submit" disabled={!newMessage.trim()}>
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="empty-state" onClick={() => { if (isMobile()) setShowSidebar(true); }}>
            <MessageCircle size={56} />
            <h3>Select a conversation</h3>
            <p>Choose a chat from the sidebar or search for a user</p>
          </div>
        )}
      </div>
    </div>
  );
}
