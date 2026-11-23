import { useEffect, useRef, useState } from 'react';
import {
  Download,
  CalendarClock,
  CheckCircle2,
  HardDrive,
  Check,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { AppSettings, AppTheme, EditorFont, EditorWidth } from '../types/models';
import { SelectField } from './SelectField';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  counts: {
    documents: number;
    games: number;
    collections: number;
  };
  onClose: () => void;
  onUpdateSettings: (patch: Partial<Omit<AppSettings, 'id'>>) => void;
  onExportBackup: () => Promise<void>;
  onImportBackup: (rawJson: string, mode: 'merge' | 'replace') => Promise<string>;
  onClearAll: () => void;
}

export function SettingsModal({
  isOpen,
  settings,
  counts,
  onClose,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onClearAll,
}: SettingsModalProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null);
  const [pendingImportName, setPendingImportName] = useState<string>('');
  const [backupMessage, setBackupMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reminderInterval = settings.backupReminderInterval ?? 'monthly';
  const lastBackupAt = settings.lastBackupAt ?? null;
  const nextBackupAt = lastBackupAt === null || reminderInterval === 'never'
    ? null
    : (() => {
        const due = new Date(lastBackupAt);
        if (reminderInterval === 'monthly') due.setMonth(due.getMonth() + 1);
        else due.setDate(due.getDate() + 7);
        return due.getTime();
      })();
  const hasArchive = counts.documents > 0 || counts.games > 0 || counts.collections > 0;
  const backupIsDue = hasArchive && reminderInterval !== 'never' &&
    (lastBackupAt === null || (nextBackupAt !== null && Date.now() >= nextBackupAt));

  useEffect(() => {
    if (!isOpen) {
      setConfirmClear(false);
      setPendingImportJson(null);
      setPendingImportName('');
      setBackupMessage(null);
      setBusy(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    setBackupMessage(null);
    try {
      const text = await file.text();
      setPendingImportJson(text);
      setPendingImportName(file.name);
    } catch {
      setBackupMessage({ type: 'err', text: 'Could not read the selected backup file.' });
    }
  };

  const runImport = async (mode: 'merge' | 'replace') => {
    if (!pendingImportJson || busy) return;
    setBusy(true);
    setBackupMessage(null);
    try {
      const summary = await onImportBackup(pendingImportJson, mode);
      setPendingImportJson(null);
      setPendingImportName('');
      setBackupMessage({ type: 'ok', text: summary });
    } catch (err) {
      setBackupMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Backup import failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="lk-overlay lk-overlay-centered"
      role="dialog"
      aria-modal="true"
      aria-label="LOREKEEP Settings"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lk-dialog lk-settings-dialog" style={{ maxWidth: 620 }}>
        <div className="lk-dialog-head">
          <h2 className="lk-dialog-title">Settings</h2>
          <button
            type="button"
            className="lk-icon-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={17} />
          </button>
        </div>

        <div className="lk-dialog-body" style={{ gap: 8 }}>
          <fieldset className="lk-theme-setting">
            <legend className="lk-setting-name">Color theme</legend>
            <p className="lk-setting-desc">Choose the workspace palette for this device.</p>
            <div className="lk-theme-options" role="group" aria-label="Color theme options">
              {([
                { value: 'slate', label: 'Slate', description: 'The original dark workspace.' },
                { value: 'paper', label: 'Paper', description: 'Warm light surfaces for daytime writing.' },
              ] as Array<{ value: AppTheme; label: string; description: string }>).map((option) => {
                const selected = settings.theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`lk-theme-option ${selected ? 'is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => onUpdateSettings({ theme: option.value })}
                  >
                    <span className="lk-theme-preview" data-theme-preview={option.value} aria-hidden="true">
                      <span className="lk-theme-preview-topbar"><i /></span>
                      <span className="lk-theme-preview-content">
                        <span className="lk-theme-preview-panel">
                          <i className="is-title" />
                          <i />
                          <i className="is-short" />
                        </span>
                        <span className="lk-theme-preview-side" />
                      </span>
                    </span>
                    <span className="lk-theme-option-label">
                      <span className="lk-theme-option-copy">
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                      <span className="lk-theme-option-check" aria-hidden="true">
                        {selected && <Check size={14} strokeWidth={2.4} />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="lk-setting-row">
            <div>
              <div className="lk-setting-name">Word &amp; character count</div>
              <div className="lk-setting-desc">
                Display a subtle counter inside the Immersive Editor.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.showWordCount}
              className={`lk-switch ${settings.showWordCount ? 'is-on' : ''}`}
              onClick={() => onUpdateSettings({ showWordCount: !settings.showWordCount })}
            >
              <span className="lk-switch-thumb" />
            </button>
          </div>

          <div className="lk-setting-row">
            <div>
              <div className="lk-setting-name">Editor typography</div>
              <div className="lk-setting-desc">
                Choose between crisp UI sans or editorial serif for long-form stories.
              </div>
            </div>
            <div className="lk-segmented" role="group" aria-label="Editor font">
              {(
                [
                  { value: 'sans', label: 'Sans' },
                  { value: 'serif', label: 'Serif' },
                ] as Array<{ value: EditorFont; label: string }>
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`lk-segmented-btn ${settings.editorFont === opt.value ? 'is-active' : ''}`}
                  onClick={() => onUpdateSettings({ editorFont: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lk-setting-row">
            <div>
              <div className="lk-setting-name">Writing column width</div>
              <div className="lk-setting-desc">
                Adjust the line measure inside the Immersive Editor.
              </div>
            </div>
            <div className="lk-segmented" role="group" aria-label="Writing column width">
              {(
                [
                  { value: 'narrow', label: 'Compact' },
                  { value: 'comfortable', label: 'Balanced' },
                  { value: 'wide', label: 'Wide' },
                ] as Array<{ value: EditorWidth; label: string }>
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`lk-segmented-btn ${settings.editorWidth === opt.value ? 'is-active' : ''}`}
                  onClick={() => onUpdateSettings({ editorWidth: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lk-setting-row">
            <div>
              <div className="lk-setting-name">Dim chrome while typing</div>
              <div className="lk-setting-desc">
                Gently fades the top bar, toolbar, and Floating Dock during continuous writing.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoHideChromeWhileTyping}
              className={`lk-switch ${settings.autoHideChromeWhileTyping ? 'is-on' : ''}`}
              onClick={() =>
                onUpdateSettings({
                  autoHideChromeWhileTyping: !settings.autoHideChromeWhileTyping,
                })
              }
            >
              <span className="lk-switch-thumb" />
            </button>
          </div>

          <div className="lk-setting-row">
            <div>
              <div className="lk-setting-name">Browser spellcheck</div>
              <div className="lk-setting-desc">
                Off by default to avoid underlines on proper nouns and custom lore terms.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.spellcheck}
              className={`lk-switch ${settings.spellcheck ? 'is-on' : ''}`}
              onClick={() => onUpdateSettings({ spellcheck: !settings.spellcheck })}
            >
              <span className="lk-switch-thumb" />
            </button>
          </div>

          {/* Local-First Storage & JSON Backup/Restore */}
          <div
            style={{
              marginTop: 10,
              padding: '15px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-recessed)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.86rem', fontWeight: 600 }}>
                <HardDrive size={15} color="var(--state-success)" aria-hidden="true" />
                Local-First Storage &amp; Backup (IndexedDB)
              </span>
              <span className="tabular" style={{ fontSize: '0.79rem', color: 'var(--ink-muted)' }}>
                {counts.documents} {counts.documents === 1 ? 'doc' : 'docs'} · {counts.games}{' '}
                {counts.games === 1 ? 'game' : 'games'} · {counts.collections}{' '}
                {counts.collections === 1 ? 'collection' : 'collections'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
              <ShieldCheck size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>
                Everything stays on your PC and works offline. Export a portable JSON backup anytime (includes documents, revisions, collections, games, session notes, settings, and local covers).
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                padding: '11px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ minWidth: 200, flex: '1 1 260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', fontWeight: 600 }}>
                  {backupIsDue ? (
                    <CalendarClock size={14} color="var(--state-favorite)" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={14} color="var(--state-success)" aria-hidden="true" />
                  )}
                  {backupIsDue ? 'Backup recommended' : 'Backup status'}
                </div>
                <div style={{ marginTop: 4, fontSize: '0.77rem', lineHeight: 1.5, color: 'var(--ink-muted)' }}>
                  {!hasArchive
                    ? 'Your archive is empty. Backup reminders start when you add content.'
                    : lastBackupAt
                      ? `Last full backup: ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(lastBackupAt)}`
                      : 'No full backup has been downloaded from this browser yet.'}
                  {backupIsDue && <span> Export a copy to keep your archive safe.</span>}
                </div>
              </div>
              <div style={{ minWidth: 155 }}>
                <label className="lk-label" htmlFor="lk-backup-reminder" style={{ marginBottom: 6 }}>
                  In-app reminder
                </label>
                <SelectField
                  id="lk-backup-reminder"
                  ariaLabel="Backup reminder frequency"
                  value={reminderInterval}
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'never', label: 'Off' },
                  ]}
                  onChange={(value) => onUpdateSettings({ backupReminderInterval: value as AppSettings['backupReminderInterval'] })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="lk-btn lk-btn-secondary lk-btn-sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setBackupMessage(null);
                  try {
                    await onExportBackup();
                    setBackupMessage({ type: 'ok', text: 'Full JSON backup downloaded.' });
                  } catch (err) {
                    setBackupMessage({
                      type: 'err',
                      text: err instanceof Error ? err.message : 'Backup export failed.',
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Download size={14} />
                Export backup (.json)
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  void handleFilePicked(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />

              <button
                type="button"
                className="lk-btn lk-btn-secondary lk-btn-sm"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                Import backup (.json)
              </button>
            </div>

            {pendingImportJson && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                  Ready to import <strong>{pendingImportName}</strong>. Choose how to restore:
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="lk-btn lk-btn-primary lk-btn-sm"
                    disabled={busy}
                    onClick={() => void runImport('merge')}
                  >
                    Merge with current archive
                  </button>
                  <button
                    type="button"
                    className="lk-btn lk-btn-danger lk-btn-sm"
                    disabled={busy}
                    onClick={() => void runImport('replace')}
                  >
                    Replace entire archive
                  </button>
                  <button
                    type="button"
                    className="lk-btn lk-btn-ghost lk-btn-sm"
                    onClick={() => {
                      setPendingImportJson(null);
                      setPendingImportName('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {backupMessage && (
              <div
                role="status"
                style={{
                  fontSize: '0.8rem',
                  color: backupMessage.type === 'ok' ? 'var(--state-success)' : 'var(--ink-danger)',
                }}
              >
                {backupMessage.text}
              </div>
            )}

            {(counts.documents > 0 || counts.games > 0 || counts.collections > 0) && (
              <div
                style={{
                  paddingTop: 10,
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                {confirmClear ? (
                  <>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ink-danger)' }}>
                      Permanently clear your entire local archive?
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="lk-btn lk-btn-ghost lk-btn-sm"
                        onClick={() => setConfirmClear(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="lk-btn lk-btn-danger lk-btn-sm"
                        onClick={() => {
                          onClearAll();
                          setConfirmClear(false);
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="lk-btn lk-btn-danger lk-btn-sm"
                    onClick={() => setConfirmClear(true)}
                  >
                    <Trash2 size={14} />
                    Clear local archive
                  </button>
                )}
              </div>
            )}
          </div>
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
