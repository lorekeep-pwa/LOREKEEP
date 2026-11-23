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
  CalendarDays,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import type { Collection, Game, GameSession, LoreDocument, SessionSpoilerLevel } from '../types/models';
import { DocumentRow } from '../components/DocumentRow';
import { GameCover } from '../components/GameCover';
import { SelectField } from '../components/SelectField';

function toDateInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromDateInputValue(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12).getTime();
}

interface GamesViewProps {
  games: Game[];
  sessions: GameSession[];
  documents: LoreDocument[];
  collections: Collection[];
  selectedGameId: string | null;
  onSelectGame: (gameId: string | null) => void;
  onOpenNewGameModal: () => void;
  onEditGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
  onCreateGameSession: (session: {
    gameId: string;
    title: string;
    notes: string;
    playedAt: number;
    spoilerLevel: SessionSpoilerLevel;
  }) => Promise<void>;
  onUpdateGameSession: (
    id: string,
    patch: Pick<GameSession, 'title' | 'notes' | 'playedAt' | 'spoilerLevel'>,
  ) => Promise<void>;
  onDeleteGameSession: (id: string) => void;
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
  sessions,
  documents,
  collections,
  selectedGameId,
  onSelectGame,
  onOpenNewGameModal,
  onEditGame,
  onDeleteGame,
  onCreateGameSession,
  onUpdateGameSession,
  onDeleteGameSession,
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
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionDate, setSessionDate] = useState(() => toDateInputValue(Date.now()));
  const [sessionSpoilerLevel, setSessionSpoilerLevel] = useState<SessionSpoilerLevel>('none');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [revealedSessionIds, setRevealedSessionIds] = useState<Set<string>>(() => new Set());
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);

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
    setSessionTitle('');
    setSessionNotes('');
    setSessionDate(toDateInputValue(Date.now()));
    setSessionSpoilerLevel('none');
    setEditingSessionId(null);
    setConfirmDeleteSessionId(null);
    setSessionError(null);
  }, [selectedGameId]);

  const linkedSessions = useMemo(
    () => sessions
      .filter((session) => session.gameId === selectedGameId)
      .sort((a, b) => b.playedAt - a.playedAt),
    [sessions, selectedGameId],
  );

  const resetSessionForm = () => {
    setSessionTitle('');
    setSessionNotes('');
    setSessionDate(toDateInputValue(Date.now()));
    setSessionSpoilerLevel('none');
    setEditingSessionId(null);
    setSessionError(null);
  };

  const beginEditSession = (session: GameSession) => {
    setEditingSessionId(session.id);
    setSessionTitle(session.title);
    setSessionNotes(session.notes);
    setSessionDate(toDateInputValue(session.playedAt));
    setSessionSpoilerLevel(session.spoilerLevel);
    setConfirmDeleteSessionId(null);
  };

  const saveSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGame || !sessionTitle.trim() || savingSession) return;
    setSavingSession(true);
    setSessionError(null);
    try {
      const session = {
        gameId: selectedGame.id,
        title: sessionTitle.trim(),
        notes: sessionNotes.trim(),
        playedAt: fromDateInputValue(sessionDate),
        spoilerLevel: sessionSpoilerLevel,
      };
      if (editingSessionId) {
        await onUpdateGameSession(editingSessionId, {
          title: session.title,
          notes: session.notes,
          playedAt: session.playedAt,
          spoilerLevel: session.spoilerLevel,
        });
      } else {
        await onCreateGameSession(session);
      }
      resetSessionForm();
    } catch {
      setSessionError('Could not save this session note. Please try again.');
    } finally {
      setSavingSession(false);
    }
  };

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

        <section className="lk-panel lk-session-panel" aria-label="Playthrough session journal">
          <div className="lk-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="lk-panel-title">
                <CalendarDays size={15} color="var(--accent)" aria-hidden="true" />
                Playthrough journal
              </h2>
              <span className="lk-count-pill">{linkedSessions.length}</span>
            </div>
          </div>

          <form className="lk-session-form" onSubmit={(event) => void saveSession(event)}>
            <div className="lk-form-row">
              <div className="lk-field">
                <label className="lk-label" htmlFor="lk-session-title">Session, mission, or chapter *</label>
                <input
                  id="lk-session-title"
                  className="lk-input"
                  value={sessionTitle}
                  onChange={(event) => setSessionTitle(event.target.value)}
                  placeholder="e.g. Chapter 4 — The Gilded Cage"
                  required
                />
              </div>
              <div className="lk-field">
                <label className="lk-label" htmlFor="lk-session-date">Played on</label>
                <input
                  id="lk-session-date"
                  className="lk-input tabular"
                  type="date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="lk-field">
              <label className="lk-label" htmlFor="lk-session-notes">What happened?</label>
              <textarea
                id="lk-session-notes"
                className="lk-textarea"
                rows={3}
                value={sessionNotes}
                onChange={(event) => setSessionNotes(event.target.value)}
                placeholder="Progress, choices, discoveries, or details to remember…"
              />
            </div>
            <div className="lk-session-form-footer">
              <div className="lk-field lk-session-spoiler-select">
                <label className="lk-label" htmlFor="lk-session-spoilers">Spoiler level</label>
                <SelectField
                  id="lk-session-spoilers"
                  ariaLabel="Session note spoiler level"
                  value={sessionSpoilerLevel}
                  options={[
                    { value: 'none', label: 'No spoilers' },
                    { value: 'minor', label: 'Minor spoilers' },
                    { value: 'major', label: 'Major spoilers' },
                  ]}
                  onChange={(value) => setSessionSpoilerLevel(value as SessionSpoilerLevel)}
                />
              </div>
              <div className="lk-session-form-actions">
                {editingSessionId && (
                  <button type="button" className="lk-btn lk-btn-ghost lk-btn-sm" onClick={resetSessionForm}>
                    Cancel edit
                  </button>
                )}
                <button type="submit" className="lk-btn lk-btn-primary lk-btn-sm" disabled={savingSession || !sessionTitle.trim()}>
                  <Plus size={14} />
                  {savingSession ? 'Saving…' : editingSessionId ? 'Save changes' : 'Add session note'}
                </button>
              </div>
            </div>
            {sessionError && <p className="lk-session-error" role="alert">{sessionError}</p>}
          </form>

          {linkedSessions.length > 0 ? (
            <div className="lk-session-list">
              {linkedSessions.map((session) => {
                const hasSpoilers = session.spoilerLevel !== 'none';
                const isRevealed = revealedSessionIds.has(session.id);
                return (
                  <article className="lk-session-item" key={session.id}>
                    <div className="lk-session-item-head">
                      <div>
                        <h3>{hasSpoilers && !isRevealed ? 'Spoiler protected session' : session.title}</h3>
                        <span className="lk-session-date tabular">
                          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(session.playedAt)}
                        </span>
                      </div>
                      <div className="lk-session-actions">
                        {hasSpoilers && (
                          <span className={`lk-session-spoiler-badge spoiler-${session.spoilerLevel}`}>
                            {session.spoilerLevel === 'major' ? 'Major spoilers' : 'Minor spoilers'}
                          </span>
                        )}
                        {confirmDeleteSessionId === session.id ? (
                          <>
                            <button type="button" className="lk-btn lk-btn-danger lk-btn-sm" onClick={() => {
                              onDeleteGameSession(session.id);
                              setConfirmDeleteSessionId(null);
                              if (editingSessionId === session.id) resetSessionForm();
                            }}>Delete</button>
                            <button type="button" className="lk-btn lk-btn-ghost lk-btn-sm" onClick={() => setConfirmDeleteSessionId(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="lk-btn lk-btn-ghost lk-btn-sm" onClick={() => beginEditSession(session)}>Edit</button>
                            <button type="button" className="lk-icon-btn" onClick={() => setConfirmDeleteSessionId(session.id)} aria-label={`Delete session note ${session.title}`} title="Delete session note"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </div>
                    {hasSpoilers && (
                      <button
                        type="button"
                        className="lk-session-reveal"
                        aria-expanded={isRevealed}
                        onClick={() => setRevealedSessionIds((current) => {
                          const next = new Set(current);
                          if (next.has(session.id)) next.delete(session.id);
                          else next.add(session.id);
                          return next;
                        })}
                      >
                        {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        {isRevealed ? 'Hide spoilers' : 'Reveal spoilers'}
                      </button>
                    )}
                    {session.notes && (!hasSpoilers || isRevealed) && (
                      <p className="lk-session-notes">{session.notes}</p>
                    )}
                    {!session.notes && <p className="lk-session-empty-notes">No session details were added.</p>}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="lk-session-empty">Your session notes will appear here, newest first.</p>
          )}
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
