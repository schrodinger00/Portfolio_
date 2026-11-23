import { memo } from 'react';
import { createSeededRand } from '../../engine/procedural/prng.js';

const SPLASH_PATHS = [
  // 0: Organic Sumi splash + satellite droplets
  'M31 15c7-1 13 4 16 10 2 5-1 12-6 16-5 3-13 5-19 1-6-4-9-11-6-18 3-6 9-9 15-9zm19-3c2 0 4 2 4 4s-2 4-4 4-4-2-4-4 2-4 4-4zM14 45c2 0 3 1 3 3s-1 3-3 3-3-1-3-3 1-3 3-3zm33 2c1.5 0 2.5 1 2.5 2.5S48.5 52 47 52s-2.5-1-2.5-2.5S45.5 47 47 47z',
  // 1: Diagonal calligraphic nib flick + trailing drop
  'M14 43c8-11 20-21 31-26 3-1 6 1 5 4-4 10-15 21-28 28-4 2-11 0-8-6zm40-29c2.5 0 4.5 2 4.5 4.5S56.5 23 54 23s-4.5-2-4.5-4.5S51.5 14 54 14zM11 49c1.8 0 3 1.2 3 3s-1.2 3-3 3-3-1.2-3-3 1.2-3 3-3z',
  // 2: Soft lobed ink blot + micro flecks
  'M32 18c8 1 13 7 12 15-1 7-7 13-14 13-7 0-12-6-12-13 0-8 6-16 14-15zm17 20c2 0 3.5 1.5 3.5 3.5S51 45 49 45s-3.5-1.5-3.5-3.5S47 38 49 38zM15 21c1.5 0 2.8 1.2 2.8 2.8S16.5 26.5 15 26.5s-2.8-1.2-2.8-2.8S13.5 21 15 21z',
  // 3: Dispersed splash spray cluster
  'M28 22c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9zm17-5c3 0 5.5 2.5 5.5 5.5S48 28 45 28s-5.5-2.5-5.5-5.5S42 17 45 17zM16 42c2.5 0 4.5 2 4.5 4.5S18.5 51 16 51s-4.5-2-4.5-4.5S13.5 42 16 42zm26 3c2 0 3.5 1.5 3.5 3.5S44 52 42 52s-3.5-1.5-3.5-3.5S40 45 42 45z',
];

// 12 perimeter splashes total: 6 animated floats + 6 static settled archival flecks
const PAGE_SPLASH_ZONES = [
  { xMin: 2, xMax: 11, yMin: 14, yMax: 42, hideMobile: false, animated: true },
  { xMin: 3, xMax: 12, yMin: 52, yMax: 84, hideMobile: false, animated: false },
  { xMin: 15, xMax: 29, yMin: 8, yMax: 22, hideMobile: true, animated: false },
  { xMin: 15, xMax: 30, yMin: 76, yMax: 90, hideMobile: true, animated: true },
  { xMin: 89, xMax: 97, yMin: 15, yMax: 44, hideMobile: false, animated: true },
  { xMin: 88, xMax: 97, yMin: 52, yMax: 85, hideMobile: false, animated: false },
  { xMin: 71, xMax: 86, yMin: 8, yMax: 22, hideMobile: true, animated: true },
  { xMin: 70, xMax: 85, yMin: 76, yMax: 90, hideMobile: true, animated: false },
  { xMin: 32, xMax: 44, yMin: 6, yMax: 14, hideMobile: false, animated: true },
  { xMin: 56, xMax: 68, yMin: 6, yMax: 14, hideMobile: false, animated: false },
  { xMin: 31, xMax: 44, yMin: 84, yMax: 93, hideMobile: false, animated: false },
  { xMin: 56, xMax: 69, yMin: 84, yMax: 93, hideMobile: false, animated: true },
];

const PAGE_SPLASHES = (() => {
  const rand = createSeededRand(9187);
  return PAGE_SPLASH_ZONES.map((zone, idx) => {
    const isAccent = idx % 3 === 0;
    const size = isAccent ? 18 + rand() * 10 : 10 + rand() * 7;
    const rotA = Math.round((rand() - 0.5) * 280);
    const rotB = rotA + Math.round((rand() > 0.5 ? 1 : -1) * (12 + rand() * 22));
    const dx = Math.round((rand() - 0.5) * 24);
    const dy = Math.round(-12 - rand() * 20);
    const duration = (18 + rand() * 10).toFixed(1);
    const delay = (-rand() * 22).toFixed(1);
    const opacity = isAccent ? (0.19 + rand() * 0.13).toFixed(2) : (0.24 + rand() * 0.16).toFixed(2);

    const styleVars = zone.animated
      ? {
          '--dx': `${dx}px`,
          '--dy': `${dy}px`,
          '--rot-a': `${rotA}deg`,
          '--rot-b': `${rotB}deg`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        }
      : {
          transform: `rotate(${rotA}deg)`,
        };

    return {
      id: idx,
      variant: idx % SPLASH_PATHS.length,
      left: `${(zone.xMin + rand() * (zone.xMax - zone.xMin)).toFixed(1)}%`,
      top: `${(zone.yMin + rand() * (zone.yMax - zone.yMin)).toFixed(1)}%`,
      size: Math.round(size),
      opacity,
      animated: zone.animated,
      hideMobile: zone.hideMobile,
      styleVars,
    };
  });
})();

export const InkPageSplashes = memo(function InkPageSplashes({ isPaused }) {
  return (
    <div
      aria-hidden="true"
      className={`ink-page-splashes${isPaused ? ' is-paused' : ''}`}
    >
      {PAGE_SPLASHES.map((item) => (
        <svg
          key={item.id}
          viewBox="0 0 64 64"
          fill="currentColor"
          className={`ink-page-splash${item.animated ? ' is-animated' : ''}${item.hideMobile ? ' hidden md:block' : ''}`}
          style={{
            left: item.left,
            top: item.top,
            width: `${item.size}px`,
            height: `${item.size}px`,
            opacity: item.opacity,
            ...item.styleVars,
          }}
        >
          <path d={SPLASH_PATHS[item.variant]} />
        </svg>
      ))}
    </div>
  );
});
