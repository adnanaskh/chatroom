import React, { useState, useEffect } from 'react';
import { Settings, Clock, Trash2, Save, X } from 'lucide-react';
import api from '../services/api';

const ConversationSettings = ({ userId, userName, onClose }) => {
  const [settings, setSettings] = useState({
    deleteAfterSeen: 86400 // 24 hours default
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const data = await api.getConversationSettings(userId);
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateConversationSettings(userId, settings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  const timeOptions = [
    { value: 60, label: '1 minute' },
    { value: 300, label: '5 minutes' },
    { value: 900, label: '15 minutes' },
    { value: 3600, label: '1 hour' },
    { value: 21600, label: '6 hours' },
    { value: 43200, label: '12 hours' },
    { value: 86400, label: '1 day' },
    { value: 259200, label: '3 days' },
    { value: 604800, label: '1 week' },
    { value: 2592000, label: '30 days' },
  ];

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" />
            <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} />
              Conversation Settings
            </h2>
            <p className="modal-subtitle">Settings for chat with {userName}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-section">
          <div className="setting-row">
            <div className="setting-info">
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} />
                Auto-delete messages
              </h4>
              <p>Messages will be automatically deleted after being seen for the selected time period</p>
            </div>
            <div className="setting-control">
              <select
                className="input"
                value={settings.deleteAfterSeen}
                onChange={(e) => setSettings({ ...settings, deleteAfterSeen: parseInt(e.target.value) })}
              >
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px' }} />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationSettings;
