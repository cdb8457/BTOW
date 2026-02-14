import { useState, useEffect } from 'react';
import { useLayoutStore } from '../stores/layoutStore';

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    () => window.innerWidth >= 768 && window.innerWidth < 1024
  );
  const setLayoutMobile = useLayoutStore((s) => s.setIsMobile);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      setIsMobile(mobile);
      setIsTablet(tablet);
      setLayoutMobile(mobile);
    });

    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [setLayoutMobile]);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
}
