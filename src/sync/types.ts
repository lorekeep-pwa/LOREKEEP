export type SyncEntityType = 'documents' | 'games' | 'collections' | 'revisions' | 'gameSessions';

export interface SyncKeyRecord {
  id: string;
  key: CryptoKey;
  createdAt: number;
}

export interface SyncRecordState {
  id: string;
  entityType: SyncEntityType;
  recordId: string;
  remoteId: string;
  serverRevision: number;
  changeId: string;
  fingerprint: string;
  deleted: boolean;
}

export interface EncryptedSyncEnvelope {
  operation: 'put' | 'delete';
  value?: unknown;
}

export interface RemoteSyncRecord {
  entityType: SyncEntityType;
  recordId: string;
  changeId: string;
  revision: number;
  ciphertext: string;
  syncSeq?: number;
}

export interface SyncChange {
  entityType: SyncEntityType;
  recordId: string;
  changeId: string;
  baseRevision: number;
  ciphertext: string;
}
