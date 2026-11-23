import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Pool } from 'pg';

const allowedTypes = new Set([
  'documents',
  'games',
  'collections',
  'revisions',
  'gameSessions',
  'archiveKeyCheck',
]);
const maxBodyBytes = 5 * 1024 * 1024;
const maxChanges = 100;
const maxCiphertextBytes = 1024 * 1024;
const keyCheckRecordId = '00000000-0000-4000-8000-000000000001';

const databaseUrl = process.env.DATABASE_URL;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const jwksUrl = process.env.NEON_AUTH_JWKS_URL;

if (!databaseUrl || !authBaseUrl || !jwksUrl) {
  throw new Error('Neon Postgres and Managed Auth must be enabled for the sync function.');
}

const pool = new Pool({ connectionString: databaseUrl, max: 4 });
const jwks = createRemoteJWKSet(new URL(jwksUrl));
const issuer = new URL(authBaseUrl).origin;

interface SyncChange {
  entityType: string;
  recordId: string;
  changeId: string;
  baseRevision: number;
  ciphertext: string;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    const isAppOrigin = hostname === 'lorekeep.pages.dev' || hostname.endsWith('.lorekeep.pages.dev');
    const isLocalOrigin = (hostname === 'localhost' || hostname === '127.0.0.1') &&
      ['5173', '4173'].includes(url.port);
    return url.protocol === 'https:' && isAppOrigin || url.protocol === 'http:' && isLocalOrigin
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function responseHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'authorization, content-type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

function json(data: unknown, status: number, origin: string | null): Response {
  return Response.json(data, {
    status,
    headers: responseHeaders(origin),
  });
}

async function authenticatedUser(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return null;
  try {
    const { payload } = await jwtVerify(authorization.slice(7), jwks, { issuer });
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

function isSyncChange(value: unknown): value is SyncChange {
  if (!value || typeof value !== 'object') return false;
  const change = value as Partial<SyncChange>;
  return typeof change.entityType === 'string' && allowedTypes.has(change.entityType) &&
    isUuid(change.recordId) && isUuid(change.changeId) &&
    Number.isInteger(change.baseRevision) && (change.baseRevision ?? -1) >= 0 &&
    typeof change.ciphertext === 'string' && change.ciphertext.length > 0 &&
    new TextEncoder().encode(change.ciphertext).byteLength <= maxCiphertextBytes;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = allowedOrigin(request.headers.get('origin'));
    if (request.headers.has('origin') && !origin) {
      return new Response('Origin not allowed', { status: 403, headers: { 'Vary': 'Origin' } });
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }

    const userId = await authenticatedUser(request);
    if (!userId) return json({ error: 'Unauthorized' }, 401, origin);

    const url = new URL(request.url);
    if (url.pathname !== '/' && url.pathname !== '/sync') {
      return json({ error: 'Not found' }, 404, origin);
    }

    if (request.method === 'GET') {
      if (url.searchParams.get('key-check') === '1') {
        try {
          const result = await pool.query(
            `SELECT entity_type AS "entityType", record_id AS "recordId",
                    change_id AS "changeId", revision, ciphertext
               FROM lorekeep_sync_records
              WHERE owner_id = $1 AND entity_type = 'archiveKeyCheck' AND record_id = $2`,
            [userId, keyCheckRecordId],
          );
          return json({ record: result.rows[0] ?? null }, 200, origin);
        } catch {
          return json({ error: 'Could not check the encrypted archive key.' }, 500, origin);
        }
      }
      const rawCursor = url.searchParams.get('after') ?? '0';
      const cursor = Number(rawCursor);
      if (!Number.isSafeInteger(cursor) || cursor < 0) return json({ error: 'Invalid sync cursor.' }, 400, origin);
      try {
        const result = await pool.query(
          `SELECT entity_type AS "entityType", record_id AS "recordId",
                  change_id AS "changeId", revision, ciphertext, sync_seq AS "syncSeq"
             FROM lorekeep_sync_records
            WHERE owner_id = $1 AND entity_type <> 'archiveKeyCheck' AND sync_seq > $2
            ORDER BY sync_seq ASC
            LIMIT 501`,
          [userId, cursor],
        );
        const hasMore = result.rows.length > 500;
        const records = hasMore ? result.rows.slice(0, 500) : result.rows;
        const nextCursor = hasMore ? records.at(-1)?.syncSeq ?? cursor : null;
        return json({ records, nextCursor }, 200, origin);
      } catch {
        return json({ error: 'Could not load the encrypted archive.' }, 500, origin);
      }
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (declaredLength > maxBodyBytes) return json({ error: 'Sync batch is too large.' }, 413, origin);

    let body: unknown;
    try {
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength > maxBodyBytes) return json({ error: 'Sync batch is too large.' }, 413, origin);
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return json({ error: 'Invalid request body.' }, 400, origin);
    }

    const changes = body && typeof body === 'object'
      ? (body as { changes?: unknown }).changes
      : null;
    const keyCheck = body && typeof body === 'object'
      ? (body as { keyCheck?: unknown }).keyCheck
      : null;
    if (keyCheck && typeof keyCheck === 'object') {
      const value = keyCheck as { changeId?: unknown; ciphertext?: unknown };
      if (!isUuid(value.changeId) || typeof value.ciphertext !== 'string' ||
          value.ciphertext.length === 0 || new TextEncoder().encode(value.ciphertext).byteLength > maxCiphertextBytes) {
        return json({ error: 'Invalid encrypted key check.' }, 400, origin);
      }
      try {
        await pool.query(
          `INSERT INTO lorekeep_sync_records
             (owner_id, entity_type, record_id, change_id, revision, ciphertext, updated_at)
           VALUES ($1, 'archiveKeyCheck', $2, $3, 1, $4, NOW())
           ON CONFLICT (owner_id, entity_type, record_id) DO NOTHING`,
          [userId, keyCheckRecordId, value.changeId, value.ciphertext],
        );
        const result = await pool.query(
          `SELECT change_id AS "changeId", ciphertext
             FROM lorekeep_sync_records
            WHERE owner_id = $1 AND entity_type = 'archiveKeyCheck' AND record_id = $2`,
          [userId, keyCheckRecordId],
        );
        return json({ record: result.rows[0] ?? null }, 200, origin);
      } catch {
        return json({ error: 'Could not save the encrypted key check.' }, 500, origin);
      }
    }
    if (!Array.isArray(changes) || changes.length > maxChanges || !changes.every(isSyncChange)) {
      return json({ error: 'Invalid sync changes.' }, 400, origin);
    }

    const accepted: Array<{ entityType: string; recordId: string; changeId: string; revision: number }> = [];
    const conflicts: Array<SyncChange & { revision: number }> = [];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const change of changes) {
        const saved = await client.query(
          `INSERT INTO lorekeep_sync_records
             (owner_id, entity_type, record_id, change_id, revision, ciphertext, updated_at)
           VALUES ($1, $2, $3, $4, 1, $5, NOW())
           ON CONFLICT (owner_id, entity_type, record_id) DO UPDATE
             SET change_id = EXCLUDED.change_id,
                 revision = lorekeep_sync_records.revision + 1,
                 ciphertext = EXCLUDED.ciphertext,
                 updated_at = NOW(),
                 sync_seq = DEFAULT
           WHERE lorekeep_sync_records.revision = $6
           RETURNING entity_type AS "entityType", record_id AS "recordId",
                     change_id AS "changeId", revision`,
          [userId, change.entityType, change.recordId, change.changeId,
            change.ciphertext, change.baseRevision],
        );
        if (saved.rows[0]) {
          accepted.push(saved.rows[0]);
          continue;
        }

        const current = await client.query(
          `SELECT entity_type AS "entityType", record_id AS "recordId",
                  change_id AS "changeId", revision, ciphertext, sync_seq AS "syncSeq"
             FROM lorekeep_sync_records
            WHERE owner_id = $1 AND entity_type = $2 AND record_id = $3`,
          [userId, change.entityType, change.recordId],
        );
        if (current.rows[0]?.changeId === change.changeId) accepted.push(current.rows[0]);
        else if (current.rows[0]) conflicts.push(current.rows[0]);
      }
      await client.query('COMMIT');
      return json({ accepted, conflicts }, 200, origin);
    } catch {
      await client.query('ROLLBACK').catch(() => undefined);
      return json({ error: 'Could not save encrypted changes.' }, 500, origin);
    } finally {
      client.release();
    }
  },
};
