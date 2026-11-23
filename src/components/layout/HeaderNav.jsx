import { memo } from 'react';
import { NAV_ITEMS } from '../../config/portfolioData.js';

export const HeaderNav = memo(function HeaderNav({ onOpenModal }) {
  return (
    <header className="relative z-20 w-full pt-5 sm:pt-7 px-4 sm:px-8">
      <nav
        aria-label="Primary Editorial Navigation"
        className="max-w-5xl mx-auto flex items-center justify-center gap-6 sm:gap-12 md:gap-16 pb-4 border-b border-ink/15"
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenModal(item.id)}
            className="nav-link font-serif text-xs sm:text-sm tracking-[0.28em] uppercase text-ink hover:opacity-60 transition-opacity py-1 cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
});
