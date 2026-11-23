import { memo } from 'react';
import { STUDIO_CONTACT } from '../../config/portfolioData.js';
import { MOOD_THEMES, getMoodTheme } from '../../config/moodThemes.js';

export const FooterBar = memo(function FooterBar({
  moodIndex = 0,
  onChangeMood,
  isDrawerOpen,
  onToggleDrawer,
  onOpenAbout,
}) {
  const activeMood = getMoodTheme(moodIndex);

  return (
    <footer className="relative z-20 w-full px-4 sm:px-8 pb-5 pt-2">
      <div className="max-w-[1620px] mx-auto flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 pt-3.5">
        {/* Bottom-Left: Color-as-Mood Tone Selector (replaces Ink Trail droplets) */}
        <div
          className="flex items-center gap-2.5 sm:min-w-[215px]"
          role="group"
          aria-label="Website Mood Tone Selector"
        >
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-muted select-none">
            MOOD
          </span>

          <div className="flex items-center gap-1">
            {MOOD_THEMES.map((mood, idx) => {
              const isActive = mood.id === activeMood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => onChangeMood?.(idx)}
                  aria-label={mood.ariaLabel}
                  aria-pressed={isActive}
                  title={mood.title}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'border-ink/45 bg-ink/[0.06] scale-105'
                      : 'border-transparent hover:border-ink/25 hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                >
                  <svg width="13" height="16" viewBox="0 0 16 20" fill="none" aria-hidden="true">
                    <path
                      d="M8 1.6C8 1.6 13.6 8.3 13.6 12.6C13.6 15.8 11.1 18.4 8 18.4C4.9 18.4 2.4 15.8 2.4 12.6C2.4 8.3 8 1.6 8 1.6Z"
                      fill={mood.dropletFill}
                      stroke={isActive ? 'var(--ink)' : mood.dropletRing}
                      strokeWidth={isActive ? '1.35' : '1'}
                    />
                    <path
                      d="M5.5 12.7C5.5 14.1 6.5 15.3 7.8 15.7"
                      stroke="rgba(255,255,255,0.62)"
                      strokeWidth="1.05"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              );
            })}
          </div>

          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-soft min-w-[76px] select-none transition-colors duration-200">
            {activeMood.label}
          </span>
        </div>

        {/* Bottom-Center: Quiet Minimal Pill Button 'MODELS & SHADER' */}
        <button
          type="button"
          id="ToggleDrawerBtn"
          aria-expanded={isDrawerOpen}
          aria-controls="StudioDrawer"
          onClick={onToggleDrawer}
          className="px-5 py-2 rounded-full border border-ink/35 bg-paper-light/85 hover:bg-ink hover:text-paper-light text-ink font-mono text-[11px] tracking-[0.2em] uppercase transition-all duration-200 shadow-sm cursor-pointer"
        >
          MODELS &amp; SHADER
        </button>

        {/* Bottom-Right: Monochrome GitHub, LinkedIn, and Custom 'MR' Monogram SVG */}
        <div className="flex items-center gap-4">
          <a
            href={STUDIO_CONTACT.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Profile"
            className="text-ink/75 hover:text-ink transition-colors p-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </a>

          <a
            href={STUDIO_CONTACT.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Profile"
            className="text-ink/75 hover:text-ink transition-colors p-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17A1.4 1.4 0 0 1 15.71 13.57V18.5H18.5M6.88 8.56A1.68 1.68 0 0 0 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19A1.69 1.69 0 0 0 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z" />
            </svg>
          </a>

          {/* Custom Engraved 'MR' Monogram SVG */}
          <button
            type="button"
            onClick={onOpenAbout}
            aria-label="MR Studio Monogram"
            title="MR Atelier"
            className="text-ink hover:opacity-70 transition-opacity p-0.5 cursor-pointer"
          >
            <svg width="32" height="22" viewBox="0 0 44 28" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="42" height="26" rx="4" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M7 21V7L13.5 16.5L20 7V21"
                stroke="currentColor"
                strokeWidth="1.55"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M24.5 21V7H31.5C34.2 7 36 8.6 36 11C36 13.3 34.2 14.9 31.5 14.9H24.5M31 14.9L36.5 21"
                stroke="currentColor"
                strokeWidth="1.55"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
});
