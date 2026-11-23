import {
  Archive,
  Compass,
  Feather,
  FolderKanban,
  Gamepad2,
  Plus,
} from 'lucide-react';
import type { NavSection } from '../types/models';

interface FloatingDockProps {
  activeSection: NavSection;
  hasActiveDocument: boolean;
  isReceded?: boolean;
  onSelectSection: (section: NavSection) => void;
  onQuickNewDocument: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof Compass;
}> = [
  { id: 'hub', label: 'Hub', icon: Compass },
  { id: 'editor', label: 'Editor', icon: Feather },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'collections', label: 'Collections', icon: FolderKanban },
  { id: 'archive', label: 'Archive', icon: Archive },
];

export function FloatingDock({
  activeSection,
  hasActiveDocument,
  isReceded = false,
  onSelectSection,
  onQuickNewDocument,
}: FloatingDockProps) {
  return (
    <div className={`lk-dock-anchor ${isReceded ? 'is-receded' : ''}`}>
      <nav className="lk-dock" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`lk-dock-item ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectSection(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              <span>{item.label}</span>
              {item.id === 'editor' && hasActiveDocument && !isActive && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                  }}
                />
              )}
            </button>
          );
        })}

        <div className="lk-dock-sep" aria-hidden="true" />

        <button
          type="button"
          className="lk-dock-cta"
          onClick={onQuickNewDocument}
          title="Create a new document (Alt + N)"
        >
          <Plus size={16} strokeWidth={2.3} aria-hidden="true" />
          <span>Write</span>
        </button>
      </nav>
    </div>
  );
}
