import { memo } from 'react';
import {
  INK_SHADER_SLIDERS,
  RENDER_STYLES,
  SPATIAL_ALIGNMENT_SLIDERS,
} from '../../config/shaderDefaults.js';
import { ShaderSlider } from './ShaderSlider.jsx';

export const StudioDrawer = memo(function StudioDrawer({
  isOpen,
  onClose,
  modelStatus,
  renderStyle,
  onChangeRenderStyle,
  params,
  onParamChange,
  onResetSliders,
  onUploadGlb,
  onResetModels,
  onUseProcedural,
  onSwapCard,
  onResetCard,
}) {
  return (
    <aside
      id="StudioDrawer"
      aria-label="3D Models and Crosshatch Shader Controls"
      aria-hidden={!isOpen}
      className={`fixed top-0 right-0 z-40 h-full w-full max-w-[370px] bg-paper-light/[0.98] border-l border-ink/20 [contain:layout_style_paint] will-change-transform transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full pointer-events-none'
        }`}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink/15">
        <div>
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-muted">
            ATELIER WORKBENCH
          </div>
          <h2 className="font-serif text-lg tracking-[0.12em] uppercase text-ink">
            Models &amp; Shader
          </h2>
        </div>
        <button
          type="button"
          id="CloseDrawerBtn"
          aria-label="Close Studio Drawer"
          onClick={onClose}
          className="w-8 h-8 rounded-full border border-ink/25 flex items-center justify-center text-ink hover:bg-ink hover:text-paper-light transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 2L12 12M12 2L2 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Drawer Scrollable Body */}
      <div className="archival-scroll flex-1 overflow-y-auto px-5 py-4 space-y-6 text-xs">
        {/* 01 / UPLOAD .GLB MODELS */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[10.5px] font-medium tracking-[0.18em] uppercase text-ink">
              01 / UPLOAD .GLB MODELS
            </h3>
            <span
              id="ModelStatusBadge"
              className="font-mono text-[9.5px] px-2 py-0.5 rounded-full bg-ink/10 text-ink"
            >
              {modelStatus.statusBadge}
            </span>
          </div>

          <p className="text-[11px] text-ink-muted leading-relaxed">
            Upload Draco-compressed or WebP <code className="font-mono text-ink">.glb</code> files, or drop them anywhere onto the stage.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border border-dashed border-ink/35 hover:border-ink hover:bg-ink/5 transition-colors cursor-pointer text-center">
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink font-medium">
                + HANDS .GLB
              </span>
              <span
                id="HandsFileLabel"
                className="font-mono text-[9px] text-ink-muted truncate max-w-full"
              >
                {modelStatus.handsLabel}
              </span>
              <input
                type="file"
                id="UploadHandsInput"
                accept=".glb,.gltf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadGlb(file, 'hands');
                  e.target.value = '';
                }}
              />
            </label>

            <label className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border border-dashed border-ink/35 hover:border-ink hover:bg-ink/5 transition-colors cursor-pointer text-center">
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink font-medium">
                + EYE .GLB
              </span>
              <span
                id="EyeFileLabel"
                className="font-mono text-[9px] text-ink-muted truncate max-w-full"
              >
                {modelStatus.eyeLabel}
              </span>
              <input
                type="file"
                id="UploadEyeInput"
                accept=".glb,.gltf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadGlb(file, 'eye');
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <button
            type="button"
            id="ResetModelsBtn"
            onClick={onResetModels}
            className="w-full py-1.5 rounded-md border border-ink/20 text-ink-soft hover:text-ink hover:border-ink/50 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors cursor-pointer"
          >
            {modelStatus.hasDefaultsConfigured
              ? 'Restore Default Models'
              : 'Restore Procedural Sculpture'}
          </button>

          {modelStatus.hasDefaultsConfigured && (
            <button
              type="button"
              onClick={onUseProcedural}
              className="w-full py-1 rounded-md text-ink-muted hover:text-ink font-mono text-[9px] tracking-[0.14em] uppercase transition-colors cursor-pointer"
            >
              Use Procedural Fallback
            </button>
          )}
        </section>

        <hr className="border-ink/15" />

        {/* 02 / TAROT CARD ARTWORK */}
        <section className="space-y-2.5">
          <h3 className="font-mono text-[10.5px] font-medium tracking-[0.18em] uppercase text-ink">
            02 / TAROT CARD ARTWORK
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => onSwapCard('left')}
                className="w-full py-1.5 px-2 rounded-md border border-ink/30 hover:bg-ink hover:text-paper-light font-mono text-[9.5px] tracking-[0.12em] uppercase transition-colors cursor-pointer"
              >
                Upload Card 01
              </button>
              <button
                type="button"
                onClick={() => onResetCard('left')}
                className="w-full py-1 px-2 rounded-md text-ink-muted hover:text-ink font-mono text-[9px] tracking-[0.12em] uppercase cursor-pointer"
              >
                Reset Card 01
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => onSwapCard('right')}
                className="w-full py-1.5 px-2 rounded-md border border-ink/30 hover:bg-ink hover:text-paper-light font-mono text-[9.5px] tracking-[0.12em] uppercase transition-colors cursor-pointer"
              >
                Upload Card 02
              </button>
              <button
                type="button"
                onClick={() => onResetCard('right')}
                className="w-full py-1 px-2 rounded-md text-ink-muted hover:text-ink font-mono text-[9px] tracking-[0.12em] uppercase cursor-pointer"
              >
                Reset Card 02
              </button>
            </div>
          </div>
        </section>

        <hr className="border-ink/15" />

        {/* 03 / INK & CROSSHATCH */}
        <section className="space-y-3">
          <h3 className="font-mono text-[10.5px] font-medium tracking-[0.18em] uppercase text-ink">
            03 / INK &amp; CROSSHATCH
          </h3>

          <div
            className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-ink/5 border border-ink/15"
            role="group"
            aria-label="Render Style"
          >
            {RENDER_STYLES.map((style) => {
              const isSelected = renderStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChangeRenderStyle(style.id)}
                  className={`style-seg-btn py-1.5 px-2 rounded-md font-mono text-[10px] tracking-[0.08em] uppercase transition-colors cursor-pointer ${isSelected
                    ? 'bg-ink text-paper-light'
                    : 'text-ink hover:bg-ink/10'
                    }`}
                >
                  {style.label}
                </button>
              );
            })}
          </div>

          {INK_SHADER_SLIDERS.map((slider) => (
            <ShaderSlider
              key={slider.id}
              slider={slider}
              value={params[slider.key]}
              onChange={onParamChange}
            />
          ))}
        </section>

        <hr className="border-ink/15" />

        {/* 04 / SPATIAL ALIGNMENT */}
        <section className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[10.5px] font-medium tracking-[0.18em] uppercase text-ink">
              04 / SPATIAL ALIGNMENT
            </h3>
            <button
              type="button"
              id="ResetSlidersBtn"
              onClick={onResetSliders}
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase underline text-ink-soft hover:text-ink cursor-pointer"
            >
              Reset Sliders
            </button>
          </div>

          {SPATIAL_ALIGNMENT_SLIDERS.map((slider) => (
            <ShaderSlider
              key={slider.id}
              slider={slider}
              value={params[slider.key]}
              onChange={onParamChange}
            />
          ))}
        </section>
      </div>
    </aside>
  );
});
