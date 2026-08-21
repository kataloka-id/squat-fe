import { Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { getPosition, MAX_WIDTH, VIEWPORT_PADDING, type Position } from './infoPopoverPosition.ts';

export const InfoPopover = ({
  label,
  trigger,
  children,
}: {
  label: string;
  trigger?: ReactNode;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const id = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  };
  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !panelRef.current) return;
    setPosition(
      getPosition(
        anchorRef.current.getBoundingClientRect(),
        panelRef.current.getBoundingClientRect(),
      ),
    );
  }, []);
  const openPopover = () => {
    cancelClose();
    setPosition(null);
    setOpen(true);
  };

  useEffect(() => () => cancelClose(), []);
  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    const reposition = () => requestAnimationFrame(updatePosition);
    window.addEventListener('resize', reposition);
    document.addEventListener('scroll', reposition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('scroll', reposition, true);
    };
  }, [open, updatePosition]);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        anchorRef.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const panel =
    open && typeof document !== 'undefined'
      ? createPortal(
          <span
            ref={panelRef}
            id={id}
            role="tooltip"
            data-info-popover-panel="true"
            data-placement={position?.placement ?? 'pending'}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{
              position: 'fixed',
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              maxWidth: `min(${MAX_WIDTH}px, calc(100vw - ${VIEWPORT_PADDING * 2}px))`,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="z-[1000] w-max rounded-lg border border-slate-200 bg-white p-3 text-left normal-case tracking-normal text-slate-700 shadow-xl"
          >
            {children}
          </span>,
          document.body,
        )
      : null;

  return (
    <span className="inline-flex" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <button
        ref={anchorRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        data-info-popover-trigger="true"
        onClick={openPopover}
        onFocus={openPopover}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node))
            scheduleClose();
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {trigger ?? <Info className="h-4 w-4" aria-hidden="true" />}
      </button>
      {panel}
    </span>
  );
};
