import type React from 'react';
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type PopoverPlacement = 'top-end' | 'bottom-end' | 'bottom-start' | 'bottom-stretch';

interface AnchoredPopoverProps {
  anchorRef: React.RefObject<HTMLElement>;
  placement: PopoverPlacement;
  onDismiss: () => void;
  children: React.ReactNode;
  className: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  maxHeight?: number;
}

const VIEWPORT_GUTTER = 8;
const ANCHOR_GAP = 8;

export function AnchoredPopover({
  anchorRef,
  placement,
  onDismiss,
  children,
  className,
  onClick,
  maxHeight: maxPanelHeight,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const updatePosition = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const availableBelow = viewportHeight - anchorRect.bottom - ANCHOR_GAP - VIEWPORT_GUTTER;
      const availableAbove = anchorRect.top - ANCHOR_GAP - VIEWPORT_GUTTER;
      const preferTop = placement === 'top-end';
      const useTop = preferTop
        ? availableAbove >= Math.min(popoverRect.height, 240) || availableAbove > availableBelow
        : availableBelow < Math.min(popoverRect.height, 240) && availableAbove > availableBelow;
      const maxHeight = Math.max(1, Math.min(
        useTop ? availableAbove : availableBelow,
        viewportHeight - VIEWPORT_GUTTER * 2,
        maxPanelHeight ?? Number.POSITIVE_INFINITY
      ));
      let left = placement === 'bottom-start' || placement === 'bottom-stretch'
        ? anchorRect.left
        : anchorRect.right - popoverRect.width;
      if (placement === 'bottom-stretch') left = anchorRect.left;
      left = Math.min(Math.max(VIEWPORT_GUTTER, left), viewportWidth - popoverRect.width - VIEWPORT_GUTTER);
      popover.style.top = `${useTop ? Math.max(VIEWPORT_GUTTER, anchorRect.top - ANCHOR_GAP - Math.min(popoverRect.height, maxHeight)) : anchorRect.bottom + ANCHOR_GAP}px`;
      popover.style.left = `${left}px`;
      popover.style.maxHeight = `${maxHeight}px`;
      popover.style.width = placement === 'bottom-stretch' ? `${anchorRect.width}px` : '';
      popover.style.visibility = 'visible';
    };

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(anchor);
    observer.observe(popover);
    globalThis.addEventListener('resize', updatePosition);
    let animationFrame: number | undefined;
    let stopTrackingTimer: number | undefined;
    const stopTracking = () => {
      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
      }
    };
    const trackDuringScroll = () => {
      updatePosition();
      if (animationFrame === undefined) {
        const track = () => {
          updatePosition();
          animationFrame = requestAnimationFrame(track);
        };
        animationFrame = requestAnimationFrame(track);
      }
      globalThis.clearTimeout(stopTrackingTimer);
      stopTrackingTimer = globalThis.setTimeout(stopTracking, 120);
    };
    globalThis.addEventListener('scroll', trackDuringScroll, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      globalThis.removeEventListener('resize', updatePosition);
      globalThis.removeEventListener('scroll', trackDuringScroll, true);
      stopTracking();
      globalThis.clearTimeout(stopTrackingTimer);
    };
  }, [anchorRef, maxPanelHeight, placement]);

  useLayoutEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, onDismiss]);

  return createPortal(
    <div
      ref={popoverRef}
      onClick={onClick}
      className={className}
      style={{
        position: 'fixed',
        top: -10000,
        left: -10000,
        overflowY: 'auto',
        visibility: 'hidden',
      }}
    >
      {children}
    </div>,
    document.body
  );
}
