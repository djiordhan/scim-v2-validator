export interface ValidationResult {
  test: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  description: string;
  warnings: string[];
  errors: string[];
  request?: unknown;
  response?: unknown;
  durationMs?: number;
}

export function checkSchemas(data: any, expected: string[]): string[] {
  const errors: string[] = [];
  if (!data?.schemas || !Array.isArray(data.schemas)) {
    errors.push('Response missing "schemas" array');
    return errors;
  }
  for (const schema of expected) {
    if (!data.schemas.includes(schema)) {
      errors.push(`Missing expected schema: ${schema}`);
    }
  }
  return errors;
}

export function checkRequiredAttributes(data: any, attrs: string[]): string[] {
  const errors: string[] = [];
  for (const attr of attrs) {
    if (data?.[attr] === undefined || data?.[attr] === null) {
      errors.push(`Missing required attribute: ${attr}`);
    }
  }
  return errors;
}

export function checkPagination(data: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data?.totalResults === undefined) {
    warnings.push('Response missing "totalResults" — pagination may not be supported');
  }
  if (data?.startIndex === undefined) {
    warnings.push('Response missing "startIndex"');
  }
  if (data?.itemsPerPage === undefined) {
    warnings.push('Response missing "itemsPerPage"');
  }

  return { errors, warnings };
}

export function buildResult(
  test: string,
  description: string,
  errors: string[],
  warnings: string[],
  request?: unknown,
  response?: unknown,
  durationMs?: number
): ValidationResult {
  const status =
    errors.length > 0 ? 'failed' : warnings.length > 0 ? 'warning' : 'passed';
  return { test, status, description, errors, warnings, request, response, durationMs };
}
