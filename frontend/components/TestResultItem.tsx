'use client';

import { useState } from 'react';
import { ValidationResult } from '../lib/types';

interface Props {
  result: ValidationResult;
}

const STATUS_CONFIG = {
  passed: { icon: '✅', color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/40' },
  failed: { icon: '❌', color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/40' },
  warning: { icon: '⚠️', color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/40' },
  skipped: { icon: '⏭️', color: 'text-gray-400', bg: 'bg-gray-800/40 border-gray-600/40' },
};

export default function TestResultItem({ result }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[result.status];

  return (
    <div className={`border rounded-lg overflow-hidden ${cfg.bg}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{cfg.icon}</span>
          <div>
            <p className={`text-sm font-semibold ${cfg.color}`}>{result.test.replace(/_/g, ' ')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{result.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {result.durationMs !== undefined && (
            <span className="text-xs text-gray-500">{result.durationMs}ms</span>
          )}
          <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {result.errors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-400 mb-1">Errors</p>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-300 bg-red-900/20 rounded px-2 py-1">{e}</li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-yellow-400 mb-1">Warnings</p>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-yellow-300 bg-yellow-900/20 rounded px-2 py-1">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {result.request && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Request</p>
              <pre className="text-xs text-gray-300 bg-gray-800 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {JSON.stringify(result.request, null, 2)}
              </pre>
            </div>
          )}

          {result.response && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Response</p>
              <pre className="text-xs text-gray-300 bg-gray-800 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
