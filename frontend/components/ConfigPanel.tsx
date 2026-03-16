'use client';

import { useState } from 'react';
import { TestConfig } from '../lib/types';

interface Props {
  onRun: (config: TestConfig) => void;
  loading: boolean;
}

export default function ConfigPanel({ onRun, loading }: Props) {
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [showHeaders, setShowHeaders] = useState(false);
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});

  function addHeader() {
    if (headerKey.trim()) {
      setCustomHeaders(prev => ({ ...prev, [headerKey.trim()]: headerValue.trim() }));
      setHeaderKey('');
      setHeaderValue('');
    }
  }

  function removeHeader(key: string) {
    setCustomHeaders(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onRun({ baseUrl: baseUrl.trim(), token: token.trim(), customHeaders });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">SCIM Base URL</label>
        <input
          type="url"
          required
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder="https://example.com/scim/v2"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Bearer Token</label>
        <input
          type="password"
          required
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIs..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowHeaders(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-200 transition"
        >
          {showHeaders ? '▲' : '▼'} Custom Headers (optional)
        </button>

        {showHeaders && (
          <div className="mt-3 space-y-2">
            {Object.entries(customHeaders).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs text-gray-300">
                <span className="font-mono bg-gray-800 px-2 py-1 rounded">{k}: {v}</span>
                <button type="button" onClick={() => removeHeader(k)} className="text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={headerKey}
                onChange={e => setHeaderKey(e.target.value)}
                placeholder="Header name"
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500"
              />
              <input
                type="text"
                value={headerValue}
                onChange={e => setHeaderValue(e.target.value)}
                placeholder="Value"
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500"
              />
              <button
                type="button"
                onClick={addHeader}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition"
      >
        {loading ? 'Running validation...' : 'Run SCIM Validation'}
      </button>
    </form>
  );
}
