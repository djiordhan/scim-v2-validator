import { EntraConfig, EntraUser, SyncResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getEntraConfig(): Promise<EntraConfig> {
  const res = await fetch(`${API_BASE}/entra/config`);
  return handleResponse<EntraConfig>(res);
}

export async function saveEntraConfig(config: EntraConfig): Promise<void> {
  const res = await fetch(`${API_BASE}/entra/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  await handleResponse<{ ok: boolean }>(res);
}

export async function getEntraUsers(): Promise<EntraUser[]> {
  const res = await fetch(`${API_BASE}/entra/users`);
  return handleResponse<EntraUser[]>(res);
}

export async function addEntraUser(user: {
  user_name: string;
  display_name: string;
  given_name: string;
  family_name: string;
  email: string;
}): Promise<EntraUser> {
  const res = await fetch(`${API_BASE}/entra/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return handleResponse<EntraUser>(res);
}

export async function deleteEntraUser(id: number): Promise<void> {
  await fetch(`${API_BASE}/entra/users/${id}`, { method: 'DELETE' });
}

export async function toggleEntraUser(id: number, active: boolean): Promise<EntraUser> {
  const res = await fetch(`${API_BASE}/entra/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
  return handleResponse<EntraUser>(res);
}

export async function syncEntraUsers(): Promise<SyncResponse> {
  const res = await fetch(`${API_BASE}/entra/sync`, { method: 'POST' });
  return handleResponse<SyncResponse>(res);
}
