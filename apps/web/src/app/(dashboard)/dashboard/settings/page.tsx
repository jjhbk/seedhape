'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Save, Plus, Copy, Check, Link2, Eye, EyeOff, CheckCircle, XCircle, Loader2, Trash2, PowerOff, Power } from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type Profile = {
  businessName: string;
  upiId: string | null;
  webhookUrl: string | null;
  webhookSecret?: string | null;
  webhookSecretSet?: boolean;
  allowedDomain?: string | null;
};

type ApiKey = {
  id: string;
  keyPrefix: string;
  keySuffix: string;
  environment: string;
  name: string;
  isActive: boolean;
  createdAt: string;
};

type WebhookTestResult =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'success'; statusCode: number }
  | { state: 'error'; message: string };

export default function SettingsPage() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<Profile>({ businessName: '', upiId: '', webhookUrl: '' });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [webhookTest, setWebhookTest] = useState<WebhookTestResult>({ state: 'idle' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const token = await getToken();
    const [profileRes, keysRes] = await Promise.all([
      fetch(`${API_URL}/v1/merchant/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/v1/merchant/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    if (profileRes.ok) setProfile(await profileRes.json());
    if (keysRes.ok) {
      const data = await keysRes.json().catch(() => ({}));
      setApiKeys(data.data ?? []);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveResult('idle');
    const token = await getToken();
    try {
      const res = await fetch(`${API_URL}/v1/merchant/profile`, {
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
      setSaveResult(res.ok ? 'success' : 'error');
      // Reset back to idle after 3s
      setTimeout(() => setSaveResult('idle'), 3000);
    } catch {
      setSaveResult('error');
      setTimeout(() => setSaveResult('idle'), 3000);
    } finally {
      setSaving(false);
    }
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
    // Reload keys so new key appears in list
    await loadData();
  }

  async function testWebhook() {
    if (!profile.webhookUrl) {
      setWebhookTest({ state: 'error', message: 'Save a webhook URL first.' });
      return;
    }
    setWebhookTest({ state: 'loading' });
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/v1/merchant/webhook/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWebhookTest({ state: 'error', message: data.error ?? `API error ${res.status}` });
        return;
      }
      if (data.success) {
        setWebhookTest({ state: 'success', statusCode: data.statusCode });
      } else {
        setWebhookTest({ state: 'error', message: data.error ?? `Endpoint returned non-2xx` });
      }
    } catch (err) {
      setWebhookTest({ state: 'error', message: err instanceof Error ? err.message : 'Network error' });
    }
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggleApiKey(id: string, currentlyActive: boolean) {
    const token = await getToken();
    const res = await fetch(`${API_URL}/v1/merchant/api-keys/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentlyActive }),
    });
    if (res.ok) {
      setApiKeys((prev) => prev.map((k) => k.id === id ? { ...k, isActive: !currentlyActive } : k));
    }
  }

  async function deleteApiKey(id: string) {
    if (!confirm('Permanently delete this API key? This cannot be undone.')) return;
    const token = await getToken();
    const res = await fetch(`${API_URL}/v1/merchant/api-keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    }
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
            <p className="text-xs text-gray-400 mt-1">Money will be sent directly to this UPI ID</p>
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
              When set, API keys can only be used from this domain (read from Origin/Referer or <code className="bg-gray-100 px-1 rounded">X-SeedhaPe-Domain</code>).
            </p>
          </div>

          {/* Webhook URL + inline test */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={profile.webhookUrl ?? ''}
                onChange={(e) => { setProfile({ ...profile, webhookUrl: e.target.value }); setWebhookTest({ state: 'idle' }); }}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="https://api.your-domain.com/webhooks/seedhape"
              />
              <button
                type="button"
                onClick={testWebhook}
                disabled={webhookTest.state === 'loading' || !profile.webhookUrl}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[72px] justify-center w-full sm:w-auto"
              >
                {webhookTest.state === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Link2 className="h-4 w-4" /> Test</>
                )}
              </button>
            </div>

            {/* Inline test result */}
            {webhookTest.state === 'success' && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Webhook delivered — your endpoint returned HTTP {webhookTest.statusCode}.
              </div>
            )}
            {webhookTest.state === 'error' && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                {webhookTest.message}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              We POST a signed <code className="bg-gray-100 px-1 rounded">order.verified</code> event here when a payment is confirmed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
            {profile.webhookSecretSet && !profile.webhookSecret ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Secret is set — enter a new value below to rotate it
                </span>
              </div>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={profile.webhookSecret ?? ''}
                onChange={(e) => setProfile({ ...profile, webhookSecret: e.target.value })}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                placeholder={profile.webhookSecretSet ? 'Enter new secret to rotate…' : 'Generate or enter min 32 chars'}
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret((v) => !v)}
                className="inline-flex items-center justify-center h-10 w-full sm:w-10 border border-slate-200 rounded-xl hover:bg-slate-50"
                aria-label={showWebhookSecret ? 'Hide webhook secret' : 'Show webhook secret'}
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('');
                  setProfile({ ...profile, webhookSecret: secret });
                  setShowWebhookSecret(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 whitespace-nowrap w-full sm:w-auto"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Verify the <code className="bg-gray-100 px-1 rounded">X-SeedhaPe-Signature</code> header on incoming webhooks using this secret. Save changes after generating.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saveResult === 'success' && (
            <span className="flex items-center gap-1.5 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" /> Saved
            </span>
          )}
          {saveResult === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-red-600">
              <XCircle className="h-4 w-4" /> Save failed
            </span>
          )}
        </div>
      </form>

      {/* API Keys */}
      <div className="bg-white rounded-2xl border border-emerald-100/70 p-6 shadow-sm shadow-emerald-100/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">API Keys</h2>
            <p className="text-xs text-gray-400 mt-0.5">Use these keys in the SeedhaPe SDK or REST API.</p>
          </div>
          <button
            onClick={createApiKey}
            className="flex items-center gap-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-xl transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Key
          </button>
        </div>

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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <code className="flex-1 bg-white border border-green-200 rounded px-3 py-2 text-sm font-mono break-all">
                {newKey}
              </code>
              <button
                onClick={() => copyKey(newKey)}
                className="inline-flex items-center justify-center p-2 text-green-700 hover:bg-green-100 rounded border border-green-200 sm:border-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {apiKeys.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {apiKeys.map((key) => (
              <div key={key.id} className={`py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${!key.isActive ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800">{key.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${key.environment === 'live' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {key.environment}
                    </span>
                    {!key.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">disabled</span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{key.keyPrefix}••••••••••••{key.keySuffix}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created {new Date(key.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => toggleApiKey(key.id, key.isActive)}
                    title={key.isActive ? 'Disable key' : 'Enable key'}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    {key.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    title="Delete key permanently"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : !newKey ? (
          <p className="text-sm text-gray-400 text-center py-4">No API keys yet</p>
        ) : null}
      </div>
    </div>
  );
}
