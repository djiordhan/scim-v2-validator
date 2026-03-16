import { TestConfig, ValidateResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function runValidation(config: TestConfig): Promise<ValidateResponse> {
  const res = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
