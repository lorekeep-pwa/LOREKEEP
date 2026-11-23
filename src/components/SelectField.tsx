import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  variant?: 'default' | 'inline';
  placeholder?: string;
}

const OPTION_ROW_HEIGHT = 34;
const MENU_PADDING = 10;

export function SelectField({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  variant = 'default',
  placeholder = 'Select…',
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 14;
    const spaceAbove = rect.top - 14;

    const maxVisibleRows = Math.max(
      3,
      Math.min(7, options.length, Math.floor((Math.max(spaceBelow, spaceAbove) - MENU_PADDING) / OPTION_ROW_HEIGHT)),
    );
    const snappedMaxHeight = maxVisibleRows * OPTION_ROW_HEIGHT + MENU_PADDING;
    const desiredHeight = Math.min(options.length * OPTION_ROW_HEIGHT + MENU_PADDING, snappedMaxHeight);

    const openUpward = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
    const available = openUpward ? spaceAbove : spaceBelow;
    const finalRows = Math.max(
      3,
      Math.min(maxVisibleRows, Math.floor((available - MENU_PADDING) / OPTION_ROW_HEIGHT)),
    );
    const finalMaxHeight = finalRows * OPTION_ROW_HEIGHT + MENU_PADDING;
    const finalHeight = Math.min(options.length * OPTION_ROW_HEIGHT + MENU_PADDING, finalMaxHeight);

    const minWidth = variant === 'inline' ? Math.max(rect.width, 190) : rect.width;
    const left = Math.min(rect.left, window.innerWidth - minWidth - 12);

    setMenuStyle({
      top: openUpward ? rect.top - finalHeight - 6 : rect.bottom + 6,
      left: Math.max(12, left),
      width: minWidth,
      maxHeight: finalMaxHeight,
    });
  }, [options.length, variant]);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    updateMenuPosition();

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (options.length ? (prev + 1) % options.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          options.length ? (prev - 1 + options.length) % options.length : 0,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((current) => {
          const opt = options[current];
          if (opt) onChange(opt.value);
          return current;
        });
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'Tab') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleCaptureKeyDown, true);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleCaptureKeyDown, true);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, selectedIndex, options, onChange, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const activeEl = menuRef.current.querySelector<HTMLElement>('[data-highlighted="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel}
        className={
          variant === 'inline'
            ? `lk-inline-select-trigger ${isOpen ? 'is-open' : ''}`
            : `lk-select-trigger ${isOpen ? 'is-open' : ''}`
        }
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="lk-select-trigger-label">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={variant === 'inline' ? 13 : 15}
          strokeWidth={2}
          className={`lk-select-chevron ${isOpen ? 'is-rotated' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen &&
        menuStyle &&
        createPortal(
          <ul
            ref={menuRef}
            id={listboxId}
            role="listbox"
            className="lk-select-menu"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
              maxHeight: menuStyle.maxHeight,
            }}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    data-highlighted={isHighlighted}
                    className={`lk-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <span className="lk-select-option-label">{opt.label}</span>
                    {isSelected && <Check size={14} color="var(--accent)" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
