import {
  db,
  generateId,
} from '../db/database';
import type {
  Collection,
  DocumentRevision,
  Game,
  GameSession,
  LoreDocument,
} from '../types/models';
import { decryptSyncEnvelope, encryptSyncEnvelope, fingerprint } from './crypto';
import type {
  EncryptedSyncEnvelope,
  RemoteSyncRecord,
  SyncChange,
  SyncEntityType,
  SyncRecordState,
} from './types';

type SyncValue = LoreDocument | Game | Collection | DocumentRevision | GameSession;
type SyncCollections = Record<SyncEntityType, SyncValue[]>;

const entityTypes: SyncEntityType[] = [
  'games',
  'collections',
  'documents',
  'revisions',
  'gameSessions',
];

function stateKey(entityType: SyncEntityType, recordId: string): string {
  return `${entityType}:${recordId}`;
}

function remoteIdFor(recordId: string, state?: SyncRecordState): string {
  if (state?.remoteId) return state.remoteId;
  return /^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(recordId) ? recordId : crypto.randomUUID();
}

function tableFor(entityType: SyncEntityType) {
  switch (entityType) {
    case 'documents': return db.documents;
    case 'games': return db.games;
    case 'collections': return db.collections;
    case 'revisions': return db.revisions;
    case 'gameSessions': return db.gameSessions;
  }
}

async function listAll(): Promise<SyncCollections> {
  const [games, collections, documents, revisions, gameSessions] = await Promise.all([
    db.games.toArray(),
    db.collections.toArray(),
    db.documents.toArray(),
    db.revisions.toArray(),
    db.gameSessions.toArray(),
  ]);
  return { games, collections, documents, revisions, gameSessions };
}

function syncValue(entityType: SyncEntityType, value: SyncValue): SyncValue {
  // Covers are useful on the original device but aren't note content. Keeping them local
  // avoids sending large base64 images through the sync API.
  if (entityType === 'games') return { ...(value as Game), coverDataUrl: null };
  return value;
}

async function readValue(entityType: SyncEntityType, recordId: string): Promise<SyncValue | undefined> {
  return await tableFor(entityType).get(recordId) as SyncValue | undefined;
}

async function putValue(entityType: SyncEntityType, value: SyncValue): Promise<void> {
  if (entityType === 'games') {
    const incoming = value as Game;
    const current = await db.games.get(incoming.id);
    await db.games.put({ ...incoming, coverDataUrl: current?.coverDataUrl ?? incoming.coverDataUrl ?? null });
    return;
  }
  await tableFor(entityType).put(value as never);
}

async function deleteValue(entityType: SyncEntityType, recordId: string): Promise<void> {
  if (entityType === 'documents') {
    await db.transaction('rw', db.documents, db.revisions, async () => {
      await db.documents.delete(recordId);
      await db.revisions.where('documentId').equals(recordId).delete();
    });
    return;
  }
  await tableFor(entityType).delete(recordId);
}

