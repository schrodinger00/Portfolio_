import { memo, useEffect, useRef, useState } from 'react';

const TARGETS =
  'a, button, input, select, textarea, label, .cursor-target-card, [role="button"], .cursor-pointer';

export const RuneCursor = memo(function RuneCursor({ isPaused = false }) {
  const cursorRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove('has-rune-cursor');
      return;
    }
    document.documentElement.classList.add('has-rune-cursor');
    return () => document.documentElement.classList.remove('has-rune-cursor');
  }, [enabled]);

  useEffect(() => {
    const cursorEl = cursorRef.current;
    if (!enabled || isPaused || !cursorEl) return;

    let overTarget = false;
    let isDown = false;
    let isActive = false;
    let visible = false;
    let lastCheckedTarget = null;
    let moveRafId = null;
    let nextX = 0;
    let nextY = 0;

    const refresh = () => {
      const next = overTarget || isDown;
      if (next !== isActive) {
        isActive = next;
        cursorEl.classList.toggle('is-active', next);
      }
    };

    const flushPointerPosition = () => {
      moveRafId = null;
      cursorEl.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
      if (!visible) {
        visible = true;
        cursorEl.style.opacity = '1';
        cursorEl.classList.add('is-visible');
      }
    };

    const handlePointerMove = (e) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
        if (visible) {
          visible = false;
          cursorEl.style.opacity = '0';
          cursorEl.classList.remove('is-visible');
        }
        return;
      }
      nextX = e.clientX;
      nextY = e.clientY;
      if (moveRafId === null) {
        moveRafId = requestAnimationFrame(flushPointerPosition);
      }
    };

    const handlePointerOver = (e) => {
      const target = e.target;
      if (!target || target === lastCheckedTarget) return;
      lastCheckedTarget = target;
      const tag = target.tagName;
      const isDirectInteractive =
        tag === 'A' ||
        tag === 'BUTTON' ||
        tag === 'INPUT' ||
        tag === 'SELECT' ||
        tag === 'TEXTAREA' ||
        tag === 'LABEL';
      const nextOver = isDirectInteractive || Boolean(target.closest?.(TARGETS));
      if (nextOver !== overTarget) {
        overTarget = nextOver;
        refresh();
      }
    };

    const handlePointerOut = (e) => {
      if (!e.relatedTarget?.closest?.(TARGETS)) {
        lastCheckedTarget = null;
        if (overTarget) {
          overTarget = false;
          refresh();
        }
      }
    };

    const handlePointerDown = (e) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      isDown = true;
      refresh();
    };

    const handlePointerUp = () => {
      isDown = false;
      refresh();
    };

    const handleLeave = () => {
      if (moveRafId !== null) {
        cancelAnimationFrame(moveRafId);
        moveRafId = null;
      }
      visible = false;
      overTarget = false;
      isDown = false;
      lastCheckedTarget = null;
      cursorEl.style.opacity = '0';
      cursorEl.classList.remove('is-visible');
      refresh();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.addEventListener('pointerout', handlePointerOut, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('blur', handleLeave);
    document.documentElement.addEventListener('mouseleave', handleLeave);

    return () => {
      if (moveRafId !== null) {
        cancelAnimationFrame(moveRafId);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('blur', handleLeave);
      document.documentElement.removeEventListener('mouseleave', handleLeave);
    };
  }, [enabled, isPaused]);

  if (!enabled || isPaused) return null;

  return (
    <div id="RuneCursor" ref={cursorRef} aria-hidden="true" style={{ opacity: 0 }}>
      {/* Normal state: slightly larger spinning square in its own GPU layer */}
      <div className="cursor-rolling-square">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="5" y="5" width="18" height="18" stroke="var(--ink, #141311)" strokeWidth="1.3" />
        </svg>
      </div>

      {/* Hover / click state: spinning hexagonal alchemical rune reticle */}
      <div className="cursor-alchemical-reticle">
        {/* Outer rotating hexagon ring + vertex pips */}
        <svg className="cursor-hex-outer" width="84" height="84" viewBox="0 0 84 84" fill="none">
          <polygon
            points="42,11.5 68.41,26.75 68.41,57.25 42,72.5 15.59,57.25 15.59,26.75"
            stroke="var(--paper-light, #f4f2eb)"
            strokeWidth="2.5"
            strokeOpacity="0.7"
          />
          <polygon
            points="42,8 71.44,25 71.44,59 42,76 12.56,59 12.56,25"
            stroke="var(--ink, #141311)"
            strokeWidth="0.8"
            strokeDasharray="1.6 3.0"
            opacity="0.72"
          />
          <polygon
            points="42,11.5 68.41,26.75 68.41,57.25 42,72.5 15.59,57.25 15.59,26.75"
            stroke="var(--ink, #141311)"
            strokeWidth="1.15"
          />
          {/* Vertex cardinal ticks & masked hex astrolabe pips */}
          <path
            d="M42 5.5V9.5 M42 74.5V78.5 M71.2 25.1L74.6 23.1 M9.4 60.9L12.8 58.9 M71.2 58.9L74.6 60.9 M9.4 23.1L12.8 25.1"
            stroke="var(--ink, #141311)"
            strokeWidth="1.0"
            strokeLinecap="round"
          />
          <circle cx="42" cy="11.5" r="2.4" fill="var(--paper-light, #f4f2eb)" stroke="var(--ink, #141311)" strokeWidth="1.0" />
          <circle cx="68.41" cy="26.75" r="2.4" fill="var(--paper-light, #f4f2eb)" stroke="var(--ink, #141311)" strokeWidth="1.0" />
          <circle cx="68.41" cy="57.25" r="2.4" fill="var(--paper-light, #f4f2eb)" stroke="var(--ink, #141311)" strokeWidth="1.0" />
          <circle cx="42" cy="72.5" r="2.4" fill="var(--paper-light, #f4f2eb)" stroke="var(--ink, #141311)" strokeWidth="1.0" />
          <circle cx="15.59" cy="57.25" r="2.4" fill="var(--paper-light, #f4f2eb)" stroke="var(--ink, #141311)" strokeWidth="1.0" />
          <circle cx="15.59" cy="26.75" r="2.4" fill="var(--paper-light, #f4f2eb)" stroke="var(--ink, #141311)" strokeWidth="1.0" />
        </svg>

        {/* Counter-rotating inner inscribed hexagon + diamond seal */}
        <svg className="cursor-hex-inner" width="84" height="84" viewBox="0 0 84 84" fill="none">
          <polygon
            points="66.5,42 54.25,63.22 29.75,63.22 17.5,42 29.75,20.78 54.25,20.78"
            stroke="var(--ink, #141311)"
            strokeWidth="1.8"
            strokeDasharray="1.5 2.5"
          />
          <polygon
            points="42,27.5 54.56,34.75 54.56,49.25 42,56.5 29.44,49.25 29.44,34.75"
            stroke="var(--ink, #141311)"
            strokeWidth="0.9"
          />
          <line x1="29.75" y1="20.78" x2="36.2" y2="32.0" stroke="var(--ink, #141311)" strokeWidth="0.75" opacity="0.65" />
          <line x1="54.25" y1="63.22" x2="47.8" y2="52.0" stroke="var(--ink, #141311)" strokeWidth="0.75" opacity="0.65" />
          <line x1="54.25" y1="20.78" x2="47.8" y2="32.0" stroke="var(--ink, #141311)" strokeWidth="0.75" opacity="0.65" />
          <line x1="29.75" y1="63.22" x2="36.2" y2="52.0" stroke="var(--ink, #141311)" strokeWidth="0.75" opacity="0.65" />
          <rect
            x="36"
            y="36"
            width="12"
            height="12"
            transform="rotate(45 42 42)"
            stroke="var(--ink, #141311)"
            strokeWidth="1.05"
          />
        </svg>
      </div>

      {/* Center core dot */}
      <svg className="cursor-core-dot" width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="2.7" fill="var(--ink, #141311)" />
      </svg>
    </div>
  );
});
