import * as THREE from 'three';

export const crosshatchVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Guard normal against zero-length vectors after Draco decompression
    float nLen = length(normal);
    vec3 safeNormal = nLen > 1e-5 ? normal / nLen : vec3(0.0, 1.0, 0.0);

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vWorldNormal = mat3(modelMatrix) * safeNormal;

    vec4 mvPosition = viewMatrix * worldPosition;
    vViewDir = -mvPosition.xyz;
    vNormal = normalMatrix * safeNormal;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const crosshatchFragmentShader = /* glsl */ `
  uniform int uRenderMode; // 0 = Crosshatch Etch, 1 = Charcoal Wash
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec3 uBaseColor;
  uniform vec3 uLightDir;
  uniform vec3 uRimDir;
  uniform vec3 uEyeWorldPos;
  uniform float uTintStrength;
  uniform float uShadowDepth;
  uniform float uHighlightLift;
  uniform float uContrast;
  uniform float uHatchDensity;
  uniform float uHatchThickness;
  uniform float uEdgeStrength;
  uniform float uOutlineWidth;
  uniform float uUseRimOutline;
  uniform float uDpr;
  uniform vec3 uPaperHighlight;
  uniform vec3 uPaperMidtone;
  uniform vec3 uShadowSepia;
  uniform vec3 uInkColor;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  const vec3 LUMA_W = vec3(0.2126, 0.7152, 0.0722);

  // Precomputed unit rotation vectors for the 4 nib-pen hatch angles (-0.48, 1.02, 0.24, -1.24 rad)
  const vec2 HATCH_CS_1 = vec2( 0.88699, -0.46178);
  const vec2 HATCH_CS_2 = vec2( 0.52337,  0.85211);
  const vec2 HATCH_CS_3 = vec2( 0.97134,  0.23770);
  const vec2 HATCH_CS_4 = vec2( 0.32480, -0.94578);

  // Decode linear texture RGB into perceptual sRGB luminance
  vec3 toPerceptualSrgb(vec3 linearRgb) {
    return pow(max(linearRgb, vec3(0.0)), vec3(0.45454545));
  }

  float getPerceptualLum(vec3 srgbRgb) {
    return dot(srgbRgb, LUMA_W);
  }

  // Fast hardware sqrt perceptual luminance for neighborhood Difference-of-Gaussians taps
  float samplePerceptualLum(vec2 uv, vec3 weightedLuma) {
    float linLum = dot(texture2D(uMap, uv).rgb, weightedLuma);
    return sqrt(max(linLum, 0.0));
  }

  // Anti-aliased screen-space nib-pen stroke with analytical AA (zero fwidth quad stalls)
  float nibStroke(vec2 p, vec2 cs, float freq, float thickness, float warpAmp, float invDpr) {
    vec2 rot = vec2(cs.x * p.x - cs.y * p.y, cs.y * p.x + cs.x * p.y);
    float coord = rot.x * freq + sin(rot.y * 0.055) * warpAmp;
    float distToLine = abs(fract(coord + 0.5) - 0.5);
    float aa = max(freq * (abs(cs.x) + abs(cs.y)) * invDpr, 0.001);
    float halfWidth = clamp(thickness * 0.5, 0.02, 0.48);
    return 1.0 - smoothstep(halfWidth - aa * 0.65, halfWidth + aa * 0.65, distToLine);
  }

  // Procedural organic paper/charcoal grain hash in screen space
  float screenHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    // Safe normal normalization
    float nLen = length(vNormal);
    vec3 N = nLen > 1e-5 ? vNormal / nLen : vec3(0.0, 0.0, 1.0);
    if (!gl_FrontFacing) N = -N;

    float vLen = length(vViewDir);
    vec3 V = vLen > 1e-5 ? vViewDir / vLen : vec3(0.0, 0.0, 1.0);
    vec3 L1 = normalize(uLightDir);
    vec3 L2 = normalize(vec3(-uLightDir.x * 0.65, 0.55, 0.78));

    // 1. Perceptual sRGB Texture Decoding & 4-Tap Rotated Screen-Space UV Neighborhood Analysis
    vec3 albedoLinear = uBaseColor;
    vec3 srgbTex = toPerceptualSrgb(albedoLinear);
    float texLum = getPerceptualLum(srgbTex);
    float detailDelta = 0.0;
    float detailInk = 0.0;
    float pupilMask = 0.0;
    float irisBand = 0.0;
    float albedoLift = 1.0;

    if (uHasMap > 0.5) {
      albedoLinear = texture2D(uMap, vUv).rgb * uBaseColor;
      srgbTex = toPerceptualSrgb(albedoLinear);
      texLum = getPerceptualLum(srgbTex);

      if (uEdgeStrength > 0.001) {
        vec3 weightedLuma = LUMA_W * uBaseColor;
        vec2 duvX = clamp(dFdx(vUv), vec2(-0.015), vec2(0.015));
        vec2 duvY = clamp(dFdy(vUv), vec2(-0.015), vec2(0.015));
        vec2 step1 = max(abs(duvX) + abs(duvY), vec2(0.0013)) * 1.7;
        vec2 step2 = step1 * 2.15;

        float localAvgLum = 0.0;
        localAvgLum += samplePerceptualLum(vUv + vec2( step1.x,  step1.y * 0.4), weightedLuma);
        localAvgLum += samplePerceptualLum(vUv + vec2(-step1.x, -step1.y * 0.4), weightedLuma);
        localAvgLum += samplePerceptualLum(vUv + vec2(-step2.x * 0.4,  step2.y), weightedLuma);
        localAvgLum += samplePerceptualLum(vUv + vec2( step2.x * 0.4, -step2.y), weightedLuma);
        localAvgLum *= 0.25;

        detailDelta = texLum - localAvgLum;
        float darkFissure = max(0.0, -detailDelta);
        float filteredFissure = smoothstep(0.011, 0.072, darkFissure) * darkFissure;
        detailInk = clamp(filteredFissure * uEdgeStrength * 7.2, 0.0, 1.0);
      }

      // Anchor true dark pupils (texLum < 0.11) as a crisp dark pupil center
      pupilMask = 1.0 - smoothstep(0.055, 0.115, texLum);

      // Map iris/retina mid-tones (0.12 - 0.45) into expressive crosshatch mid-tone band
      irisBand = smoothstep(0.095, 0.145, texLum) * (1.0 - smoothstep(0.41, 0.54, texLum));

      // Keep bright sclera & lit hand ivory skin high and uncrushed
      albedoLift = mix(0.86, 1.0, smoothstep(0.46, 0.90, texLum));
    } else {
      albedoLift = mix(0.88, 1.0, smoothstep(0.05, 0.85, texLum));
    }

    // 2. Wide Wrapped Omnidirectional Studio Illumination + Front Camera Fill & Soft-Knee Shadow Floor
    float wrapNdotL = dot(N, L1) * 0.5 + 0.5;
    float fillNdotL = dot(N, L2) * 0.5 + 0.5;
    float camFill   = dot(N, V) * 0.5 + 0.5;
    float studioLight = mix(mix(wrapNdotL, fillNdotL, 0.30), camFill, 0.32);

    // Soft-knee shadow floor + power contrast curve so Shadow Contrast slider smoothly drives mid-to-deep shadows
    float softKnee = 0.14 + 0.86 * pow(clamp(studioLight, 0.0, 1.0), 0.76);
    float lit = mix(1.0, softKnee * albedoLift, uShadowDepth * 1.32);
    float lifted = clamp(lit * uHighlightLift, 0.001, 1.0);
    float baseTone = pow(lifted, max(uContrast, 0.2));

    // Map iris/retina mid-tones (0.12 - 0.45) into crosshatch mid-tone band while respecting Shadow Contrast
    float irisNorm = clamp((texLum - 0.12) / (0.45 - 0.12), 0.0, 1.0);
    float irisContrastExp = mix(0.68, 1.48, clamp((uContrast - 0.6) / 3.4, 0.0, 1.0));
    float irisShaped = pow(max(irisNorm, 0.001), irisContrastExp);
    float irisTargetTone = mix(0.32, 0.68, irisShaped) + clamp(detailDelta * 1.35, -0.10, 0.12);
    float tone = mix(baseTone, clamp(irisTargetTone, 0.24, 0.72), irisBand * 0.92);

    // Directional Fresnel paper-rim lift + upward Eye-to-Hands radial bounce glow
    float fresnel = pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), 2.75);
    float rimSide = smoothstep(-0.25, 0.72, dot(N, uRimDir));
    float rimLift = fresnel * rimSide * 0.22;

    vec3 worldN = normalize(vWorldNormal);
    vec3 toEye = uEyeWorldPos - vWorldPos;
    float eyeDist = length(toEye);
    vec3 toEyeDir = eyeDist > 1e-4 ? toEye / eyeDist : vec3(0.0, 1.0, 0.0);
    float eyeFacing = smoothstep(0.0, 0.85, dot(worldN, toEyeDir));
    float eyeFalloff = smoothstep(2.15, 0.45, eyeDist);
    float belowEye = smoothstep(0.15, -0.35, vWorldPos.y - uEyeWorldPos.y);
    float eyeBounce = eyeFacing * eyeFalloff * mix(0.28, 1.0, belowEye) * 0.19;

    tone = clamp(tone + (rimLift + eyeBounce) * (1.0 - irisBand * 0.75), 0.0, 1.0);

    // 3. Mood-Responsive Parchment Palette + Shadow Ink Pool + Warm & Albedo Tint
    vec3 ivoryHighlight = uPaperHighlight;
    vec3 ivoryMidtone   = uPaperMidtone;
    vec3 shadowSepia    = uShadowSepia;
    vec3 sumiInk        = uInkColor;

    vec3 paperTone = mix(ivoryMidtone, ivoryHighlight, smoothstep(0.28, 0.86, tone));
    float deepSepiaMix = smoothstep(0.34, 0.02, tone) * clamp(uContrast * 0.36, 0.15, 0.95);
    paperTone = mix(paperTone, shadowSepia, deepSepiaMix);

    if (uTintStrength > 0.001) {
      // Progressive warm archival patina (works on both textured and untextured sculptures)
      vec3 warmPatina = vec3(1.10, 0.94, 0.70);
      vec3 warmedTone = mix(paperTone, paperTone * warmPatina, uTintStrength * 0.65);

      // Preserve real model albedo chroma (iris hue, skin warmth, and GLB material tint)
      float linLum = dot(albedoLinear, LUMA_W);
      float safeLinLum = max(linLum, 0.025);
      vec3 chromaLin = clamp(albedoLinear / safeLinLum, vec3(0.32), vec3(1.75));
      float chromaWeight = mix(0.75, 1.0, irisBand) * smoothstep(0.015, 0.09, linLum);
      vec3 tintedTone = warmedTone * mix(vec3(1.0), chromaLin, uTintStrength * chromaWeight);

      // Blend rich albedo luminance into mid/colored zones while preserving nib-pen hatching
      paperTone = mix(tintedTone, albedoLinear * mix(0.85, 1.08, tone), uTintStrength * 0.42);
    }

    // 4. Pure Screen-Space Anti-Aliased Nib-Pen Crosshatching (gl_FragCoord.xy)
    float invDpr = 1.0 / max(uDpr, 1.0);
    vec2 screenPx = gl_FragCoord.xy * invDpr;
    float baseFreq = 0.215 * uHatchDensity;

    float totalInk = 0.0;

    if (uRenderMode == 0) {
      // Crosshatch Etch Mode: 4 progressive nib-pen passes (branching avoids work in pure bright ivory areas)
      float hatchInk = 0.0;
      if (tone < 0.78) {
        float h1 = nibStroke(screenPx, HATCH_CS_1, baseFreq, uHatchThickness, 0.35, invDpr);
        float m1 = smoothstep(0.76, 0.62, tone);
        hatchInk = max(hatchInk, h1 * m1 * 0.86);

        if (tone < 0.57) {
          float h2 = nibStroke(screenPx, HATCH_CS_2, baseFreq * 0.96, uHatchThickness * 0.92, 0.30, invDpr);
          float m2 = smoothstep(0.55, 0.41, tone);
          hatchInk = max(hatchInk, h2 * m2 * 0.89);

          if (tone < 0.37) {
            float h3 = nibStroke(screenPx, HATCH_CS_3, baseFreq * 1.12, uHatchThickness * 0.85, 0.25, invDpr);
            float m3 = smoothstep(0.35, 0.22, tone);
            hatchInk = max(hatchInk, h3 * m3 * 0.92);

            if (tone < 0.21) {
              float h4 = nibStroke(screenPx, HATCH_CS_4, baseFreq * 1.18, uHatchThickness * 0.80, 0.20, invDpr);
              float m4 = smoothstep(0.19, 0.07, tone);
              hatchInk = max(hatchInk, h4 * m4 * 0.95);
            }
          }
        }
      }

      // Deep shadow wash reinforcement under high Shadow Contrast
      float shadowPool = smoothstep(0.22, 0.01, tone) * clamp((uContrast - 1.1) * 0.24, 0.0, 0.65);
      totalInk = clamp(max(max(max(hatchInk, shadowPool), detailInk), pupilMask * 0.96), 0.0, 1.0);
    } else {
      // Charcoal Wash Mode: velvety graphite tooth + soft tonal shading
      float grain = screenHash(floor(screenPx * 0.85));
      float softShade = smoothstep(0.82, 0.12, tone);
      float charcoalTooth = smoothstep(0.15, 0.92, softShade + (grain - 0.5) * 0.24 * softShade);
      totalInk = clamp(max(max(charcoalTooth * 0.85, detailInk * 0.9), pupilMask * 0.96), 0.0, 1.0);
    }

    // Single-pass ink contour for dense meshes (>20k tris) avoids doubling GPU vertex load
    if (uUseRimOutline > 0.5 && uOutlineWidth > 0.001) {
      float ndotv = abs(dot(N, V));
      float rimEdge = clamp(0.14 + uOutlineWidth * 0.34, 0.06, 0.68);
      float rimInk = 1.0 - smoothstep(rimEdge * 0.42, rimEdge, ndotv);
      totalInk = max(totalInk, rimInk * 0.96);
    }

    vec3 finalRgb = mix(paperTone, sumiInk, totalInk);

    // Subtle aerial perspective depth cue separates receding ring arcs & crevices (~14% cap)
    float aerialDepth = clamp((vLen - 3.9) * 0.11, 0.0, 0.14);
    vec3 depthHaze = mix(ivoryMidtone, ivoryHighlight, 0.45);
    finalRgb = mix(finalRgb, depthHaze, aerialDepth);

    gl_FragColor = vec4(finalRgb, 1.0);
    #include <colorspace_fragment>
  }
`;