async function preserveLocalConflict(entityType: SyncEntityType, value: SyncValue): Promise<void> {
  const now = Date.now();
  if (entityType === 'documents') {
    const document = value as LoreDocument;
    const conflictId = generateId();
    const title = document.title.trim() || 'Untitled document';
    await db.transaction('rw', db.documents, db.revisions, async () => {
      await db.documents.add({
        ...document,
        id: conflictId,
        title: `${title} (local conflict copy)`,
        createdAt: now,
        updatedAt: now,
      });
      const revisions = await db.revisions.where('documentId').equals(document.id).toArray();
      if (revisions.length) {
        await db.revisions.bulkAdd(revisions.map((revision) => ({
          ...revision,
          id: generateId(),
          documentId: conflictId,
        })));
      }
    });
    return;
  }

  if (entityType === 'games') {
    const game = value as Game;
    const conflictId = generateId();
    const copy = { ...game, id: conflictId, title: `${game.title} (local conflict copy)`, createdAt: now, updatedAt: now };
    await db.transaction('rw', db.games, db.documents, db.gameSessions, async () => {
      await db.games.add(copy);
      await db.documents.where('gameId').equals(game.id).modify({ gameId: conflictId, updatedAt: now });
      await db.gameSessions.where('gameId').equals(game.id).modify({ gameId: conflictId, updatedAt: now });
    });
    return;
  }

  if (entityType === 'collections') {
    const collection = value as Collection;
    const conflictId = generateId();
    await db.transaction('rw', db.collections, db.documents, async () => {
      await db.collections.add({
        ...collection,
        id: conflictId,
        name: `${collection.name} (local conflict copy)`,
        createdAt: now,
        updatedAt: now,
      });
      await db.documents.where('collectionId').equals(collection.id).modify({ collectionId: conflictId, updatedAt: now });
    });
    return;
  }

  if (entityType === 'gameSessions') {
    const session = value as GameSession;
    await db.gameSessions.add({
      ...session,
      id: generateId(),
      title: `${session.title} (local conflict copy)`,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const revision = value as DocumentRevision;
  await db.revisions.add({ ...revision, id: generateId(), createdAt: now });
}

async function readRemote(apiUrl: string, token: string): Promise<RemoteSyncRecord[]> {
  const endpoint = new URL('sync', `${apiUrl.replace(/\/+$/u, '')}/`);
  const records: RemoteSyncRecord[] = [];
  let cursor = 0;
  while (true) {
    endpoint.searchParams.set('after', String(cursor));
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(response.status === 401
      ? 'Your session expired. Sign in again to sync.'
      : 'Could not load the encrypted cloud archive.');
    const body = await response.json() as { records?: RemoteSyncRecord[]; nextCursor?: number | null };
    const batch = Array.isArray(body.records) ? body.records : [];
    records.push(...batch);
    if (body.nextCursor == null || batch.length === 0) break;
    cursor = body.nextCursor;
  }
  return records;
}

export async function verifyRecoveryKey(apiUrl: string, token: string, key: CryptoKey): Promise<boolean> {
  const endpoint = new URL('sync?key-check=1', `${apiUrl.replace(/\/+$/u, '')}/`);
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('Could not verify the encrypted archive key.');
  const body = await response.json() as { record?: RemoteSyncRecord | null };
  const record = body.record;
  if (!record) return false;
  try {
    const check = await decryptSyncEnvelope<{ operation?: string; value?: { application?: string; format?: string } }>(
      key,
      record.ciphertext,
      `archiveKeyCheck:${record.recordId}:${record.changeId}`,
    );
    return check.operation === 'key-check' && check.value?.application === 'LOREKEEP' && check.value.format === 'v1';
  } catch {
    return false;
  }
}

export async function registerRecoveryKey(apiUrl: string, token: string, key: CryptoKey): Promise<void> {
  const endpoint = new URL('sync', `${apiUrl.replace(/\/+$/u, '')}/`);
  const changeId = crypto.randomUUID();
  const recordId = '00000000-0000-4000-8000-000000000001';
  const ciphertext = await encryptSyncEnvelope(
    key,
    { operation: 'key-check', value: { application: 'LOREKEEP', format: 'v1' } },
    `archiveKeyCheck:${recordId}:${changeId}`,
  );
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyCheck: { changeId, ciphertext } }),
  });
  if (!response.ok) throw new Error('Could not initialize the encrypted archive key check.');
  if (!await verifyRecoveryKey(apiUrl, token, key)) {
    throw new Error('This account already has a different recovery key. Sign in on this device with its original recovery code.');
  }
}

async function saveLocalState(state: SyncRecordState): Promise<void> {
  await db.syncStates.put(state);
}

