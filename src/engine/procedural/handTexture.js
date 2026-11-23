import * as THREE from 'three';
import { createSeededRand } from './prng.js';

export function createHandTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const rand = createSeededRand(8191);

  // Clean warm ivory-bone base (#f2efe1) so ~80% of hands stay uncrushed warm ivory
  ctx.fillStyle = '#f2efe1';
  ctx.fillRect(0, 0, size, size);

  // Subtle warm parchment tonal mottling
  for (let m = 0; m < 45; m++) {
    const mx = rand() * size;
    const my = rand() * size;
    const mr = 40 + rand() * 110;
    const grad = ctx.createRadialGradient(mx, my, 4, mx, my, mr);
    grad.addColorStop(0, 'rgba(218, 211, 188, 0.24)');
    grad.addColorStop(1, 'rgba(242, 239, 225, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  // Delicate porcelain / dry-clay crackle fissures across palms & fingers
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function drawCrackleBranch(x, y, angle, length, width, depth) {
    if (depth <= 0 || length < 8) return;
    let cx = x;
    let cy = y;
    let curA = angle;
    const steps = 5;
    const stepLen = length / steps;

    ctx.strokeStyle = `rgba(38, 35, 30, ${(0.48 + depth * 0.12).toFixed(3)})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx, cy);

    for (let s = 0; s < steps; s++) {
      curA += (rand() - 0.5) * 0.72;
      cx += Math.cos(curA) * stepLen;
      cy += Math.sin(curA) * stepLen;
      ctx.lineTo(cx, cy);

      if (rand() < 0.42 && depth > 1) {
        const branchSign = rand() < 0.5 ? -1 : 1;
        drawCrackleBranch(
          cx,
          cy,
          curA + branchSign * (0.55 + rand() * 0.5),
          length * 0.62,
          width * 0.72,
          depth - 1
        );
      }
    }
    ctx.stroke();
  }

  // Seed crackle networks across the UV grid so seams and palms look organically fractured
  for (let gx = 0; gx < 5; gx++) {
    for (let gy = 0; gy < 5; gy++) {
      const sx = (gx + 0.25 + rand() * 0.5) * (size / 5);
      const sy = (gy + 0.25 + rand() * 0.5) * (size / 5);
      const startAng = rand() * Math.PI * 2;
      drawCrackleBranch(sx, sy, startAng, 95 + rand() * 65, 1.65, 3);
    }
  }

  // Horizontal knuckle & palm crease lines
  for (let k = 0; k < 14; k++) {
    const ky = size * (0.18 + (k / 14) * 0.62);
    const kx = size * (0.12 + rand() * 0.55);
    const kw = size * (0.14 + rand() * 0.18);
    ctx.strokeStyle = 'rgba(42, 39, 34, 0.42)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.quadraticCurveTo(
      kx + kw * 0.5,
      ky + (rand() - 0.5) * 14,
      kx + kw,
      ky + (rand() - 0.5) * 8
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
