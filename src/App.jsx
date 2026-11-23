import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_MODEL_URLS, TAROT_CARDS_META } from './config/portfolioData.js';
import { DEFAULT_SHADER_PARAMS } from './config/shaderDefaults.js';
import {
  DEFAULT_MOOD_INDEX,
  applyMoodThemeToDocument,
  getMoodTheme,
} from './config/moodThemes.js';
import { prefetchDefaultGlbs } from './engine/loaders/assetPrefetch.js';
import { useGlobalDragDrop } from './hooks/useGlobalDragDrop.js';
import { CottonGrainCanvas } from './components/background/CottonGrainCanvas.jsx';
import { InkPageSplashes } from './components/background/InkPageSplashes.jsx';
import { RuneCursor } from './components/cursor/RuneCursor.jsx';
import { HeaderNav } from './components/layout/HeaderNav.jsx';
import { FooterBar } from './components/layout/FooterBar.jsx';
import { LoadingScreen } from './components/layout/LoadingScreen.jsx';
import { WebGLStage } from './components/stage/WebGLStage.jsx';
import { TarotCard } from './components/stage/TarotCard.jsx';
import { DropOverlay } from './components/stage/DropOverlay.jsx';
import { StudioDrawer } from './components/drawer/StudioDrawer.jsx';

const loadEditorialModal = () =>
  import('./components/modals/EditorialModal.jsx').then((m) => ({
    default: m.EditorialModal,
  }));

const EditorialModal = lazy(loadEditorialModal);

// Start streaming default .glb models in parallel with React/Three initialization
prefetchDefaultGlbs(DEFAULT_MODEL_URLS);

