import * as THREE from 'three';

export function createRingEngravingTexture() {
  const w = 1024;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#cfc9b6';
  ctx.fillRect(0, 0, w, h);

  // Engraved radial hatch ticks around the orbital rings
  ctx.strokeStyle = '#2d2a25';
  for (let x = 0; x < w; x += 6) {
    ctx.lineWidth = x % 24 === 0 ? 2.2 : 1.1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Circumferential double border lines
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.25);
  ctx.lineTo(w, h * 0.25);
  ctx.moveTo(0, h * 0.75);
  ctx.lineTo(w, h * 0.75);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
