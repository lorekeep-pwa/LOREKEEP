import { useMemo, useState } from 'react';
import { Archive, Search } from 'lucide-react';
import type { Collection, Game, LoreDocument } from '../types/models';
import { DocumentRow } from '../components/DocumentRow';
import { getDocumentDisplayTitle } from '../utils/format';

interface ArchiveViewProps {
  documents: LoreDocument[];
  games: Game[];
  collections: Collection[];
  onOpenDocument: (id: string) => void;
  onRenameDocument: (id: string, title: string) => void;
  onDuplicateDocument: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDeleteDocument: (id: string) => void;
}

export function ArchiveView({
  documents,
  games,
  collections,
  onOpenDocument,
  onRenameDocument,
  onDuplicateDocument,
  onToggleFavorite,
  onToggleArchive,
  onDeleteDocument,
}: ArchiveViewProps) {
  const [query, setQuery] = useState('');

  const gameById = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);
  const collectionById = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections],
  );

  const archivedDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((d) => {
        if (!d.isArchived) return false;
        if (!q) return true;
        return (
          getDocumentDisplayTitle(d.title).toLowerCase().includes(q) ||
          d.plainText.toLowerCase().includes(q) ||
          d.tags.some((t) => t.includes(q))
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [documents, query]);

  return (
    <div className="lk-page">
      <div className="lk-page-header">
        <div>
          <h1 className="lk-page-title">Archive</h1>
          <p className="lk-page-desc">
            Keep finished stories or older drafts safely tucked away without deleting them. Reopen or restore any document to the Hub at any time.
          </p>
        </div>

        {archivedDocs.length > 0 && (
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search archive…"
              aria-label="Search archived documents"
            />
          </div>
        )}
      </div>

      <section className="lk-panel">
        {archivedDocs.length === 0 ? (
          <div className="lk-empty lk-empty-centered">
            <div className="lk-empty-icon">
              <Archive size={20} />
            </div>
            <h2 className="lk-empty-title">
              {query.trim() ? 'No matching documents' : 'No archived documents'}
            </h2>
            <p className="lk-empty-copy">
              {query.trim()
                ? 'Try searching with a different keyword.'
                : 'When you archive a story or note, it leaves the active Hub while staying permanently readable and restorable here.'}
            </p>
          </div>
        ) : (
          <div className="lk-doc-list">
            {archivedDocs.map((doc) => (
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
      </section>
    </div>
  );
}
