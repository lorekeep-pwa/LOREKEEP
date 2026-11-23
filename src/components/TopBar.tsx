import { ArrowLeft, Search, Settings } from 'lucide-react';
import type { NavSection } from '../types/models';

interface TopBarProps {
  activeSection: NavSection;
  contextLabel?: string;
  isReceded?: boolean;
  onGoHome: () => void;
  onBack?: () => void;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
}

const SECTION_LABELS: Record<NavSection, string> = {
  hub: 'Hub',
  editor: 'Editor',
  games: 'Games',
  collections: 'Collections',
  archive: 'Archive',
};

export function TopBar({
  activeSection,
  contextLabel,
  isReceded = false,
  onGoHome,
  onBack,
  onOpenPalette,
  onOpenSettings,
}: TopBarProps) {
  return (
    <header className={`lk-topbar ${isReceded ? 'is-receded' : ''}`}>
      <div className="lk-topbar-left">
        <button
          type="button"
          className="lk-brand"
          onClick={onGoHome}
          aria-label="Return to LOREKEEP Hub Workspace"
        >
          <img
            src="/lorekeep-icon.svg"
            alt=""
            className="lk-brand-mark"
            width={26}
            height={26}
          />
          <span>LOREKEEP</span>
        </button>

        {activeSection === 'editor' && onBack && (
          <button
            type="button"
            className="lk-icon-btn lk-editor-back-btn"
            onClick={onBack}
            aria-label="Back to previous section"
            title="Back to previous section"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}

        <div className="lk-section-crumb" aria-label="Current section">
          <span className="lk-section-crumb-sep" aria-hidden="true">
            /
          </span>
          <span style={{ flexShrink: 0 }}>{SECTION_LABELS[activeSection]}</span>
          {contextLabel && (
            <>
              <span className="lk-section-crumb-sep" aria-hidden="true">
                /
              </span>
              <span className="lk-section-crumb-context" title={contextLabel}>
                {contextLabel}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className="lk-search-trigger"
        onClick={onOpenPalette}
        aria-label="Open quick search and Command Palette (Ctrl + K)"
      >
        <span className="lk-search-trigger-left">
          <Search size={14} strokeWidth={2} aria-hidden="true" />
          <span>Search stories, games, tags, or commands…</span>
        </span>
        <kbd className="lk-kbd">Ctrl K</kbd>
      </button>

      <div className="lk-topbar-right">
        <button
          type="button"
          className="lk-icon-btn is-bordered"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
        >
          <Settings size={16} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
