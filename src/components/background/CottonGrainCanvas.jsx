import { memo, useMemo } from 'react';
import { createSeededRand } from '../../engine/procedural/prng.js';

let cachedGrainTileUrl = null;

function createCottonPaperTileDataUrl() {
  if (typeof document === 'undefined') return '';
  if (cachedGrainTileUrl) return cachedGrainTileUrl;

  const tileSize = 256;
  const tile = document.createElement('canvas');
  tile.width = tileSize;
  tile.height = tileSize;
  const tCtx = tile.getContext('2d');
  if (!tCtx) return '';

  const imgData = tCtx.createImageData(tileSize, tileSize);
  const data = imgData.data;

  const rand = createSeededRand(1337);

  for (let i = 0; i < data.length; i += 4) {
    const n1 = rand();
    const n2 = rand();
    const tooth = (n1 + n2) * 0.5;
    const shade = Math.floor(226 + tooth * 24);
    data[i] = shade;
    data[i + 1] = shade - 2;
    data[i + 2] = shade - 8;
    data[i + 3] = Math.floor(14 + Math.abs(tooth - 0.5) * 28);
  }
  tCtx.putImageData(imgData, 0, 0);

  tCtx.lineCap = 'round';
  for (let f = 0; f < 46; f++) {
    const x = rand() * tileSize;
    const y = rand() * tileSize;
    const len = 6 + rand() * 16;
    const ang = rand() * Math.PI * 2;
    const curve = (rand() - 0.5) * 6;
    tCtx.strokeStyle = f % 3 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(90,86,78,0.065)';
    tCtx.lineWidth = 0.45 + rand() * 0.5;
    tCtx.beginPath();
    tCtx.moveTo(x, y);
    tCtx.quadraticCurveTo(
      x + Math.cos(ang) * len * 0.5 - Math.sin(ang) * curve,
      y + Math.sin(ang) * len * 0.5 + Math.cos(ang) * curve,
      x + Math.cos(ang) * len,
      y + Math.sin(ang) * len
    );
    tCtx.stroke();
  }

  cachedGrainTileUrl = tile.toDataURL('image/png');
  return cachedGrainTileUrl;
}

export const CottonGrainCanvas = memo(function CottonGrainCanvas() {
  const tileUrl = useMemo(() => createCottonPaperTileDataUrl(), []);

  return (
    <div
      id="GrainCanvas"
      aria-hidden="true"
      style={
        tileUrl
          ? {
            backgroundImage: `url(${tileUrl})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '256px 256px',
          }
          : undefined
      }
    />
  );
});
