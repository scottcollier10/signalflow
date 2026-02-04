'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import {
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Link,
  Eye,
  EyeOff,
  Trash2,
  Database,
  Settings as SettingsIcon,
  Bell
} from 'lucide-react';

export default function SettingsPage() {
  // n8n Connection
  const [n8nUrl, setN8nUrl] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  // Preferences
  const [defaultView, setDefaultView] = useState('overview');
  const [dashboardGrouping, setDashboardGrouping] = useState('workflow');
  const [defaultBottleneckTab, setDefaultBottleneckTab] = useState('all');
  const [showScoringExplanations, setShowScoringExplanations] = useState(true);
  const [autoExpandRecommendations, setAutoExpandRecommendations] = useState(true);

  // Data stats
  const [dataStats, setDataStats] = useState({ executions: 0, storageUsed: '0 KB' });

  // Save feedback
  const [saveMessage, setSaveMessage] = useState('');

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('signalflow-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setN8nUrl(parsed.n8nUrl || '');
      setN8nApiKey(parsed.n8nApiKey || '');
      setDefaultView(parsed.defaultView || 'overview');
      setDashboardGrouping(parsed.dashboardGrouping || 'workflow');
      setDefaultBottleneckTab(parsed.defaultBottleneckTab || 'all');
      setShowScoringExplanations(parsed.showScoringExplanations ?? true);
      setAutoExpandRecommendations(parsed.autoExpandRecommendations ?? true);
    }

    // Fetch data stats
    fetchDataStats();
  }, []);

  const fetchDataStats = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/executions');
      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : (data.executions?.length || 0);
        // Rough estimate: ~50KB per execution
        const storageKB = count * 50;
        setDataStats({
          executions: count,
          storageUsed: storageKB > 1024 ? `${(storageKB / 1024).toFixed(1)} MB` : `${storageKB} KB`
        });
      }
    } catch (e) {
      console.error('Failed to fetch data stats:', e);
    }
  };

  const saveSettings = () => {
    const settings = {
      n8nUrl,
      n8nApiKey,
      defaultView,
      dashboardGrouping,
      defaultBottleneckTab,
      showScoringExplanations,
      autoExpandRecommendations
    };
    localStorage.setItem('signalflow-settings', JSON.stringify(settings));
  };

  const testConnection = async () => {
    if (!n8nUrl) {
      setConnectionStatus('error');
      setConnectionMessage('Please enter your n8n instance URL');
      return;
    }

    setConnectionStatus('testing');
    setConnectionMessage('Testing connection...');

    try {
      const res = await fetch('http://localhost:8001/api/n8n/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: n8nUrl, apiKey: n8nApiKey })
      });

      if (res.ok) {
        setConnectionStatus('success');
        setConnectionMessage('Connected successfully!');
        saveSettings();
      } else {
        const error = await res.json();
        setConnectionStatus('error');
        setConnectionMessage(error.detail || 'Connection failed');
      }
    } catch (e) {
      setConnectionStatus('error');
      setConnectionMessage('Connection failed. Check your URL and API key.');
    }
  };

  const handleSavePreferences = () => {
    saveSettings();
    setSaveMessage('Preferences saved!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleDeleteAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL executions? This cannot be undone.')) {
      return;
    }

    if (!confirm('FINAL WARNING: This will permanently delete all your analysis data. Continue?')) {
      return;
    }

    try {
      const res = await fetch('http://localhost:8001/api/executions/all', { method: 'DELETE' });
      if (res.ok) {
        const result = await res.json();
        alert(`Deleted ${result.deleted_count || 0} executions successfully`);
        fetchDataStats();
      } else {
        alert('Failed to delete data');
      }
    } catch (e) {
      alert('Failed to delete data');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Settings
          </h1>
          <p className="text-gray-500 mt-1">Configure your SignalFlow experience</p>
        </div>

        {/* n8n Connection */}
        <section className="bg-white rounded-xl border shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Link className="w-5 h-5 text-orange-500" />
              n8n Connection
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Connect to your n8n instance for direct execution imports
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instance URL
              </label>
              <input
                type="url"
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="https://your-instance.app.n8n.cloud"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your n8n cloud or self-hosted instance URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={n8nApiKey}
                  onChange={(e) => setN8nApiKey(e.target.value)}
                  placeholder="Enter your n8n API key"
                  className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Find this in n8n → Settings → API → Create API Key
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={testConnection}
                disabled={connectionStatus === 'testing'}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors"
              >
                {connectionStatus === 'testing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Test Connection
              </button>

              {connectionStatus === 'success' && (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  {connectionMessage}
                </span>
              )}

              {connectionStatus === 'error' && (
                <span className="flex items-center gap-1 text-red-600 text-sm">
                  <XCircle className="w-4 h-4" />
                  {connectionMessage}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-white rounded-xl border shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              Preferences
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Customize your default views and behavior
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default view after import
                </label>
                <select
                  value={defaultView}
                  onChange={(e) => setDefaultView(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="overview">Overview</option>
                  <option value="playback">Playback</option>
                  <option value="bottlenecks">Bottlenecks</option>
                  <option value="recommendations">Recommendations</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dashboard grouping
                </label>
                <select
                  value={dashboardGrouping}
                  onChange={(e) => setDashboardGrouping(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="workflow">Group by Workflow</option>
                  <option value="date">Group by Date</option>
                  <option value="none">No Grouping</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default bottleneck tab
                </label>
                <select
                  value={defaultBottleneckTab}
                  onChange={(e) => setDefaultBottleneckTab(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All</option>
                  <option value="severe">Severe</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showScoringExplanations}
                  onChange={(e) => setShowScoringExplanations(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Show scoring explanations by default</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoExpandRecommendations}
                  onChange={(e) => setAutoExpandRecommendations(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Auto-expand recommendation categories</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSavePreferences}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Preferences
              </button>
              {saveMessage && (
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {saveMessage}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="bg-white rounded-xl border shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="w-5 h-5 text-green-500" />
              Data Management
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage your stored execution data
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold">{dataStats.executions}</div>
                <div className="text-sm text-gray-500">Stored Executions</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold">{dataStats.storageUsed}</div>
                <div className="text-sm text-gray-500">Estimated Storage</div>
              </div>
            </div>

            <button
              onClick={handleDeleteAllData}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete All Executions
            </button>
            <p className="text-xs text-gray-500 mt-2">
              This permanently removes all execution data. This cannot be undone.
            </p>
          </div>
        </section>

        {/* Version Info */}
        <div className="text-center text-sm text-gray-400 py-4">
          SignalFlow v0.8 • Week 5 Build
        </div>
      </div>
    </AppLayout>
  );
}
