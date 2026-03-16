// ── SCIM Validator ────────────────────────────────────────────────────────────

export interface TestConfig {
  baseUrl: string;
  token: string;
  customHeaders?: Record<string, string>;
}

export type TestStatus = 'passed' | 'failed' | 'warning' | 'skipped';

export interface ValidationResult {
  test: string;
  status: TestStatus;
  description: string;
  warnings: string[];
  errors: string[];
  request?: unknown;
  response?: unknown;
  durationMs?: number;
}

export interface ValidateResponse {
  results: ValidationResult[];
}

// ── Entra Simulation ──────────────────────────────────────────────────────────

export interface EntraConfig {
  scim_base_url: string;
  token: string;
}

export interface EntraUser {
  id: number;
  user_name: string;
  display_name: string;
  given_name: string;
  family_name: string;
  email: string;
  active: number; // 1 = active, 0 = disabled
  scim_id: string | null;
  sync_status: 'pending' | 'synced' | 'error';
  last_synced_at: string | null;
  sync_error: string | null;
}

export interface SyncResult {
  id: number;
  user_name: string;
  action: string;
  status: 'synced' | 'failed';
  error: string | null;
}

export interface SyncResponse {
  results: SyncResult[];
  users: EntraUser[];
}
