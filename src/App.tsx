import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2 } from 'lucide-react';
import {
  buildWorkspaceBackup,
  clearAllWorkspaceData,
  createCollection,
  createDocument,
  createGame,
  createGameSession,
  createRevisionSnapshot,
  db,
  deleteCollection,
  deleteDocument,
  deleteDocumentRevision,
  deleteGame,
  deleteGameSession,
  duplicateDocument,
  ensureSettings,
  importWorkspaceBackup,
  restoreDocumentRevision,
  toggleDocumentArchive,
  toggleDocumentFavorite,
  updateCollection,
  updateDocument,
  updateGame,
  updateGameSession,
  updateSettings,
} from './db/database';
import { downloadWorkspaceBackupJson } from './utils/export';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type Game,
  type NavSection,
} from './types/models';
import { TopBar } from './components/TopBar';
import { SiteTooltipLayer } from './components/SiteTooltipLayer';
import { FloatingDock } from './components/FloatingDock';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { GameFormModal, type GameFormValues } from './components/GameFormModal';
import { HubView } from './views/HubView';
import { EditorView } from './views/EditorView';
import { GamesView } from './views/GamesView';
import { CollectionsView } from './views/CollectionsView';
import { ArchiveView } from './views/ArchiveView';
import { getDocumentDisplayTitle } from './utils/format';

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('hub');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const previousSectionRef = useRef<NavSection>('hub');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [openCollectionFormOnVisit, setOpenCollectionFormOnVisit] = useState(false);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTypingCalm, setIsTypingCalm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const typingCalmResetRef = useRef<number | null>(null);

  // Live IndexedDB Queries via Dexie
  const documents = useLiveQuery(
    () => db.documents.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  );
  const games = useLiveQuery(
    () => db.games.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  );
  const collections = useLiveQuery(
    () => db.collections.orderBy('name').toArray(),
    [],
    [],
  );
  const gameSessions = useLiveQuery(
    () => db.gameSessions.orderBy('playedAt').reverse().toArray(),
    [],
    [],
  );
  const settings = useLiveQuery(
    () => db.settings.get('user-settings'),
    [],
    DEFAULT_SETTINGS,
  );

  const resolvedSettings: AppSettings = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };

  useEffect(() => {
    const theme = resolvedSettings.theme === 'paper' ? 'paper' : 'slate';
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'paper' ? '#f4f2ec' : '#14151a',
    );
    document.querySelector('meta[name="color-scheme"]')?.setAttribute(
      'content',
      theme === 'paper' ? 'light' : 'dark',
    );
  }, [resolvedSettings.theme]);
  const backupReminderDue = useMemo(() => {
    const interval = resolvedSettings.backupReminderInterval ?? 'monthly';
    if (interval === 'never' || (documents.length === 0 && games.length === 0 && collections.length === 0)) {
      return false;
    }
    if (resolvedSettings.lastBackupAt == null) return true;
    const due = new Date(resolvedSettings.lastBackupAt);
    if (interval === 'monthly') due.setMonth(due.getMonth() + 1);
    else due.setDate(due.getDate() + 7);
    return Date.now() >= due.getTime();
  }, [resolvedSettings.backupReminderInterval, resolvedSettings.lastBackupAt, documents.length, games.length, collections.length]);

  useEffect(() => {
    void ensureSettings();
  }, []);

  useEffect(() => {
    if (activeSection !== 'editor') previousSectionRef.current = activeSection;
  }, [activeSection]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  const activeDoc = useMemo(
    () => (activeDocId ? documents.find((d) => d.id === activeDocId) ?? null : null),
    [documents, activeDocId],
  );

  const activeRecentDocs = useMemo(
    () => documents.filter((d) => !d.isArchived),
    [documents],
  );

  // Adaptive chrome dimming during active writing; restores on pointer movement
  const handleTypingActivity = useCallback(() => {
    if (!resolvedSettings.autoHideChromeWhileTyping) return;
    setIsTypingCalm(true);
    if (typingCalmResetRef.current !== null) {
      window.clearTimeout(typingCalmResetRef.current);
    }
  }, [resolvedSettings.autoHideChromeWhileTyping]);

  useEffect(() => {
    if (!isTypingCalm) return;
    const wakeChrome = () => setIsTypingCalm(false);
    window.addEventListener('pointermove', wakeChrome, { passive: true });
    return () => window.removeEventListener('pointermove', wakeChrome);
  }, [isTypingCalm]);

  useEffect(() => {
    if (activeSection !== 'editor') {
      setIsTypingCalm(false);
    }
  }, [activeSection]);

  // Fullscreen Focus Mode sync with Browser Fullscreen API
  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => {
      const next = !prev;
      if (next) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {
            // In-app focus overlay works seamlessly even if browser blocks fullscreen
          });
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [isFocusMode]);

  // Document Actions
  const handleCreateDocument = useCallback(
    async (opts?: { gameId?: string | null; collectionId?: string | null; tags?: string[] }) => {
      const doc = await createDocument(opts);
      setActiveDocId(doc.id);
      setActiveSection('editor');
    },
    [],
  );

  const handleOpenDocument = useCallback((docId: string) => {
    setActiveDocId(docId);
    setActiveSection('editor');
  }, []);

  const handleNavigateSection = useCallback(
    (section: NavSection) => {
      if (section === 'editor' && activeSection !== 'editor') {
        setActiveDocId(null);
      }
      setActiveSection(section);
    },
    [activeSection],
  );

  const handleRenameDocument = useCallback(
    async (docId: string, nextTitle: string) => {
      await updateDocument(docId, { title: nextTitle });
      showToast('Document renamed');
    },
    [showToast],
  );

  const handleDuplicateDocument = useCallback(
    async (docId: string) => {
      const copy = await duplicateDocument(docId);
      if (copy) {
        showToast('Document duplicated');
      }
    },
    [showToast],
  );

  const handleToggleFavorite = useCallback(async (docId: string) => {
    await toggleDocumentFavorite(docId);
  }, []);

  const handleToggleArchive = useCallback(
    async (docId: string) => {
      const doc = documents.find((d) => d.id === docId);
      await toggleDocumentArchive(docId);
      if (doc) {
        showToast(doc.isArchived ? 'Document restored to Hub' : 'Document moved to Archive');
      }
    },
    [documents, showToast],
  );

  const handleDeleteDocument = useCallback(
    async (docId: string) => {
      await deleteDocument(docId);
      if (activeDocId === docId) {
        setActiveDocId(null);
      }
      showToast('Document deleted');
    },
    [activeDocId, showToast],
  );

  // Game Actions
  const openNewGameModal = useCallback(() => {
    setEditingGame(null);
    setIsGameModalOpen(true);
  }, []);

  const openEditGameModal = useCallback((game: Game) => {
    setEditingGame(game);
    setIsGameModalOpen(true);
  }, []);

  const handleSubmitGame = useCallback(
    async (values: GameFormValues) => {
      if (editingGame) {
        await updateGame(editingGame.id, values);
        showToast('Game profile updated');
      } else {
        const created = await createGame(values);
        setSelectedGameId(created.id);
        setActiveSection('games');
        showToast('Game added to library');
      }
    },
    [editingGame, showToast],
  );

  const handleDeleteGame = useCallback(
    async (gameId: string) => {
      await deleteGame(gameId);
      showToast('Game profile deleted (stories preserved)');
    },
    [showToast],
  );

  // Collection Actions
  const handleCreateCollection = useCallback(
    async (input: { name: string; description: string; color: string }) => {
      await createCollection(input);
      showToast('Collection created');
    },
    [showToast],
  );

  const handleUpdateCollection = useCallback(
    async (id: string, patch: { name: string; description: string; color: string }) => {
      await updateCollection(id, patch);
      showToast('Collection updated');
    },
    [showToast],
  );

  const handleDeleteCollection = useCallback(
    async (id: string) => {
      await deleteCollection(id);
      showToast('Collection deleted');
    },
    [showToast],
  );

  // Global Keyboard Shortcuts (Ctrl+K, Alt+N, Alt+F, Escape for Focus Mode)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((open) => !open);
        return;
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey && key === 'n') {
        e.preventDefault();
        void handleCreateDocument();
        return;
      }

      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        key === 'f' &&
        activeSection === 'editor' &&
        activeDoc
      ) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      if (
        e.key === 'Escape' &&
        isFocusMode &&
        !isPaletteOpen &&
        !isSettingsOpen &&
        !isGameModalOpen
      ) {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeSection,
    activeDoc,
    isFocusMode,
    isPaletteOpen,
    isSettingsOpen,
    isGameModalOpen,
    handleCreateDocument,
    toggleFocusMode,
  ]);

  const contextLabel = useMemo(() => {
    if (activeSection === 'editor' && activeDoc) {
      return getDocumentDisplayTitle(activeDoc.title);
    }
    if (activeSection === 'games' && selectedGameId) {
      return games.find((g) => g.id === selectedGameId)?.title;
    }
    return undefined;
  }, [activeSection, activeDoc, selectedGameId, games]);

  const chromeReceded =
    activeSection === 'editor' &&
    Boolean(activeDoc) &&
    resolvedSettings.autoHideChromeWhileTyping &&
    isTypingCalm;

  return (
    <div className="lk-app">
      {!isFocusMode && (
        <TopBar
          activeSection={activeSection}
          contextLabel={contextLabel}
          isReceded={chromeReceded}
          onGoHome={() => setActiveSection('hub')}
          onBack={() => {
            setActiveDocId(null);
            setActiveSection(
              previousSectionRef.current === 'editor' ? 'hub' : previousSectionRef.current,
            );
          }}
          onOpenPalette={() => setIsPaletteOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      <main className="lk-main">
        {activeSection === 'hub' && (
          <HubView
            documents={documents}
            games={games}
            collections={collections}
            backupReminderDue={backupReminderDue}
            onOpenBackupCenter={() => setIsSettingsOpen(true)}
            onCreateDocument={() => void handleCreateDocument()}
            onOpenDocument={handleOpenDocument}
            onRenameDocument={(id, title) => void handleRenameDocument(id, title)}
            onDuplicateDocument={(id) => void handleDuplicateDocument(id)}
            onToggleFavorite={(id) => void handleToggleFavorite(id)}
            onToggleArchive={(id) => void handleToggleArchive(id)}
            onDeleteDocument={(id) => void handleDeleteDocument(id)}
            onOpenNewGameModal={openNewGameModal}
            onOpenGame={(gameId) => {
              setSelectedGameId(gameId);
              setActiveSection('games');
            }}
            onOpenAllGames={() => {
              setSelectedGameId(null);
              setActiveSection('games');
            }}
            onOpenCollections={(collectionId, tag) => {
              setSelectedCollectionId(collectionId ?? null);
              setSelectedTag(tag ?? null);
              setActiveSection('collections');
            }}
          />
        )}

        {activeSection === 'editor' && (
          <EditorView
            document={activeDoc}
            recentDocuments={activeRecentDocs}
            games={games}
            collections={collections}
            settings={resolvedSettings}
            isFocusMode={isFocusMode}
            isTypingCalm={isTypingCalm}
            onTypingActivity={handleTypingActivity}
            onToggleFocusMode={toggleFocusMode}
            onSaveContent={async (docId, payload) => {
              await updateDocument(docId, payload);
            }}
            onUpdateMeta={async (docId, patch) => {
              await updateDocument(docId, patch);
            }}
            onToggleFavorite={(id) => void handleToggleFavorite(id)}
            onToggleArchive={(id) => void handleToggleArchive(id)}
            onDuplicateDocument={(id) => void handleDuplicateDocument(id)}
            onCreateSnapshot={async (docId, force) => {
              const snap = await createRevisionSnapshot(docId, { force });
              if (force && snap) {
                showToast('Revision snapshot saved');
              }
            }}
            onRestoreRevision={async (docId, revisionId) => {
              const restored = await restoreDocumentRevision(docId, revisionId);
              if (restored) {
                showToast('Previous version restored');
              }
              return restored;
            }}
            onDeleteRevision={async (revisionId) => {
              await deleteDocumentRevision(revisionId);
            }}
            onExportNotice={(msg) => showToast(msg)}
            onCreateDocument={() => void handleCreateDocument()}
            onSelectDocument={handleOpenDocument}
          />
        )}

        {activeSection === 'games' && (
          <GamesView
            games={games}
            sessions={gameSessions}
            documents={documents}
            collections={collections}
            selectedGameId={selectedGameId}
            onSelectGame={setSelectedGameId}
            onOpenNewGameModal={openNewGameModal}
            onEditGame={openEditGameModal}
            onDeleteGame={(id) => void handleDeleteGame(id)}
            onCreateGameSession={async (session) => {
              await createGameSession(session);
              showToast('Session note saved');
            }}
            onUpdateGameSession={async (id, patch) => {
              await updateGameSession(id, patch);
              showToast('Session note updated');
            }}
            onDeleteGameSession={(id) => void deleteGameSession(id)}
            onCreateDocumentForGame={(gameId) => void handleCreateDocument({ gameId })}
            onOpenDocument={handleOpenDocument}
            onRenameDocument={(id, title) => void handleRenameDocument(id, title)}
            onDuplicateDocument={(id) => void handleDuplicateDocument(id)}
            onToggleFavorite={(id) => void handleToggleFavorite(id)}
            onToggleArchive={(id) => void handleToggleArchive(id)}
            onDeleteDocument={(id) => void handleDeleteDocument(id)}
          />
        )}

        {activeSection === 'collections' && (
          <CollectionsView
            collections={collections}
            documents={documents}
            games={games}
            selectedCollectionId={selectedCollectionId}
            selectedTag={selectedTag}
            initialOpenForm={openCollectionFormOnVisit}
            onClearInitialForm={() => setOpenCollectionFormOnVisit(false)}
            onSelectCollection={setSelectedCollectionId}
            onSelectTag={setSelectedTag}
            onCreateCollection={handleCreateCollection}
            onUpdateCollection={handleUpdateCollection}
            onDeleteCollection={handleDeleteCollection}
            onCreateDocument={(opts) => void handleCreateDocument(opts)}
            onOpenDocument={handleOpenDocument}
            onRenameDocument={(id, title) => void handleRenameDocument(id, title)}
            onDuplicateDocument={(id) => void handleDuplicateDocument(id)}
            onToggleFavorite={(id) => void handleToggleFavorite(id)}
            onToggleArchive={(id) => void handleToggleArchive(id)}
            onDeleteDocument={(id) => void handleDeleteDocument(id)}
          />
        )}

        {activeSection === 'archive' && (
          <ArchiveView
            documents={documents}
            games={games}
            collections={collections}
            onOpenDocument={handleOpenDocument}
            onRenameDocument={(id, title) => void handleRenameDocument(id, title)}
            onDuplicateDocument={(id) => void handleDuplicateDocument(id)}
            onToggleFavorite={(id) => void handleToggleFavorite(id)}
            onToggleArchive={(id) => void handleToggleArchive(id)}
            onDeleteDocument={(id) => void handleDeleteDocument(id)}
          />
        )}
      </main>

      {!isFocusMode && (
        <FloatingDock
          activeSection={activeSection}
          hasActiveDocument={Boolean(activeDoc)}
          isReceded={chromeReceded}
          onSelectSection={(section) => {
            if (section === 'games' && activeSection === 'games') {
              setSelectedGameId(null);
            }
            handleNavigateSection(section);
          }}
          onQuickNewDocument={() => void handleCreateDocument()}
        />
      )}

      <CommandPalette
        isOpen={isPaletteOpen}
        activeSection={activeSection}
        hasActiveDocument={Boolean(activeDoc)}
        documents={documents}
        games={games}
        collections={collections}
        onClose={() => setIsPaletteOpen(false)}
        onNavigate={handleNavigateSection}
        onOpenDocument={handleOpenDocument}
        onOpenGame={(gameId) => {
          setSelectedGameId(gameId);
          setActiveSection('games');
        }}
        onOpenCollection={(collectionId) => {
          setSelectedCollectionId(collectionId);
          setSelectedTag(null);
          setActiveSection('collections');
        }}
        onOpenTag={(tag) => {
          setSelectedTag(tag);
          setSelectedCollectionId(null);
          setActiveSection('collections');
        }}
        onNewDocument={() => void handleCreateDocument()}
        onNewGame={openNewGameModal}
        onNewCollection={() => {
          setOpenCollectionFormOnVisit(true);
          setActiveSection('collections');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleFocusMode={toggleFocusMode}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={resolvedSettings}
        counts={{
          documents: documents.length,
          games: games.length,
          collections: collections.length,
        }}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={(patch) => void updateSettings(patch)}
        onExportBackup={async () => {
          const backup = await buildWorkspaceBackup();
          downloadWorkspaceBackupJson(backup);
          await updateSettings({ lastBackupAt: Date.now() });
        }}
        onImportBackup={async (rawJson, mode) => {
          const stats = await importWorkspaceBackup(rawJson, mode);
          return `Imported ${stats.documents} docs, ${stats.games} games, ${stats.collections} collections, and ${stats.gameSessions} session notes.`;
        }}
        onClearAll={async () => {
          await clearAllWorkspaceData();
          setActiveDocId(null);
          setSelectedGameId(null);
          setSelectedCollectionId(null);
          setSelectedTag(null);
          setIsSettingsOpen(false);
          setActiveSection('hub');
          showToast('Local archive cleared');
        }}
      />

      <GameFormModal
        isOpen={isGameModalOpen}
        editingGame={editingGame}
        onClose={() => setIsGameModalOpen(false)}
        onSubmit={handleSubmitGame}
      />

      {toastMessage && !isFocusMode && (
        <div className="lk-toast" role="status" aria-live="polite">
          <CheckCircle2 size={15} color="var(--state-success)" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      <SiteTooltipLayer />
    </div>
  );
}

export default App;
