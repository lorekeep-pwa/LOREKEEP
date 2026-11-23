import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ImagePlus,
  Info,
  Layers,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  ACCENT_SWATCHES,
  GAME_GENRES,
  GAME_PLATFORMS,
  type Game,
} from '../types/models';
import { compressCoverImage } from '../utils/format';
import {
  downloadCoverForOfflineStorage,
  getProxiedCoverUrl,
  mapExternalGenre,
  mapExternalPlatform,
  searchOfficialCovers,
  type CoverSearchResult,
  type CoverSource,
} from '../services/coverSearch';
import { GameCover } from './GameCover';
import { SelectField } from './SelectField';

export interface GameFormValues {
  title: string;
  platform: string;
  genre: string;
  developer: string;
  releaseYear: string;
  notes: string;
  coverDataUrl: string | null;
  coverAccent: string;
}

interface GameFormModalProps {
  isOpen: boolean;
  editingGame: Game | null;
  onClose: () => void;
  onSubmit: (values: GameFormValues) => Promise<void> | void;
}

export function GameFormModal({
  isOpen,
  editingGame,
  onClose,
  onSubmit,
}: GameFormModalProps) {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<string>(GAME_PLATFORMS[0]);
  const [genre, setGenre] = useState<string>(GAME_GENRES[0]);
  const [developer, setDeveloper] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [notes, setNotes] = useState('');
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const [coverAccent, setCoverAccent] = useState<string>(ACCENT_SWATCHES[0].hex);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Official Cover Search Mode
  const [mode, setMode] = useState<'form' | 'cover-search'>('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<CoverSource>('auto');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [activeSourceLabel, setActiveSourceLabel] = useState<'igdb' | 'steamgriddb' | null>(null);
  const [results, setResults] = useState<CoverSearchResult[]>([]);
  const [expandedAltResult, setExpandedAltResult] = useState<CoverSearchResult | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingGame) {
      setTitle(editingGame.title);
      setPlatform(editingGame.platform || GAME_PLATFORMS[0]);
      setGenre(editingGame.genre || GAME_GENRES[0]);
      setDeveloper(editingGame.developer);
      setReleaseYear(editingGame.releaseYear);
      setNotes(editingGame.notes);
      setCoverDataUrl(editingGame.coverDataUrl);
      setCoverAccent(editingGame.coverAccent || ACCENT_SWATCHES[0].hex);
    } else {
      setTitle('');
      setPlatform(GAME_PLATFORMS[0]);
      setGenre(GAME_GENRES[0]);
      setDeveloper('');
      setReleaseYear('');
      setNotes('');
      setCoverDataUrl(null);
      setCoverAccent(ACCENT_SWATCHES[0].hex);
    }
    setUploadError(null);
    setSubmitting(false);
    setMode('form');
    setSearchQuery('');
    setSearchSource('auto');
    setSearchError(null);
    setSearchNotice(null);
    setResults([]);
    setExpandedAltResult(null);
    setDownloadingId(null);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  }, [isOpen, editingGame]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'cover-search') {
          if (expandedAltResult) {
            setExpandedAltResult(null);
          } else {
            setMode('form');
          }
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, mode, expandedAltResult, onClose]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (!isOpen) return null;

  const runCoverSearch = async (queryText: string, source: CoverSource) => {
    const trimmed = queryText.trim();
    if (trimmed.length < 2) {
      setSearchError('Enter at least 2 characters to search official covers.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setSearchError(null);
    setSearchNotice(null);
    setExpandedAltResult(null);

    try {
      const response = await searchOfficialCovers(trimmed, source, controller.signal);
      setResults(response.results);
      setActiveSourceLabel(response.activeSource);
      setSearchNotice(response.notice);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setSearchError(
        err instanceof Error ? err.message : 'Unable to reach cover search right now.',
      );
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const openCoverSearch = () => {
    const initial = title.trim();
    setMode('cover-search');
    setSearchQuery(initial);
    setExpandedAltResult(null);
    setSearchError(null);
    requestAnimationFrame(() => searchInputRef.current?.focus());
    if (initial.length >= 2) {
      void runCoverSearch(initial, searchSource);
    }
  };

  const handleSelectCover = async (
    result: CoverSearchResult,
    overrideCoverUrl?: string,
  ) => {
    const targetUrl = overrideCoverUrl || result.coverUrl;
    const downloadKey = overrideCoverUrl ? `${result.id}-${overrideCoverUrl}` : result.id;
    setDownloadingId(downloadKey);
    setSearchError(null);

    try {
      const localDataUrl = await downloadCoverForOfflineStorage(targetUrl);
      setCoverDataUrl(localDataUrl);

      // Gently populate empty fields without overwriting anything the user already typed
      if (!title.trim() && result.title) {
        setTitle(result.title);
      }
      if (!developer.trim() && result.developer) {
        setDeveloper(result.developer);
      }
      if (!releaseYear.trim() && result.releaseYear) {
        setReleaseYear(result.releaseYear);
      }
      if (!editingGame) {
        const mappedPlatform = mapExternalPlatform(result.platforms);
        if (mappedPlatform && platform === GAME_PLATFORMS[0]) {
          setPlatform(mappedPlatform);
        }
        const mappedGenre = mapExternalGenre(result.genre);
        if (mappedGenre && genre === GAME_GENRES[0]) {
          setGenre(mappedGenre);
        }
      }

      setMode('form');
      setExpandedAltResult(null);
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : 'Could not save this cover offline. Try another result or upload from your PC.',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, or WebP).');
      return;
    }
    try {
      const processed = await compressCoverImage(file);
      setCoverDataUrl(processed);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to load cover image.',
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        platform,
        genre,
        developer: developer.trim(),
        releaseYear: releaseYear.trim(),
        notes: notes.trim(),
        coverDataUrl,
        coverAccent,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="lk-overlay lk-overlay-centered"
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === 'cover-search'
          ? 'Find official game cover'
          : editingGame
            ? 'Edit game profile'
            : 'Add game'
      }
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lk-dialog" style={{ maxWidth: mode === 'cover-search' ? 760 : 660 }}>
        <div className="lk-dialog-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {mode === 'cover-search' && (
              <button
                type="button"
                className="lk-icon-btn"
                onClick={() => {
                  if (expandedAltResult) {
                    setExpandedAltResult(null);
                  } else {
                    setMode('form');
                  }
                }}
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="lk-dialog-title">
              {mode === 'cover-search'
                ? expandedAltResult
                  ? `Artworks — ${expandedAltResult.title}`
                  : 'Find official cover'
                : editingGame
                  ? 'Edit game'
                  : 'Add game'}
            </h2>
          </div>

          <button
            type="button"
            className="lk-icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={17} />
          </button>
        </div>

        {mode === 'cover-search' ? (
          <>
            <div className="lk-dialog-body" style={{ gap: 14 }}>
              {!expandedAltResult ? (
                <>
                  <form
                    className="lk-cover-picker-bar"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void runCoverSearch(searchQuery, searchSource);
                    }}
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="lk-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search any PC, PlayStation, Xbox, or Nintendo title…"
                      aria-label="Search game title for official covers"
                    />
                    <button
                      type="submit"
                      className="lk-btn lk-btn-primary"
                      disabled={isSearching || searchQuery.trim().length < 2}
                    >
                      {isSearching ? (
                        <Loader2 size={15} className="lk-spin" aria-hidden="true" />
                      ) : (
                        <Search size={15} aria-hidden="true" />
                      )}
                      Search
                    </button>
                  </form>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div className="lk-segmented" role="group" aria-label="Cover source">
                      {(
                        [
                          { id: 'auto', label: 'Auto (IGDB → SteamGridDB)' },
                          { id: 'igdb', label: 'IGDB' },
                          { id: 'steamgriddb', label: 'SteamGridDB' },
                        ] as Array<{ id: CoverSource; label: string }>
                      ).map((src) => (
                        <button
                          key={src.id}
                          type="button"
                          className={`lk-segmented-btn ${searchSource === src.id ? 'is-active' : ''}`}
                          onClick={() => {
                            setSearchSource(src.id);
                            if (searchQuery.trim().length >= 2) {
                              void runCoverSearch(searchQuery, src.id);
                            }
                          }}
                        >
                          {src.label}
                        </button>
                      ))}
                    </div>

                    {activeSourceLabel && results.length > 0 && (
                      <span style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
                        Showing {results.length}{' '}
                        {results.length === 1 ? 'result' : 'results'} from{' '}
                        <strong style={{ color: 'var(--ink-secondary)' }}>
                          {activeSourceLabel === 'igdb' ? 'IGDB' : 'SteamGridDB'}
                        </strong>
                      </span>
                    )}
                  </div>

                  {searchNotice && (
                    <div className="lk-cover-notice" role="status">
                      <Info size={14} color="var(--accent)" style={{ flexShrink: 0 }} aria-hidden="true" />
                      <span>{searchNotice}</span>
                    </div>
                  )}

                  {searchError && (
                    <div
                      className="lk-cover-notice"
                      style={{ borderColor: 'rgba(226, 87, 87, 0.35)', color: '#f38b8b' }}
                      role="alert"
                    >
                      <span>{searchError}</span>
                    </div>
                  )}

                  {isSearching ? (
                    <div
                      style={{
                        padding: '44px 16px',
                        textAlign: 'center',
                        color: 'var(--ink-muted)',
                        fontSize: '0.88rem',
                      }}
                    >
                      Searching official multiplatform covers…
                    </div>
                  ) : results.length === 0 ? (
                    <div
                      style={{
                        padding: '38px 16px',
                        textAlign: 'center',
                        color: 'var(--ink-muted)',
                        fontSize: '0.86rem',
                        lineHeight: 1.55,
                      }}
                    >
                      {searchQuery.trim().length >= 2
                        ? 'No covers found for this title. Try another spelling, switch source, or upload a cover from your PC.'
                        : 'Type a game title above to browse official covers and pick the exact edition you want. Selected covers are saved locally for offline use.'}
                    </div>
                  ) : (
                    <div className="lk-cover-results-grid">
                      {results.map((item) => {
                        const isDownloading = downloadingId === item.id;
                        const hasAlts = (item.alternateCovers?.length ?? 0) > 1;
                        return (
                          <div key={item.id} className="lk-cover-result-card">
                            <button
                              type="button"
                              disabled={Boolean(downloadingId)}
                              onClick={() => void handleSelectCover(item)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: 0,
                                textAlign: 'left',
                                width: '100%',
                              }}
                            >
                              <div className="lk-cover-result-thumb">
                                <img
                                  src={getProxiedCoverUrl(item.thumbUrl)}
                                  alt={item.title}
                                  loading="lazy"
                                />
                                {(item.releaseYear || item.editionLabel) && (
                                  <span className="lk-cover-result-badge tabular">
                                    {[item.releaseYear, item.editionLabel]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                )}
                                {isDownloading && (
                                  <div className="lk-cover-result-loading">
                                    <span>Saving offline…</span>
                                  </div>
                                )}
                              </div>
                              <div className="lk-cover-result-info">
                                <div className="lk-cover-result-title">{item.title}</div>
                                <div className="lk-cover-result-meta">
                                  {item.platforms.length > 0
                                    ? item.platforms.slice(0, 3).join(', ')
                                    : item.source === 'igdb'
                                      ? 'IGDB Official'
                                      : 'SteamGridDB'}
                                </div>
                              </div>
                            </button>

                            {hasAlts && (
                              <div style={{ padding: '0 8px 8px' }}>
                                <button
                                  type="button"
                                  className="lk-btn lk-btn-ghost lk-btn-sm"
                                  style={{ width: '100%', height: 26, fontSize: '0.73rem' }}
                                  disabled={Boolean(downloadingId)}
                                  onClick={() => setExpandedAltResult(item)}
                                >
                                  <Layers size={12} />
                                  More artworks ({item.alternateCovers!.length})
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
                    Pick an alternative portrait cover for{' '}
                    <strong style={{ color: 'var(--ink-primary)' }}>
                      {expandedAltResult.title}
                    </strong>
                    . It will be saved locally for offline use.
                  </div>

                  <div className="lk-alt-strip">
                    {expandedAltResult.alternateCovers?.map((alt) => {
                      const key = `${expandedAltResult.id}-${alt.coverUrl}`;
                      const isDownloading = downloadingId === key;
                      return (
                        <button
                          key={alt.id}
                          type="button"
                          className="lk-cover-result-card"
                          disabled={Boolean(downloadingId)}
                          onClick={() => void handleSelectCover(expandedAltResult, alt.coverUrl)}
                        >
                          <div className="lk-cover-result-thumb">
                            <img
                              src={getProxiedCoverUrl(alt.thumbUrl)}
                              alt={`${expandedAltResult.title} artwork`}
                              loading="lazy"
                            />
                            {isDownloading && (
                              <div className="lk-cover-result-loading">
                                <span>Saving offline…</span>
                              </div>
                            )}
                          </div>
                          <div className="lk-cover-result-info">
                            <div className="lk-cover-result-meta" style={{ textTransform: 'capitalize' }}>
                              {alt.style.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="lk-dialog-foot" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.77rem', color: 'var(--ink-muted)' }}>
                Selected covers are compressed &amp; saved locally in IndexedDB.
              </span>
              <button
                type="button"
                className="lk-btn lk-btn-secondary"
                onClick={() => {
                  setExpandedAltResult(null);
                  setMode('form');
                }}
              >
                Back to details
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="lk-dialog-body">
              <div
                className="lk-game-modal-grid"
                style={{ display: 'grid', gridTemplateColumns: '148px minmax(0, 1fr)', gap: 20 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <GameCover
                      game={{
                        title: title || 'New Game',
                        platform,
                        coverDataUrl,
                        coverAccent,
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="lk-btn lk-btn-primary lk-btn-sm"
                    onClick={openCoverSearch}
                  >
                    <Search size={13} />
                    Find cover
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />

                  <button
                    type="button"
                    className="lk-btn lk-btn-secondary lk-btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={13} />
                    {coverDataUrl ? 'Replace from PC' : 'Upload from PC'}
                  </button>

                  {coverDataUrl && (
                    <button
                      type="button"
                      className="lk-btn lk-btn-ghost lk-btn-sm"
                      onClick={() => setCoverDataUrl(null)}
                    >
                      <Trash2 size={13} />
                      Remove image
                    </button>
                  )}

                  {uploadError && (
                    <div style={{ fontSize: '0.76rem', color: '#f38b8b', lineHeight: 1.4 }}>
                      {uploadError}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div className="lk-field">
                    <label className="lk-label" htmlFor="lk-game-title">
                      Game title *
                    </label>
                    <input
                      ref={titleInputRef}
                      id="lk-game-title"
                      type="text"
                      className="lk-input"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Elden Ring, Alan Wake 2, Tears of the Kingdom…"
                    />
                  </div>

                  <div className="lk-form-row">
                    <div className="lk-field">
                      <label className="lk-label" htmlFor="lk-game-platform">
                        Platform
                      </label>
                      <SelectField
                        id="lk-game-platform"
                        ariaLabel="Platform"
                        value={platform}
                        options={GAME_PLATFORMS.map((p) => ({ value: p, label: p }))}
                        onChange={setPlatform}
                      />
                    </div>

                    <div className="lk-field">
                      <label className="lk-label" htmlFor="lk-game-genre">
                        Genre
                      </label>
                      <SelectField
                        id="lk-game-genre"
                        ariaLabel="Genre"
                        value={genre}
                        options={GAME_GENRES.map((g) => ({ value: g, label: g }))}
                        onChange={setGenre}
                      />
                    </div>
                  </div>

                  <div className="lk-form-row">
                    <div className="lk-field">
                      <label className="lk-label" htmlFor="lk-game-dev">
                        Developer
                      </label>
                      <input
                        id="lk-game-dev"
                        type="text"
                        className="lk-input"
                        value={developer}
                        onChange={(e) => setDeveloper(e.target.value)}
                        placeholder="e.g. Remedy Entertainment"
                      />
                    </div>

                    <div className="lk-field">
                      <label className="lk-label" htmlFor="lk-game-year">
                        Release year
                      </label>
                      <input
                        id="lk-game-year"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        className="lk-input tabular"
                        value={releaseYear}
                        onChange={(e) => setReleaseYear(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="e.g. 2024"
                      />
                    </div>
                  </div>

                  <div className="lk-field">
                    <span className="lk-label">Cover &amp; profile accent</span>
                    <div className="lk-swatches" role="radiogroup" aria-label="Cover accent color">
                      {ACCENT_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          role="radio"
                          aria-checked={coverAccent === sw.hex}
                          aria-label={sw.name}
                          title={sw.name}
                          className={`lk-swatch-btn ${coverAccent === sw.hex ? 'is-active' : ''}`}
                          style={{ backgroundColor: sw.hex }}
                          onClick={() => setCoverAccent(sw.hex)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="lk-field">
                    <label className="lk-label" htmlFor="lk-game-notes">
                      World notes (optional)
                    </label>
                    <textarea
                      id="lk-game-notes"
                      className="lk-textarea"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Setting, narrative tone, or general notes about your playthrough or saga…"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lk-dialog-foot">
              <button type="button" className="lk-btn lk-btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="lk-btn lk-btn-primary"
                disabled={!title.trim() || submitting}
              >
                {editingGame ? 'Save changes' : 'Save game'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
