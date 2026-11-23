import { memo, useEffect } from 'react';
import {
  drawCopperplatePlateI,
  drawCopperplatePlateII,
  drawUploadedCardArt,
} from '../../engine/procedural/tarotPlates.js';
import { useCardGyroscope } from '../../hooks/useCardGyroscope.js';

export const TarotCard = memo(function TarotCard({
  meta,
  orderClass,
  canvasRef,
  fileInputRef,
  customImage,
  tarotPalette,
  isPaused = false,
  onUploadFile,
}) {
  const isLeft = meta.side === 'left';
  const canvasId = isLeft ? 'TarotCanvasLeft' : 'TarotCanvasRight';
  const { stageRef, frameRef, glareRef, artRef, gyroHandlers } = useCardGyroscope({
    isPaused,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastDrawKey = '';

    const renderCard = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const drawKey = `${Math.round(rect.width)}x${Math.round(rect.height)}@${dpr}`;
      if (drawKey === lastDrawKey) return;
      lastDrawKey = drawKey;

      if (customImage) {
        drawUploadedCardArt(canvas, customImage, tarotPalette);
      } else if (isLeft) {
        drawCopperplatePlateI(canvas, tarotPalette);
      } else {
        drawCopperplatePlateII(canvas, tarotPalette);
      }
    };

    renderCard();

    const resizeObserver = new ResizeObserver(renderCard);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasRef, customImage, isLeft, tarotPalette]);

  return (
    <aside
      ref={stageRef}
      {...gyroHandlers}
      className={`${orderClass} tarot-stage w-full max-w-[270px] mx-auto flex flex-col items-center`}
    >
      <div
        ref={frameRef}
        className="tarot-frame w-full rounded-xl p-3 sm:p-3.5 flex flex-col items-center"
      >
        {/* GPU-composited Gyroscope Specular Vellum Sheen */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl z-20"
          aria-hidden="true"
        >
          <div ref={glareRef} className="tarot-glare-sheen" />
        </div>

        {/* Top Roman Numeral Header */}
        <div className="w-full flex items-center justify-between px-1.5 pt-0.5 pb-2 border-b border-ink/15 text-[10px] font-mono tracking-[0.2em] text-ink/70">
          <span>{meta.plate}</span>
          <span>{meta.technique}</span>
        </div>

        {/* High-DPI Procedural Etched Ink Illustration Canvas */}
        <div className="relative w-full aspect-[3/4.15] my-2.5 overflow-hidden rounded-md border border-ink/25 bg-paper-card">
          <div
            ref={artRef}
            className="w-full h-full will-change-transform"
            style={{ transform: 'translate3d(0, 0, 0) scale(1.025)' }}
          >
            <canvas ref={canvasRef} id={canvasId} className="w-full h-full block" />
          </div>

          {/* Hover-Only Swap Art Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="swap-btn z-30 absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-ink/90 text-paper-light font-mono text-[10px] tracking-[0.18em] uppercase shadow-md hover:bg-ink cursor-pointer whitespace-nowrap"
          >
            SWAP ART
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file, meta.side);
              e.target.value = '';
            }}
          />
        </div>

        {/* Caption & Subtitle */}
        <div className="w-full text-center pt-1 pb-0.5 border-t border-ink/15">
          <h2 className="font-serif text-base sm:text-[17px] font-medium tracking-[0.16em] uppercase text-ink mt-1">
            {meta.title}
          </h2>
          <p className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-muted mt-0.5">
            {meta.subtitle}
          </p>
        </div>
      </div>
    </aside>
  );
});
