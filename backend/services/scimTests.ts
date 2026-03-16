import { ScimClientConfig, createScimClient, scimGet, scimPost, scimPatch } from './scimClient';
import { ValidationResult, checkSchemas, checkRequiredAttributes, checkPagination, buildResult } from './validation';

export async function runAllTests(config: ScimClientConfig): Promise<ValidationResult[]> {
  const client = createScimClient(config);
  const results: ValidationResult[] = [];
  let createdUserId: string | null = null;

  // Test 1: ServiceProviderConfig
  try {
    const res = await scimGet(client, '/ServiceProviderConfig');
    const errors: string[] = [];
    const warnings: string[] = [];

    if (res.status !== 200) {
      errors.push(`Expected 200, got ${res.status}`);
    } else {
      const data = res.data as any;
      const schemaErrors = checkSchemas(data, ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig']);
      errors.push(...schemaErrors);

      if (data?.patch?.supported !== true) {
        errors.push('PATCH not reported as supported — required for Entra provisioning');
      }
      if (data?.filter?.supported !== true) {
        warnings.push('Filter not reported as supported — may affect Entra user lookup');
      }
      if (data?.bulk?.supported !== true) {
        warnings.push('Bulk not reported as supported');
      }
    }

    results.push(buildResult(
      'service_provider_config',
      'GET /ServiceProviderConfig — Verify PATCH, filter, and bulk support',
      errors, warnings, res.request, res.data, res.durationMs
    ));
  } catch (err: any) {
    results.push(buildResult(
      'service_provider_config',
      'GET /ServiceProviderConfig',
      [`Request failed: ${err.message}`], [], undefined, undefined
    ));
  }

  // Test 2: Fetch Users
  try {
    const res = await scimGet(client, '/Users', { count: 5, startIndex: 1 });
    const errors: string[] = [];
    const warnings: string[] = [];

    if (res.status !== 200) {
      errors.push(`Expected 200, got ${res.status}`);
    } else {
      const data = res.data as any;
      const schemaErrors = checkSchemas(data, ['urn:ietf:params:scim:api:messages:2.0:ListResponse']);
      errors.push(...schemaErrors);

      const pagCheck = checkPagination(data);
      errors.push(...pagCheck.errors);
      warnings.push(...pagCheck.warnings);

      if (!Array.isArray(data?.Resources)) {
        errors.push('Response missing "Resources" array');
      }
    }

    results.push(buildResult(
      'fetch_users',
      'GET /Users — Verify ListResponse schema and pagination',
      errors, warnings, res.request, res.data, res.durationMs
    ));
  } catch (err: any) {
    results.push(buildResult(
      'fetch_users',
      'GET /Users',
      [`Request failed: ${err.message}`], [], undefined, undefined
    ));
  }

  // Test 3: Filter Users
  try {
    const res = await scimGet(client, '/Users', { filter: 'userName eq "scim_test_user"' });
    const errors: string[] = [];
    const warnings: string[] = [];

    if (res.status === 501) {
      warnings.push('Server returned 501 — filtering not implemented. Entra requires filter support.');
    } else if (res.status !== 200) {
      errors.push(`Expected 200, got ${res.status}`);
    } else {
      const data = res.data as any;
      const schemaErrors = checkSchemas(data, ['urn:ietf:params:scim:api:messages:2.0:ListResponse']);
      errors.push(...schemaErrors);
    }

    results.push(buildResult(
      'filter_users',
      'GET /Users?filter=userName eq "..." — Entra uses this for user lookup',
      errors, warnings, res.request, res.data, res.durationMs
    ));
  } catch (err: any) {
    results.push(buildResult(
      'filter_users',
      'GET /Users with filter',
      [`Request failed: ${err.message}`], [], undefined, undefined
    ));
  }

  // Test 4: Create User
  const createPayload = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    userName: `scim_test_${Date.now()}`,
    displayName: 'SCIM Test User',
    active: true,
    emails: [{ value: 'scimtest@example.com', primary: true }],
    name: { givenName: 'SCIM', familyName: 'Test' },
  };

  try {
    const res = await scimPost(client, '/Users', createPayload);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (res.status !== 201) {
      errors.push(`Expected 201, got ${res.status}`);
    } else {
      const data = res.data as any;
      const schemaErrors = checkSchemas(data, ['urn:ietf:params:scim:schemas:core:2.0:User']);
      errors.push(...schemaErrors);
      const attrErrors = checkRequiredAttributes(data, ['id', 'userName']);
      errors.push(...attrErrors);

      if (data?.id) {
        createdUserId = data.id;
      } else {
        errors.push('Response did not include "id" — cannot proceed with subsequent tests');
      }
    }

    results.push(buildResult(
      'create_user',
      'POST /Users — Create test user, verify 201 + id returned',
      errors, warnings, res.request, res.data, res.durationMs
    ));
  } catch (err: any) {
    results.push(buildResult(
      'create_user',
      'POST /Users',
      [`Request failed: ${err.message}`], [], undefined, undefined
    ));
  }

  // Test 5: Retrieve Created User
  if (createdUserId) {
    try {
      const res = await scimGet(client, `/Users/${createdUserId}`);
      const errors: string[] = [];
      const warnings: string[] = [];

      if (res.status !== 200) {
        errors.push(`Expected 200, got ${res.status}`);
      } else {
        const data = res.data as any;
        const schemaErrors = checkSchemas(data, ['urn:ietf:params:scim:schemas:core:2.0:User']);
        errors.push(...schemaErrors);
        const attrErrors = checkRequiredAttributes(data, ['id', 'userName', 'active']);
        errors.push(...attrErrors);
      }

      results.push(buildResult(
        'retrieve_user',
        `GET /Users/${createdUserId} — Retrieve user by id`,
        errors, warnings, res.request, res.data, res.durationMs
      ));
    } catch (err: any) {
      results.push(buildResult(
        'retrieve_user',
        'GET /Users/{id}',
        [`Request failed: ${err.message}`], [], undefined, undefined
      ));
    }
  } else {
    results.push(buildResult(
      'retrieve_user',
      'GET /Users/{id} — Skipped: no user id from create step',
      [], ['Skipped because create_user did not return an id'], undefined, undefined
    ));
  }

  // Test 6: Update User (PATCH displayName)
  if (createdUserId) {
    const patchPayload = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [
        { op: 'Replace', path: 'displayName', value: 'SCIM Test User Updated' },
      ],
    };

    try {
      const res = await scimPatch(client, `/Users/${createdUserId}`, patchPayload);
      const errors: string[] = [];
      const warnings: string[] = [];

      if (res.status !== 200 && res.status !== 204) {
        errors.push(`Expected 200 or 204, got ${res.status}`);
      }

      results.push(buildResult(
        'update_user',
        `PATCH /Users/${createdUserId} — Update displayName`,
        errors, warnings, res.request, res.data, res.durationMs
      ));
    } catch (err: any) {
      results.push(buildResult(
        'update_user',
        'PATCH /Users/{id}',
        [`Request failed: ${err.message}`], [], undefined, undefined
      ));
    }
  } else {
    results.push(buildResult(
      'update_user',
      'PATCH /Users/{id} — Skipped: no user id',
      [], ['Skipped because create_user did not return an id'], undefined, undefined
    ));
  }

  // Test 7: Disable User (Entra-style)
  if (createdUserId) {
    const disablePayload = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{ op: 'Replace', path: 'active', value: false }],
    };

    try {
      const res = await scimPatch(client, `/Users/${createdUserId}`, disablePayload);
      const errors: string[] = [];
      const warnings: string[] = [];

      if (res.status !== 200 && res.status !== 204) {
        errors.push(`Expected 200 or 204, got ${res.status}`);
      } else if (res.status === 200) {
        const data = res.data as any;
        if (data?.active !== false) {
          warnings.push('"active" attribute not returned as false in response body');
        }
      }

      results.push(buildResult(
        'disable_user',
        `PATCH /Users/${createdUserId} — Set active=false (Entra deprovisioning behavior)`,
        errors, warnings, res.request, res.data, res.durationMs
      ));
    } catch (err: any) {
      results.push(buildResult(
        'disable_user',
        'PATCH /Users/{id} active=false',
        [`Request failed: ${err.message}`], [], undefined, undefined
      ));
    }
  } else {
    results.push(buildResult(
      'disable_user',
      'PATCH /Users/{id} active=false — Skipped: no user id',
      [], ['Skipped because create_user did not return an id'], undefined, undefined
    ));
  }

  return results;
}
