import * as THREE from 'three';
import { createSeededRand } from '../procedural/prng.js';

const PARTICLE_COUNT = 44;
const HALF_HEIGHT = 1.85;

function createInkSplashAtlasTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const rand = createSeededRand(5527);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';

  const paintBlob = (cx, cy, r, lobes = 7, alpha = 1.0) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    const steps = lobes * 3;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wobble =
        1.0 +
        0.24 * Math.sin(a * lobes + rand() * 0.9) +
        0.16 * Math.cos(a * (lobes - 2) - 0.6);
      const rad = r * wobble;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Quadrant (0, 0) center (64, 64): Bold organic Sumi splash + satellite droplets (~72% cell coverage)
  paintBlob(64, 64, 30, 6, 0.98);
  paintBlob(99, 43, 8.5, 5, 0.92);
  paintBlob(34, 92, 7.2, 4, 0.88);
  paintBlob(93, 94, 5.4, 4, 0.82);

  // Quadrant (1, 0) center (192, 64): Calligraphic diagonal nib flick + trailing ink drop
  ctx.save();
  ctx.translate(192, 64);
  ctx.rotate(-0.58);
  ctx.beginPath();
  ctx.ellipse(-4, 0, 36, 14, 0, 0, Math.PI * 2);
  ctx.globalAlpha = 0.98;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(38, 4, 7.5, 0, Math.PI * 2);
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-40, -6, 4.5, 0, Math.PI * 2);
  ctx.globalAlpha = 0.78;
  ctx.fill();
  ctx.restore();

  // Quadrant (0, 1) center (64, 192): Rich ink blot with subtle watercolor halo + dense core
  const grad = ctx.createRadialGradient(64, 192, 10, 64, 192, 44);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 192, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  paintBlob(63, 191, 21, 5, 0.96);

  // Quadrant (1, 1) center (192, 192): Expressive clustered splash spray
  paintBlob(186, 188, 19, 5, 0.96);
  paintBlob(215, 206, 10.5, 4, 0.9);
  paintBlob(168, 212, 8.2, 4, 0.86);
  paintBlob(212, 168, 6.8, 4, 0.82);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Lightweight GPU ink splash & charcoal fleck system using a single
 * 256x256 2x2 sprite atlas (zero fragment trigonometry or branching).
 */
export function createInkParticleSystem(dpr = 1, particleColor = '#141311') {
  const rand = createSeededRand(7331);
  const atlasTex = createInkSplashAtlasTexture();

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const params = new Float32Array(PARTICLE_COUNT * 4); // seed, speed, sizePx, tileIndex (0..3)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const isHalo = i < PARTICLE_COUNT * 0.6;
    let x;
    let y;
    let z;

    if (isHalo) {
      const angle = rand() * Math.PI * 2;
      const radius = 0.95 + rand() * 1.25;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius * 0.72;
      y = (rand() - 0.5) * 2.8 - 0.05;
    } else {
      x = (rand() - 0.5) * 3.6;
      y = (rand() - 0.5) * (HALF_HEIGHT * 1.8) - 0.05;
      z = -0.4 - rand() * 1.3;
    }

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const roll = rand();
    const sizePx =
      roll < 0.16
        ? 13.5 + rand() * 5.5
        : roll < 0.6
          ? 7.5 + rand() * 5.0
          : 4.0 + rand() * 2.8;

    params[i * 4 + 0] = rand();
    params[i * 4 + 1] = 0.14 + rand() * 0.34;
    params[i * 4 + 2] = sizePx;
    params[i * 4 + 3] = Math.floor(rand() * 4);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aParams', new THREE.BufferAttribute(params, 4));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uDpr: { value: dpr },
      uAtlas: { value: atlasTex },
      uParticleColor: { value: new THREE.Color(particleColor) },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aParams;
      uniform float uTime;
      uniform float uDpr;

      varying vec2 vTileOffset;
      varying vec2 vSpin;
      varying float vOpacity;

      void main() {
        float seed = aParams.x;
        float speed = aParams.y;
        float sizePx = aParams.z;
        float tileIdx = aParams.w;

        float angle = seed * 6.283185 + uTime * (0.18 + seed * 0.32) * (seed > 0.5 ? 1.0 : -1.0);
        vSpin = vec2(cos(angle), sin(angle));
        vTileOffset = vec2(mod(tileIdx, 2.0) * 0.5, floor(tileIdx * 0.5) * 0.5);

        float span = ${HALF_HEIGHT.toFixed(2)} * 2.0;
        float rawY = position.y + uTime * speed * 0.16;
        float wrappedY = mod(rawY + ${HALF_HEIGHT.toFixed(2)}, span) - ${HALF_HEIGHT.toFixed(2)};

        float normY = abs(wrappedY) / ${HALF_HEIGHT.toFixed(2)};
        float verticalFade = 1.0 - smoothstep(0.72, 1.0, normY);

        float orbit = uTime * 0.038 * (0.45 + seed * 0.7);
        float oc = cos(orbit);
        float os = sin(orbit);
        vec3 swirled = vec3(
          position.x * oc - position.z * os + sin(uTime * 0.45 + seed * 19.0) * 0.09,
          wrappedY,
          position.x * os + position.z * oc + cos(uTime * 0.40 + seed * 23.0) * 0.07
        );

        vec4 mvPosition = modelViewMatrix * vec4(swirled, 1.0);
        float depthDist = max(-mvPosition.z, 0.9);
        float nearFade = smoothstep(0.95, 1.85, depthDist);
        float richness = 0.36 + 0.28 * fract(seed * 17.37);
        vOpacity = richness * verticalFade * nearFade;

        float perspectiveScale = 3.6 / depthDist;
        gl_PointSize = clamp(sizePx * perspectiveScale * uDpr, 2.5, 24.0 * uDpr);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      uniform vec3 uParticleColor;

      varying vec2 vTileOffset;
      varying vec2 vSpin;
      varying float vOpacity;

      void main() {
        vec2 p = gl_PointCoord - 0.5;
        vec2 ruv = vec2(vSpin.x * p.x - vSpin.y * p.y, vSpin.y * p.x + vSpin.x * p.y);
        vec2 atlasUv = clamp(ruv + 0.5, 0.03, 0.97) * 0.5 + vTileOffset;

        float alpha = texture2D(uAtlas, atlasUv).a * vOpacity;
        if (alpha < 0.02) discard;

        gl_FragColor = vec4(uParticleColor, alpha);
        #include <colorspace_fragment>
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;

  return {
    points,
    update(elapsedTime, parallaxYaw = 0) {
      material.uniforms.uTime.value = elapsedTime;
      points.rotation.y = parallaxYaw * 0.45;
    },
    setDpr(nextDpr) {
      material.uniforms.uDpr.value = nextDpr;
    },
    setColor(hexOrColor) {
      material.uniforms.uParticleColor.value.set(hexOrColor);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      atlasTex?.dispose();
    },
  };
}
