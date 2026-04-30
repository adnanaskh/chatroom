import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, LogOut, Search, MessageCircle, ArrowLeft, X, User, Settings, Eye, Check, Trash2, Ban, Lock } from 'lucide-react';
import api from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { encryption } from '../services/encryption';
import ConversationSettings from './ConversationSettings';

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
  const [showConversationSettings, setShowConversationSettings] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [keys, setKeys] = useState(null);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const activeChatRef = useRef(null);
  const keysRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);

  // Key Management: Generate and upload keys if missing
  useEffect(() => {
    const manageKeys = async () => {
      const storedKeys = localStorage.getItem('chat_keys');
      const currentUser = JSON.parse(localStorage.getItem('user'));
      
      if (!storedKeys && currentUser.privateKey && currentUser.publicKey) {
        console.log("Restoring keys from server...");
        const restoredKeys = {
          publicKey: currentUser.publicKey,
          privateKey: currentUser.privateKey
        };
        localStorage.setItem('chat_keys', JSON.stringify(restoredKeys));
        setKeys(restoredKeys);
        loadConversations(currentUser, restoredKeys);
      } else if (!storedKeys) {
        console.log("Generating new E2EE keys...");
        const newKeys = await encryption.generateKeyPair();
        localStorage.setItem('chat_keys', JSON.stringify(newKeys));
        setKeys(newKeys);
        
        // Upload public & private key to server
        await api.updateProfile({ publicKey: newKeys.publicKey, privateKey: newKeys.privateKey });
        
        // Update local user state
        const updatedUser = { ...currentUser, publicKey: newKeys.publicKey, privateKey: newKeys.privateKey };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        loadConversations(updatedUser, newKeys);
      } else {
        const parsedKeys = JSON.parse(storedKeys);
        
        // Mismatch check: if server has keys and they differ, trust the server (Cloud Sync)
        if (currentUser.publicKey && currentUser.privateKey && currentUser.publicKey !== parsedKeys.publicKey) {
          console.log("Local keys mismatch server keys. Restoring from server...");
          const restoredKeys = {
            publicKey: currentUser.publicKey,
            privateKey: currentUser.privateKey
          };
          localStorage.setItem('chat_keys', JSON.stringify(restoredKeys));
          setKeys(restoredKeys);
          loadConversations(currentUser, restoredKeys);
          return;
        }

        setKeys(parsedKeys);
        
        // Ensure server has the public AND private key
        if (!currentUser.publicKey || !currentUser.privateKey) {
          await api.updateProfile({ publicKey: parsedKeys.publicKey, privateKey: parsedKeys.privateKey });
          const updatedUser = { ...currentUser, publicKey: parsedKeys.publicKey, privateKey: parsedKeys.privateKey };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        loadConversations(currentUser, parsedKeys);
      }
    };

    if (user) manageKeys();
  }, [user?.id, user?._id]);

  const isMobile = () => window.innerWidth <= 768;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Prevent mobile back button from logging out — push history state
  useEffect(() => {
    const handlePopState = (e) => {
      e.preventDefault();
      if (activeChat) {
        goBackToList();
      }
      // Push state again to prevent leaving the page
      window.history.pushState(null, '', window.location.href);
    };

    // Push initial state so back button triggers popstate instead of navigation
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeChat]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { navigate('/'); return; }

    const parsed = JSON.parse(userData);
    setUser(parsed);

    const socket = connectSocket(token);

    socket.on('message:new', (msg) => {
      const currentChat = activeChatRef.current;
      const currentUserId = parsed.id || parsed._id;
      const isInCurrentChat = currentChat && (
        (msg.sender === currentChat._id && msg.receiver === currentUserId) ||
        (msg.sender === currentUserId && msg.receiver === currentChat._id)
      );

      if (isInCurrentChat && keysRef.current) {
        const decrypt = async () => {
          const isOwn = msg.sender === currentUserId;
          const keyToDecrypt = isOwn ? msg.senderEncryptedKey : msg.encryptedKey;
          const decryptedContent = await encryption.decryptMessage(
            { ...msg, encryptedKey: keyToDecrypt }, 
            keysRef.current.privateKey
          );
          const decryptedMsg = { ...msg, content: decryptedContent };
          
          setMessages((prev) => {
            if (prev.some(m => m._id === msg._id)) return prev;
            return [...prev, decryptedMsg];
          });
          setTimeout(scrollToBottom, 50);

          if (!isOwn && document.visibilityState === 'visible') {
            socket.emit('message:seen', { senderId: msg.sender });
          }
        };
        decrypt();
      }

      const isMe = msg.sender === currentUserId;
      if (!isMe && (!isInCurrentChat || document.visibilityState !== 'visible')) {
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification(`New message`, {
                body: 'You have a new encrypted message',
                icon: '/favicon.svg',
                tag: 'chat',
                renotify: true
              });
            }).catch(() => {
              new Notification(`New message`, { body: 'You have a new encrypted message', icon: '/favicon.svg' });
            });
          } catch (e) {}
        }
      }

      setConversations(prev => {
        const otherUserId = msg.sender === currentUserId ? msg.receiver : msg.sender;
        const existing = prev.find(c => c.user._id === otherUserId);
        
        if (existing && keysRef.current) {
          const update = async () => {
            const isOwn = msg.sender === currentUserId;
            const keyToDecrypt = isOwn ? msg.senderEncryptedKey : msg.encryptedKey;
            const decryptedLastMsg = await encryption.decryptMessage(
              { ...msg, encryptedKey: keyToDecrypt }, 
              keysRef.current.privateKey
            );
            setConversations(current => current.map(c =>
              c.user._id === otherUserId
                ? { ...c, lastMessage: decryptedLastMsg, lastMessageAt: msg.createdAt }
                : c
            ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
          };
          update();
          return prev;
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

    socket.on('messages:seen', ({ receiverId }) => {
      if (activeChatRef.current && activeChatRef.current._id === receiverId) {
        setMessages((prev) => prev.map(m => 
          (m.receiver === receiverId && !m.seen) ? { ...m, seen: true, seenAt: new Date() } : m
        ));
      }
    });

    socket.on('connect', () => {
      loadConversations();
      if (activeChatRef.current) {
        openChat(activeChatRef.current, true);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadConversations();
        if (activeChatRef.current) {
          openChat(activeChatRef.current, true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnectSocket();
    };
  }, [navigate, scrollToBottom]);

  const loadConversations = async (u = user, k = keys) => {
    try {
      const currentUser = u || JSON.parse(localStorage.getItem('user'));
      const currentKeys = k || keysRef.current || JSON.parse(localStorage.getItem('chat_keys'));
      
      if (!currentUser || !currentKeys) return;

      const [convData, usersData] = await Promise.all([
        api.getConversations(),
        api.getAllUsers()
      ]);
      
      const currentUserId = currentUser.id || currentUser._id;

      // Decrypt last messages for conversation list
      const decryptedConvData = await Promise.all(
        convData.map(async (conv) => {
          if (!conv.lastMessage || !conv.lastMessageIv) return conv;
          const isOwn = conv.lastSender === currentUserId;
          const keyToDecrypt = isOwn ? conv.lastMessageSenderKey : conv.lastMessageKey;
          const decrypted = await encryption.decryptMessage({
            content: conv.lastMessage,
            iv: conv.lastMessageIv,
            encryptedKey: keyToDecrypt
          }, currentKeys.privateKey);
          return { ...conv, lastMessage: decrypted };
        })
      );

      setConversations(decryptedConvData);
      setAllUsers(usersData);
      setIsNewUser(convData.length === 0);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const openChat = async (chatUser, silent = false) => {
    if (!silent) {
      setActiveChat(chatUser);
      setMessages([]);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      setTypingUsers([]);
      if (isMobile()) setShowSidebar(false);
    }

    try {
      const data = await api.getConversation(chatUser._id);
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (!currentUser) return;
      const currentUserId = currentUser.id || currentUser._id;
      
      const decryptedMessages = await Promise.all(
        data.messages.map(async (msg) => {
          const isOwn = msg.sender === currentUserId;
          const keyToDecrypt = isOwn ? msg.senderEncryptedKey : msg.encryptedKey;
          const content = await encryption.decryptMessage(
            { ...msg, encryptedKey: keyToDecrypt }, 
            keysRef.current?.privateKey || JSON.parse(localStorage.getItem('chat_keys')).privateKey
          );
          return { ...msg, content };
        })
      );
      
      setMessages(decryptedMessages);
      if (!silent) setTimeout(scrollToBottom, 100);

      const socket = getSocket();
      if (socket && data.messages.some(m => m.receiver === currentUserId && !m.seen)) {
        socket.emit('message:seen', { senderId: chatUser._id });
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const goBackToList = () => {
    setActiveChat(null);
    setMessages([]);
    if (isMobile()) {
      setShowSidebar(true);
    }
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

  const handleBlockUser = async () => {
    if (!activeChat) return;
    
    const isBlocked = user.blockedUsers?.includes(activeChat._id);
    
    try {
      if (isBlocked) {
        const res = await api.unblockUser(activeChat._id);
        const updatedUser = { ...user, blockedUsers: res.blockedUsers };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        if (window.confirm(`Block ${activeChat.displayName}? You won't receive their messages.`)) {
          const res = await api.blockUser(activeChat._id);
          const updatedUser = { ...user, blockedUsers: res.blockedUsers };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    } catch (err) {
      console.error('Failed to block/unblock user:', err);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeChat) return;
    if (window.confirm(`Delete entire conversation with ${activeChat.displayName}?`)) {
      try {
        await api.deleteConversation(activeChat._id);
        setMessages([]);
        loadConversations();
        goBackToList();
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const socket = getSocket();
    if (!socket || !keys) return;

    const send = async () => {
      try {
        if (!activeChat.publicKey) {
          alert("Recipient has not set up E2EE keys yet. They need to log in first.");
          return;
        }

        const encrypted = await encryption.encryptMessage(newMessage.trim(), activeChat.publicKey, user.publicKey);
        
        socket.emit('message:send', {
          ...encrypted,
          senderName: user.displayName,
          receiverId: activeChat._id,
        });

        setNewMessage('');
        socket.emit('typing:stop', { receiverId: activeChat._id });
        messageInputRef.current?.focus();
      } catch (err) {
        console.error("Encryption/Send failed:", err);
      }
    };

    send();
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
    localStorage.removeItem('chat_keys');
    navigate('/', { replace: true });
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
          <div style={{ padding: '6px 12px' }}>
            <input
              type="text"
              name="search_query"
              id="search_query"
              className="input"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {searchResults.length > 0 && (
              <div className="user-list" style={{ maxHeight: '200px', marginTop: '4px', padding: '0' }}>
                {searchResults.map((u) => (
                  <div className="user-item" key={u._id} onClick={() => openChat(u)}>
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

        <div style={{ padding: '6px 16px', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
          Conversations
        </div>

        <div className="user-list">
          {conversations.map((conv) => (
            <div
              className="user-item"
              key={conv.user._id}
              onClick={() => openChat(conv.user)}
              style={{
                background: activeChat?._id === conv.user._id ? 'var(--accent-soft)' : undefined,
                borderLeft: activeChat?._id === conv.user._id ? '2px solid var(--accent)' : '2px solid transparent'
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatTime(conv.lastMessageAt)}
                </div>
                {conv.unreadCount > 0 && (
                  <div className="unread-badge">
                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                  </div>
                )}
              </div>
            </div>
          ))}
          {!isNewUser && conversations.length === 0 && !showSearch && allUsers.length > 0 && (
            <>
              <div style={{ padding: '6px 16px', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                All Users
              </div>
              {allUsers.map((u) => (
                <div className="user-item" key={u._id} onClick={() => openChat(u)}>
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
          {conversations.length === 0 && !showSearch && (isNewUser || allUsers.length === 0) && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Search size={20} style={{ opacity: 0.2, marginBottom: '8px' }} />
              <p>No conversations yet</p>
              <p style={{ fontSize: '0.7rem', marginTop: '4px' }}>Search to find users</p>
            </div>
          )}
        </div>

        <div className="sidebar-footer" style={{ alignItems: 'center' }}>
          <div className="current-user">
            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.65rem' }}>
              {getInitials(user.displayName)}
            </div>
            <div>
              <div className="name">{user.displayName}</div>
              <div className="role">@{user.username}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => navigate('/profile')} title="Profile">
              <User size={16} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className={`main-content ${activeChat ? 'active' : ''}`}>
        {activeChat ? (
          <>
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                <button className="btn btn-ghost btn-icon" onClick={goBackToList} title="Back">
                  <ArrowLeft size={18} />
                </button>
                <div className="user-avatar" style={{ width: 34, height: 34, fontSize: '0.7rem' }}>
                  {activeChat.avatar ? <img src={activeChat.avatar} alt="" /> : getInitials(activeChat.displayName)}
                  <span className={`status-dot ${isUserOnline(activeChat._id) ? 'online' : 'offline'}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>{activeChat.displayName}</h3>
                  <div style={{ fontSize: '0.7rem', color: isUserOnline(activeChat._id) ? 'var(--success)' : 'var(--text-muted)' }}>
                    {isUserOnline(activeChat._id) ? 'Online' : 'Offline'}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={handleBlockUser}
                  title={user.blockedUsers?.includes(activeChat._id) ? "Unblock" : "Block"}
                  style={{ color: user.blockedUsers?.includes(activeChat._id) ? 'var(--danger)' : undefined }}
                >
                  <Ban size={16} />
                </button>
                <button className="btn btn-ghost btn-icon" onClick={handleDeleteConversation} title="Delete conversation">
                  <Trash2 size={16} />
                </button>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowConversationSettings(true)} title="Settings">
                  <Settings size={16} />
                </button>
              </div>
            </div>

            <div className="messages-area">
              <div style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                background: 'rgba(34, 197, 94, 0.05)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: 'var(--success)',
                border: '1px solid rgba(34, 197, 94, 0.15)',
                textAlign: 'center'
              }}>
                <Lock size={14} />
                <span>This chat is End-to-End Encrypted (RSA-OAEP & AES-GCM)</span>
              </div>

              {messages.length === 0 && (
                <div className="empty-state">
                  <MessageCircle size={40} />
                  <h3>Start a conversation</h3>
                  <p>Send a message to {activeChat.displayName}</p>
                </div>
              )}

              {messages.map((msg) => {
                const currentUserId = user.id || user._id;
                const isOwn = msg.sender === currentUserId;
                return (
                  <div key={msg._id} className={`message-group ${isOwn ? 'own' : ''}`}>
                    <div className="message-avatar">{getInitials(isOwn ? user.displayName : activeChat.displayName)}</div>
                    <div className="message-content">
                      <span className="message-sender">{isOwn ? 'You' : activeChat.displayName}</span>
                      <div className="message-bubble">{msg.content}</div>
                      <div className="message-meta">
                        <span className="message-time">{formatMsgTime(msg.createdAt)}</span>
                        {isOwn && (
                          <span className="message-status">
                            {msg.seen ? (
                              <Eye size={11} color="var(--success)" />
                            ) : (
                              <Check size={11} color="var(--text-muted)" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="typing-indicator">
              {typingUsers.length > 0 && !user.blockedUsers?.includes(activeChat._id) && (
                <span>{activeChat.displayName} is typing...</span>
              )}
            </div>

            {user.blockedUsers?.includes(activeChat._id) ? (
              <div className="chat-input-area" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                You have blocked this user. Unblock to send messages.
              </div>
            ) : (
              <div className="chat-input-area">
                <form className="chat-input-wrapper" onSubmit={handleSend}>
                  <input
                    type="text"
                    name="chat_message"
                    id="chat_message"
                    ref={messageInputRef}
                    className="input"
                    placeholder={`Message ${activeChat.displayName}...`}
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    maxLength={2000}
                    autoComplete="off"
                    autoCorrect="on"
                    spellCheck="true"
                  />
                  <button className="btn btn-primary btn-icon" type="submit" disabled={!newMessage.trim()}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state" onClick={() => { if (isMobile()) setShowSidebar(true); }}>
            <MessageCircle size={48} />
            <h3>Select a conversation</h3>
            <p>Choose a chat from the sidebar or search for a user</p>
          </div>
        )}
      </div>

      {showConversationSettings && activeChat && (
        <ConversationSettings
          userId={activeChat._id}
          userName={activeChat.displayName}
          onClose={() => setShowConversationSettings(false)}
        />
      )}
    </div>
  );
}
