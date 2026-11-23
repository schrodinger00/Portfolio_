import * as THREE from 'three';
import { createSeededRand } from './prng.js';

export function createEyeTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Deterministic PRNG for organic scleral veins & iris striations
  const rand = createSeededRand(4099);

  // Warm ivory sclera base (#f3f0e4)
  ctx.fillStyle = '#f3f0e4';
  ctx.fillRect(0, 0, size, size);

  // Align front iris at u = 0.5, v = 0.5 with sphere rotated Y = -PI/2 so front (+Z) reads u = 0.5
  const cx = size * 0.5;
  const cy = size * 0.5;

  // Subtle branching scleral veins radiating from outer periphery toward iris
  ctx.lineCap = 'round';
  for (let v = 0; v < 38; v++) {
    const angle = (v / 38) * Math.PI * 2 + (rand() - 0.5) * 0.12;
    const rStart = size * (0.2 + rand() * 0.05);
    const rEnd = size * (0.095 + rand() * 0.035);
    ctx.strokeStyle = `rgba(92, 78, 68, ${(0.22 + rand() * 0.22).toFixed(3)})`;
    ctx.lineWidth = 0.9 + rand() * 1.1;

    ctx.beginPath();
    let curR = rStart;
    let curA = angle;
    ctx.moveTo(cx + Math.cos(curA) * curR, cy + Math.sin(curA) * curR);
    for (let step = 0; step < 5; step++) {
      curR -= (rStart - rEnd) / 5;
      curA += (rand() - 0.5) * 0.08;
      ctx.lineTo(cx + Math.cos(curA) * curR, cy + Math.sin(curA) * curR);
    }
    ctx.stroke();
  }

  // Lower crescent shadow across bottom ~30% of the eye
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
  ctx.clip();

  const crescentGrad = ctx.createRadialGradient(
    cx,
    cy - size * 0.05,
    size * 0.11,
    cx,
    cy + size * 0.06,
    size * 0.23
  );
  crescentGrad.addColorStop(0.0, 'rgba(42, 39, 34, 0.0)');
  crescentGrad.addColorStop(0.68, 'rgba(42, 39, 34, 0.04)');
  crescentGrad.addColorStop(0.84, 'rgba(38, 35, 30, 0.62)');
  crescentGrad.addColorStop(1.0, 'rgba(26, 24, 21, 0.85)');
  ctx.fillStyle = crescentGrad;
  ctx.fillRect(0, cy + size * 0.015, size, size * 0.3);
  ctx.restore();

  // Iris / Retina Disc (luminance in 0.16 - 0.42 midtone band so crosshatch + radial fibers shine)
  const irisR = size * 0.088;
  const irisGrad = ctx.createRadialGradient(cx, cy, irisR * 0.28, cx, cy, irisR);
  irisGrad.addColorStop(0.0, '#3a362f');
  irisGrad.addColorStop(0.45, '#595348');
  irisGrad.addColorStop(0.82, '#6c6558');
  irisGrad.addColorStop(0.95, '#3b3730');
  irisGrad.addColorStop(1.0, '#24211d');

  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Crisp circular limbus border
  ctx.strokeStyle = '#1f1d19';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.stroke();

  // Expressive radial iris / retina striations & trabecular fibers
  for (let f = 0; f < 110; f++) {
    const a = (f / 110) * Math.PI * 2 + (rand() - 0.5) * 0.03;
    const r0 = irisR * (0.34 + rand() * 0.08);
    const r1 = irisR * (0.86 + rand() * 0.11);
    const isLightFiber = f % 3 === 0;
    ctx.strokeStyle = isLightFiber
      ? `rgba(176, 168, 148, ${(0.36 + rand() * 0.28).toFixed(3)})`
      : `rgba(28, 26, 22, ${(0.42 + rand() * 0.35).toFixed(3)})`;
    ctx.lineWidth = isLightFiber ? 1.35 : 1.1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.quadraticCurveTo(
      cx + Math.cos(a + 0.03) * ((r0 + r1) * 0.5),
      cy + Math.sin(a + 0.03) * ((r0 + r1) * 0.5),
      cx + Math.cos(a) * r1,
      cy + Math.sin(a) * r1
    );
    ctx.stroke();
  }

  // Concentric collarette ring inside iris
  ctx.strokeStyle = 'rgba(32, 29, 25, 0.58)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, irisR * 0.58, 0, Math.PI * 2);
  ctx.stroke();

  // Central Dark Pupil (texLum < 0.11) with organic etched corona spikes
  const pupilR = irisR * 0.35;
  ctx.fillStyle = '#0e0d0b';
  ctx.beginPath();
  for (let p = 0; p <= 48; p++) {
    const a = (p / 48) * Math.PI * 2;
    const spike = pupilR * (0.94 + Math.sin(a * 9.0) * 0.06 + rand() * 0.08);
    const px = cx + Math.cos(a) * spike;
    const py = cy + Math.sin(a) * spike;
    if (p === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Crisp Upper-Right Catchlight Glint inside Iris/Pupil Edge
  ctx.fillStyle = '#faf8f0';
  ctx.beginPath();
  ctx.ellipse(
    cx + irisR * 0.27,
    cy - irisR * 0.24,
    irisR * 0.11,
    irisR * 0.075,
    -0.5,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + irisR * 0.42, cy - irisR * 0.1, irisR * 0.038, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
