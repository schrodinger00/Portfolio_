import * as THREE from 'three';

const SHADOW_Y_OFFSET = -0.58;
const SIGIL_BASE_Y = 0.18;
const SIGIL_Z = -1.78;

const contactShadowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const contactShadowFragmentShader = /* glsl */ `
  uniform vec3 uShadowColor;
  uniform float uBreathMix;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;

    // Twin subtle lobes matching left & right cupped hands + soft shared cradle falloff
    float leftDist = length((p - vec2(-0.24, 0.02)) * vec2(1.45, 2.05));
    float rightDist = length((p - vec2(0.24, 0.02)) * vec2(1.45, 2.05));
    float cradleDist = length(p * vec2(1.12, 1.85));

    float lobeGlow = exp(-leftDist * leftDist * 3.1) * 0.52 + exp(-rightDist * rightDist * 3.1) * 0.52;
    float baseShadow = exp(-cradleDist * cradleDist * 2.8) * 0.65;
    float radialFade = 1.0 - smoothstep(0.55, 0.98, length(p));

    float alpha = clamp((lobeGlow * 0.55 + baseShadow * 0.6) * radialFade * uBreathMix, 0.0, 0.34);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(uShadowColor, alpha);
    #include <colorspace_fragment>
  }
`;

const sigilVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vOuterUv;
  varying vec2 vInnerUv;

  vec2 rotateUv(vec2 uv, float angle) {
    vec2 centered = uv - 0.5;
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * centered.x - s * centered.y, s * centered.x + c * centered.y) + 0.5;
  }

  void main() {
    vOuterUv = rotateUv(uv, -uTime * 0.045);
    vInnerUv = rotateUv(uv, uTime * 0.035);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sigilFragmentShader = /* glsl */ `
  uniform sampler2D uSigilMap;
  uniform vec3 uInkColor;
  uniform float uZoomFade;
  varying vec2 vOuterUv;
  varying vec2 vInnerUv;

  void main() {
    float outerInk = texture2D(uSigilMap, vOuterUv).r;
    float innerInk = texture2D(uSigilMap, vInnerUv).g;
    float alpha = max(outerInk, innerInk) * 0.14 * uZoomFade;
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(uInkColor, alpha);
    #include <colorspace_fragment>
  }
`;

function createBakedSigilTexture() {
  const size = 768;
  const half = size * 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Opaque black prevents alpha-premultiply bleed across mipmaps; outer sits in R, inner in G
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const hexPath = (apothemNorm, pointyTop) => {
    const vertexR = apothemNorm * 1.15470054 * half;
    const angleOffset = pointyTop ? Math.PI / 6 : 0;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = angleOffset + (i * Math.PI) / 3;
      const x = half + Math.cos(a) * vertexR;
      const y = half + Math.sin(a) * vertexR;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // 1. Outer counter-rotating seal (Red channel)
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.72)';
  ctx.lineWidth = size * 0.0028;
  ctx.setLineDash([size * 0.022, size * 0.029]);
  hexPath(0.71, true);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
  ctx.lineWidth = size * 0.0036;
  hexPath(0.64, true);
  ctx.stroke();

  const outerVertexR = 0.64 * 1.15470054 * half;
  const pipR = 0.036 * half;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    const vx = half + Math.cos(a) * outerVertexR;
    const vy = half + Math.sin(a) * outerVertexR;
    ctx.beginPath();
    ctx.arc(vx, vy, pipR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 0, 0, 0.92)';
  ctx.lineWidth = size * 0.0034;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    const vx = half + Math.cos(a) * outerVertexR;
    const vy = half + Math.sin(a) * outerVertexR;
    ctx.moveTo(vx + pipR, vy);
    ctx.arc(vx, vy, pipR, 0, Math.PI * 2);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 0, 0, 0.85)';
  ctx.lineWidth = size * 0.0032;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.moveTo(half + ca * (outerVertexR + 0.06 * half), half + sa * (outerVertexR + 0.06 * half));
    ctx.lineTo(half + ca * (outerVertexR + 0.135 * half), half + sa * (outerVertexR + 0.135 * half));
  }
  ctx.stroke();

  // 2. Inner counter-rotating seal (Green channel via additive 'lighter' pass)
  ctx.globalCompositeOperation = 'lighter';

  ctx.strokeStyle = 'rgba(0, 255, 0, 0.78)';
  ctx.lineWidth = size * 0.0042;
  ctx.setLineDash([size * 0.02, size * 0.026]);
  hexPath(0.48, false);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.72)';
  ctx.lineWidth = size * 0.0032;
  hexPath(0.3, true);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 255, 0, 0.52)';
  ctx.lineWidth = size * 0.0032;
  ctx.beginPath();
  [Math.PI / 3, (2 * Math.PI) / 3, (4 * Math.PI) / 3, (5 * Math.PI) / 3].forEach((a) => {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.moveTo(half + ca * 0.34 * half, half + sa * 0.34 * half);
    ctx.lineTo(half + ca * 0.53 * half, half + sa * 0.53 * half);
  });
  ctx.stroke();

  const dRad = 0.15 * Math.SQRT2 * half;
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.75)';
  ctx.lineWidth = size * 0.0034;
  ctx.beginPath();
  ctx.moveTo(half, half - dRad);
  ctx.lineTo(half + dRad, half);
  ctx.lineTo(half, half + dRad);
  ctx.lineTo(half - dRad, half);
  ctx.closePath();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createDepthBackdrop(initialPalette = {}) {
  const group = new THREE.Group();

  const shadowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uShadowColor: { value: new THREE.Color(initialPalette.inkColor || '#141311') },
      uBreathMix: { value: 0.28 },
    },
    vertexShader: contactShadowVertexShader,
    fragmentShader: contactShadowFragmentShader,
  });

  const shadowGeo = new THREE.PlaneGeometry(3.4, 2.2);
  const contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadowMesh.rotation.x = -Math.PI * 0.5;
  contactShadowMesh.position.set(0, -1.4, 0.04);
  contactShadowMesh.renderOrder = -2;
  group.add(contactShadowMesh);

  const sigilTex = createBakedSigilTexture();
  const sigilMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSigilMap: { value: sigilTex },
      uInkColor: {
        value: new THREE.Color(initialPalette.sigilColor || initialPalette.inkColor || '#141311'),
      },
      uTime: { value: 0 },
      uZoomFade: { value: 1.0 },
    },
    vertexShader: sigilVertexShader,
    fragmentShader: sigilFragmentShader,
  });

  const sigilGeo = new THREE.PlaneGeometry(3.8, 3.8);
  const recessedSigilMesh = new THREE.Mesh(sigilGeo, sigilMat);
  recessedSigilMesh.position.set(0, SIGIL_BASE_Y, SIGIL_Z);
  recessedSigilMesh.renderOrder = -3;
  group.add(recessedSigilMesh);

  return {
    group,
    setPalette(palette, sigilColor) {
      if (palette?.inkColor) {
        shadowMat.uniforms.uShadowColor.value.set(palette.inkColor);
      }
      const nextSigilColor = sigilColor || palette?.sigilColor || palette?.inkColor;
      if (nextSigilColor) {
        sigilMat.uniforms.uInkColor.value.set(nextSigilColor);
      }
    },
    update({
      elapsedTime = 0,
      handsY = -0.82,
      breathOffset = 0,
      handsScale = 1,
      parallaxYaw = 0,
      parallaxPitch = 0,
      cameraDistance = 4.3,
    }) {
      sigilMat.uniforms.uTime.value = elapsedTime;
      sigilMat.uniforms.uZoomFade.value = THREE.MathUtils.clamp((cameraDistance - 2.2) / 1.5, 0.22, 1.0);

      // Grounded elliptical shadow tracks hands Y-offset and responds inversely to breathing height
      contactShadowMesh.position.y = handsY + SHADOW_Y_OFFSET;
      const scaleMul = Math.max(0.6, handsScale);
      const liftShrink = 1 - breathOffset * 1.4;
      contactShadowMesh.scale.set(scaleMul * liftShrink, scaleMul * liftShrink, 1);
      shadowMat.uniforms.uBreathMix.value = 0.28 - breathOffset * 1.2;

      // Recessed sigil trails softly in depth behind the forward hands & eye
      recessedSigilMesh.position.x = -parallaxYaw * 1.35;
      recessedSigilMesh.position.y = SIGIL_BASE_Y + parallaxPitch * 1.1;
    },
    dispose() {
      shadowGeo.dispose();
      shadowMat.dispose();
      sigilGeo.dispose();
      sigilMat.dispose();
      sigilTex?.dispose();
    },
  };
}
