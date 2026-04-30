const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = {
  _headers(isAdmin = false) {
    const token = isAdmin
      ? localStorage.getItem('adminToken')
      : localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  },

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('chat_keys');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/';
  },

  async _fetch(url, options = {}) {
    const res = await fetch(`${API_URL}${url}`, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) {
        this.clearSession();
      }
      throw new Error(data?.message || 'Request failed');
    }
    return data;
  },

  adminLogin(username, password) {
    return this._fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  },

  userLogin(username, password) {
    return this._fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  },

  registerUser(data) {
    return this._fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getProfile() {
    return this._fetch('/api/auth/me', { headers: this._headers() });
  },

  updateProfile(data) {
    return this._fetch('/api/auth/me', {
      method: 'PATCH',
      headers: this._headers(),
      body: JSON.stringify(data),
    });
  },

  deleteAccount() {
    return this._fetch('/api/auth/me', {
      method: 'DELETE',
      headers: this._headers(),
    });
  },

  getUsers() {
    return this._fetch('/api/auth/users', { headers: this._headers(true) });
  },

  createUser(data) {
    return this._fetch('/api/auth/users', {
      method: 'POST',
      headers: this._headers(true),
      body: JSON.stringify(data),
    });
  },

  deleteUser(id) {
    return this._fetch(`/api/auth/users/${id}`, {
      method: 'DELETE',
      headers: this._headers(true),
    });
  },

  resetPassword(id, password) {
    return this._fetch(`/api/auth/users/${id}/password`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ password }),
    });
  },

  banUser(id, isBanned, reason = '') {
    return this._fetch(`/api/auth/users/${id}/ban`, {
      method: 'PATCH',
      headers: this._headers(true),
      body: JSON.stringify({ isBanned, reason }),
    });
  },

  searchUsers(query) {
    return this._fetch(`/api/auth/search?q=${encodeURIComponent(query)}`, {
      headers: this._headers(),
    });
  },

  getAllUsers() {
    return this._fetch('/api/auth/all-users', {
      headers: this._headers(),
    });
  },

  getConversation(userId, page = 1, limit = 50) {
    return this._fetch(`/api/messages/conversation/${userId}?page=${page}&limit=${limit}`, {
      headers: this._headers(),
    });
  },

  getConversations() {
    return this._fetch('/api/messages/conversations', {
      headers: this._headers(),
    });
  },

  getMessageStats() {
    return this._fetch('/api/messages/stats', { headers: this._headers(true) });
  },

  getSettings() {
    return this._fetch('/api/settings', { headers: this._headers(true) });
  },

  clearMessages() {
    return this._fetch('/api/settings/messages', {
      method: 'DELETE',
      headers: this._headers(true),
    });
  },

  getConversationSettings(userId) {
    return this._fetch(`/api/messages/settings/${userId}`, {
      headers: this._headers(),
    });
  },

  updateConversationSettings(userId, settings) {
    return this._fetch(`/api/messages/settings/${userId}`, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(settings),
    });
  },

  deleteConversation(userId) {
    return this._fetch(`/api/messages/conversation/${userId}`, {
      method: 'DELETE',
      headers: this._headers(),
    });
  },

  blockUser(userId) {
    return this._fetch(`/api/auth/me/block/${userId}`, {
      method: 'POST',
      headers: this._headers(),
    });
  },

  unblockUser(userId) {
    return this._fetch(`/api/auth/me/block/${userId}`, {
      method: 'DELETE',
      headers: this._headers(),
    });
  },

  getActivityLogs(userId) {
    return this._fetch(`/api/auth/users/${userId}/activity`, {
      headers: this._headers(true),
    });
  },

  // Tracking endpoints for admin dashboard
  getAllActivityLogs(page = 1, limit = 50, action = '') {
    const params = `page=${page}&limit=${limit}${action ? `&action=${action}` : ''}`;
    return this._fetch(`/api/auth/activity/all?${params}`, {
      headers: this._headers(true),
    });
  },

  getTrackingSummary() {
    return this._fetch('/api/auth/tracking/summary', {
      headers: this._headers(true),
    });
  },
};

export default api;