async function applyRemoteRecords(
  remoteRecords: RemoteSyncRecord[],
  key: CryptoKey,
): Promise<void> {
  for (const remote of remoteRecords) {
    const localIdFromState = await db.syncStates
      .where('remoteId')
      .equals(remote.recordId)
      .first();
    const associatedData = `${remote.entityType}:${remote.recordId}:${remote.changeId}`;
    const envelope = await decryptSyncEnvelope<EncryptedSyncEnvelope & { entityId?: string }>(
      key,
      remote.ciphertext,
      associatedData,
    );
    const recordId = envelope.entityId ?? (envelope.value as { id?: string } | undefined)?.id ?? localIdFromState?.recordId;
    if (!recordId) throw new Error('An encrypted archive record is missing its identifier.');

    const keyId = stateKey(remote.entityType, recordId);
    const state = await db.syncStates.get(keyId);
    const local = await readValue(remote.entityType, recordId);
    let nextLocal = local;

    if (envelope.operation === 'delete') {
      if (local) {
        if (!state || await fingerprint(syncValue(remote.entityType, local)) !== state.fingerprint) {
          await preserveLocalConflict(remote.entityType, local);
        }
        await deleteValue(remote.entityType, recordId);
      }
      nextLocal = undefined;
    } else if (envelope.value && typeof envelope.value === 'object') {
      const incoming = envelope.value as SyncValue;
      const localChanged = Boolean(local && (!state ||
        await fingerprint(syncValue(remote.entityType, local)) !== state.fingerprint));
      const remoteIsNewer = !state || remote.revision > state.serverRevision;
      if (local && localChanged && remoteIsNewer) {
        await preserveLocalConflict(remote.entityType, local);
      }
      if (remoteIsNewer || !local) {
        await putValue(remote.entityType, incoming);
        nextLocal = await readValue(remote.entityType, recordId);
      }
    }

    const nextFingerprint = nextLocal
      ? await fingerprint(syncValue(remote.entityType, nextLocal))
      : '';
    await saveLocalState({
      id: keyId,
      entityType: remote.entityType,
      recordId,
      remoteId: remote.recordId,
      serverRevision: remote.revision,
      changeId: remote.changeId,
      fingerprint: nextFingerprint,
      deleted: envelope.operation === 'delete',
    });
  }
}

async function listLocalStateByKey(): Promise<Map<string, SyncRecordState>> {
  const states = await db.syncStates.toArray();
  return new Map(states.map((state) => [state.id, state]));
}

async function createChanges(
  key: CryptoKey,
  local: SyncCollections,
  stateByKey: Map<string, SyncRecordState>,
): Promise<SyncChange[]> {
  const changes: SyncChange[] = [];
  const localIds = new Set<string>();

  for (const entityType of entityTypes) {
    for (const value of local[entityType]) {
      const record = syncValue(entityType, value);
      const entityId = (record as { id: string }).id;
      const keyId = stateKey(entityType, entityId);
      localIds.add(keyId);
      const state = stateByKey.get(keyId);
      const nextFingerprint = await fingerprint(record);
      if (state && !state.deleted && state.fingerprint === nextFingerprint) continue;

      const recordId = remoteIdFor(entityId, state);
      const changeId = crypto.randomUUID();
      const ciphertext = await encryptSyncEnvelope(
        key,
        { operation: 'put', value: record, entityId },
        `${entityType}:${recordId}:${changeId}`,
      );
      changes.push({
        entityType,
        recordId,
        changeId,
        baseRevision: state?.serverRevision ?? 0,
        ciphertext,
      });
    }
  }

  for (const [keyId, state] of stateByKey) {
    if (localIds.has(keyId) || state.deleted || state.serverRevision === 0) continue;
    const changeId = crypto.randomUUID();
    const ciphertext = await encryptSyncEnvelope(
      key,
      { operation: 'delete', entityId: state.recordId },
      `${state.entityType}:${state.remoteId}:${changeId}`,
    );
    changes.push({
      entityType: state.entityType,
      recordId: state.remoteId,
      changeId,
      baseRevision: state.serverRevision,
      ciphertext,
    });
  }

  return changes;
}

