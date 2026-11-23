import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Compass,
  Feather,
  FileText,
  FolderKanban,
  Gamepad2,
  Hash,
  Maximize2,
  Plus,
  Search,
  Settings,
  Star,
} from 'lucide-react';
import type { Collection, Game, LoreDocument, NavSection } from '../types/models';
import { getDocumentDisplayTitle } from '../utils/format';

interface CommandPaletteProps {
  isOpen: boolean;
  activeSection: NavSection;
  hasActiveDocument: boolean;
  documents: LoreDocument[];
  games: Game[];
  collections: Collection[];
  onClose: () => void;
  onNavigate: (section: NavSection) => void;
  onOpenDocument: (docId: string) => void;
  onOpenGame: (gameId: string) => void;
  onOpenCollection: (collectionId: string) => void;
  onOpenTag: (tag: string) => void;
  onNewDocument: () => void;
  onNewGame: () => void;
  onNewCollection: () => void;
  onOpenSettings: () => void;
  onToggleFocusMode: () => void;
}

interface PaletteEntry {
  id: string;
  group: 'Quick Actions' | 'Documents' | 'Games' | 'Collections' | 'Tags' | 'Navigation';
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: typeof Search;
  accentColor?: string;
  isFavorite?: boolean;
  onRun: () => void;
}