export default function App() {
  const engineRef = useRef(null);
  const leftCardCanvasRef = useRef(null);
  const rightCardCanvasRef = useRef(null);
  const leftCardInputRef = useRef(null);
  const rightCardInputRef = useRef(null);

  const [renderStyle, setRenderStyle] = useState('crosshatch');
  const [params, setParams] = useState(() => ({ ...DEFAULT_SHADER_PARAMS }));
  const [moodIndex, setMoodIndex] = useState(DEFAULT_MOOD_INDEX);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeMood = getMoodTheme(moodIndex);

  useEffect(() => {
    applyMoodThemeToDocument(activeMood);
  }, [activeMood]);
  const [activeModal, setActiveModal] = useState(null);
  const [isTabHidden, setIsTabHidden] = useState(() =>
    typeof document !== 'undefined' ? document.hidden : false
  );

  const [customCards, setCustomCards] = useState({ left: null, right: null });
  const [artworkPreviews, setArtworkPreviews] = useState({ left: '', right: '' });
  const hasDefaultsConfigured = Boolean(
    DEFAULT_MODEL_URLS.handsUrl || DEFAULT_MODEL_URLS.eyeUrl
  );

  const [modelStatus, setModelStatus] = useState({
    statusBadge: hasDefaultsConfigured ? 'LOADING DEFAULT...' : 'PROCEDURAL SCULPT',
    handsLabel: DEFAULT_MODEL_URLS.handsUrl ? 'hands-final.glb' : 'Procedural Cradle',
    eyeLabel: DEFAULT_MODEL_URLS.eyeUrl ? 'eye-final.glb' : 'Procedural Astrolabe',
    hasCustomHands: Boolean(DEFAULT_MODEL_URLS.handsUrl),
    hasCustomEye: Boolean(DEFAULT_MODEL_URLS.eyeUrl),
    hasDefaultsConfigured,
    bootProgress: hasDefaultsConfigured ? 0 : 100,
    bootLabel: hasDefaultsConfigured ? 'INITIALIZING STUDIO' : 'READY',
    isInitialReady: !hasDefaultsConfigured,
  });

  useEffect(() => {
    if (!modelStatus.isInitialReady) return undefined;
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => {
        loadEditorialModal();
      }, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = window.setTimeout(() => {
      loadEditorialModal();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [modelStatus.isInitialReady]);

  const isPaused = Boolean(activeModal) || isTabHidden;

  const handleDropGlbFiles = useCallback((files) => {
    files.forEach((file) => {
      engineRef.current?.loadGlbFile(file, null);
    });
  }, []);

  const isDraggingGlb = useGlobalDragDrop(handleDropGlbFiles);

  useEffect(() => {
    function handleVisibilityChange() {
      setIsTabHidden(document.hidden);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (activeModal) setActiveModal(null);
        else if (isDrawerOpen) setIsDrawerOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, isDrawerOpen]);

  const handleOpenModal = useCallback((modalType) => {
    if (modalType === 'artwork') {
      setArtworkPreviews({
        left: leftCardCanvasRef.current?.toDataURL('image/png') || '',
        right: rightCardCanvasRef.current?.toDataURL('image/png') || '',
      });
    }
    setActiveModal(modalType);
  }, []);

  const handleCloseModal = useCallback(() => setActiveModal(null), []);
  const handleToggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);
  const handleCloseDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const handleOpenAbout = useCallback(() => handleOpenModal('about'), [handleOpenModal]);

  const handleParamChange = useCallback((key, value) => {
    engineRef.current?.updateParams({ [key]: value });
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetSliders = useCallback(() => {
    const reset = { ...DEFAULT_SHADER_PARAMS };
    engineRef.current?.updateParams(reset);
    setParams(reset);
  }, []);

  const handleUploadGlb = useCallback((file, slot) => {
    engineRef.current?.loadGlbFile(file, slot);
  }, []);

  const handleResetModels = useCallback(() => {
    engineRef.current?.restoreDefaults();
  }, []);

  const handleUseProcedural = useCallback(() => {
    engineRef.current?.resetToProcedural();
  }, []);

  const handleTarotUpload = useCallback((file, side) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setCustomCards((prev) => ({ ...prev, [side]: img }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const triggerCardUpload = useCallback((side) => {
    if (side === 'left') leftCardInputRef.current?.click();
    else rightCardInputRef.current?.click();
  }, []);

  const handleResetCard = useCallback((side) => {
    setCustomCards((prev) => ({ ...prev, [side]: null }));
  }, []);

  const handleSwapCardFromModal = useCallback(
    (side) => {
      setActiveModal(null);
      triggerCardUpload(side);
    },
    [triggerCardUpload]
  );

  const isSceneReady = modelStatus.isInitialReady;

  return (
    <>
      <LoadingScreen
        progress={modelStatus.bootProgress}
        statusLabel={modelStatus.bootLabel}
        isReady={isSceneReady}
      />
      <CottonGrainCanvas />
      <InkPageSplashes isPaused={isPaused || !isSceneReady} />
      <RuneCursor isPaused={isTabHidden} />
      <DropOverlay visible={isDraggingGlb} />

      <HeaderNav onOpenModal={handleOpenModal} />

      {/* Symmetrical 3-Column Hero Stage */}
      <main className="relative z-10 flex-1 w-full max-w-[1620px] mx-auto px-3 sm:px-6 lg:px-8 py-2 lg:py-0 flex flex-col lg:grid lg:grid-cols-[235px_minmax(0,1fr)_235px] xl:grid-cols-[260px_minmax(0,1fr)_260px] 2xl:grid-cols-[280px_minmax(0,1fr)_280px] items-center justify-center gap-4 lg:gap-6">
        <WebGLStage
          engineRef={engineRef}
          renderStyle={renderStyle}
          params={params}
          shaderPalette={activeMood.shader}
          backdropInk={activeMood.cssVars['--ink']}
          isPaused={isPaused}
          onStatusChange={setModelStatus}
        />

        <TarotCard
          meta={TAROT_CARDS_META.left}
          orderClass="order-2 lg:order-1"
          canvasRef={leftCardCanvasRef}
          fileInputRef={leftCardInputRef}
          customImage={customCards.left}
          tarotPalette={activeMood.tarot}
          isPaused={isPaused || !isSceneReady}
          onUploadFile={handleTarotUpload}
        />

        <TarotCard
          meta={TAROT_CARDS_META.right}
          orderClass="order-3 lg:order-3"
          canvasRef={rightCardCanvasRef}
          fileInputRef={rightCardInputRef}
          customImage={customCards.right}
          tarotPalette={activeMood.tarot}
          isPaused={isPaused || !isSceneReady}
          onUploadFile={handleTarotUpload}
        />
      </main>

      <FooterBar
        moodIndex={moodIndex}
        onChangeMood={setMoodIndex}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={handleToggleDrawer}
        onOpenAbout={handleOpenAbout}
      />

      <StudioDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        modelStatus={modelStatus}
        renderStyle={renderStyle}
        onChangeRenderStyle={setRenderStyle}
        params={params}
        onParamChange={handleParamChange}
        onResetSliders={handleResetSliders}
        onUploadGlb={handleUploadGlb}
        onResetModels={handleResetModels}
        onUseProcedural={handleUseProcedural}
        onSwapCard={triggerCardUpload}
        onResetCard={handleResetCard}
      />

      {activeModal && (
        <Suspense fallback={null}>
          <EditorialModal
            activeModal={activeModal}
            onClose={handleCloseModal}
            artworkPreviews={artworkPreviews}
            onSwapCardFromModal={handleSwapCardFromModal}
          />
        </Suspense>
      )}
    </>
  );
}
