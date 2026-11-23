import Dexie, { type EntityTable } from 'dexie';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type Collection,
  type DocumentRevision,
  type Game,
  type GameSession,
  type LoreDocument,
} from '../types/models';
import {
  extractPlainTextFromJson,
  type WorkspaceBackupPayload,
} from '../utils/export';
import { countWords } from '../utils/format';

class LorekeepDatabase extends Dexie {
  games!: EntityTable<Game, 'id'>;
  collections!: EntityTable<Collection, 'id'>;
  documents!: EntityTable<LoreDocument, 'id'>;
  revisions!: EntityTable<DocumentRevision, 'id'>;
  gameSessions!: EntityTable<GameSession, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('lorekeep_local_db');

    this.version(1).stores({
      games: 'id, title, platform, genre, developer, updatedAt, createdAt',
      collections: 'id, name, updatedAt, createdAt',
      documents:
        'id, title, gameId, collectionId, *tags, isFavorite, isArchived, updatedAt, createdAt',
      revisions: 'id, documentId, createdAt',
      settings: 'id',
    });

    this.version(2).stores({
      games: 'id, title, platform, genre, developer, updatedAt, createdAt',
      collections: 'id, name, updatedAt, createdAt',
      documents:
        'id, title, gameId, collectionId, *tags, isFavorite, isArchived, updatedAt, createdAt',
      revisions: 'id, documentId, createdAt',
      settings: 'id',
      gameSessions: 'id, gameId, playedAt, updatedAt',
    });
  }
}

export const db = new LorekeepDatabase();

const EMPTY_DOC_JSON = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('user-settings');
  if (existing) {
    const normalized = { ...DEFAULT_SETTINGS, ...existing };
    if (
      existing.lastBackupAt === undefined ||
      existing.backupReminderInterval === undefined
    ) {
      await db.settings.put(normalized);
    }
    return normalized;
  }
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, 'id'>>,
): Promise<AppSettings> {
  const current = await ensureSettings();
  const next: AppSettings = { ...current, ...patch, id: 'user-settings' };
  await db.settings.put(next);
  return next;
}

