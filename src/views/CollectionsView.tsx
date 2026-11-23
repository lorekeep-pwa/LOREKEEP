import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  FolderKanban,
  Hash,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  ACCENT_SWATCHES,
  type Collection,
  type Game,
  type LoreDocument,
} from '../types/models';
import { DocumentRow } from '../components/DocumentRow';

interface CollectionsViewProps {
  collections: Collection[];
  documents: LoreDocument[];
  games: Game[];
  selectedCollectionId: string | null;
  selectedTag: string | null;
  initialOpenForm?: boolean;
  onClearInitialForm?: () => void;
  onSelectCollection: (collectionId: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onCreateCollection: (input: { name: string; description: string; color: string }) => Promise<void>;
  onUpdateCollection: (
    id: string,
    patch: { name: string; description: string; color: string },
  ) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onCreateDocument: (opts?: { collectionId?: string | null; tags?: string[] }) => void;
  onOpenDocument: (id: string) => void;
  onRenameDocument: (id: string, title: string) => void;
  onDuplicateDocument: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDeleteDocument: (id: string) => void;
}

export function CollectionsView({
  collections,
  documents,
  games,
  selectedCollectionId,
  selectedTag,
  initialOpenForm = false,
  onClearInitialForm,
  onSelectCollection,
  onSelectTag,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  onCreateDocument,
  onOpenDocument,
  onRenameDocument,
  onDuplicateDocument,
  onToggleFavorite,
  onToggleArchive,
  onDeleteDocument,
}: CollectionsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(ACCENT_SWATCHES[0].hex);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialOpenForm) {
      setEditingId(null);
      setName('');
      setDescription('');
      setColor(ACCENT_SWATCHES[0].hex);
      setShowForm(true);
      onClearInitialForm?.();
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [initialOpenForm, onClearInitialForm]);

  const activeDocs = useMemo(
    () => documents.filter((d) => !d.isArchived).sort((a, b) => b.updatedAt - a.updatedAt),
    [documents],
  );

