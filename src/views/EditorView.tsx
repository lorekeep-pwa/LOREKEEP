import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import { Fragment, Slice, type ResolvedPos } from '@tiptap/pm/model';
import type { EditorView as ProseMirrorEditorView } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Archive,
  ArchiveRestore,
  Bold,
  Check,
  Code,
  Copy,
  ClipboardPaste,
  Download,
  Feather,
  FolderKanban,
  Gamepad2,
  Heading1,
  Heading2,
  Heading3,
  History,
  Italic,
  List,
  ListOrdered,
  ListTree,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Quote,
  Redo2,
  Scissors,
  Star,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from 'lucide-react';
import type { AppSettings, Collection, Game, LoreDocument } from '../types/models';
import {
  exportDocumentAsJson,
  exportDocumentAsMarkdown,
  exportDocumentAsPdf,
  exportDocumentAsTxt,
} from '../utils/export';
import { countWords, getDocumentDisplayTitle, normalizeTag } from '../utils/format';
import { SelectField } from '../components/SelectField';
import { RevisionHistoryModal } from '../components/RevisionHistoryModal';

function parsePlainTextClipboard(
  text: string,
  _context: ResolvedPos,
  _plain: boolean,
  view: ProseMirrorEditorView,
): Slice {
  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .map((block) =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);

  if (paragraphs.length === 0) return Slice.empty;

  const paragraphType = view.state.schema.nodes.paragraph;
  const nodes = paragraphs.flatMap((paragraph, index) => [
    ...(index > 0 ? [paragraphType.create()] : []),
    paragraphType.create(null, view.state.schema.text(paragraph)),
  ]);

  return new Slice(Fragment.fromArray(nodes), 0, 0);
}

interface EditorViewProps {
  document: LoreDocument | null;
  recentDocuments: LoreDocument[];
  games: Game[];
  collections: Collection[];
  settings: AppSettings;
  isFocusMode: boolean;
  isTypingCalm: boolean;
  onTypingActivity: () => void;
  onToggleFocusMode: () => void;
  onSaveContent: (
    docId: string,
    payload: {
      title: string;
      contentJson: string;
      plainText: string;
      wordCount: number;
      charCount: number;
    },
  ) => Promise<void>;
  onUpdateMeta: (
    docId: string,
    patch: Partial<Pick<LoreDocument, 'gameId' | 'collectionId' | 'tags'>>,
  ) => Promise<void>;
  onToggleFavorite: (docId: string) => void;
  onToggleArchive: (docId: string) => void;
  onDuplicateDocument: (docId: string) => void;
  onCreateSnapshot: (docId: string, force?: boolean) => Promise<void>;
  onRestoreRevision: (docId: string, revisionId: string) => Promise<LoreDocument | null>;
  onDeleteRevision: (revisionId: string) => Promise<void>;
  onExportNotice: (message: string) => void;
  onCreateDocument: () => void;
  onSelectDocument: (docId: string) => void;
}

function parseDocJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
}