export const outlineVertexShader = /* glsl */ `
  uniform float uOutlineWidth;
  uniform float uModelRadius;

  void main() {
    float nLen = length(normal);
    vec3 safeNormal = nLen > 1e-5 ? normal / nLen : vec3(0.0, 1.0, 0.0);
    vec3 pos = position + safeNormal * (uOutlineWidth * uModelRadius * 0.006);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const outlineFragmentShader = /* glsl */ `
  uniform vec3 uInkColor;
  void main() {
    gl_FragColor = vec4(uInkColor, 1.0);
    #include <colorspace_fragment>
  }
`;

export function getLightDirectionFromAngle(deg, target = new THREE.Vector3()) {
  const rad = (deg * Math.PI) / 180;
  return target
    .set(Math.sin(rad) * 0.85, 0.58, Math.cos(rad) * 0.85)
    .normalize();
}

export function getRimDirectionFromLight(lightDir, target = new THREE.Vector3()) {
  return target
    .set(-lightDir.x * 0.75, 0.72, 0.25)
    .normalize();
}

export function createOutlineMaterial(modelRadius, params, shaderPalette = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: outlineVertexShader,
    fragmentShader: outlineFragmentShader,
    side: THREE.BackSide,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    uniforms: {
      uOutlineWidth: { value: params.outlineWidth },
      uModelRadius: { value: Math.max(modelRadius, 0.25) },
      uInkColor: { value: new THREE.Color(shaderPalette.inkColor || '#141311') },
    },
  });
}

export function createCrosshatchMaterial(
  sourceMat,
  modelRadius,
  { isOutline = false, useRimOutline = false, renderStyle = 'crosshatch', params, dpr = 1, shaderPalette = {} }
) {
  if (isOutline) {
    return createOutlineMaterial(modelRadius, params, shaderPalette);
  }

  const hasMap = Boolean(sourceMat && sourceMat.map);
  const baseColor =
    sourceMat && sourceMat.color ? sourceMat.color.clone() : new THREE.Color(0xf2efe2);
  const lightDir = getLightDirectionFromAngle(params.lightAngle);

  return new THREE.ShaderMaterial({
    vertexShader: crosshatchVertexShader,
    fragmentShader: crosshatchFragmentShader,
    side: THREE.FrontSide,
    depthWrite: true,
    uniforms: {
      uRenderMode: { value: renderStyle === 'charcoal' ? 1 : 0 },
      uMap: { value: hasMap ? sourceMat.map : null },
      uHasMap: { value: hasMap ? 1.0 : 0.0 },
      uBaseColor: { value: baseColor },
      uLightDir: { value: lightDir },
      uRimDir: { value: getRimDirectionFromLight(lightDir) },
      uEyeWorldPos: { value: new THREE.Vector3(0, params.eyeY, 0) },
      uTintStrength: { value: params.tintStrength },
      uShadowDepth: { value: params.shadowDepth },
      uHighlightLift: { value: params.highlightLift },
      uContrast: { value: params.contrast },
      uHatchDensity: { value: params.hatchDensity },
      uHatchThickness: { value: params.hatchThickness },
      uEdgeStrength: { value: params.edgeStrength },
      uOutlineWidth: { value: params.outlineWidth },
      uUseRimOutline: { value: useRimOutline ? 1.0 : 0.0 },
      uDpr: { value: dpr },
      uPaperHighlight: { value: new THREE.Color(shaderPalette.paperHighlight || '#ece9d8') },
      uPaperMidtone: { value: new THREE.Color(shaderPalette.paperMidtone || '#cfc9b4') },
      uShadowSepia: { value: new THREE.Color(shaderPalette.shadowSepia || '#8f8774') },
      uInkColor: { value: new THREE.Color(shaderPalette.inkColor || '#141311') },
    },
  });
}
