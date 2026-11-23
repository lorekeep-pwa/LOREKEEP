import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookmarkPlus, History, RotateCcw, Trash2, X } from 'lucide-react';
import { db } from '../db/database';
import { extractPlainTextFromJson } from '../utils/export';
import {
  formatExactDateTime,
  formatRelativeDate,
  getDocumentDisplayTitle,
} from '../utils/format';

interface RevisionHistoryModalProps {
  isOpen: boolean;
  documentId: string;
  documentTitle: string;
  onClose: () => void;
  onSaveSnapshotNow: () => Promise<void>;
  onRestoreRevision: (revisionId: string) => Promise<void>;
  onDeleteRevision: (revisionId: string) => Promise<void>;
}

export function RevisionHistoryModal({
  isOpen,
  documentId,
  documentTitle,
  onClose,
  onSaveSnapshotNow,
  onRestoreRevision,
  onDeleteRevision,
}: RevisionHistoryModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const revisions = useLiveQuery(
    async () => {
      if (!isOpen || !documentId) return [];
      const rows = await db.revisions
        .where('documentId')
        .equals(documentId)
        .sortBy('createdAt');
      return rows.reverse();
    },
    [isOpen, documentId],
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (revisions.length === 0) {
      setSelectedId(null);
    } else if (!selectedId || !revisions.some((r) => r.id === selectedId)) {
      setSelectedId(revisions[0].id);
    }
  }, [isOpen, revisions, selectedId]);

  const selectedRevision = useMemo(
    () => revisions.find((r) => r.id === selectedId) ?? null,
    [revisions, selectedId],
  );

  const previewText = useMemo(
    () => (selectedRevision ? extractPlainTextFromJson(selectedRevision.contentJson) : ''),
    [selectedRevision],
  );

  if (!isOpen) return null;

  return (
    <div
      className="lk-overlay lk-overlay-centered"
      role="dialog"
      aria-modal="true"
      aria-label="Revision History"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lk-dialog" style={{ maxWidth: 780 }}>
        <div className="lk-dialog-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <History size={16} color="var(--accent)" aria-hidden="true" />
            <h2 className="lk-dialog-title">
              Revision History — {getDocumentDisplayTitle(documentTitle)}
            </h2>
          </div>

          <button
            type="button"
            className="lk-icon-btn"
            onClick={onClose}
            aria-label="Close revision history"
          >
            <X size={17} />
          </button>
        </div>

        <div className="lk-dialog-body" style={{ gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
              Snapshots are saved locally in IndexedDB. Restoring automatically saves a snapshot of your current draft first.
            </span>
            <button
              type="button"
              className="lk-btn lk-btn-secondary lk-btn-sm"
              onClick={() => void onSaveSnapshotNow()}
            >
              <BookmarkPlus size={14} />
              Save snapshot now
            </button>
          </div>

          {revisions.length === 0 ? (
            <div className="lk-empty lk-empty-centered" style={{ padding: '40px 20px' }}>
              <div className="lk-empty-icon">
                <History size={19} />
              </div>
              <h3 className="lk-empty-title">No snapshots recorded yet</h3>
              <p className="lk-empty-copy">
                LOREKEEP captures local snapshots automatically as you write, or you can save a manual checkpoint anytime.
              </p>
            </div>
          ) : (
            <div className="lk-history-grid">
              <div className="lk-history-list" role="listbox" aria-label="Saved snapshots">
                {revisions.map((rev) => {
                  const active = rev.id === selectedRevision?.id;
                  return (
                    <div
                      key={rev.id}
                      className={`lk-history-item ${active ? 'is-active' : ''}`}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className="lk-history-item-btn"
                        onClick={() => setSelectedId(rev.id)}
                      >
                        <div className="lk-history-item-time">
                          {formatRelativeDate(rev.createdAt)}
                        </div>
                        <div className="lk-history-item-meta tabular">
                          {formatExactDateTime(rev.createdAt)} · {rev.wordCount}{' '}
                          {rev.wordCount === 1 ? 'word' : 'words'}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="lk-icon-btn"
                        style={{ width: 28, height: 28 }}
                        title="Delete snapshot"
                        aria-label="Delete snapshot"
                        onClick={() => void onDeleteRevision(rev.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="lk-history-preview">
                {selectedRevision && (
                  <>
                    <div className="lk-history-preview-head">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.94rem', color: 'var(--ink-primary)' }}>
                          {getDocumentDisplayTitle(selectedRevision.title)}
                        </div>
                        <div className="tabular" style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
                          {formatExactDateTime(selectedRevision.createdAt)} ·{' '}
                          {selectedRevision.wordCount}{' '}
                          {selectedRevision.wordCount === 1 ? 'word' : 'words'}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="lk-btn lk-btn-primary lk-btn-sm"
                        disabled={restoring}
                        onClick={async () => {
                          setRestoring(true);
                          try {
                            await onRestoreRevision(selectedRevision.id);
                            onClose();
                          } finally {
                            setRestoring(false);
                          }
                        }}
                      >
                        <RotateCcw size={13} />
                        Restore version
                      </button>
                    </div>

                    <div className="lk-history-preview-body">
                      {previewText || (
                        <span style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                          Empty document snapshot.
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lk-dialog-foot">
          <button type="button" className="lk-btn lk-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
