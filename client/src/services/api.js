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

  async _fetch(url, options = {}) {
    const res = await fetch(`${API_URL}${url}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
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

  updateTTL(ttl) {
    return this._fetch('/api/settings/ttl', {
      method: 'PUT',
      headers: this._headers(true),
      body: JSON.stringify({ ttl }),
    });
  },

  clearMessages() {
    return this._fetch('/api/settings/messages', {
      method: 'DELETE',
      headers: this._headers(true),
    });
  },
};

export default api;
