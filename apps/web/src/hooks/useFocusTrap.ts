import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing focus trap within a modal/dialog
 * - Focuses the first focusable element when modal opens
 * - Traps focus within the container
 * - Returns focus to trigger element when modal closes
 */
export function useFocusTrap(
  isOpen: boolean,
  containerRef: React.RefObject<HTMLElement>
) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const focusableSelector = 
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    const elements = containerRef.current.querySelectorAll<HTMLElement>(focusableSelector);
    return Array.from(elements).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }, [containerRef]);

  // Focus the first focusable element
  const focusFirstElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  // Handle keydown for focus trapping
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement || document.activeElement === document.body) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement || document.activeElement === document.body) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [getFocusableElements]);

  // Store the currently focused element before opening
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        focusFirstElement();
      }, 0);

      // Add keydown listener for focus trap
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Return focus to the trigger element when closing
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        const timer = setTimeout(() => {
          previousActiveElement.current?.focus();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, handleKeyDown, focusFirstElement]);

  return {
    focusFirstElement,
    getFocusableElements,
  };
}

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function useId(prefix: string = 'a11y'): string {
  const idRef = useRef<string>(`${prefix}-${++idCounter}`);
  return idRef.current;
}
