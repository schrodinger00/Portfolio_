import { memo, useEffect, useRef } from 'react';
import { DEFAULT_MODEL_URLS } from '../../config/portfolioData.js';
import { StageEngine } from '../../engine/StageEngine.js';

export const WebGLStage = memo(function WebGLStage({
  engineRef,
  renderStyle,
  params,
  shaderPalette,
  backdropInk,
  isPaused,
  onStatusChange,
}) {
  const stageContainerRef = useRef(null);
  const initialStyleRef = useRef(renderStyle);
  const initialParamsRef = useRef(params);
  const initialPaletteRef = useRef(shaderPalette);
  const initialBackdropInkRef = useRef(backdropInk);
  const statusCallbackRef = useRef(onStatusChange);
  const isPropPausedRef = useRef(isPaused);
  const isOffscreenRef = useRef(false);
  statusCallbackRef.current = onStatusChange;

  useEffect(() => {
    const container = stageContainerRef.current;
    if (!container) return;

    const engine = new StageEngine(container, {
      initialRenderStyle: initialStyleRef.current,
      initialParams: initialParamsRef.current,
      initialShaderPalette: {
        ...initialPaletteRef.current,
        sigilColor: initialBackdropInkRef.current,
      },
      defaultModels: DEFAULT_MODEL_URLS,
      onStatusChange: (status) => statusCallbackRef.current?.(status),
    });

    engineRef.current = engine;
    const syncPause = () => {
      engine.setPaused(isPropPausedRef.current || isOffscreenRef.current);
    };
    syncPause();

    function handleResize() {
      if (!stageContainerRef.current) return;
      engine.resize(
        stageContainerRef.current.clientWidth,
        stageContainerRef.current.clientHeight
      );
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let intersectionObserver = null;
    if (typeof IntersectionObserver === 'function') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          isOffscreenRef.current = !entry.isIntersecting;
          syncPause();
        },
        { threshold: 0.01 }
      );
      intersectionObserver.observe(container);
    }

    return () => {
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      engine.destroy();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [engineRef]);

  useEffect(() => {
    engineRef.current?.setRenderStyle(renderStyle);
  }, [engineRef, renderStyle]);

  useEffect(() => {
    engineRef.current?.updateParams(params);
  }, [engineRef, params]);

  useEffect(() => {
    engineRef.current?.setMoodShaderPalette(shaderPalette, backdropInk);
  }, [engineRef, shaderPalette, backdropInk]);

  useEffect(() => {
    isPropPausedRef.current = isPaused;
    engineRef.current?.setPaused(isPaused || isOffscreenRef.current);
  }, [engineRef, isPaused]);

  return (
    <section
      aria-label="Interactive 3D Crosshatch Sculpture"
      className="order-1 lg:order-2 relative w-full h-[58vh] min-h-[420px] sm:h-[66vh] lg:h-[82vh] xl:h-[84vh] max-h-[960px] flex items-center justify-center"
    >
      <div
        ref={stageContainerRef}
        id="WebGLStage"
        className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing"
      />

      {/* Subtle Interactive Cue */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-mono tracking-[0.18em] uppercase text-ink/45 whitespace-nowrap">
        <span>DRAG TO ORBIT</span>
        <span>•</span>
        <span>SCROLL TO ZOOM</span>
      </div>
    </section>
  );
});
