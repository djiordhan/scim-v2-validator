import { Router, Request, Response } from 'express';
import { getDb } from '../services/db';
import { createScimClient, scimGet, scimPost, scimPatch } from '../services/scimClient';

const router = Router();

// ── Config ────────────────────────────────────────────────────────────────────

router.get('/config', (_req: Request, res: Response) => {
  const row = getDb()
    .prepare('SELECT scim_base_url, token FROM entra_config WHERE id = 1')
    .get() as { scim_base_url: string; token: string } | undefined;
  return res.json(row ?? { scim_base_url: '', token: '' });
});

router.post('/config', (req: Request, res: Response) => {
  const { scim_base_url, token } = req.body as { scim_base_url?: string; token?: string };
  if (!scim_base_url || !token) {
    return res.status(400).json({ error: 'scim_base_url and token are required' });
  }
  getDb()
    .prepare('UPDATE entra_config SET scim_base_url = ?, token = ? WHERE id = 1')
    .run(scim_base_url.trim(), token.trim());
  return res.json({ ok: true });
});

// ── Users ─────────────────────────────────────────────────────────────────────

router.get('/users', (_req: Request, res: Response) => {
  const users = getDb()
    .prepare('SELECT * FROM entra_users ORDER BY id ASC')
    .all();
  return res.json(users);
});

router.post('/users', (req: Request, res: Response) => {
  const { user_name, display_name, given_name, family_name, email } = req.body as Record<string, string>;
  if (!user_name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'user_name and email are required' });
  }
  const db = getDb();
  try {
    const result = db
      .prepare(
        'INSERT INTO entra_users (user_name, display_name, given_name, family_name, email) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        user_name.trim(),
        (display_name || `${given_name ?? ''} ${family_name ?? ''}`.trim() || user_name).trim(),
        (given_name ?? '').trim(),
        (family_name ?? '').trim(),
        email.trim()
      );
    const user = db.prepare('SELECT * FROM entra_users WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json(user);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: `User "${user_name}" already exists` });
    }
    throw err;
  }
});

router.delete('/users/:id', (req: Request, res: Response) => {
  getDb().prepare('DELETE FROM entra_users WHERE id = ?').run(req.params.id);
  return res.json({ ok: true });
});

router.patch('/users/:id', (req: Request, res: Response) => {
  const { active } = req.body as { active: boolean };
  const db = getDb();
  db.prepare("UPDATE entra_users SET active = ?, sync_status = 'pending', sync_error = NULL WHERE id = ?").run(
    active ? 1 : 0,
    req.params.id
  );
  const user = db.prepare('SELECT * FROM entra_users WHERE id = ?').get(req.params.id);
  return res.json(user);
});

// ── Sync ──────────────────────────────────────────────────────────────────────

router.post('/sync', async (_req: Request, res: Response) => {
  const db = getDb();
  const config = db
    .prepare('SELECT scim_base_url, token FROM entra_config WHERE id = 1')
    .get() as { scim_base_url: string; token: string } | undefined;

  if (!config?.scim_base_url || !config?.token) {
    return res.status(400).json({ error: 'SCIM configuration not saved yet. Set the endpoint and token first.' });
  }

  const users = db.prepare('SELECT * FROM entra_users ORDER BY id ASC').all() as any[];
  if (users.length === 0) {
    return res.json({ results: [], users: [] });
  }

  const client = createScimClient({ baseUrl: config.scim_base_url, token: config.token });

  type SyncResult = {
    id: number;
    user_name: string;
    action: string;
    status: 'synced' | 'failed';
    error: string | null;
  };

  const results: SyncResult[] = [];

  for (const user of users) {
    const result: SyncResult = {
      id: user.id,
      user_name: user.user_name,
      action: '',
      status: 'failed',
      error: null,
    };

    try {
      let scimId: string | null = user.scim_id ?? null;

      // Step 1 — Entra always filters by userName before creating to avoid duplicates
      if (!scimId) {
        const filterRes = await scimGet(client, '/Users', {
          filter: `userName eq "${user.user_name}"`,
        });
        if (filterRes.status === 200) {
          const resources = (filterRes.data as any)?.Resources;
          if (Array.isArray(resources) && resources.length > 0) {
            scimId = resources[0].id ?? null;
            if (scimId) {
              db.prepare('UPDATE entra_users SET scim_id = ? WHERE id = ?').run(scimId, user.id);
            }
          }
        }
      }

      if (!scimId) {
        // Step 2 — Create
        const createRes = await scimPost(client, '/Users', {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: user.user_name,
          displayName: user.display_name,
          name: { givenName: user.given_name, familyName: user.family_name },
          emails: [{ value: user.email, primary: true }],
          active: user.active === 1,
        });

        if (createRes.status === 201) {
          scimId = (createRes.data as any)?.id ?? null;
          result.action = 'created';
          result.status = 'synced';
          db.prepare(
            "UPDATE entra_users SET scim_id = ?, sync_status = 'synced', last_synced_at = ?, sync_error = NULL WHERE id = ?"
          ).run(scimId, new Date().toISOString(), user.id);
        } else {
          result.action = 'create_failed';
          result.error = `POST /Users → ${createRes.status}: ${JSON.stringify(createRes.data)}`;
          db.prepare("UPDATE entra_users SET sync_status = 'error', sync_error = ? WHERE id = ?").run(
            result.error,
            user.id
          );
        }
      } else if (user.active === 0) {
        // Step 3a — Deprovision: Entra sets active=false instead of deleting
        const patchRes = await scimPatch(client, `/Users/${scimId}`, {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [{ op: 'Replace', path: 'active', value: false }],
        });

        if (patchRes.status === 200 || patchRes.status === 204) {
          result.action = 'deprovisioned';
          result.status = 'synced';
          db.prepare(
            "UPDATE entra_users SET sync_status = 'synced', last_synced_at = ?, sync_error = NULL WHERE id = ?"
          ).run(new Date().toISOString(), user.id);
        } else {
          result.action = 'deprovision_failed';
          result.error = `PATCH /Users/${scimId} → ${patchRes.status}`;
          db.prepare("UPDATE entra_users SET sync_status = 'error', sync_error = ? WHERE id = ?").run(
            result.error,
            user.id
          );
        }
      } else {
        // Step 3b — Update active user
        const patchRes = await scimPatch(client, `/Users/${scimId}`, {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [
            { op: 'Replace', path: 'displayName', value: user.display_name },
            { op: 'Replace', path: 'active', value: true },
          ],
        });

        if (patchRes.status === 200 || patchRes.status === 204) {
          result.action = 'updated';
          result.status = 'synced';
          db.prepare(
            "UPDATE entra_users SET sync_status = 'synced', last_synced_at = ?, sync_error = NULL WHERE id = ?"
          ).run(new Date().toISOString(), user.id);
        } else {
          result.action = 'update_failed';
          result.error = `PATCH /Users/${scimId} → ${patchRes.status}`;
          db.prepare("UPDATE entra_users SET sync_status = 'error', sync_error = ? WHERE id = ?").run(
            result.error,
            user.id
          );
        }
      }
    } catch (err: any) {
      result.error = err.message;
      db.prepare("UPDATE entra_users SET sync_status = 'error', sync_error = ? WHERE id = ?").run(
        err.message,
        user.id
      );
    }

    results.push(result);
  }

  const updatedUsers = db.prepare('SELECT * FROM entra_users ORDER BY id ASC').all();
  return res.json({ results, users: updatedUsers });
});

export default router;
