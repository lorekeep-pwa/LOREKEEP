import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  Gamepad2,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { Collection, Game, LoreDocument } from '../types/models';
import {
  formatRelativeDate,
  getDocumentDisplayTitle,
  getDocumentExcerpt,
} from '../utils/format';

interface DocumentRowProps {
  doc: LoreDocument;
  game?: Game;
  collection?: Collection;
  onOpen: (id: string) => void;
  onRename: (id: string, nextTitle: string) => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DocumentRow({
  doc,
  game,
  collection,
  onOpen,
  onRename,
  onDuplicate,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
}: DocumentRowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(doc.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setDraftTitle(doc.title);
      requestAnimationFrame(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      });
    }
  }, [isRenaming, doc.title]);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = window.setTimeout(() => setConfirmDelete(false), 3800);
    return () => window.clearTimeout(timer);
  }, [confirmDelete]);

  const commitRename = () => {
    onRename(doc.id, draftTitle.trim());
    setIsRenaming(false);
  };

  return (
    <div className="lk-doc-row">
      {isRenaming ? (
        <form
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            commitRename();
          }}
        >
          <input
            ref={renameInputRef}
            type="text"
            className="lk-input"
            style={{ height: 34 }}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsRenaming(false);
              }
            }}
            placeholder="Document title…"
            aria-label="New document title"
          />
          <button type="submit" className="lk-icon-btn is-active" aria-label="Save title">
            <Check size={15} />
          </button>
          <button
            type="button"
            className="lk-icon-btn"
            onClick={() => setIsRenaming(false)}
            aria-label="Cancel rename"
          >
            <X size={15} />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="lk-doc-row-main"
          onClick={() => onOpen(doc.id)}
        >
          <div className="lk-doc-row-top">
            {doc.isFavorite && (
              <Star
                size={13}
                fill="var(--state-favorite)"
                color="var(--state-favorite)"
                style={{ flexShrink: 0 }}
                aria-label="Favorite"
              />
            )}
            <span
              className="lk-doc-row-title"
              style={!doc.title.trim() ? { color: 'var(--ink-muted)', fontStyle: 'italic' } : undefined}
            >
              {getDocumentDisplayTitle(doc.title)}
            </span>
          </div>

          <div className="lk-doc-row-excerpt">{getDocumentExcerpt(doc.plainText)}</div>

          <div className="lk-doc-row-meta">
            {game && (
              <span className="lk-meta-chip">
                <Gamepad2 size={11} aria-hidden="true" />
                <span>{game.title}</span>
              </span>
            )}

            {collection && (
              <span className="lk-meta-chip">
                <span
                  className="lk-color-dot"
                  style={{ background: collection.color }}
                  aria-hidden="true"
                />
                <span>{collection.name}</span>
              </span>
            )}

            {doc.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="lk-tag-pill">
                #{tag}
              </span>
            ))}

            <span className="tabular">
              {doc.wordCount} {doc.wordCount === 1 ? 'word' : 'words'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular">{formatRelativeDate(doc.updatedAt)}</span>
          </div>
        </button>
      )}

      {!isRenaming && (
        <div className="lk-doc-row-actions">
          <button
            type="button"
            className="lk-icon-btn"
            onClick={() => onToggleFavorite(doc.id)}
            title={doc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={doc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              size={15}
              fill={doc.isFavorite ? 'var(--state-favorite)' : 'none'}
              color={doc.isFavorite ? 'var(--state-favorite)' : 'currentColor'}
            />
          </button>

          <button
            type="button"
            className="lk-icon-btn"
            onClick={() => setIsRenaming(true)}
            title="Rename"
            aria-label="Rename document"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            className="lk-icon-btn"
            onClick={() => onDuplicate(doc.id)}
            title="Duplicate"
            aria-label="Duplicate document"
          >
            <Copy size={15} />
          </button>

          <button
            type="button"
            className="lk-icon-btn"
            onClick={() => onToggleArchive(doc.id)}
            title={doc.isArchived ? 'Restore from archive' : 'Archive'}
            aria-label={doc.isArchived ? 'Restore from archive' : 'Archive document'}
          >
            {doc.isArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          </button>

          {confirmDelete ? (
            <button
              type="button"
              className="lk-btn lk-btn-danger lk-btn-sm"
              onClick={() => onDelete(doc.id)}
            >
              Delete
            </button>
          ) : (
            <button
              type="button"
              className="lk-icon-btn"
              onClick={() => setConfirmDelete(true)}
              title="Delete"
              aria-label="Delete document"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
