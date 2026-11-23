const DEFAULT_PALETTE = {
  paper: '#f3f2ec',
  ink: '#161513',
  inkRgb: '22, 21, 19',
};

function prepareCardCanvas(canvas, palette = DEFAULT_PALETTE) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(rect.width, 240);
  const h = Math.max(rect.height, 330);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, w, h);

  return { ctx, w, h };
}

export function drawCopperplatePlateI(canvas, palette = DEFAULT_PALETTE) {
  const { ctx, w, h } = prepareCardCanvas(canvas, palette);
  const { paper, ink, inkRgb } = palette;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';

  const cx = w * 0.5;
  const cy = h * 0.45;

  // Sky tonal horizontal etched sky lines (dense at top, fading toward horizon)
  for (let y = 10; y < h * 0.72; y += 3.2) {
    const density = 1 - y / (h * 0.72);
    if (density <= 0.05) continue;
    ctx.strokeStyle = `rgba(${inkRgb}, ${(0.12 + density * 0.34).toFixed(3)})`;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    const dash = 14 + density * 45;
    for (let x = 10; x < w - 10; x += dash + 8) {
      const distFromCenter = Math.hypot(x - cx, y - cy);
      if (distFromCenter < w * 0.28) continue;
      ctx.moveTo(x, y);
      ctx.lineTo(Math.min(w - 10, x + dash), y);
    }
    ctx.stroke();
  }

  // Sacred Astrolabe & Geometric Drafting Rings behind Winged Figure
  ctx.strokeStyle = ink;
  [w * 0.36, w * 0.32, w * 0.22].forEach((r, idx) => {
    ctx.lineWidth = idx === 0 ? 1.1 : 0.65;
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.04, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Astrolabe degree tick marks (batched into single path)
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
    const rIn = w * 0.32;
    const rOut = w * 0.36;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.moveTo(cx + ca * rIn, cy - h * 0.04 + sa * rIn);
    ctx.lineTo(cx + ca * rOut, cy - h * 0.04 + sa * rOut);
  }
  ctx.stroke();

  // Radiant sunbeams (batched into single path)
  ctx.strokeStyle = `rgba(${inkRgb}, 0.26)`;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.moveTo(cx + ca * (w * 0.1), cy - h * 0.06 + sa * (w * 0.1));
    ctx.lineTo(cx + ca * (w * 0.43), cy - h * 0.06 + sa * (w * 0.43));
  }
  ctx.stroke();

  // Ornate Symmetrical Feathered Wings (Left & Right)
  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(cx + side * 8, cy - h * 0.02);
    ctx.scale(side, 1);

    ctx.fillStyle = paper;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(w * 0.16, -h * 0.22, w * 0.38, -h * 0.24, w * 0.43, -h * 0.12);
    ctx.bezierCurveTo(w * 0.36, -h * 0.02, w * 0.24, h * 0.08, w * 0.06, h * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Primary & Secondary Feather Quills (batched)
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    for (let f = 0; f < 13; f++) {
      const t = f / 12;
      const fx = w * (0.05 + t * 0.35);
      const fyTop = -h * (0.05 + Math.sin(t * Math.PI) * 0.15);
      const fyBot = h * (0.12 - t * 0.21);
      ctx.moveTo(w * 0.02, -h * 0.01);
      ctx.quadraticCurveTo(fx * 0.6, fyTop, fx, fyBot);
    }
    ctx.stroke();

    // Feather Barb Crosshatching (batched)
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let f = 0; f < 13; f++) {
      const t = f / 12;
      const fx = w * (0.05 + t * 0.35);
      const fyTop = -h * (0.05 + Math.sin(t * Math.PI) * 0.15);
      const fyBot = h * (0.12 - t * 0.21);
      for (let b = 0.25; b <= 0.9; b += 0.16) {
        const bx = fx * b;
        const by = fyTop * (1 - b) + fyBot * b;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + 4, by + 5);
      }
    }
    ctx.stroke();
    ctx.restore();
  });

  // Central Winged Architectural Seraph / Draped Figure
  ctx.fillStyle = paper;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.2;

  // Halo
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.13, w * 0.065, 0, Math.PI * 2);
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.13, w * 0.032, w * 0.042, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Flowing Robe & Draped Folds
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.055, cy - h * 0.07);
  ctx.lineTo(cx + w * 0.055, cy - h * 0.07);
  ctx.lineTo(cx + w * 0.11, cy + h * 0.28);
  ctx.lineTo(cx - w * 0.11, cy + h * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vertical & Diagonal Drapery Engraving Lines (batched)
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  for (let d = -4; d <= 4; d++) {
    const xTop = cx + d * (w * 0.011);
    const xBot = cx + d * (w * 0.022);
    ctx.moveTo(xTop, cy - h * 0.06);
    ctx.quadraticCurveTo(xTop + d * 2, cy + h * 0.1, xBot, cy + h * 0.27);
  }
  ctx.stroke();

  // Shadow-side crosshatching on right half of robe (batched)
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  for (let y = cy - h * 0.05; y < cy + h * 0.26; y += 3.5) {
    ctx.moveTo(cx + 2, y);
    ctx.lineTo(cx + w * 0.085, y + 3);
  }
  ctx.stroke();

  // Held Drafting Compass / Caliper in Hands
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.01);
  ctx.lineTo(cx - w * 0.065, cy + h * 0.11);
  ctx.moveTo(cx, cy - h * 0.01);
  ctx.lineTo(cx + w * 0.065, cy + h * 0.11);
  ctx.stroke();

  // Architectural Plinth & Ground Crosshatching at Bottom
  const groundY = h * 0.74;
  ctx.fillStyle = paper;
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();

  ctx.lineWidth = 0.65;
  ctx.beginPath();
  for (let y = groundY + 4; y < h; y += 3.5) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = -h * 0.2; x < w; x += 6) {
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + (h - groundY) * 0.8, h);
  }
  ctx.stroke();
}

