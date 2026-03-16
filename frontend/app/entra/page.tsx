'use client';

import { useState, useEffect, useRef } from 'react';
import { EntraConfig, EntraUser, SyncResult } from '../../lib/types';
import {
  getEntraConfig,
  saveEntraConfig,
  getEntraUsers,
  addEntraUser,
  deleteEntraUser,
  toggleEntraUser,
  syncEntraUsers,
} from '../../lib/entraApi';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SYNC_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-gray-700 text-gray-300',
  synced: 'bg-green-900/60 text-green-300',
  error: 'bg-red-900/60 text-red-300',
};

const ACTION_LABEL: Record<string, string> = {
  created: '✅ Created',
  updated: '✅ Updated',
  deprovisioned: '✅ Deprovisioned',
  create_failed: '❌ Create failed',
  update_failed: '❌ Update failed',
  deprovision_failed: '❌ Deprovision failed',
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SYNC_STATUS_STYLE[status] ?? 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  );
}

// ── Add User Form ─────────────────────────────────────────────────────────────

interface AddUserFormProps {
  onAdd: (user: { user_name: string; display_name: string; given_name: string; family_name: string; email: string }) => Promise<void>;
  onCancel: () => void;
}

function AddUserForm({ onAdd, onCancel }: AddUserFormProps) {
  const [form, setForm] = useState({ user_name: '', display_name: '', given_name: '', family_name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onAdd(form);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500';

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-200">New user</p>

      {error && (
        <p className="text-xs text-red-400 bg-red-900/30 rounded px-2 py-1">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Username *</label>
          <input ref={firstRef} required value={form.user_name} onChange={field('user_name')} placeholder="jane.doe" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Email *</label>
          <input required type="email" value={form.email} onChange={field('email')} placeholder="jane@example.com" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">First name</label>
          <input value={form.given_name} onChange={field('given_name')} placeholder="Jane" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Last name</label>
          <input value={form.family_name} onChange={field('family_name')} placeholder="Doe" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Display name</label>
          <input value={form.display_name} onChange={field('display_name')} placeholder="Jane Doe (defaults to first + last)" className={inputCls} />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded hover:bg-gray-700 transition">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-white font-medium transition">
          {loading ? 'Adding…' : 'Add user'}
        </button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EntraPage() {
  const [config, setConfig] = useState<EntraConfig>({ scim_base_url: '', token: '' });
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [users, setUsers] = useState<EntraUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    getEntraConfig().then(setConfig).catch(() => {});
    getEntraUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, []);

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setConfigSaving(true);
    setConfigError(null);
    try {
      await saveEntraConfig(config);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } catch (err: any) {
      setConfigError(err.message);
    } finally {
      setConfigSaving(false);
    }
  }

  async function handleAddUser(form: Parameters<typeof addEntraUser>[0]) {
    const user = await addEntraUser(form);
    setUsers(prev => [...prev, user]);
    setShowAddForm(false);
  }

  async function handleDelete(id: number) {
    await deleteEntraUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  async function handleToggle(user: EntraUser) {
    const updated = await toggleEntraUser(user.id, user.active === 0);
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
  }

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResults(null);
    try {
      const res = await syncEntraUsers();
      setSyncResults(res.results);
      setUsers(res.users);
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  const syncResultById = syncResults
    ? Object.fromEntries(syncResults.map(r => [r.id, r]))
    : null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <path d="M11.5 0L0 6.5v11L11.5 24 23 17.5v-11L11.5 0zm0 2.3l9.2 5.3-3.5 2-5.7-3.3-5.7 3.3-3.5-2L11.5 2.3zM2.3 8.9l4 2.3v4.6l-4-2.3V8.9zm18.4 0v4.6l-4 2.3v-4.6l4-2.3zm-5.3 3.1v4.6l-3.9 2.3-3.9-2.3v-4.6l3.9 2.2 3.9-2.2z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Microsoft Entra ID Simulation</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage users and sync them to your SCIM endpoint — mimicking how Entra provisions identities
          </p>
        </div>
      </div>

      {/* Config */}
      <section className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">SCIM Endpoint Configuration</h2>
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">SCIM Base URL</label>
              <input
                type="url"
                required
                value={config.scim_base_url}
                onChange={e => setConfig(c => ({ ...c, scim_base_url: e.target.value }))}
                placeholder="https://example.com/scim/v2"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bearer Token</label>
              <input
                type="password"
                required
                value={config.token}
                onChange={e => setConfig(c => ({ ...c, token: e.target.value }))}
                placeholder="eyJhbGciOiJIUzI1NiIs…"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {configError && (
            <p className="text-xs text-red-400 bg-red-900/30 rounded px-2 py-1">{configError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={configSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition"
            >
              {configSaving ? 'Saving…' : 'Save configuration'}
            </button>
            {configSaved && (
              <span className="text-xs text-green-400">✅ Saved</span>
            )}
          </div>
        </form>
      </section>

      {/* Users */}
      <section className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Users</h2>
            <p className="text-xs text-gray-500 mt-0.5">Stored in SQLite — sync pushes them to your SCIM endpoint</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition"
            >
              {showAddForm ? 'Cancel' : '+ Add user'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || users.length === 0}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-white font-medium transition"
            >
              {syncing ? 'Syncing…' : '⟳ Sync to SCIM'}
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="px-6 py-4 border-b border-gray-700">
            <AddUserForm onAdd={handleAddUser} onCancel={() => setShowAddForm(false)} />
          </div>
        )}

        {usersLoading ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            No users yet. Add one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700/60">
                  <th className="text-left px-6 py-2">Username</th>
                  <th className="text-left px-4 py-2">Display name</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">SCIM ID</th>
                  <th className="text-left px-4 py-2">Sync</th>
                  <th className="text-left px-4 py-2">Active</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const result = syncResultById?.[user.id];
                  return (
                    <tr key={user.id} className="border-b border-gray-800/60 hover:bg-white/[0.02] transition">
                      <td className="px-6 py-3 font-mono text-xs text-gray-200">{user.user_name}</td>
                      <td className="px-4 py-3 text-gray-300 text-xs">{user.display_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{user.email}</td>
                      <td className="px-4 py-3">
                        {user.scim_id ? (
                          <span className="font-mono text-xs text-gray-500 truncate max-w-[120px] block" title={user.scim_id}>
                            {user.scim_id.length > 12 ? `${user.scim_id.slice(0, 12)}…` : user.scim_id}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge status={user.sync_status} />
                          {result && (
                            <span className="text-xs text-gray-400">{ACTION_LABEL[result.action] ?? result.action}</span>
                          )}
                          {user.sync_error && !result && (
                            <span className="text-xs text-red-400 truncate max-w-[140px]" title={user.sync_error}>
                              {user.sync_error.slice(0, 40)}{user.sync_error.length > 40 ? '…' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(user)}
                          title={user.active ? 'Disable user' : 'Enable user'}
                          className={`w-9 h-5 rounded-full transition-colors relative ${user.active ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${user.active ? 'translate-x-4' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-xs text-gray-600 hover:text-red-400 transition"
                          title="Delete user"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sync results */}
      {(syncError || syncResults) && (
        <section className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Last sync results</h2>

          {syncError && (
            <p className="text-sm text-red-400 bg-red-900/30 rounded px-3 py-2">{syncError}</p>
          )}

          {syncResults && (
            <div className="space-y-2">
              {syncResults.map(r => (
                <div
                  key={r.id}
                  className={`flex items-start justify-between rounded-lg px-4 py-2.5 text-sm ${
                    r.status === 'synced' ? 'bg-green-900/20 border border-green-700/30' : 'bg-red-900/20 border border-red-700/30'
                  }`}
                >
                  <div>
                    <span className="font-mono text-xs text-gray-300">{r.user_name}</span>
                    <span className="ml-3 text-xs text-gray-400">{ACTION_LABEL[r.action] ?? r.action}</span>
                    {r.error && <p className="text-xs text-red-400 mt-0.5">{r.error}</p>}
                  </div>
                  <Badge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Entra behavior notes */}
      <section className="border border-gray-800 rounded-xl p-5 text-xs text-gray-500 space-y-1.5">
        <p className="font-semibold text-gray-400 mb-2">How this simulates Entra ID provisioning</p>
        <p>⟳ &nbsp;<strong className="text-gray-300">Filter before create</strong> — checks <code className="text-gray-400">GET /Users?filter=userName eq "..."</code> before posting a new user</p>
        <p>⟳ &nbsp;<strong className="text-gray-300">PATCH only</strong> — updates are sent as <code className="text-gray-400">PATCH PatchOp</code>, never PUT</p>
        <p>⟳ &nbsp;<strong className="text-gray-300">Disable, not delete</strong> — toggling a user off sends <code className="text-gray-400">PATCH active=false</code></p>
        <p>⟳ &nbsp;<strong className="text-gray-300">SCIM ID tracked</strong> — once a user is created on the SCIM server, the returned <code className="text-gray-400">id</code> is stored for future syncs</p>
      </section>
    </main>
  );
}
