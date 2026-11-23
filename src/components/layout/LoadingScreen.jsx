import { memo, useEffect, useState } from 'react';

export const LoadingScreen = memo(function LoadingScreen({
  progress = 0,
  statusLabel = 'INITIALIZING STUDIO',
  isReady = false,
}) {
  const [unmounted, setUnmounted] = useState(isReady);

  useEffect(() => {
    if (!isReady) return undefined;
    const timer = window.setTimeout(() => {
      setUnmounted(true);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [isReady]);

  if (unmounted) return null;

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      id="LoadingScreen"
      role="status"
      aria-live="polite"
      aria-busy={!isReady}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 select-none transition-opacity duration-300 ease-out ${
        isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 44%, var(--paper-light) 0%, var(--paper-base) 56%, var(--paper-edge) 100%)',
      }}
    >
      <div className="w-full max-w-[260px] flex flex-col items-center gap-5">
        {/* Hexagonal Alchemical Seal */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg
            className="loading-seal-spin w-full h-full"
            width="80"
            height="80"
            viewBox="0 0 84 84"
            fill="none"
            aria-hidden="true"
          >
            <polygon
              points="42,9 70.58,25.5 70.58,58.5 42,75 13.42,58.5 13.42,25.5"
              stroke="var(--ink)"
              strokeWidth="1.05"
              strokeOpacity="0.82"
            />
            <polygon
              points="42,16.5 64.08,29.25 64.08,54.75 42,67.5 19.92,54.75 19.92,29.25"
              stroke="var(--ink)"
              strokeWidth="0.9"
              strokeDasharray="1.8 2.8"
              strokeOpacity="0.6"
            />
            <rect
              x="34.5"
              y="34.5"
              width="15"
              height="15"
              transform="rotate(45 42 42)"
              stroke="var(--ink)"
              strokeWidth="1.05"
            />
          </svg>
          <span
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--ink)' }}
            aria-hidden="true"
          />
        </div>

        {/* Studio Eyebrow */}
        <div className="text-center space-y-1">
          <p className="font-serif text-base tracking-[0.28em] uppercase text-ink">
            MR ATELIER
          </p>
          <p className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-ink-muted">
            PREPARING ETCHED STAGE
          </p>
        </div>

        {/* Thin Archival Progress Rule */}
        <div className="w-full space-y-2">
          <div className="w-full h-[2px] rounded-full overflow-hidden bg-ink/15">
            <div
              className="w-full h-full origin-left bg-ink will-change-transform transition-transform duration-150 ease-out"
              style={{ transform: `scaleX(${clampedProgress / 100})` }}
            />
          </div>

          <div className="flex items-center justify-between font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-soft">
            <span>{statusLabel}</span>
            <span className="tabular-nums text-ink">{clampedProgress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
});