export function drawCopperplatePlateII(canvas, palette = DEFAULT_PALETTE) {
  const { ctx, w, h } = prepareCardCanvas(canvas, palette);
  const { paper, ink, inkRgb } = palette;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';

  // Radiant Copperplate Sun / Eclipse Disc in Upper Right Sky
  const sunX = w * 0.68;
  const sunY = h * 0.23;
  const sunR = w * 0.11;

  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.stroke();

  // Concentric engraved aura rings around sun
  for (let r = sunR + 5; r < w * 0.45; r += 6) {
    const alpha = Math.max(0.06, 0.32 - (r - sunR) * 0.0022);
    ctx.strokeStyle = `rgba(${inkRgb}, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Radiating copperplate sunbeams (batched)
  ctx.strokeStyle = `rgba(${inkRgb}, 0.24)`;
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.moveTo(sunX + ca * (sunR + 2), sunY + sa * (sunR + 2));
    ctx.lineTo(sunX + ca * (w * 0.42), sunY + sa * (w * 0.42));
  }
  ctx.stroke();

  // Layered Etched Mountain Ridges
  const ridges = [
    { baseY: h * 0.52, amp: h * 0.11, freq: 2.4, phase: 0.4, shade: 0.25 },
    { baseY: h * 0.6, amp: h * 0.09, freq: 3.1, phase: 1.8, shade: 0.42 },
  ];

  ridges.forEach((ridge) => {
    ctx.fillStyle = paper;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const nx = x / w;
      const peak =
        Math.sin(nx * Math.PI * ridge.freq + ridge.phase) * ridge.amp +
        Math.cos(nx * Math.PI * 5.2 - ridge.phase) * (ridge.amp * 0.35);
      ctx.lineTo(x, ridge.baseY - Math.abs(peak));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Slope contour hatch strokes (batched per ridge)
    ctx.strokeStyle = `rgba(${inkRgb}, ${ridge.shade})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = 8; x < w - 8; x += 6) {
      const nx = x / w;
      const yTop =
        ridge.baseY -
        Math.abs(
          Math.sin(nx * Math.PI * ridge.freq + ridge.phase) * ridge.amp +
            Math.cos(nx * Math.PI * 5.2 - ridge.phase) * (ridge.amp * 0.35)
        );
      ctx.moveTo(x, yTop + 3);
      ctx.lineTo(x + 9, yTop + 22);
    }
    ctx.stroke();
  });

  // Still Water Horizon & Engraved Ripples
  const waterY = h * 0.67;
  ctx.fillStyle = paper;
  ctx.fillRect(0, waterY, w, h - waterY);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, waterY);
  ctx.lineTo(w, waterY);
  ctx.stroke();

  for (let y = waterY + 4; y < h; y += 3.2) {
    const t = (y - waterY) / (h - waterY);
    ctx.strokeStyle = `rgba(${inkRgb}, ${(0.18 + t * 0.36).toFixed(3)})`;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    for (let x = 6; x < w - 6; x += 18) {
      const wobble = Math.sin(x * 0.08 + y * 0.25) * 4;
      ctx.moveTo(x, y);
      ctx.lineTo(Math.min(w - 6, x + 11 + wobble), y);
    }
    ctx.stroke();
  }
}

export function drawUploadedCardArt(canvas, img, palette = DEFAULT_PALETTE) {
  const { ctx, w, h } = prepareCardCanvas(canvas, palette);
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;

  ctx.save();
  ctx.filter = 'grayscale(100%) contrast(112%)';
  ctx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);
  ctx.restore();
}