  const gameById = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);
  const collectionById = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections],
  );

  const docCountByCollection = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of activeDocs) {
      if (d.collectionId) map.set(d.collectionId, (map.get(d.collectionId) ?? 0) + 1);
    }
    return map;
  }, [activeDocs]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of activeDocs) {
      for (const tag of d.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [activeDocs]);

  const filteredDocs = useMemo(() => {
    return activeDocs.filter((d) => {
      if (selectedCollectionId && d.collectionId !== selectedCollectionId) return false;
      if (selectedTag && !d.tags.includes(selectedTag)) return false;
      return true;
    });
  }, [activeDocs, selectedCollectionId, selectedTag]);

  const openCreateForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setColor(ACCENT_SWATCHES[0].hex);
    setShowForm(true);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  };

  const openEditForm = (col: Collection) => {
    setEditingId(col.id);
    setName(col.name);
    setDescription(col.description);
    setColor(col.color);
    setShowForm(true);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      await onUpdateCollection(editingId, {
        name: name.trim(),
        description: description.trim(),
        color,
      });
    } else {
      await onCreateCollection({
        name: name.trim(),
        description: description.trim(),
        color,
      });
    }
    setShowForm(false);
    setEditingId(null);
    setName('');
    setDescription('');
  };

  const activeCollection = selectedCollectionId
    ? collectionById.get(selectedCollectionId) ?? null
    : null;

  return (
    <div className="lk-page">
      <div className="lk-page-header">
        <div>
          <h1 className="lk-page-title">Collections &amp; Tags</h1>
          <p className="lk-page-desc">
            Group sagas, campaigns, character dossiers, and thematic notes into custom collections and filter by tags.
          </p>
        </div>

        <div className="lk-header-actions">
          <button type="button" className="lk-btn lk-btn-primary" onClick={openCreateForm}>
            <Plus size={16} strokeWidth={2.3} />
            New collection
          </button>
        </div>
      </div>

      {/* Inline Creation / Editing Form */}
      {showForm && (
        <form
          className="lk-panel"
          style={{ marginBottom: 22 }}
          onSubmit={handleFormSubmit}
        >
          <div className="lk-panel-head">
            <h2 className="lk-panel-title">
              {editingId ? 'Edit collection' : 'Create new collection'}
            </h2>
            <button
              type="button"
              className="lk-icon-btn"
              onClick={() => setShowForm(false)}
              aria-label="Close collection form"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="lk-form-row">
              <div className="lk-field">
                <label className="lk-label" htmlFor="lk-col-name">
                  Collection name *
                </label>
                <input
                  ref={nameInputRef}
                  id="lk-col-name"
                  type="text"
                  className="lk-input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Soulslike Chronicles, Original Characters…"
                />
              </div>

              <div className="lk-field">
                <label className="lk-label" htmlFor="lk-col-desc">
                  Short description (optional)
                </label>
                <input
                  id="lk-col-desc"
                  type="text"
                  className="lk-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A quick note on what belongs in this collection…"
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <div className="lk-swatches" role="radiogroup" aria-label="Collection color">
                {ACCENT_SWATCHES.map((sw) => (
                  <button
                    key={sw.hex}
                    type="button"
                    role="radio"
                    aria-checked={color === sw.hex}
                    aria-label={sw.name}
                    className={`lk-swatch-btn ${color === sw.hex ? 'is-active' : ''}`}
                    style={{ backgroundColor: sw.hex }}
                    onClick={() => setColor(sw.hex)}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="lk-btn lk-btn-ghost lk-btn-sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lk-btn lk-btn-primary lk-btn-sm"
                  disabled={!name.trim()}
                >
                  <Check size={14} />
                  {editingId ? 'Save changes' : 'Create collection'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Collections Grid */}
      {collections.length > 0 ? (
        <div className="lk-collections-grid">
          {collections.map((col) => {
            const count = docCountByCollection.get(col.id) ?? 0;
            const isSelected = selectedCollectionId === col.id;
            return (
              <div
                key={col.id}
                className={`lk-collection-card ${isSelected ? 'is-selected' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      textAlign: 'left',
                    }}
                    onClick={() => onSelectCollection(isSelected ? null : col.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span
                        className="lk-color-dot"
                        style={{ background: col.color, width: 9, height: 9 }}
                        aria-hidden="true"
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink-primary)' }}>
                        {col.name}
                      </span>
                    </div>
                    {col.description && (
                      <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--ink-muted)', lineHeight: 1.45 }}>
                        {col.description}
                      </div>
                    )}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      type="button"
                      className="lk-icon-btn"
                      onClick={() => openEditForm(col)}
                      aria-label={`Edit collection ${col.name}`}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    {confirmDeleteId === col.id ? (
                      <button
                        type="button"
                        className="lk-btn lk-btn-danger lk-btn-sm"
                        onClick={() => {
                          onDeleteCollection(col.id);
                          if (isSelected) onSelectCollection(null);
                          setConfirmDeleteId(null);
                        }}
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="lk-icon-btn"
                        onClick={() => setConfirmDeleteId(col.id)}
                        aria-label={`Delete collection ${col.name}`}
                        title="Delete collection"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="tabular"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: 'var(--ink-muted)',
                  }}
                >
                  <span>
                    {count} {count === 1 ? 'document' : 'documents'}
                  </span>
                  {isSelected && <span style={{ color: '#b7c2ff', fontWeight: 600 }}>Active filter</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !showForm && (
          <div className="lk-panel" style={{ marginBottom: 22 }}>
            <div className="lk-empty">
              <div className="lk-empty-icon">
                <FolderKanban size={19} />
              </div>
              <h2 className="lk-empty-title">No collections yet</h2>
              <p className="lk-empty-copy">
                Collections let you group stories and notes across different video games — ideal for multi-game sagas, genres, or ongoing narrative projects.
              </p>
              <div className="lk-empty-actions">
                <button type="button" className="lk-btn lk-btn-secondary lk-btn-sm" onClick={openCreateForm}>
                  <Plus size={14} />
                  Create your first collection
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Tags Strip */}
      {allTags.length > 0 && (
        <div className="lk-filter-bar">
          <div className="lk-pills">
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginRight: 4 }}>
              Tags:
            </span>
            {allTags.map(([tag, count]) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  className={`lk-filter-pill ${active ? 'is-active' : ''}`}
                  onClick={() => onSelectTag(active ? null : tag)}
                >
                  <Hash size={12} aria-hidden="true" />
                  <span>{tag}</span>
                  <span className="tabular" style={{ opacity: 0.72, fontSize: '0.73rem' }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtered Documents Section */}
      <section className="lk-panel" aria-label="Filtered documents">
        <div className="lk-panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="lk-panel-title">
              {activeCollection
                ? `Collection: ${activeCollection.name}`
                : selectedTag
                  ? `Tag: #${selectedTag}`
                  : 'All active documents'}
            </h2>
            <span className="lk-count-pill">{filteredDocs.length}</span>
            {(selectedCollectionId || selectedTag) && (
              <button
                type="button"
                className="lk-btn lk-btn-ghost lk-btn-sm"
                onClick={() => {
                  onSelectCollection(null);
                  onSelectTag(null);
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <button
            type="button"
            className="lk-btn lk-btn-secondary lk-btn-sm"
            onClick={() =>
              onCreateDocument({
                collectionId: selectedCollectionId,
                tags: selectedTag ? [selectedTag] : [],
              })
            }
          >
            <Plus size={14} />
            New document here
          </button>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="lk-empty">
            <h3 className="lk-empty-title">No documents in this view</h3>
            <p className="lk-empty-copy">
              You can assign a collection and add tags to any document right from the Immersive Editor header.
            </p>
          </div>
        ) : (
          <div className="lk-doc-list">
            {filteredDocs.map((doc) => (
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
