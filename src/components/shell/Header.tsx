'use client';

import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';

interface HeaderProps {
  children: ReactNode;
  autoHide?: boolean;
  hideDelay?: number;
}

export function Header({
  children,
  autoHide = true,
  hideDelay = 20000,
}: HeaderProps) { // code_id:276
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    if (!autoHide) return;

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  }, [autoHide, hideDelay]);

  useEffect(() => {
    if (!autoHide) return;

    const handleScroll = () => { // code_id:277
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY.current) {
        // Scrolling up
        setIsVisible(true);
        resetHideTimer();
      }

      lastScrollY.current = currentScrollY;
    };

    // Start the initial hide timer
    resetHideTimer();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [autoHide, resetHideTimer]);

  const handleMouseEnter = () => { // code_id:278
    if (autoHide) {
      setIsVisible(true);
      resetHideTimer();
    }
  };

  return (
    <header
      className="header"
      data-visible={isVisible}
      role="banner"
      onMouseEnter={handleMouseEnter}
    >
      <div className="header-content">{children}</div>
    </header>
  );
}
