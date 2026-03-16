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
