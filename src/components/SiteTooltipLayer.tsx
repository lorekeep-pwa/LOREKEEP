import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipState {
  label: string;
  left: number;
  top: number;
  placement: 'above' | 'below';
}

export function SiteTooltipLayer() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const internallyRemovedTitles = new WeakSet<HTMLElement>();

    const convertTitle = (element: HTMLElement) => {
      const title = element.getAttribute('title');
      if (title === null) return;
      if (title.trim()) element.dataset.lkTooltip = title.trim();
      else delete element.dataset.lkTooltip;
      internallyRemovedTitles.add(element);
      element.removeAttribute('title');
    };

    const convertTree = (root: HTMLElement) => {
      convertTitle(root);
      root.querySelectorAll<HTMLElement>('[title]').forEach(convertTitle);
    };

    convertTree(document.body);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          const element = record.target as HTMLElement;
          if (element.hasAttribute('title')) {
            convertTitle(element);
          } else if (record.oldValue !== null && internallyRemovedTitles.has(element)) {
            internallyRemovedTitles.delete(element);
          } else if (record.oldValue !== null) {
            delete element.dataset.lkTooltip;
          }
        }

        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) convertTree(node);
        });
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['title'],
    });

    const cancelTimers = () => {
      if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
      showTimerRef.current = null;
      hideTimerRef.current = null;
    };

    const findTooltipTarget = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      const element = target.closest<HTMLElement>('[data-lk-tooltip], [title]');
      if (!element) return null;
      convertTitle(element);
      return element.dataset.lkTooltip ? element : null;
    };

    const reveal = (element: HTMLElement) => {
      const label = element.dataset.lkTooltip;
      if (!label) return;
      const rect = element.getBoundingClientRect();
      const placement = rect.top >= 48 ? 'above' : 'below';
      const center = rect.left + rect.width / 2;
      const horizontalPadding = Math.min(142, Math.max(12, window.innerWidth / 2 - 8));
      setTooltip({
        label,
        left: Math.max(horizontalPadding, Math.min(center, window.innerWidth - horizontalPadding)),
        top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
        placement,
      });
    };

    const scheduleReveal = (element: HTMLElement, immediate = false) => {
      cancelTimers();
      activeTargetRef.current = element;
      if (immediate) reveal(element);
      else showTimerRef.current = window.setTimeout(() => reveal(element), 420);
    };

    const hide = () => {
      cancelTimers();
      activeTargetRef.current = null;
      setTooltip(null);
    };

    const onPointerOver = (event: PointerEvent) => {
      const target = findTooltipTarget(event.target);
      if (!target || target === activeTargetRef.current) return;
      scheduleReveal(target);
    };

    const onPointerOut = (event: PointerEvent) => {
      const target = findTooltipTarget(event.target);
      if (!target || target !== activeTargetRef.current) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
      hideTimerRef.current = window.setTimeout(hide, 90);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = findTooltipTarget(event.target);
      if (target) scheduleReveal(target, true);
    };

    const onFocusOut = (event: FocusEvent) => {
      const target = findTooltipTarget(event.target);
      if (!target || target !== activeTargetRef.current) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      hide();
    };

    const dismiss = () => hide();

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('pointerdown', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);

    return () => {
      cancelTimers();
      observer.disconnect();
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, []);

  if (!tooltip) return null;

  return createPortal(
    <div
      id="lk-site-tooltip"
      className={`lk-site-tooltip is-${tooltip.placement}`}
      role="tooltip"
      style={{ left: tooltip.left, top: tooltip.top }}
    >
      {tooltip.label}
    </div>,
    document.body,
  );
}