async function pushChanges(
  apiUrl: string,
  token: string,
  key: CryptoKey,
  changes: SyncChange[],
  stateByKey: Map<string, SyncRecordState>,
  localByKey: Map<string, SyncValue>,
): Promise<RemoteSyncRecord[]> {
  const conflicts: RemoteSyncRecord[] = [];
  const endpoint = new URL('sync', `${apiUrl.replace(/\/+$/u, '')}/`);

  for (let offset = 0; offset < changes.length; offset += 100) {
    const batch = changes.slice(offset, offset + 100);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ changes: batch }),
    });
    if (!response.ok) throw new Error(response.status === 401
      ? 'Your session expired. Sign in again to sync.'
      : 'Could not save the encrypted cloud archive.');

    const result = await response.json() as {
      accepted?: Array<{ entityType: SyncEntityType; recordId: string; changeId: string; revision: number }>;
      conflicts?: RemoteSyncRecord[];
    };
    conflicts.push(...(result.conflicts ?? []));

    for (const accepted of result.accepted ?? []) {
      const change = batch.find((item) => item.changeId === accepted.changeId);
      if (!change) continue;
      const payload = await decryptSyncEnvelope<EncryptedSyncEnvelope & { entityId?: string }>(
        key,
        change.ciphertext,
        `${change.entityType}:${change.recordId}:${change.changeId}`,
      ).catch(() => null);
      const entityId = payload?.entityId;
      if (!entityId) continue;
      const keyId = stateKey(change.entityType, entityId);
      const value = localByKey.get(keyId);
      const isDeleted = payload.operation === 'delete';
      const nextState: SyncRecordState = {
        id: keyId,
        entityType: change.entityType,
        recordId: entityId,
        remoteId: accepted.recordId,
        serverRevision: accepted.revision,
        changeId: accepted.changeId,
        fingerprint: value && !isDeleted
          ? await fingerprint(syncValue(change.entityType, value))
          : '',
        deleted: isDeleted,
      };
      await saveLocalState(nextState);
      stateByKey.set(keyId, nextState);
    }
  }
  return conflicts;
}

export async function checkRemoteArchive(apiUrl: string, token: string): Promise<boolean> {
  const [records, keyCheckResponse] = await Promise.all([
    readRemote(apiUrl, token),
    fetch(new URL('sync?key-check=1', `${apiUrl.replace(/\/+$/u, '')}/`), {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    }),
  ]);
  if (!keyCheckResponse.ok) throw new Error('Could not check the encrypted cloud archive.');
  const { record } = await keyCheckResponse.json() as { record?: RemoteSyncRecord | null };
  return records.length > 0 || Boolean(record);
}

export async function syncWorkspace(
  apiUrl: string,
  token: string,
  key: CryptoKey,
): Promise<{ uploaded: number; downloaded: number; conflicts: number }> {
  const firstRemote = await readRemote(apiUrl, token);
  await applyRemoteRecords(firstRemote, key);

  let stateByKey = await listLocalStateByKey();
  let local = await listAll();
  let localByKey = new Map<string, SyncValue>();
  for (const entityType of entityTypes) {
    for (const value of local[entityType]) {
      localByKey.set(stateKey(entityType, (value as { id: string }).id), value);
    }
  }

  let pending = await createChanges(key, local, stateByKey);
  let conflicts = await pushChanges(apiUrl, token, key, pending, stateByKey, localByKey);
  if (conflicts.length) {
    await applyRemoteRecords(conflicts, key);
    stateByKey = await listLocalStateByKey();
    local = await listAll();
    localByKey = new Map<string, SyncValue>();
    for (const entityType of entityTypes) {
      for (const value of local[entityType]) {
        localByKey.set(stateKey(entityType, (value as { id: string }).id), value);
      }
    }
    pending = await createChanges(key, local, stateByKey);
    const remainingConflicts = await pushChanges(apiUrl, token, key, pending, stateByKey, localByKey);
    conflicts = [...conflicts, ...remainingConflicts];
  }

  const finalRemote = await readRemote(apiUrl, token);
  await applyRemoteRecords(finalRemote, key);
  return {
    uploaded: pending.length,
    downloaded: firstRemote.length,
    conflicts: conflicts.length,
  };
}

export async function getLocalArchiveCounts(): Promise<{ documents: number; games: number; collections: number }> {
  const [documents, games, collections] = await Promise.all([
    db.documents.count(),
    db.games.count(),
    db.collections.count(),
  ]);
  return { documents, games, collections };
}
