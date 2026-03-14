'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Save, Plus, Copy, Check, Link2, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type Profile = {
  businessName: string;
  upiId: string | null;
  webhookUrl: string | null;
  webhookSecret?: string | null;
  allowedDomain?: string | null;
};

type ApiKey = {
  id: string;
  keyPrefix: string;
  environment: string;
  name: string;
  isActive: boolean;
  createdAt: string;
};

export default function SettingsPage() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<Profile>({ businessName: '', upiId: '', webhookUrl: '' });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const token = await getToken();
    const [profileRes] = await Promise.all([
      fetch(`${API_URL}/v1/merchant/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    if (profileRes.ok) {
      setProfile(await profileRes.json());
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = await getToken();
    await fetch(`${API_URL}/v1/merchant/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: profile.businessName,
        upiId: profile.upiId,
        webhookUrl: profile.webhookUrl || null,
        webhookSecret: profile.webhookSecret || undefined,
        allowedDomain: profile.allowedDomain || null,
      }),
    });
    setSaving(false);
  }

  async function createApiKey() {
    setApiKeyError(null);
    const token = await getToken();
    const res = await fetch(`${API_URL}/v1/merchant/api-keys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment: 'live', name: 'Default' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setApiKeyError(data.error ?? data.message ?? 'Failed to create API key');
      return;
    }
    setNewKey(data.key);
  }

  async function testWebhook() {
    const token = await getToken();
    const res = await fetch(`${API_URL}/v1/merchant/webhook/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    alert(data.success ? `Webhook delivered! Status: ${data.statusCode}` : `Failed: ${data.error}`);
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage payout profile, webhooks, and production keys.</p>
      </div>

      {/* Profile form */}
      <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-emerald-100/70 p-6 shadow-sm shadow-emerald-100/50">
        <h2 className="font-semibold text-slate-900 mb-4">Business Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              type="text"
              value={profile.businessName}
              onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Your Store Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
            <input
              type="text"
              value={profile.upiId ?? ''}
              onChange={(e) => setProfile({ ...profile, upiId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              placeholder="yourname@ybl"
            />
            <p className="text-xs text-gray-400 mt-1">
              Money will be sent directly to this UPI ID
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Domain (API key lock)</label>
            <input
              type="text"
              value={profile.allowedDomain ?? ''}
              onChange={(e) => setProfile({ ...profile, allowedDomain: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="app.yourdomain.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              When set, this API key can only be used from this domain (read from Origin/Referer or `X-SeedhaPe-Domain`).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={profile.webhookUrl ?? ''}
                onChange={(e) => setProfile({ ...profile, webhookUrl: e.target.value })}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="https://api.your-domain.com/v1/billing/webhooks/seedhape"
              />
              <button
                type="button"
                onClick={testWebhook}
                className="inline-flex items-center gap-2 text-sm px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                <Link2 className="h-4 w-4" />
                Test
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
            <div className="flex gap-2">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={profile.webhookSecret ?? ''}
                onChange={(e) => setProfile({ ...profile, webhookSecret: e.target.value })}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                placeholder="min 16 chars (used for X-SeedhaPe-Signature)"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret((v) => !v)}
                className="inline-flex items-center justify-center w-10 border border-slate-200 rounded-xl hover:bg-slate-50"
                aria-label={showWebhookSecret ? 'Hide webhook secret' : 'Show webhook secret'}
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Must exactly match `SEEDHAPE_WEBHOOK_SECRET` in your API env.</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* API Keys */}
      <div className="bg-white rounded-2xl border border-emerald-100/70 p-6 shadow-sm shadow-emerald-100/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">API Keys</h2>
          <button
            onClick={createApiKey}
            className="flex items-center gap-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-xl transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Key
          </button>
        </div>

        {/* New key reveal */}
        {apiKeyError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {apiKeyError}
          </div>
        )}

        {newKey && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-green-800 mb-2">
              Save this key — it won&apos;t be shown again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-green-200 rounded px-3 py-2 text-sm font-mono break-all">
                {newKey}
              </code>
              <button
                onClick={() => copyKey(newKey)}
                className="p-2 text-green-700 hover:bg-green-100 rounded"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {apiKeys.length === 0 && !newKey && (
          <p className="text-sm text-gray-400 text-center py-4">No API keys yet</p>
        )}
      </div>
    </div>
  );
}
