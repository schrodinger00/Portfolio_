import { TAROT_CARDS_META } from '../../config/portfolioData.js';

export function ArtworkModalContent({ previews, onSwapCard }) {
  const cards = [
    { meta: TAROT_CARDS_META.left, previewSrc: previews.left, alt: 'Plate I Preview' },
    { meta: TAROT_CARDS_META.right, previewSrc: previews.right, alt: 'Plate II Preview' },
  ];

  return (
    <div className="space-y-6">
      <p className="font-serif text-lg sm:text-xl text-ink-soft leading-relaxed">
        Procedural high-DPI drypoint plates and dip-pen studies rendered directly onto cold-press cotton stock. Swap custom illustrations directly onto the homepage tarot frames at any time.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {cards.map(({ meta, previewSrc, alt }) => (
          <div
            key={meta.side}
            className="p-4 rounded-xl border border-ink/20 bg-paper-card flex flex-col items-center"
          >
            <div className="w-full aspect-[3/4] rounded-lg overflow-hidden border border-ink/25 bg-paper-card">
              {previewSrc && (
                <img src={previewSrc} alt={alt} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="w-full flex items-center justify-between mt-3 pt-2 border-t border-ink/15">
              <div>
                <div className="font-serif text-base uppercase tracking-wider text-ink">
                  {meta.modalTitle}
                </div>
                <div className="font-mono text-[10px] text-ink-muted">{meta.modalSubtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => onSwapCard(meta.side)}
                className="px-3 py-1 rounded-full border border-ink/35 hover:bg-ink hover:text-paper-light font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
              >
                Swap Art
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
