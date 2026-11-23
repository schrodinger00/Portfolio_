import { PROJECT_STUDIES } from '../../config/portfolioData.js';

export function ProjectsModalContent() {
  return (
    <div className="space-y-6">
      <p className="font-serif text-lg sm:text-xl text-ink-soft leading-relaxed">
        Interactive graphics architectures, non-photorealistic rendering pipelines, and tactile TypeScript interfaces crafted with archival precision.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROJECT_STUDIES.map((study) => (
          <article
            key={study.title}
            className="p-5 rounded-xl border border-ink/20 bg-paper-card/80 space-y-2"
          >
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.16em] text-ink-muted">
              <span>{study.meta}</span>
              <span>{study.year}</span>
            </div>
            <h3 className="font-serif text-xl font-medium text-ink">{study.title}</h3>
            <p className="text-xs text-ink-soft leading-relaxed">{study.description}</p>
            <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[9.5px] text-ink">
              {study.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded bg-ink/8">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
