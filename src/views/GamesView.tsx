import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Feather,
  Gamepad2,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { Collection, Game, LoreDocument } from '../types/models';
import { DocumentRow } from '../components/DocumentRow';
import { GameCover } from '../components/GameCover';

interface GamesViewProps {
  games: Game[];
  documents: LoreDocument[];
  collections: Collection[];
  selectedGameId: string | null;
  onSelectGame: (gameId: string | null) => void;
  onOpenNewGameModal: () => void;
  onEditGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
  onCreateDocumentForGame: (gameId: string) => void;
  onOpenDocument: (docId: string) => void;
  onRenameDocument: (docId: string, title: string) => void;
  onDuplicateDocument: (docId: string) => void;
  onToggleFavorite: (docId: string) => void;
  onToggleArchive: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
}

export function GamesView({
  games,
  documents,
  collections,
  selectedGameId,
  onSelectGame,
  onOpenNewGameModal,
  onEditGame,
  onDeleteGame,
  onCreateDocumentForGame,
  onOpenDocument,
  onRenameDocument,
  onDuplicateDocument,
  onToggleFavorite,
  onToggleArchive,
  onDeleteDocument,
}: GamesViewProps) {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [confirmDeleteGame, setConfirmDeleteGame] = useState(false);

  const selectedGame = useMemo(
    () => (selectedGameId ? games.find((g) => g.id === selectedGameId) ?? null : null),
    [games, selectedGameId],
  );

  const collectionById = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections],
  );

  useEffect(() => {
    setConfirmDeleteGame(false);
  }, [selectedGameId]);

  const docCountByGame = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of documents) {
      if (!d.isArchived && d.gameId) {
        counts.set(d.gameId, (counts.get(d.gameId) ?? 0) + 1);
      }
    }
    return counts;
  }, [documents]);

  const platformsPresent = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) set.add(g.platform);
    return Array.from(set);
  }, [games]);

  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    return games.filter((g) => {
      if (platformFilter !== 'all' && g.platform !== platformFilter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q) ||
        g.developer.toLowerCase().includes(q) ||
        g.platform.toLowerCase().includes(q)
      );
    });
  }, [games, search, platformFilter]);

  // Detail View for a single Game
  if (selectedGame) {
    const linkedDocs = documents
      .filter((d) => d.gameId === selectedGame.id && !d.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return (
      <div className="lk-page">
        <div style={{ marginBottom: 18 }}>
          <button
            type="button"
            className="lk-btn lk-btn-ghost lk-btn-sm"
            onClick={() => onSelectGame(null)}
            style={{ paddingLeft: 6 }}
          >
            <ArrowLeft size={15} />
            All games
          </button>
        </div>

        <section
          className="lk-game-hero"
          style={{
            background: `linear-gradient(125deg, ${selectedGame.coverAccent}18 0%, var(--bg-surface) 44%)`,
          }}
        >
          <div className="lk-game-hero-cover">
            <GameCover game={selectedGame} showPlatformBadge={false} />
          </div>

          <div className="lk-game-hero-meta">
            <div>
              <h1 className="lk-page-title">{selectedGame.title}</h1>

              <div className="lk-game-specs">
                <span className="lk-spec-pill">
                  <Gamepad2 size={13} aria-hidden="true" />
                  {selectedGame.platform}
                </span>
                <span className="lk-spec-pill">
                  <Layers size={13} aria-hidden="true" />
                  {selectedGame.genre}
                </span>
                {selectedGame.developer && (
                  <span className="lk-spec-pill">
                    <Building2 size={13} aria-hidden="true" />
                    {selectedGame.developer}
                  </span>
                )}
                {selectedGame.releaseYear && (
                  <span className="lk-spec-pill tabular">
                    <Calendar size={13} aria-hidden="true" />
                    {selectedGame.releaseYear}
                  </span>
                )}
              </div>

              {selectedGame.notes && (
                <p
                  style={{
                    margin: '16px 0 0',
                    fontSize: '0.92rem',
                    color: 'var(--ink-secondary)',
                    lineHeight: 1.6,
                    maxWidth: '64ch',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedGame.notes}
                </p>
              )}
            </div>

            <div className="lk-header-actions">
              <button
                type="button"
                className="lk-btn lk-btn-primary"
                onClick={() => onCreateDocumentForGame(selectedGame.id)}
              >
                <Plus size={15} strokeWidth={2.3} />
                New story for this game
              </button>

              <button
                type="button"
                className="lk-btn lk-btn-secondary"
                onClick={() => onEditGame(selectedGame)}
              >
                <Pencil size={14} />
                Edit profile
              </button>

              {confirmDeleteGame ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="lk-btn lk-btn-danger"
                    onClick={() => {
                      onDeleteGame(selectedGame.id);
                      onSelectGame(null);
                    }}
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    className="lk-btn lk-btn-ghost lk-btn-sm"
                    onClick={() => setConfirmDeleteGame(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="lk-btn lk-btn-ghost"
                  onClick={() => setConfirmDeleteGame(true)}
                  title="Delete game profile (linked stories remain untouched)"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="lk-panel" aria-label="Linked stories and notes">
          <div className="lk-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="lk-panel-title">
                <Feather size={15} color="var(--accent)" aria-hidden="true" />
                Linked stories &amp; notes
              </h2>
              <span className="lk-count-pill">{linkedDocs.length}</span>
            </div>
          </div>

          {linkedDocs.length === 0 ? (
            <div className="lk-empty">
              <h3 className="lk-empty-title">No documents linked to {selectedGame.title}</h3>
              <p className="lk-empty-copy">
                Write your first story, playthrough journal, or lore breakdown connected to this title.
              </p>
              <div className="lk-empty-actions">
                <button
                  type="button"
                  className="lk-btn lk-btn-primary lk-btn-sm"
                  onClick={() => onCreateDocumentForGame(selectedGame.id)}
                >
                  <Plus size={14} />
                  Write first story
                </button>
              </div>
            </div>
          ) : (
            <div className="lk-doc-list">
              {linkedDocs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
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
        </section>
      </div>
    );
  }

  // Library Overview Grid
  return (
    <div className="lk-page">
      <div className="lk-page-header">
        <div>
          <h1 className="lk-page-title">Games Library</h1>
          <p className="lk-page-desc">
            Add your PC and console titles manually with custom cover art, metadata, and all associated stories.
          </p>
        </div>

        <div className="lk-header-actions">
          <button type="button" className="lk-btn lk-btn-primary" onClick={onOpenNewGameModal}>
            <Plus size={16} strokeWidth={2.3} />
            Add game
          </button>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="lk-panel">
          <div className="lk-empty lk-empty-centered">
            <div className="lk-empty-icon">
              <Gamepad2 size={20} />
            </div>
            <h2 className="lk-empty-title">Your games library is empty</h2>
            <p className="lk-empty-copy">
              Zero reliance on external APIs: curate your own profiles with title, local cover artwork, platform, genre, and developer.
            </p>
            <div className="lk-empty-actions">
              <button type="button" className="lk-btn lk-btn-primary" onClick={onOpenNewGameModal}>
                <Plus size={16} strokeWidth={2.3} />
                Add your first game
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="lk-filter-bar">
            <div className="lk-pills">
              <button
                type="button"
                className={`lk-filter-pill ${platformFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setPlatformFilter('all')}
              >
                All ({games.length})
              </button>
              {platformsPresent.map((plat) => (
                <button
                  key={plat}
                  type="button"
                  className={`lk-filter-pill ${platformFilter === plat ? 'is-active' : ''}`}
                  onClick={() => setPlatformFilter(plat)}
                >
                  {plat}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-muted)',
                  pointerEvents: 'none',
                }}
                aria-hidden="true"
              />
              <input
                type="text"
                className="lk-input"
                style={{ height: 34, paddingLeft: 32 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter games…"
                aria-label="Filter games"
              />
            </div>
          </div>

          {filteredGames.length === 0 ? (
            <div className="lk-panel">
              <div className="lk-empty lk-empty-centered">
                <h2 className="lk-empty-title">No matching games</h2>
                <p className="lk-empty-copy">Try clearing your search or choosing another platform.</p>
              </div>
            </div>
          ) : (
            <div className="lk-games-grid">
              {filteredGames.map((game) => {
                const count = docCountByGame.get(game.id) ?? 0;
                return (
                  <button
                    key={game.id}
                    type="button"
                    className="lk-game-card"
                    onClick={() => onSelectGame(game.id)}
                  >
                    <GameCover game={game} />
                    <div className="lk-game-card-body">
                      <div className="lk-game-card-title">{game.title}</div>
                      <div className="lk-game-card-sub">
                        {[game.genre, game.developer].filter(Boolean).join(' · ')}
                      </div>
                      <div className="lk-game-card-foot tabular">
                        <span>
                          {count} {count === 1 ? 'document' : 'documents'}
                        </span>
                        {game.releaseYear && (
                          <span style={{ color: 'var(--ink-muted)' }}>{game.releaseYear}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
