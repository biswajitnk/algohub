import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Key, CheckCircle, AlertTriangle, Send, RefreshCw, X, Globe } from 'lucide-react';
import { api, getBackendBaseUrl, setBackendBaseUrl } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  const [loading, setLoading] = useState(false);
  const [testingDelta, setTestingDelta] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [formData, setFormData] = useState({
    backend_url: getBackendBaseUrl(),
    exchange_type: 'india',
    delta_api_key: '',
    delta_api_secret: '',
    telegram_bot_token: '',
    telegram_chat_id: '',
    max_daily_loss: 100,
    max_leverage: 10,
    paper_balance: 10000,
    delta_api_key_set: false,
    delta_api_secret_set: false,
    telegram_bot_token_set: false
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setFormData(prev => ({
        ...prev,
        ...data,
        backend_url: getBackendBaseUrl(),
        delta_api_key: '',
        delta_api_secret: '',
        telegram_bot_token: ''
      }));
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Backend not reachable: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      setBackendBaseUrl(formData.backend_url);
      const payload = {
        exchange_type: formData.exchange_type,
        max_daily_loss: parseFloat(formData.max_daily_loss),
        max_leverage: parseInt(formData.max_leverage),
        paper_balance: parseFloat(formData.paper_balance),
        telegram_chat_id: formData.telegram_chat_id
      };
      if (formData.delta_api_key) payload.delta_api_key = formData.delta_api_key;
      if (formData.delta_api_secret) payload.delta_api_secret = formData.delta_api_secret;
      if (formData.telegram_bot_token) payload.telegram_bot_token = formData.telegram_bot_token;

      await api.updateSettings(payload);
      setStatusMsg({ type: 'success', text: 'Settings updated and saved successfully!' });
      if (onSettingsUpdated) onSettingsUpdated();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error saving settings: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestDelta = async () => {
    setTestingDelta(true);
    setStatusMsg(null);
    try {
      const payload = {
        exchange_type: formData.exchange_type,
        delta_api_key: formData.delta_api_key,
        delta_api_secret: formData.delta_api_secret
      };
      const res = await api.testDelta(payload);
      setStatusMsg({ type: 'success', text: res.message || 'Delta Exchange credentials verified!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Delta Test Failed: ' + err.message });
    } finally {
      setTestingDelta(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTg(true);
    setStatusMsg(null);
    try {
      const res = await api.testTelegram({
        message: '🔔 VPS Algo Test: Phone alerts are working properly!',
        telegram_bot_token: formData.telegram_bot_token || undefined,
        telegram_chat_id: formData.telegram_chat_id || undefined,
      });
      setStatusMsg({ type: 'success', text: 'Notification sent! Check your Telegram phone app now.' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Telegram Test Failed: ' + err.message });
    } finally {
      setTestingTg(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-dark-800 rounded-2xl max-w-2xl w-full border border-dark-700 shadow-2xl p-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-700">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-brand-400" />
            <h3 className="text-lg font-bold text-white">System Settings & Risk Guardrails</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div className={`my-4 p-3 rounded-lg text-xs font-medium flex items-center space-x-2 ${
            statusMsg.type === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 mt-4">
          
          {/* Section 0: Remote Backend Host (for Web Hosting / Cloud deploy) */}
          <div className="p-3 bg-dark-900/80 rounded-xl border border-dark-700">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-brand-400" />
                <span>Backend Server Host (API Endpoint)</span>
              </label>
              <span className="text-[10px] text-slate-500">Leave blank if running locally / same server</span>
            </div>
            <input
              type="text"
              placeholder="e.g. https://api.dltapp.cloud or https://your-backend.onrender.com"
              value={formData.backend_url || ''}
              onChange={(e) => setFormData({ ...formData, backend_url: e.target.value })}
              className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Agar aapne frontend Hostinger par host kiya hai, to apne running Python backend ka URL yahan enter karein.
            </p>
          </div>

          {/* Section 1: Delta Exchange API */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Delta Exchange API Credentials</span>
              </h4>
              <button
                type="button"
                onClick={handleTestDelta}
                disabled={testingDelta}
                className="px-2.5 py-1 rounded-md bg-dark-700 hover:bg-dark-600 text-xs text-slate-200 border border-dark-600 flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${testingDelta ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Exchange Endpoint</label>
                <select
                  value={formData.exchange_type}
                  onChange={(e) => setFormData({ ...formData, exchange_type: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="india">Delta India (api.india.delta.exchange)</option>
                  <option value="global">Delta Global (api.delta.exchange)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  API Key {formData.delta_api_key_set && <span className="text-emerald-400">(Saved)</span>}
                </label>
                <input
                  type="password"
                  placeholder={formData.delta_api_key_set ? "•••••••••••• (Leave blank to keep)" : "Paste Delta API Key"}
                  value={formData.delta_api_key}
                  onChange={(e) => setFormData({ ...formData, delta_api_key: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  API Secret {formData.delta_api_secret_set && <span className="text-emerald-400">(Saved)</span>}
                </label>
                <input
                  type="password"
                  placeholder={formData.delta_api_secret_set ? "•••••••••••• (Leave blank to keep)" : "Paste Delta API Secret"}
                  value={formData.delta_api_secret}
                  onChange={(e) => setFormData({ ...formData, delta_api_secret: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Telegram Mobile Alerts */}
          <div className="space-y-3 pt-3 border-t border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center space-x-1.5">
                  <Bell className="w-4 h-4 text-sky-400" />
                  <span>Telegram Mobile Phone Alerts</span>
                </h4>
                <p className="text-[11px] text-slate-400">Receive instant push notifications on Android when trades open or close.</p>
              </div>
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingTg}
                className="px-2.5 py-1 rounded-md bg-dark-700 hover:bg-dark-600 text-xs text-slate-200 border border-dark-600 flex items-center space-x-1"
              >
                <Send className="w-3 h-3 text-sky-400" />
                <span>Send Test Alert</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Telegram Bot Token {formData.telegram_bot_token_set && <span className="text-emerald-400">(Saved)</span>}
                </label>
                <input
                  type="password"
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                  value={formData.telegram_bot_token}
                  onChange={(e) => setFormData({ ...formData, telegram_bot_token: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <span className="text-[10px] text-slate-500">Create bot via @BotFather in Telegram.</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Telegram Chat ID</label>
                <input
                  type="text"
                  placeholder="e.g. 987654321"
                  value={formData.telegram_chat_id || ''}
                  onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <span className="text-[10px] text-slate-500">Find your numeric chat ID via @userinfobot.</span>
              </div>
            </div>
          </div>

          {/* Section 3: Risk Limits */}
          <div className="space-y-3 pt-3 border-t border-dark-700">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-rose-400" />
              <span>Capital Protection & Risk Guardrails</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Daily Loss ($)</label>
                <input
                  type="number"
                  min="10"
                  value={formData.max_daily_loss}
                  onChange={(e) => setFormData({ ...formData, max_daily_loss: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <span className="text-[10px] text-slate-500">Auto halts algos if daily loss exceeds this.</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Max System Leverage</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.max_leverage}
                  onChange={(e) => setFormData({ ...formData, max_leverage: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <span className="text-[10px] text-slate-500">Hard leverage ceiling for all bots.</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Virtual Paper Balance ($)</label>
                <input
                  type="number"
                  min="100"
                  value={formData.paper_balance}
                  onChange={(e) => setFormData({ ...formData, paper_balance: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <span className="text-[10px] text-slate-500">Starting balance for paper trading.</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-300 text-xs sm:text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-black text-xs sm:text-sm font-bold transition-all shadow-md flex items-center space-x-1"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Save & Apply Settings</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
