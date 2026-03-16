'use client';

import { useState } from 'react';
import ConfigPanel from '../components/ConfigPanel';
import TestResults from '../components/TestResults';
import { runValidation } from '../lib/api';
import { TestConfig, ValidationResult } from '../lib/types';

export default function Home() {
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun(config: TestConfig) {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await runValidation(config);
      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleExportJson() {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scim-validation-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportMarkdown() {
    if (!results) return;
    const lines = ['# SCIM Validation Report', ''];
    for (const r of results) {
      const icon = r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : r.status === 'warning' ? '⚠️' : '⏭️';
      lines.push(`## ${icon} ${r.test} — ${r.status.toUpperCase()}`);
      lines.push(`**${r.description}**`);
      if (r.durationMs) lines.push(`_${r.durationMs}ms_`);
      if (r.errors.length) {
        lines.push('', '**Errors:**');
        r.errors.forEach(e => lines.push(`- ${e}`));
      }
      if (r.warnings.length) {
        lines.push('', '**Warnings:**');
        r.warnings.forEach(w => lines.push(`- ${w}`));
      }
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scim-validation-report.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  const summary = results
    ? {
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        warnings: results.filter(r => r.status === 'warning').length,
      }
    : null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">SCIM v2 Validator</h1>
        <p className="text-gray-400 text-sm">
          Test your SCIM server for Microsoft Entra ID provisioning compatibility
        </p>
      </div>

      <ConfigPanel onRun={handleRun} loading={loading} />

      {error && (
        <div className="mt-6 p-4 bg-red-900/40 border border-red-600 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {results && summary && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4 text-sm">
              <span className="text-green-400 font-medium">{summary.passed} passed</span>
              <span className="text-red-400 font-medium">{summary.failed} failed</span>
              <span className="text-yellow-400 font-medium">{summary.warnings} warnings</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition"
              >
                Export JSON
              </button>
              <button
                onClick={handleExportMarkdown}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition"
              >
                Export MD
              </button>
            </div>
          </div>
          <TestResults results={results} />
        </div>
      )}
    </main>
  );
}