export function CommandPalette({
  isOpen,
  activeSection,
  hasActiveDocument,
  documents,
  games,
  collections,
  onClose,
  onNavigate,
  onOpenDocument,
  onOpenGame,
  onOpenCollection,
  onOpenTag,
  onNewDocument,
  onNewGame,
  onNewCollection,
  onOpenSettings,
  onToggleFocusMode,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const gameById = useMemo(
    () => new Map(games.map((g) => [g.id, g])),
    [games],
  );

  const allTags = useMemo(() => {
    const tagCount = new Map<string, number>();
    for (const doc of documents) {
      for (const tag of doc.tags) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(tagCount.entries()).sort((a, b) => b[1] - a[1]);
  }, [documents]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteEntry[] = [];

    const actions: PaletteEntry[] = [
      {
        id: 'act-new-doc',
        group: 'Quick Actions',
        title: 'New document',
        subtitle: 'Open a clean sheet in the Immersive Editor',
        shortcut: 'Alt N',
        icon: Plus,
        onRun: onNewDocument,
      },
      {
        id: 'act-new-game',
        group: 'Quick Actions',
        title: 'Add game',
        subtitle: 'Create a manual game profile with cover and platform',
        icon: Gamepad2,
        onRun: onNewGame,
      },
      {
        id: 'act-new-collection',
        group: 'Quick Actions',
        title: 'New collection',
        subtitle: 'Group sagas, series, or narrative arcs',
        icon: FolderKanban,
        onRun: onNewCollection,
      },
      ...(activeSection === 'editor' && hasActiveDocument
        ? [
            {
              id: 'act-focus',
              group: 'Quick Actions' as const,
              title: 'Toggle fullscreen Focus Mode',
              subtitle: 'Hide the top bar and Floating Dock while writing',
              shortcut: 'Alt F',
              icon: Maximize2,
              onRun: onToggleFocusMode,
            },
          ]
        : []),
      {
        id: 'act-settings',
        group: 'Quick Actions',
        title: 'Open settings',
        subtitle: 'Editor typography, word count, and local storage',
        icon: Settings,
        onRun: onOpenSettings,
      },
    ];

    for (const item of actions) {
      if (
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.subtitle?.toLowerCase().includes(q) ?? false)
      ) {
        list.push(item);
      }
    }

    const matchedDocs = documents
      .filter((doc) => {
        if (!q) return !doc.isArchived;
        const title = getDocumentDisplayTitle(doc.title).toLowerCase();
        const body = doc.plainText.toLowerCase();
        const tagsStr = doc.tags.join(' ').toLowerCase();
        const linkedGame = doc.gameId ? gameById.get(doc.gameId)?.title.toLowerCase() ?? '' : '';
        return (
          title.includes(q) ||
          body.includes(q) ||
          tagsStr.includes(q) ||
          linkedGame.includes(q)
        );
      })
      .slice(0, q ? 12 : 5);

    for (const doc of matchedDocs) {
      const game = doc.gameId ? gameById.get(doc.gameId) : undefined;
      const parts: string[] = [];
      if (game) parts.push(game.title);
      if (doc.isArchived) parts.push('Archived');
      parts.push(`${doc.wordCount} ${doc.wordCount === 1 ? 'word' : 'words'}`);

      list.push({
        id: `doc-${doc.id}`,
        group: 'Documents',
        title: getDocumentDisplayTitle(doc.title),
        subtitle: parts.join(' · '),
        icon: FileText,
        isFavorite: doc.isFavorite,
        onRun: () => onOpenDocument(doc.id),
      });
    }

    const matchedGames = games
      .filter((game) => {
        if (!q) return true;
        return (
          game.title.toLowerCase().includes(q) ||
          game.platform.toLowerCase().includes(q) ||
          game.genre.toLowerCase().includes(q) ||
          game.developer.toLowerCase().includes(q)
        );
      })
      .slice(0, q ? 8 : 4);

    for (const game of matchedGames) {
      list.push({
        id: `game-${game.id}`,
        group: 'Games',
        title: game.title,
        subtitle: [game.platform, game.genre, game.developer].filter(Boolean).join(' · '),
        icon: Gamepad2,
        accentColor: game.coverAccent,
        onRun: () => onOpenGame(game.id),
      });
    }

    const matchedCollections = collections.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    );
    for (const col of matchedCollections.slice(0, 6)) {
      list.push({
        id: `col-${col.id}`,
        group: 'Collections',
        title: col.name,
        subtitle: col.description || 'Custom collection',
        icon: FolderKanban,
        accentColor: col.color,
        onRun: () => onOpenCollection(col.id),
      });
    }

    const matchedTags = allTags.filter(([tag]) => !q || tag.includes(q.replace(/^#/, '')));
    for (const [tag, count] of matchedTags.slice(0, 6)) {
      list.push({
        id: `tag-${tag}`,
        group: 'Tags',
        title: `#${tag}`,
        subtitle: `${count} ${count === 1 ? 'document' : 'documents'}`,
        icon: Hash,
        onRun: () => onOpenTag(tag),
      });
    }

    const navEntries: PaletteEntry[] = [
      { id: 'nav-hub', group: 'Navigation', title: 'Go to Hub Workspace', icon: Compass, onRun: () => onNavigate('hub') },
      { id: 'nav-editor', group: 'Navigation', title: 'Go to Immersive Editor', icon: Feather, onRun: () => onNavigate('editor') },
      { id: 'nav-games', group: 'Navigation', title: 'Go to Games Library', icon: Gamepad2, onRun: () => onNavigate('games') },
      { id: 'nav-collections', group: 'Navigation', title: 'Go to Collections & Tags', icon: FolderKanban, onRun: () => onNavigate('collections') },
      { id: 'nav-archive', group: 'Navigation', title: 'Go to Archive', icon: Archive, onRun: () => onNavigate('archive') },
    ];
    for (const nav of navEntries) {
      if (!q || nav.title.toLowerCase().includes(q)) {
        list.push(nav);
      }
    }

    return list;
  }, [
    query,
    documents,
    games,
    collections,
    allTags,
    gameById,
    activeSection,
    hasActiveDocument,
    onNewDocument,
    onNewGame,
    onNewCollection,
    onToggleFocusMode,
    onOpenSettings,
    onOpenDocument,
    onOpenGame,
    onOpenCollection,
    onOpenTag,
    onNavigate,
  ]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (entries.length ? (prev + 1) % entries.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          entries.length ? (prev - 1 + entries.length) % entries.length : 0,
        );
      } else if (e.key === 'Enter' && entries[selectedIndex]) {
        e.preventDefault();
        entries[selectedIndex].onRun();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, entries, selectedIndex, onClose]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('[data-selected="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  const grouped = new Map<PaletteEntry['group'], Array<{ entry: PaletteEntry; index: number }>>();
  entries.forEach((entry, index) => {
    const bucket = grouped.get(entry.group) ?? [];
    bucket.push({ entry, index });
    grouped.set(entry.group, bucket);
  });

  return (
    <div
      className="lk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="LOREKEEP Command Palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lk-palette">
        <div className="lk-palette-input-wrap">
          <Search size={17} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="lk-palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, games, collections, tags, or commands…"
            aria-label="Search Command Palette"
          />
          <kbd className="lk-kbd">Esc</kbd>
        </div>

        <div className="lk-palette-list" ref={listRef}>
          {entries.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.875rem' }}>
              No results for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            Array.from(grouped.entries()).map(([groupName, groupItems]) => (
              <div key={groupName}>
                <div className="lk-palette-group-label">{groupName}</div>
                {groupItems.map(({ entry, index }) => {
                  const Icon = entry.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      data-selected={isSelected}
                      className={`lk-palette-item ${isSelected ? 'is-selected' : ''}`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => {
                        entry.onRun();
                        onClose();
                      }}
                    >
                      <span className="lk-palette-item-left">
                        <Icon
                          size={15}
                          strokeWidth={1.9}
                          style={{
                            color: entry.accentColor ?? (isSelected ? 'var(--ink-primary)' : 'var(--ink-muted)'),
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        />
                        <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                          <span className="lk-palette-item-title">{entry.title}</span>
                          {entry.subtitle && (
                            <span className="lk-palette-item-sub">{entry.subtitle}</span>
                          )}
                        </span>
                      </span>

                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {entry.isFavorite && (
                          <Star
                            size={13}
                            fill="var(--state-favorite)"
                            color="var(--state-favorite)"
                            aria-label="Favorite"
                          />
                        )}
                        {entry.shortcut && <kbd className="lk-kbd">{entry.shortcut}</kbd>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="lk-palette-foot">
          <span>Use arrow keys to navigate, Enter to open</span>
          <span>100% local search</span>
        </div>
      </div>
    </div>
  );
}
