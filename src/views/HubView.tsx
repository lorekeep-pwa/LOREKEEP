import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Feather,
  HardDrive,
  FolderKanban,
  Gamepad2,
  Github,
  Hash,
  ExternalLink,
  Plus,
  Star,
} from 'lucide-react';
import type { Collection, Game, LoreDocument } from '../types/models';
import { DocumentRow } from '../components/DocumentRow';
import { GameCover } from '../components/GameCover';

interface HubViewProps {
  documents: LoreDocument[];
  games: Game[];
  collections: Collection[];
  backupReminderDue: boolean;
  onOpenBackupCenter: () => void;
  onCreateDocument: () => void;
  onOpenDocument: (id: string) => void;
  onRenameDocument: (id: string, title: string) => void;
  onDuplicateDocument: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onOpenNewGameModal: () => void;
  onOpenGame: (gameId: string) => void;
  onOpenAllGames: () => void;
  onOpenCollections: (collectionId?: string, tag?: string) => void;
}

export function HubView({
  documents,
  games,
  collections,
  backupReminderDue,
  onOpenBackupCenter,
  onCreateDocument,
  onOpenDocument,
  onRenameDocument,
  onDuplicateDocument,
  onToggleFavorite,
  onToggleArchive,
  onDeleteDocument,
  onOpenNewGameModal,
  onOpenGame,
  onOpenAllGames,
  onOpenCollections,
}: HubViewProps) {
  const [docFilter, setDocFilter] = useState<'all' | 'favorites'>('all');

  const activeDocs = useMemo(
    () => documents.filter((d) => !d.isArchived).sort((a, b) => b.updatedAt - a.updatedAt),
    [documents],
  );

  const favoriteDocs = useMemo(
    () => activeDocs.filter((d) => d.isFavorite),
    [activeDocs],
  );

  const visibleDocs = docFilter === 'favorites' ? favoriteDocs : activeDocs;

  const gameById = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);
  const collectionById = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections],
  );

  const docCountByGame = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of activeDocs) {
      if (d.gameId) map.set(d.gameId, (map.get(d.gameId) ?? 0) + 1);
    }
    return map;
  }, [activeDocs]);

  const allTagsCount = useMemo(() => {
    const unique = new Set<string>();
    for (const d of activeDocs) {
      for (const tag of d.tags) unique.add(tag);
    }
    return unique.size;
  }, [activeDocs]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of activeDocs) {
      for (const tag of d.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [activeDocs]);

  return (
    <div className="lk-page">
      <div className="lk-page-header">
        <div>
          <h1 className="lk-page-title">Hub Workspace</h1>
          <p className="lk-page-desc">
            Write stories, chronicles, and lore notes dedicated to your PC and console games. Everything stays saved locally on your device, accessible even offline.
          </p>
        </div>

        <div className="lk-header-actions">
          <button type="button" className="lk-btn lk-btn-primary" onClick={onCreateDocument}>
            <Plus size={16} strokeWidth={2.3} />
            New document
          </button>
          <button type="button" className="lk-btn lk-btn-secondary" onClick={onOpenNewGameModal}>
            <Gamepad2 size={16} strokeWidth={2} />
            Add game
          </button>
          <a
            className="lk-hub-repo-link"
            href="https://github.com/lorekeep-pwa/LOREKEEP"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open LOREKEEP on GitHub in a new tab"
          >
            <span className="lk-hub-repo-mark" aria-hidden="true">
              <Github size={18} strokeWidth={1.8} />
            </span>
            <span className="lk-hub-repo-copy">
              <strong>GitHub</strong>
              <span>lorekeep-pwa/LOREKEEP</span>
            </span>
            <ExternalLink className="lk-hub-repo-external" size={13} aria-hidden="true" />
          </a>
        </div>
      </div>

      {backupReminderDue && (
        <section className="lk-backup-reminder" aria-label="Backup reminder" role="status">
          <HardDrive size={17} aria-hidden="true" />
          <div className="lk-backup-reminder-copy">
            <strong>Your monthly backup is due</strong>
            <span>Download a fresh copy of your archive, including stories, covers, revisions, and session notes.</span>
          </div>
          <button type="button" className="lk-btn lk-btn-secondary lk-btn-sm" onClick={onOpenBackupCenter}>
            Open backup center
            <ArrowRight size={14} />
          </button>
        </section>
      )}

      <div className="lk-hub-grid">
        {/* Left Main Stage: Documents & Favorites */}
        <section className="lk-panel" aria-label="Recent and favorite documents">
          <div className="lk-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="lk-panel-title">
                <Feather size={15} color="var(--accent)" aria-hidden="true" />
                Recent writing
              </h2>
              <span className="lk-count-pill">{activeDocs.length}</span>
            </div>

            {activeDocs.length > 0 && (
              <div className="lk-segmented" role="tablist" aria-label="Filter documents">
                <button
                  type="button"
                  role="tab"
                  aria-selected={docFilter === 'all'}
                  className={`lk-segmented-btn ${docFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setDocFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={docFilter === 'favorites'}
                  className={`lk-segmented-btn ${docFilter === 'favorites' ? 'is-active' : ''}`}
                  onClick={() => setDocFilter('favorites')}
                >
                  Favorites ({favoriteDocs.length})
                </button>
              </div>
            )}
          </div>

          {activeDocs.length === 0 ? (
            <div className="lk-empty">
              <div className="lk-empty-icon">
                <Feather size={19} />
              </div>
              <h3 className="lk-empty-title">Your archive is ready</h3>
              <p className="lk-empty-copy">
                Open a clean sheet in the Immersive Editor with rich formatting, silent local autosave, no forced autocorrect, and fullscreen Focus Mode.
              </p>
              <div className="lk-empty-actions">
                <button type="button" className="lk-btn lk-btn-secondary lk-btn-sm" onClick={onCreateDocument}>
                  Open Immersive Editor
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : visibleDocs.length === 0 ? (
            <div className="lk-empty">
              <div className="lk-empty-icon">
                <Star size={19} />
              </div>
              <h3 className="lk-empty-title">No favorites yet</h3>
              <p className="lk-empty-copy">
                Star the stories or lore notes you revisit most often to pin them here.
              </p>
              <div className="lk-empty-actions">
                <button
                  type="button"
                  className="lk-btn lk-btn-secondary lk-btn-sm"
                  onClick={() => setDocFilter('all')}
                >
                  Show all documents
                </button>
              </div>
            </div>
          ) : (
            <div className="lk-doc-list">
              {visibleDocs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  game={doc.gameId ? gameById.get(doc.gameId) : undefined}
                  collection={doc.collectionId ? collectionById.get(doc.collectionId) : undefined}
                  onOpen={onOpenDocument}
                  onRename={onRenameDocument}
                  onDuplicate={onDuplicateDocument}
                  onToggleFavorite={onToggleFavorite}
                  onToggleArchive={onToggleArchive}
                  onDelete={onDeleteDocument}
                />
              ))}
            </div>
          )}

          <div className="lk-shortcuts-strip">
            <span className="lk-shortcut-hint">
              <kbd className="lk-kbd">Ctrl K</kbd>
              Command Palette
            </span>
            <span className="lk-shortcut-hint">
              <kbd className="lk-kbd">Alt N</kbd>
              New document
            </span>
            <span className="lk-shortcut-hint">
              <kbd className="lk-kbd">Alt F</kbd>
              Focus Mode in editor
            </span>
          </div>
        </section>

        {/* Right Column: Games Shelf & Collections/Tags */}
        <div className="lk-hub-stack">
          <section className="lk-panel" aria-label="Games library">
            <div className="lk-panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 className="lk-panel-title">
                  <Gamepad2 size={15} color="var(--accent)" aria-hidden="true" />
                  Games
                </h2>
                <span className="lk-count-pill">{games.length}</span>
              </div>

              {games.length > 0 && (
                <button
                  type="button"
                  className="lk-btn lk-btn-ghost lk-btn-sm"
                  onClick={onOpenAllGames}
                >
                  View all
                  <ArrowRight size={14} />
                </button>
              )}
            </div>

            {games.length === 0 ? (
              <div className="lk-empty" style={{ padding: '16px 4px 8px' }}>
                <h3 className="lk-empty-title">No games added yet</h3>
                <p className="lk-empty-copy">
                  Manually create a profile for each video game with a custom cover, platform, genre, developer, and linked stories.
                </p>
              </div>
            ) : (
              <div className="lk-hub-games-mini">
                {games.slice(0, 4).map((game) => {
                  const count = docCountByGame.get(game.id) ?? 0;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      className="lk-game-card"
                      onClick={() => onOpenGame(game.id)}
                    >
                      <GameCover game={game} />
                      <div className="lk-game-card-body">
                        <div className="lk-game-card-title">{game.title}</div>
                        <div className="lk-game-card-sub">
                          {game.genre} · {count} {count === 1 ? 'story' : 'stories'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="lk-panel" aria-label="Collections and Tags">
            <div className="lk-panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 className="lk-panel-title">
                  <FolderKanban size={15} color="var(--accent)" aria-hidden="true" />
                  Collections &amp; Tags
                </h2>
                <span className="lk-count-pill">{collections.length + allTagsCount}</span>
              </div>

              <button
                type="button"
                className="lk-btn lk-btn-ghost lk-btn-sm"
                onClick={() => onOpenCollections()}
              >
                Manage
                <ArrowRight size={14} />
              </button>
            </div>

            {collections.length === 0 && topTags.length === 0 ? (
              <p className="lk-empty-copy" style={{ fontSize: '0.84rem' }}>
                Organize campaigns, sagas, and thematic notes into custom collections or freeform tags directly from the editor.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {collections.length > 0 && (
                  <div className="lk-pills">
                    {collections.slice(0, 6).map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        className="lk-filter-pill"
                        onClick={() => onOpenCollections(col.id)}
                      >
                        <span
                          className="lk-color-dot"
                          style={{ background: col.color }}
                          aria-hidden="true"
                        />
                        <span>{col.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {topTags.length > 0 && (
                  <div className="lk-pills">
                    {topTags.map(([tag, count]) => (
                      <button
                        key={tag}
                        type="button"
                        className="lk-filter-pill"
                        onClick={() => onOpenCollections(undefined, tag)}
                      >
                        <Hash size={12} aria-hidden="true" />
                        <span>{tag}</span>
                        <span className="tabular" style={{ color: 'var(--ink-muted)', fontSize: '0.74rem' }}>
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