export function EditorView({
  document: activeDoc,
  recentDocuments,
  games,
  collections,
  settings,
  isFocusMode,
  isTypingCalm,
  onTypingActivity,
  onToggleFocusMode,
  onSaveContent,
  onUpdateMeta,
  onToggleFavorite,
  onToggleArchive,
  onDuplicateDocument,
  onCreateSnapshot,
  onRestoreRevision,
  onDeleteRevision,
  onExportNotice,
  onCreateDocument,
  onSelectDocument,
}: EditorViewProps) {
  const [title, setTitle] = useState(activeDoc?.title ?? '');
  const [tagDraft, setTagDraft] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [liveWords, setLiveWords] = useState(activeDoc?.wordCount ?? 0);
  const [liveChars, setLiveChars] = useState(activeDoc?.charCount ?? 0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [outlineItems, setOutlineItems] = useState<Array<{ pos: number; level: number; text: string }>>([]);
  const [activeOutlinePos, setActiveOutlinePos] = useState<number | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuError, setContextMenuError] = useState<string | null>(null);

  const loadedDocIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastSnapshotAtRef = useRef<number>(0);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const pendingPayloadRef = useRef<{
    docId: string;
    title: string;
    contentJson: string;
    plainText: string;
    wordCount: number;
    charCount: number;
  } | null>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const activeDocIdRef = useRef<string | null>(activeDoc?.id ?? null);
  activeDocIdRef.current = activeDoc?.id ?? null;

  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    pendingPayloadRef.current = null;
    await onSaveContent(payload.docId, {
      title: payload.title,
      contentJson: payload.contentJson,
      plainText: payload.plainText,
      wordCount: payload.wordCount,
      charCount: payload.charCount,
    });
    setSaveState('saved');

    // Silent automatic revision snapshot every 90 seconds of active editing
    const now = Date.now();
    if (now - lastSnapshotAtRef.current > 90_000) {
      lastSnapshotAtRef.current = now;
      void onCreateSnapshot(payload.docId, false);
    }
  }, [onSaveContent, onCreateSnapshot]);

  const scheduleSave = useCallback(
    (payload: NonNullable<typeof pendingPayloadRef.current>) => {
      pendingPayloadRef.current = payload;
      setSaveState('saving');
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        void flushPendingSave();
      }, 420);
    },
    [flushPendingSave],
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder:
          'Start writing your story, lore notes, or playthrough chronicle…',
      }),
      CharacterCount.configure({
        limit: null,
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: activeDoc ? parseDocJson(activeDoc.contentJson) : undefined,
    editorProps: {
      clipboardTextParser: parsePlainTextClipboard,
      attributes: {
        spellcheck: settings.spellcheck ? 'true' : 'false',
        autocorrect: 'off',
        autocapitalize: 'off',
        'aria-label': 'Document writing area',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const docId = activeDocIdRef.current;
      if (!docId) return;
      onTypingActivity();
      const plainText = ed.getText({ blockSeparator: '\n' });
      const words = countWords(plainText);
      const chars = plainText.length;
      setLiveWords(words);
      setLiveChars(chars);
      scheduleSave({
        docId,
        title: titleRef.current,
        contentJson: JSON.stringify(ed.getJSON()),
        plainText,
        wordCount: words,
        charCount: chars,
      });
    },
  });

  const refreshOutline = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const headings: Array<{ pos: number; level: number; text: string }> = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({
          pos,
          level: Number(node.attrs.level) || 1,
          text: node.textContent.trim() || 'Untitled heading',
        });
      }
    });
    setOutlineItems((current) =>
      current.length === headings.length &&
      current.every((item, index) =>
        item.pos === headings[index].pos &&
        item.level === headings[index].level &&
        item.text === headings[index].text,
      )
        ? current
        : headings,
    );
    const selectionPos = editor.state.selection.from;
    const active = headings.filter((heading) => heading.pos <= selectionPos).at(-1);
    setActiveOutlinePos(active?.pos ?? headings[0]?.pos ?? null);
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    refreshOutline();
    editor.on('transaction', refreshOutline);
    return () => {
      editor.off('transaction', refreshOutline);
    };
  }, [editor, refreshOutline]);

  const pasteFromClipboard = useCallback(async (plainTextOnly: boolean) => {
    if (!editor) return;

    try {
      if (!navigator.clipboard) throw new Error('Clipboard access is unavailable.');

      if (!plainTextOnly && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const html = await (await item.getType('text/html')).text();
            editor.view.pasteHTML(html);
            setContextMenu(null);
            setContextMenuError(null);
            return;
          }
          if (item.types.includes('text/plain')) {
            const text = await (await item.getType('text/plain')).text();
            editor.view.pasteText(text);
            setContextMenu(null);
            setContextMenuError(null);
            return;
          }
        }
      }

      const text = await navigator.clipboard.readText();
      editor.view.pasteText(text);
      setContextMenu(null);
      setContextMenuError(null);
    } catch {
      setContextMenuError('Clipboard access was denied. You can still paste with Ctrl+V.');
    }
  }, [editor]);

  const runContextMenuAction = useCallback(async (action: string) => {
    if (!editor) return;

    switch (action) {
      case 'undo':
        editor.chain().focus().undo().run();
        break;
      case 'redo':
        editor.chain().focus().redo().run();
        break;
      case 'cut': {
        const { from, to, empty } = editor.state.selection;
        if (!empty) {
          const text = editor.state.doc.textBetween(from, to, '\n');
          try {
            await navigator.clipboard.writeText(text);
            editor.chain().focus().deleteSelection().run();
          } catch {
            setContextMenuError('Clipboard access was denied. The selection was not cut.');
            return;
          }
        }
        break;
      }
      case 'copy': {
        const { from, to, empty } = editor.state.selection;
        if (!empty) {
          try {
            await navigator.clipboard.writeText(editor.state.doc.textBetween(from, to, '\n'));
          } catch {
            setContextMenuError('Clipboard access was denied.');
            return;
          }
        }
        break;
      }
      case 'paste':
        await pasteFromClipboard(false);
        return;
      case 'paste-plain':
        await pasteFromClipboard(true);
        return;
      case 'select-all':
        editor.chain().focus().selectAll().run();
        break;
    }

    setContextMenu(null);
    setContextMenuError(null);
  }, [editor, pasteFromClipboard]);

  useEffect(() => {
    if (!contextMenu) return;

    contextMenuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus({ preventScroll: true });

    const dismiss = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) setContextMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };
    const onViewportChange = () => setContextMenu(null);

    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setOptions({
      editorProps: {
        clipboardTextParser: parsePlainTextClipboard,
        attributes: {
          spellcheck: settings.spellcheck ? 'true' : 'false',
          autocorrect: 'off',
          autocapitalize: 'off',
          'aria-label': 'Document writing area',
        },
      },
    });
  }, [editor, settings.spellcheck]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    if (!activeDoc) {
      loadedDocIdRef.current = null;
      return;
    }

    if (loadedDocIdRef.current !== activeDoc.id) {
      void flushPendingSave();
      loadedDocIdRef.current = activeDoc.id;
      setTitle(activeDoc.title);
      setLiveWords(activeDoc.wordCount);
      setLiveChars(activeDoc.charCount);
      setSaveState('saved');
      editor.commands.setContent(parseDocJson(activeDoc.contentJson), false);
    }
  }, [activeDoc, editor, flushPendingSave]);

  useEffect(() => {
    const onBeforeUnload = () => {
      void flushPendingSave();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      void flushPendingSave();
    };
  }, [flushPendingSave]);

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (exportMenuRef.current?.contains(e.target as Node)) return;
      setIsExportMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExportMenuOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [isExportMenuOpen]);

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    titleRef.current = nextTitle;
    if (!activeDoc || !editor) return;
    onTypingActivity();
    const plainText = editor.getText({ blockSeparator: '\n' });
    const words = countWords(plainText);
    const chars = plainText.length;
    scheduleSave({
      docId: activeDoc.id,
      title: nextTitle,
      contentJson: JSON.stringify(editor.getJSON()),
      plainText,
      wordCount: words,
      charCount: chars,
    });
  };

  const handleAddTag = () => {
    if (!activeDoc) return;
    const cleaned = normalizeTag(tagDraft);
    setTagDraft('');
    if (!cleaned || activeDoc.tags.includes(cleaned)) return;
    void onUpdateMeta(activeDoc.id, { tags: [...activeDoc.tags, cleaned] });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeDoc) return;
    void onUpdateMeta(activeDoc.id, {
      tags: activeDoc.tags.filter((t) => t !== tagToRemove),
    });
  };

  if (!activeDoc) {
    return (
      <div className="lk-page">
        <div className="lk-panel">
          <div className="lk-empty lk-empty-centered">
            <div className="lk-empty-icon">
              <Feather size={20} />
            </div>
            <h1 className="lk-empty-title" style={{ fontSize: '1.25rem' }}>
              Immersive Editor
            </h1>
            <p className="lk-empty-copy">
              No document selected. Start a fresh page to write without distractions, or jump back into a recent draft.
            </p>
            <div className="lk-empty-actions">
              <button
                type="button"
                className="lk-btn lk-btn-primary"
                onClick={onCreateDocument}
              >
                <Plus size={16} strokeWidth={2.3} />
                New document
              </button>
            </div>

            {recentDocuments.length > 0 && (
              <div style={{ marginTop: 28, width: '100%', maxWidth: 460, textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    marginBottom: 8,
                  }}
                >
                  Resume a recent draft
                </div>
                <div className="lk-doc-list">
                  {recentDocuments.slice(0, 4).map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className="lk-doc-row"
                      style={{ width: '100%', textAlign: 'left' }}
                      onClick={() => onSelectDocument(doc.id)}
                    >
                      <span className="lk-doc-row-title">
                        {getDocumentDisplayTitle(doc.title)}
                      </span>
                      <span className="tabular" style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                        {doc.wordCount} {doc.wordCount === 1 ? 'word' : 'words'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const receded = settings.autoHideChromeWhileTyping && isTypingCalm;

  return (
    <div
      className={`lk-editor-shell ${isFocusMode ? 'is-focus' : ''}`}
      onContextMenuCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenuError(null);
        setContextMenu({
          x: Math.max(8, Math.min(event.clientX, window.innerWidth - 260)),
          y: Math.max(8, Math.min(event.clientY, window.innerHeight - 320)),
        });
      }}
    >
      {/* Slim Contextual Formatting Ribbon */}
      <div className={`lk-editor-ribbon ${receded ? 'is-receded' : ''}`}>
        <div className="lk-editor-ribbon-inner">
          <div className="lk-format-group" role="toolbar" aria-label="Text formatting">
            <button
              type="button"
              className="lk-tool-btn"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              className="lk-tool-btn"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 size={15} />
            </button>

            <span className="lk-format-sep" aria-hidden="true" />

            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
              aria-label="Heading 1"
            >
              <Heading1 size={15} />
            </button>
            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
              aria-label="Heading 2"
            >
              <Heading2 size={15} />
            </button>
            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
              aria-label="Heading 3"
            >
              <Heading3 size={15} />
            </button>

            <span className="lk-format-sep" aria-hidden="true" />

            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('bold') ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('italic') ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('underline') ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              title="Underline (Ctrl+U)"
              aria-label="Underline"
            >
              <UnderlineIcon size={15} />
            </button>
            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('strike') ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              title="Strikethrough"
              aria-label="Strikethrough"
            >
              <Strikethrough size={15} />
            </button>
            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('code') ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleCode().run()}
              title="Inline code"
              aria-label="Inline code"
            >
              <Code size={15} />
            </button>

            <span className="lk-format-sep" aria-hidden="true" />

            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('bulletList') ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              title="Bullet list"
              aria-label="Bullet list"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('orderedList') ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              title="Numbered list"
              aria-label="Numbered list"
            >
              <ListOrdered size={15} />
            </button>
            <button
              type="button"
              className={`lk-tool-btn ${editor?.isActive('blockquote') ? 'is-active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              title="Quote"
              aria-label="Quote"
            >
              <Quote size={15} />
            </button>
            <button
              type="button"
              className="lk-tool-btn"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              title="Horizontal divider"
              aria-label="Horizontal divider"
            >
              <Minus size={15} />
            </button>
          </div>

          <div className="lk-editor-status">
            <span className="lk-save-indicator" aria-live="polite">
              {saveState === 'saved' ? (
                <Check size={13} color="var(--state-success)" aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'inline-block',
                  }}
                />
              )}
              <span>{saveState === 'saved' ? 'Saved' : 'Saving…'}</span>
            </span>

            {!isFocusMode && settings.showWordCount && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular">
                  {liveWords.toLocaleString('en-US')}{' '}
                  {liveWords === 1 ? 'word' : 'words'} ·{' '}
                  {liveChars.toLocaleString('en-US')} chars
                </span>
              </>
            )}

            <span className="lk-format-sep" aria-hidden="true" />

            <button
              type="button"
              className={`lk-tool-btn ${isOutlineOpen ? 'is-active' : ''}`}
              onClick={() => setIsOutlineOpen((open) => !open)}
              title="Document outline"
              aria-label="Toggle document outline"
              aria-expanded={isOutlineOpen}
            >
              <ListTree size={14} />
            </button>

            <span className="lk-format-sep" aria-hidden="true" />

            <button
              type="button"
              className="lk-tool-btn"
              onClick={() => onToggleFavorite(activeDoc.id)}
              title={activeDoc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={activeDoc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                size={14}
                fill={activeDoc.isFavorite ? 'var(--state-favorite)' : 'none'}
                color={activeDoc.isFavorite ? 'var(--state-favorite)' : 'currentColor'}
              />
            </button>

            <button
              type="button"
              className="lk-tool-btn"
              onClick={() => onDuplicateDocument(activeDoc.id)}
              title="Duplicate document"
              aria-label="Duplicate document"
            >
              <Copy size={14} />
            </button>

            <button
              type="button"
              className="lk-tool-btn"
              onClick={() => onToggleArchive(activeDoc.id)}
              title={activeDoc.isArchived ? 'Restore from archive' : 'Archive document'}
              aria-label={activeDoc.isArchived ? 'Restore from archive' : 'Archive document'}
            >
              {activeDoc.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            </button>

            {!isFocusMode && (
              <>
                <button
                  type="button"
                  className="lk-tool-btn"
                  onClick={async () => {
                    await flushPendingSave();
                    setIsHistoryOpen(true);
                  }}
                  title="Revision history"
                  aria-label="Open revision history"
                >
                  <History size={14} />
                </button>

                <div className="lk-popover-wrap" ref={exportMenuRef}>
                  <button
                    type="button"
                    className={`lk-tool-btn ${isExportMenuOpen ? 'is-active' : ''}`}
                    onClick={async () => {
                      await flushPendingSave();
                      setIsExportMenuOpen((prev) => !prev);
                    }}
                    title="Export document (MD, TXT, PDF, JSON)"
                    aria-label="Export document"
                    aria-expanded={isExportMenuOpen}
                  >
                    <Download size={14} />
                  </button>

                  {isExportMenuOpen && (
                    <div className="lk-popover-menu" role="menu" aria-label="Export format">
                      <button
                        type="button"
                        role="menuitem"
                        className="lk-popover-item"
                        onClick={() => {
                          const meta = {
                            gameTitle: games.find((g) => g.id === activeDoc.gameId)?.title,
                            collectionName: collections.find((c) => c.id === activeDoc.collectionId)?.name,
                          };
                          exportDocumentAsMarkdown(activeDoc, meta);
                          setIsExportMenuOpen(false);
                          onExportNotice('Exported as Markdown (.md)');
                        }}
                      >
                        <span>Markdown</span>
                        <kbd className="lk-kbd">.md</kbd>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="lk-popover-item"
                        onClick={() => {
                          const meta = {
                            gameTitle: games.find((g) => g.id === activeDoc.gameId)?.title,
                            collectionName: collections.find((c) => c.id === activeDoc.collectionId)?.name,
                          };
                          exportDocumentAsTxt(activeDoc, meta);
                          setIsExportMenuOpen(false);
                          onExportNotice('Exported as Plain Text (.txt)');
                        }}
                      >
                        <span>Plain Text</span>
                        <kbd className="lk-kbd">.txt</kbd>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="lk-popover-item"
                        onClick={() => {
                          const meta = {
                            gameTitle: games.find((g) => g.id === activeDoc.gameId)?.title,
                            collectionName: collections.find((c) => c.id === activeDoc.collectionId)?.name,
                          };
                          exportDocumentAsPdf(activeDoc, meta);
                          setIsExportMenuOpen(false);
                        }}
                      >
                        <span>PDF (Print / Save)</span>
                        <kbd className="lk-kbd">.pdf</kbd>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="lk-popover-item"
                        onClick={() => {
                          const meta = {
                            gameTitle: games.find((g) => g.id === activeDoc.gameId)?.title,
                            collectionName: collections.find((c) => c.id === activeDoc.collectionId)?.name,
                          };
                          exportDocumentAsJson(activeDoc, meta);
                          setIsExportMenuOpen(false);
                          onExportNotice('Exported as JSON (.json)');
                        }}
                      >
                        <span>Structured JSON</span>
                        <kbd className="lk-kbd">.json</kbd>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="lk-tool-btn"
                  onClick={onToggleFocusMode}
                  title="Focus Mode (Alt+F)"
                  aria-label="Enter Focus Mode"
                  style={{ padding: '0 9px' }}
                >
                  <Maximize2 size={14} />
                  <span>Focus</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Clean Writing Sheet */}
      <div className={`lk-editor-workspace ${isOutlineOpen && !isFocusMode ? 'has-outline' : ''}`}>
        {isOutlineOpen && !isFocusMode && (
          <aside className="lk-editor-outline" aria-label="Document outline">
            <div className="lk-editor-outline-head">
              <span>Outline</span>
              <button
                type="button"
                className="lk-icon-btn"
                onClick={() => setIsOutlineOpen(false)}
                aria-label="Close document outline"
              >
                <X size={14} />
              </button>
            </div>
            {outlineItems.length ? (
              <nav aria-label="Headings in this document" className="lk-editor-outline-list">
                {outlineItems.map((item) => (
                  <button
                    key={`${item.pos}-${item.level}`}
                    type="button"
                    className={`lk-editor-outline-item level-${item.level} ${activeOutlinePos === item.pos ? 'is-active' : ''}`}
                    title={item.text}
                    onClick={() => {
                      editor?.chain().focus().setTextSelection(item.pos + 1).scrollIntoView().run();
                    }}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            ) : (
              <p className="lk-editor-outline-empty">Add Heading 1, 2, or 3 from the toolbar to build an outline.</p>
            )}
          </aside>
        )}
        <article className={`lk-editor-canvas width-${settings.editorWidth}`}>
        <input
          type="text"
          className="lk-editor-title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={() => void flushPendingSave()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editor?.commands.focus('start');
            }
          }}
          placeholder="Story or note title…"
          aria-label="Document title"
          spellCheck={settings.spellcheck}
        />

        {/* Quiet Inline Metadata Strip (hidden during Focus Mode for zero clutter) */}
        {!isFocusMode && (
          <div className={`lk-editor-meta-strip ${receded ? 'is-receded' : ''}`}>
            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Link this document to a game"
            >
              <Gamepad2 size={14} color="var(--ink-muted)" aria-hidden="true" />
              <SelectField
                variant="inline"
                ariaLabel="Linked game"
                value={activeDoc.gameId ?? ''}
                options={[
                  { value: '', label: 'No game linked' },
                  ...games.map((g) => ({ value: g.id, label: g.title })),
                ]}
                onChange={(val) =>
                  void onUpdateMeta(activeDoc.id, {
                    gameId: val || null,
                  })
                }
              />
            </div>

            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Assign to a collection"
            >
              <FolderKanban size={14} color="var(--ink-muted)" aria-hidden="true" />
              <SelectField
                variant="inline"
                ariaLabel="Assigned collection"
                value={activeDoc.collectionId ?? ''}
                options={[
                  { value: '', label: 'No collection' },
                  ...collections.map((c) => ({ value: c.id, label: c.name })),
                ]}
                onChange={(val) =>
                  void onUpdateMeta(activeDoc.id, {
                    collectionId: val || null,
                  })
                }
              />
            </div>

            {activeDoc.tags.map((tag) => (
              <span key={tag} className="lk-tag-pill">
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    display: 'inline-flex',
                    color: 'inherit',
                  }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            <input
              type="text"
              className="lk-tag-input"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              onBlur={() => {
                if (tagDraft.trim()) handleAddTag();
              }}
              placeholder="+ add tag"
              aria-label="Add a tag"
            />
          </div>
        )}

        <div
          className={`lk-prose ${settings.editorFont === 'serif' ? 'font-serif' : ''}`}
          onClick={() => {
            if (editor && !editor.isFocused) {
              editor.commands.focus();
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>
        </article>
      </div>

      {contextMenu && createPortal(
        <div
          ref={contextMenuRef}
          className="lk-context-menu"
          role="menu"
          aria-label="Editor actions"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            const items = Array.from(
              contextMenuRef.current?.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]:not(:disabled)',
              ) ?? [],
            );
            if (items.length === 0) return;
            event.preventDefault();
            const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
            const nextIndex = event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? items.length - 1
                : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[nextIndex].focus();
          }}
        >
          <button type="button" role="menuitem" className="lk-context-menu-item" disabled={!editor?.can().undo()} onMouseDown={(event) => event.preventDefault()} onClick={() => void runContextMenuAction('undo')}>
            <Undo2 size={15} /><span>Undo</span><kbd>Ctrl+Z</kbd>
          </button>
          <button type="button" role="menuitem" className="lk-context-menu-item" disabled={!editor?.can().redo()} onMouseDown={(event) => event.preventDefault()} onClick={() => void runContextMenuAction('redo')}>
            <Redo2 size={15} /><span>Redo</span><kbd>Ctrl+Shift+Z</kbd>
          </button>
          <div className="lk-context-menu-divider" role="separator" />
          <button type="button" role="menuitem" className="lk-context-menu-item" disabled={!editor || editor.state.selection.empty} onMouseDown={(event) => event.preventDefault()} onClick={() => void runContextMenuAction('cut')}>
            <Scissors size={15} /><span>Cut</span><kbd>Ctrl+X</kbd>
          </button>
          <button type="button" role="menuitem" className="lk-context-menu-item" disabled={!editor || editor.state.selection.empty} onMouseDown={(event) => event.preventDefault()} onClick={() => void runContextMenuAction('copy')}>
            <Copy size={15} /><span>Copy</span><kbd>Ctrl+C</kbd>
          </button>
          <button type="button" role="menuitem" className="lk-context-menu-item" disabled={!navigator.clipboard?.readText} onMouseDown={(event) => event.preventDefault()} onClick={() => void runContextMenuAction('paste')}>
            <ClipboardPaste size={15} /><span>Paste</span><kbd>Ctrl+V</kbd>
          </button>
          <button type="button" role="menuitem" className="lk-context-menu-item" disabled={!navigator.clipboard?.readText} onMouseDown={(event) => event.preventDefault()} onClick={() => void runContextMenuAction('paste-plain')}>
            <ClipboardPaste size={15} /><span>Paste as plain text</span><kbd>Ctrl+Shift+V</kbd>
          </button>
          <div className="lk-context-menu-divider" role="separator" />
          <button type="button" role="menuitem" className="lk-context-menu-item" onMouseDown={(event) => event.preventDefault()} onClick={() => void runContextMenuAction('select-all')}>
            <span className="lk-context-menu-icon-spacer" aria-hidden="true" /><span>Select all</span><kbd>Ctrl+A</kbd>
          </button>
          {contextMenuError && <div className="lk-context-menu-error" role="status">{contextMenuError}</div>}
        </div>,
        document.body,
      )}

      {/* Whisper Exit Pill in Focus Mode */}
      {isFocusMode && (
        <div className="lk-focus-footer">
          {settings.showWordCount && (
            <span className="tabular">
              {liveWords.toLocaleString('en-US')} {liveWords === 1 ? 'word' : 'words'}
            </span>
          )}
          <button
            type="button"
            className="lk-btn lk-btn-secondary lk-btn-sm"
            onClick={onToggleFocusMode}
          >
            <Minimize2 size={13} />
            Exit Focus
          </button>
        </div>
      )}

      <RevisionHistoryModal
        isOpen={isHistoryOpen}
        documentId={activeDoc.id}
        documentTitle={title}
        onClose={() => setIsHistoryOpen(false)}
        onSaveSnapshotNow={async () => {
          await flushPendingSave();
          await onCreateSnapshot(activeDoc.id, true);
          lastSnapshotAtRef.current = Date.now();
        }}
        onRestoreRevision={async (revisionId) => {
          const restored = await onRestoreRevision(activeDoc.id, revisionId);
          if (restored && editor && !editor.isDestroyed) {
            setTitle(restored.title);
            titleRef.current = restored.title;
            setLiveWords(restored.wordCount);
            setLiveChars(restored.charCount);
            editor.commands.setContent(parseDocJson(restored.contentJson), false);
            setSaveState('saved');
          }
        }}
        onDeleteRevision={onDeleteRevision}
      />
    </div>
  );
}
