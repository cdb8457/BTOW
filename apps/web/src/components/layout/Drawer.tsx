import { useEffect, useRef } from 'react';
import { useFocusTrap, useId } from '../../hooks/useFocusTrap';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: React.ReactNode;
  width?: string;
  title?: string;
}

export function Drawer({
  open,
  onClose,
  side = 'left',
  children,
  width = '280px',
  title,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerId = useId('drawer');

  // Initialize focus trap
  useFocusTrap(open, drawerRef as React.RefObject<HTMLElement>);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Generate accessible title ID for aria-labelledby
  const titleId = title ? `${drawerId}-title` : undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`drawer ${side === 'right' ? 'drawer-right' : ''} ${open ? 'open' : ''}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={title ? undefined : 'Drawer'}
      >
        {title && (
          <h2 id={titleId} className="sr-only">{title}</h2>
        )}
        <div className="h-full overflow-y-auto touch-scroll">{children}</div>
      </div>
    </>
  );
}