export async function createDocument(options?: {
  title?: string;
  gameId?: string | null;
  collectionId?: string | null;
  tags?: string[];
}): Promise<LoreDocument> {
  const now = Date.now();
  const doc: LoreDocument = {
    id: generateId(),
    title: options?.title?.trim() ?? '',
    contentJson: EMPTY_DOC_JSON,
    plainText: '',
    wordCount: 0,
    charCount: 0,
    gameId: options?.gameId ?? null,
    collectionId: options?.collectionId ?? null,
    tags: options?.tags ?? [],
    isFavorite: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.documents.add(doc);
  return doc;
}

export async function updateDocument(
  id: string,
  patch: Partial<Omit<LoreDocument, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.documents.update(id, {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function duplicateDocument(id: string): Promise<LoreDocument | null> {
  const source = await db.documents.get(id);
  if (!source) return null;
  const now = Date.now();
  const baseTitle = source.title.trim() || 'Untitled document';
  const copy: LoreDocument = {
    ...source,
    id: generateId(),
    title: `${baseTitle} (copy)`,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.documents.add(copy);
  return copy;
}

export async function toggleDocumentFavorite(id: string): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  await db.documents.update(id, {
    isFavorite: !doc.isFavorite,
    updatedAt: Date.now(),
  });
}

export async function toggleDocumentArchive(id: string): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  await db.documents.update(id, {
    isArchived: !doc.isArchived,
    updatedAt: Date.now(),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await db.transaction('rw', db.documents, db.revisions, async () => {
    await db.revisions.where('documentId').equals(id).delete();
    await db.documents.delete(id);
  });
}

export async function createGame(input: {
  title: string;
  platform: string;
  genre: string;
  developer: string;
  releaseYear?: string;
  notes?: string;
  coverDataUrl?: string | null;
  coverAccent: string;
}): Promise<Game> {
  const now = Date.now();
  const game: Game = {
    id: generateId(),
    title: input.title.trim(),
    platform: input.platform.trim() || 'PC',
    genre: input.genre.trim() || 'RPG',
    developer: input.developer.trim(),
    releaseYear: input.releaseYear?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    coverDataUrl: input.coverDataUrl ?? null,
    coverAccent: input.coverAccent || '#5B6EF5',
    createdAt: now,
    updatedAt: now,
  };
  await db.games.add(game);
  return game;
}

export async function updateGame(
  id: string,
  patch: Partial<Omit<Game, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.games.update(id, {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function deleteGame(id: string): Promise<void> {
  await db.transaction('rw', db.games, db.documents, db.gameSessions, async () => {
    await db.documents.where('gameId').equals(id).modify({ gameId: null });
    await db.gameSessions.where('gameId').equals(id).delete();
    await db.games.delete(id);
  });
}

export async function createGameSession(input: {
  gameId: string;
  title: string;
  notes: string;
  playedAt: number;
  spoilerLevel: GameSession['spoilerLevel'];
}): Promise<GameSession> {
  const now = Date.now();
  const session: GameSession = {
    id: generateId(),
    gameId: input.gameId,
    title: input.title.trim(),
    notes: input.notes.trim(),
    playedAt: input.playedAt,
    spoilerLevel: input.spoilerLevel,
    createdAt: now,
    updatedAt: now,
  };
  await db.gameSessions.add(session);
  return session;
}

export async function updateGameSession(
  id: string,
  patch: Partial<Pick<GameSession, 'title' | 'notes' | 'playedAt' | 'spoilerLevel'>>,
): Promise<void> {
  await db.gameSessions.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteGameSession(id: string): Promise<void> {
  await db.gameSessions.delete(id);
}

export async function createCollection(input: {
  name: string;
  description?: string;
  color: string;
}): Promise<Collection> {
  const now = Date.now();
  const collection: Collection = {
    id: generateId(),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    color: input.color || '#5B6EF5',
    createdAt: now,
    updatedAt: now,
  };
  await db.collections.add(collection);
  return collection;
}

export async function updateCollection(
  id: string,
  patch: Partial<Omit<Collection, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.collections.update(id, {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function deleteCollection(id: string): Promise<void> {
  await db.transaction('rw', db.collections, db.documents, async () => {
    await db.documents.where('collectionId').equals(id).modify({ collectionId: null });
    await db.collections.delete(id);
  });
}

export async function createRevisionSnapshot(
  documentId: string,
  options?: { force?: boolean },
): Promise<DocumentRevision | null> {
  const doc = await db.documents.get(documentId);
  if (!doc) return null;

  const existing = await db.revisions
    .where('documentId')
    .equals(documentId)
    .sortBy('createdAt');
  const latest = existing[existing.length - 1];

  if (
    !options?.force &&
    latest &&
    latest.title === doc.title &&
    latest.contentJson === doc.contentJson
  ) {
    return null;
  }

  const revision: DocumentRevision = {
    id: generateId(),
    documentId: doc.id,
    title: doc.title,
    contentJson: doc.contentJson,
    wordCount: doc.wordCount,
    createdAt: Date.now(),
  };

  await db.revisions.add(revision);

  // Cap stored revisions per document at 40 to keep IndexedDB lean
  if (existing.length >= 40) {
    const toRemove = existing.slice(0, existing.length - 39).map((r) => r.id);
    await db.revisions.bulkDelete(toRemove);
  }

  return revision;
}

export async function restoreDocumentRevision(
  documentId: string,
  revisionId: string,
): Promise<LoreDocument | null> {
  const revision = await db.revisions.get(revisionId);
  const current = await db.documents.get(documentId);
  if (!revision || !current || revision.documentId !== documentId) return null;

  // Save a safety snapshot of current state before restoring
  await createRevisionSnapshot(documentId);

  const plainText = extractPlainTextFromJson(revision.contentJson);
  const wordCount = countWords(plainText);
  const charCount = plainText.length;

  await db.documents.update(documentId, {
    title: revision.title,
    contentJson: revision.contentJson,
    plainText,
    wordCount,
    charCount,
    updatedAt: Date.now(),
  });

  return (await db.documents.get(documentId)) ?? null;
}

export async function deleteDocumentRevision(revisionId: string): Promise<void> {
  await db.revisions.delete(revisionId);
}

export async function buildWorkspaceBackup(): Promise<WorkspaceBackupPayload> {
  const [games, collections, documents, revisions, settings, gameSessions] = await Promise.all([
    db.games.toArray(),
    db.collections.toArray(),
    db.documents.toArray(),
    db.revisions.toArray(),
    db.settings.toArray(),
    db.gameSessions.toArray(),
  ]);

  return {
    app: 'LOREKEEP',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    data: {
      games,
      collections,
      documents,
      revisions,
      settings,
      gameSessions,
    },
  };
}

export async function importWorkspaceBackup(
  rawJson: string,
  mode: 'merge' | 'replace',
): Promise<{
  games: number;
  collections: number;
  documents: number;
  revisions: number;
  gameSessions: number;
}> {
  let parsed: Partial<WorkspaceBackupPayload>;
  try {
    parsed = JSON.parse(rawJson) as Partial<WorkspaceBackupPayload>;
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (parsed.app !== 'LOREKEEP' || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('This file is not a valid LOREKEEP backup.');
  }

  const games = Array.isArray(parsed.data.games) ? parsed.data.games : [];
  const collections = Array.isArray(parsed.data.collections) ? parsed.data.collections : [];
  const documents = Array.isArray(parsed.data.documents) ? parsed.data.documents : [];
  const revisions = Array.isArray(parsed.data.revisions) ? parsed.data.revisions : [];
  const settings = Array.isArray(parsed.data.settings) ? parsed.data.settings : [];
  const gameSessions = Array.isArray(parsed.data.gameSessions) ? parsed.data.gameSessions : [];

  await db.transaction(
    'rw',
    [db.games, db.collections, db.documents, db.revisions, db.settings, db.gameSessions],
    async () => {
      if (mode === 'replace') {
        await db.documents.clear();
        await db.games.clear();
        await db.collections.clear();
        await db.revisions.clear();
        await db.gameSessions.clear();
      }
      if (games.length) await db.games.bulkPut(games);
      if (collections.length) await db.collections.bulkPut(collections);
      if (documents.length) await db.documents.bulkPut(documents);
      if (revisions.length) await db.revisions.bulkPut(revisions);
      if (settings.length) await db.settings.bulkPut(settings);
      if (gameSessions.length) await db.gameSessions.bulkPut(gameSessions);
    },
  );

  return {
    games: games.length,
    collections: collections.length,
    documents: documents.length,
    revisions: revisions.length,
    gameSessions: gameSessions.length,
  };
}

export async function clearAllWorkspaceData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.documents, db.games, db.collections, db.revisions, db.gameSessions],
    async () => {
      await db.documents.clear();
      await db.games.clear();
      await db.collections.clear();
      await db.revisions.clear();
      await db.gameSessions.clear();
    },
  );
}
