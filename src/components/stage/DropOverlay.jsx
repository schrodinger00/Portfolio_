import { memo } from 'react';

export const DropOverlay = memo(function DropOverlay({ visible }) {
  return (
    <div
      id="DropOverlay"
      className={`fixed inset-0 z-50 items-center justify-center bg-paper-light/90 backdrop-blur-sm transition-opacity duration-200 pointer-events-none ${
        visible ? 'flex' : 'hidden'
      }`}
    >
      <div className="border border-ink/70 bg-paper-card/95 px-10 py-8 rounded-xl shadow-xl text-center max-w-md mx-4">
        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-muted mb-2">
          GLTF / DRACO / WEBP IMPORTER
        </div>
        <div className="font-serif text-2xl tracking-wide text-ink mb-2">
          Release .GLB Sculpture File
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          Auto-detects Hands vs. Mystical Eye via filename or aspect ratio and renders in perceptual Crosshatch Etch.
        </p>
      </div>
    </div>
  );
});
