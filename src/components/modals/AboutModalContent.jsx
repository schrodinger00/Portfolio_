import { PRACTICE_DISCIPLINES } from '../../config/portfolioData.js';

export function AboutModalContent() {
  return (
    <div className="space-y-5 text-sm text-ink-soft leading-relaxed">
      <p className="font-serif text-xl sm:text-2xl text-ink leading-snug">
        MR is an independent creative engineering and illustration practice dedicated to bringing the tactile warmth of archival printmaking to real-time 3D web spaces.
      </p>
      <p>
        Rather than treating digital screens as sterile glass, this atelier approaches every viewport as a sheet of heavy cold-press cotton rag—sensitive to pressure, velocity, light angle, and the subtle tooth of India ink.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {PRACTICE_DISCIPLINES.map((item) => (
          <div key={item.label} className="p-4 rounded-xl border border-ink/15 bg-paper-card/70">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-muted mb-1">
              {item.label}
            </div>
            <div className="font-serif text-lg text-ink mb-1">{item.title}</div>
            <p className="text-xs text-ink-soft">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
