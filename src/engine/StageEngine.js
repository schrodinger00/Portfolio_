import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { DEFAULT_SHADER_PARAMS } from '../config/shaderDefaults.js';
import {
  createCrosshatchMaterial,
  getLightDirectionFromAngle,
  getRimDirectionFromLight,
} from './shaders/crosshatchShader.js';
import { createInkParticleSystem } from './particles/inkParticles.js';
import { createEyeTexture } from './procedural/eyeTexture.js';
import { createHandTexture } from './procedural/handTexture.js';
import { createRingEngravingTexture } from './procedural/ringTexture.js';
import {
  buildProceduralEyeGroup,
  buildProceduralHandsGroup,
} from './procedural/proceduralSculpture.js';
import { createGlbLoaderManager, normalizeLoadedGltf } from './loaders/glbModelLoader.js';
import { createDepthBackdrop } from './stage/depthBackdrop.js';
import { disposeMaterialSafely, disposeObject3D } from './disposal.js';

export class StageEngine {
  constructor(
    container,
    {
      initialRenderStyle = 'crosshatch',
      initialParams = DEFAULT_SHADER_PARAMS,
      initialShaderPalette = {},
      defaultModels = {},
      onStatusChange,
    } = {}
  ) {
    this.container = container;
    this.renderStyle = initialRenderStyle;
    this.params = { ...DEFAULT_SHADER_PARAMS, ...initialParams };
    this.shaderPalette = {
      paperHighlight: initialShaderPalette.paperHighlight || '#ece9d8',
      paperMidtone: initialShaderPalette.paperMidtone || '#cfc9b4',
      shadowSepia: initialShaderPalette.shadowSepia || '#8f8774',
      inkColor: initialShaderPalette.inkColor || '#141311',
      sigilColor: initialShaderPalette.sigilColor || initialShaderPalette.inkColor || '#141311',
    };
    this.defaultModels = {
      handsUrl: defaultModels.handsUrl || null,
      eyeUrl: defaultModels.eyeUrl || null,
    };
    this.onStatusChange = onStatusChange;

    this.hasCustomHands = false;
    this.hasCustomEye = false;
    this.handsSource = 'procedural'; // 'procedural' | 'default' | 'custom'
    this.eyeSource = 'procedural';
    this.handsFileName = 'Procedural Cradle';
    this.eyeFileName = 'Procedural Astrolabe';
    this.statusBadge = 'PROCEDURAL SCULPT';
    this.isInitialReady = false;
    this.bootProgress = 0;
    this.bootLabel = 'INITIALIZING STUDIO';
    this._bootSlotProgress = { hands: 0, eye: 0 };

    this.isPaused = false;
    this.isDestroyed = false;
    this.rafId = null;
    this.lastFrameTime = performance.now();
    this.elapsedTotal = 0;

    // Independent slot epoch guards allow parallel default/custom loads without race cancellation
    this.loadEpoch = { hands: 0, eye: 0 };

    // Flat caches avoid scene.traverse() on every slider input event
    this.activeShaderMaterials = [];
    this.activeOutlineMaterials = [];
    this.activeOutlineMeshes = [];
    this.eyeCoreGroup = null;
    this.ringEntries = [];
    this._tempLightDir = new THREE.Vector3();
    this._tempRimDir = new THREE.Vector3();
    this._tempEyeWorld = new THREE.Vector3();
    this._tempEyeNdc = new THREE.Vector3();

    // Normalized cursor state in viewport NDC (-1..+1) for eye gaze & parallax tracking
    this.hasPointer = false;
    this.pointerNdc = new THREE.Vector2(0, 0);
    this.eyeGazeCurrent = { yaw: 0, pitch: 0 };
    this.parallaxCurrent = { yaw: 0, pitch: 0 };

    this.proceduralEyeTex = null;
    this.proceduralHandTex = null;
    this.proceduralRingTex = null;
    this.sharedProceduralTextures = new Set();

    this._initThree();
    this._initInkParticles();
    this._bindPointerTracking();

    this.loaderManager = createGlbLoaderManager(this.renderer);

    this.restoreDefaults({ isInitialBoot: true });
    this._startLoop();
  }

  _getEffectiveDpr() {
    const raw = window.devicePixelRatio || 1;
    // Dense photogrammetry/Tripo GLBs (300k+ tris) run crisply at 1.0 DPR with MSAA, eliminating non-integer resampling and double-allocations
    const expectsGlb = Boolean(this.defaultModels.handsUrl || this.defaultModels.eyeUrl);
    const cap = this.hasCustomHands || this.hasCustomEye || expectsGlb ? 1.0 : 1.5;
    return Math.min(raw, cap);
  }

  _ensurePbrEnvironment() {
    if (this.scene.environment || this.isDestroyed) return;
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();
  }

  _initThree() {
    const initW = Math.max(this.container.clientWidth, 300);
    const initH = Math.max(this.container.clientHeight, 300);
    const dpr = this._getEffectiveDpr();

    this.scene = new THREE.Scene();

    const aspect = initW / initH;
    this.camera = new THREE.PerspectiveCamera(this._getResponsiveFov(aspect), aspect, 0.1, 50);
    this.camera.position.set(0, 0.05, 4.3);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(initW, initH, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    if (this.renderStyle === 'pbr') {
      this._ensurePbrEnvironment();
    }

    const hemiLight = new THREE.HemisphereLight(0xf6f4ea, 0x5c584f, 0.9);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.8);
    keyLight.position.set(2.4, 3.2, 3.0);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xeae6d8, 1.1);
    rimLight.position.set(-2.6, 1.8, -2.0);
    this.scene.add(rimLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 7.2;
    this.controls.target.set(0, -0.08, 0);
    this.controls.update();

    this.depthBackdrop = createDepthBackdrop(this.shaderPalette);
    this.scene.add(this.depthBackdrop.group);

    this.sculptureRoot = new THREE.Group();
    this.sculptureRoot.rotation.order = 'YXZ';
    this.scene.add(this.sculptureRoot);

    this.handsAnchor = new THREE.Group();
    this.handsAnchor.position.set(0, this.params.handsY, 0);
    this.handsAnchor.rotation.x = -THREE.MathUtils.degToRad(this.params.handsPitch);
    this.sculptureRoot.add(this.handsAnchor);

    this.eyeAnchor = new THREE.Group();
    this.eyeAnchor.position.set(0, this.params.eyeY, 0);
    this.sculptureRoot.add(this.eyeAnchor);
  }

  _bindPointerTracking() {
    this._viewportW = window.innerWidth || 1;
    this._viewportH = window.innerHeight || 1;

    this._handleViewportResize = () => {
      this._viewportW = window.innerWidth || 1;
      this._viewportH = window.innerHeight || 1;
    };

    this._handlePointerMove = (e) => {
      if (this.isPaused) return;
      this.pointerNdc.set(
        (e.clientX / this._viewportW) * 2 - 1,
        -(e.clientY / this._viewportH) * 2 + 1
      );
      this.hasPointer = true;
    };

    window.addEventListener('resize', this._handleViewportResize, { passive: true });
    window.addEventListener('pointermove', this._handlePointerMove, { passive: true });
  }

  _getResponsiveFov(aspect) {
    // Keep wide cupped hands cleanly unclipped on narrow portrait screens while framing large on desktop
    if (aspect < 0.95) {
      return Math.min(46, 35 + (0.95 - aspect) * 22);
    }
    return 35;
  }

  _ensureProceduralAssets() {
    if (!this.proceduralEyeTex) {
      this.proceduralEyeTex = createEyeTexture();
      this.sharedProceduralTextures.add(this.proceduralEyeTex);
    }
    if (!this.proceduralHandTex) {
      this.proceduralHandTex = createHandTexture();
      this.sharedProceduralTextures.add(this.proceduralHandTex);
    }
    if (!this.proceduralRingTex) {
      this.proceduralRingTex = createRingEngravingTexture();
      this.sharedProceduralTextures.add(this.proceduralRingTex);
    }
  }

  _initInkParticles() {
    const dpr = this._getEffectiveDpr();
    this.inkParticles = createInkParticleSystem(dpr, this.shaderPalette.sigilColor);
    this.scene.add(this.inkParticles.points);
  }

  _emitStatus() {
    if (this.isDestroyed || !this.onStatusChange) return;
    this.onStatusChange({
      statusBadge: this.statusBadge,
      handsLabel: this.handsFileName,
      eyeLabel: this.eyeFileName,
      hasCustomHands: this.hasCustomHands,
      hasCustomEye: this.hasCustomEye,
      hasDefaultsConfigured: Boolean(this.defaultModels.handsUrl || this.defaultModels.eyeUrl),
      bootProgress: this.bootProgress,
      bootLabel: this.bootLabel,
      isInitialReady: this.isInitialReady,
    });
  }

  _computeDefaultBadge() {
    if (this.handsSource === 'custom' && this.eyeSource === 'custom') return 'CUSTOM HANDS + EYE';
    if (this.handsSource === 'custom') return 'CUSTOM HANDS';
    if (this.eyeSource === 'custom') return 'CUSTOM EYE';
    if (this.handsSource === 'default' && this.eyeSource === 'default') return 'DEFAULT HANDS + EYE';
    if (this.handsSource === 'default') return 'DEFAULT HANDS';
    if (this.eyeSource === 'default') return 'DEFAULT EYE';
    return 'PROCEDURAL SCULPT';
  }

  _rebuildShaderCache() {
    this.activeShaderMaterials = [];
    this.activeOutlineMaterials = [];
    this.activeOutlineMeshes = [];

    [this.handsAnchor, this.eyeAnchor].forEach((group) => {
      group.traverse((child) => {
        if (!child.isMesh) return;
        const mat = child.material;
        if (child.userData && child.userData.isOutlineClone) {
          this.activeOutlineMeshes.push(child);
          if (mat && mat.isShaderMaterial && mat.uniforms) {
            this.activeOutlineMaterials.push(mat);
          }
          return;
        }
        if (mat && mat.isShaderMaterial && mat.uniforms) {
          this.activeShaderMaterials.push(mat);
        }
      });
    });
  }

  applyRenderStyleToGroup(rootGroup) {
    const box = new THREE.Box3().setFromObject(rootGroup);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const modelRadius = Math.max(sphere.radius, 0.25);
    const dpr = this._getEffectiveDpr();

    const meshes = [];
    rootGroup.traverse((child) => {
      if (child.isMesh && !child.userData.isOutlineClone) {
        meshes.push(child);
      }
    });

    meshes.forEach((mesh) => {
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
      }

      const prevOutline = mesh.children.find((c) => c.userData && c.userData.isOutlineClone);
      if (prevOutline) {
        mesh.remove(prevOutline);
        if (prevOutline.material) {
          disposeMaterialSafely(prevOutline.material, this.sharedProceduralTextures);
        }
      }

      if (
        mesh.material &&
        mesh.material !== mesh.userData.originalMaterial &&
        mesh.material.isShaderMaterial
      ) {
        mesh.material.dispose();
      }

      if (this.renderStyle === 'pbr') {
        mesh.material = mesh.userData.originalMaterial;
        if (mesh.material) {
          mesh.material.needsUpdate = true;
        }
      } else {
        const origMat = Array.isArray(mesh.userData.originalMaterial)
          ? mesh.userData.originalMaterial[0]
          : mesh.userData.originalMaterial;

        const triCount = mesh.geometry?.index
          ? mesh.geometry.index.count / 3
          : (mesh.geometry?.attributes?.position?.count || 0) / 3;
        const useRimOutline = triCount > 20000;

        const shaderMat = createCrosshatchMaterial(origMat, modelRadius, {
          isOutline: false,
          useRimOutline,
          renderStyle: this.renderStyle,
          params: this.params,
          dpr,
          shaderPalette: this.shaderPalette,
        });
        mesh.material = shaderMat;

        if (!useRimOutline) {
          const outlineMat = createCrosshatchMaterial(origMat, modelRadius, {
            isOutline: true,
            renderStyle: this.renderStyle,
            params: this.params,
            dpr,
            shaderPalette: this.shaderPalette,
          });
          const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
          outlineMesh.userData.isOutlineClone = true;
          outlineMesh.frustumCulled = mesh.frustumCulled;
          outlineMesh.visible = this.params.outlineWidth > 0.001;
          mesh.add(outlineMesh);
        }
      }
    });

    this._rebuildShaderCache();
  }

  setRenderStyle(nextStyle) {
    if (this.renderStyle === nextStyle) return;
    const prevWasPbr = this.renderStyle === 'pbr';
    const nextIsPbr = nextStyle === 'pbr';
    this.renderStyle = nextStyle;

    if (nextIsPbr) {
      this._ensurePbrEnvironment();
    }

    // Switching between crosshatch and charcoal only flips uRenderMode without recreating shaders
    if (!prevWasPbr && !nextIsPbr && this.activeShaderMaterials.length > 0) {
      this.updateShaderUniforms();
      return;
    }

    this.applyRenderStyleToGroup(this.handsAnchor);
    this.applyRenderStyleToGroup(this.eyeAnchor);
    this.updateShaderUniforms();
  }

  updateParams(nextParams) {
    if (!nextParams) return;
    let changed = false;
    for (const key in nextParams) {
      if (this.params[key] !== nextParams[key]) {
        this.params[key] = nextParams[key];
        changed = true;
      }
    }
    if (!changed) return;
    this.updateShaderUniforms();
  }

  setMoodShaderPalette(nextPalette, sigilColor) {
    if (!nextPalette) return;
    Object.assign(this.shaderPalette, nextPalette);
    if (sigilColor) {
      this.shaderPalette.sigilColor = sigilColor;
    }

    for (let i = 0; i < this.activeOutlineMaterials.length; i++) {
      this.activeOutlineMaterials[i].uniforms.uInkColor.value.set(this.shaderPalette.inkColor);
    }

    for (let i = 0; i < this.activeShaderMaterials.length; i++) {
      const u = this.activeShaderMaterials[i].uniforms;
      u.uPaperHighlight.value.set(this.shaderPalette.paperHighlight);
      u.uPaperMidtone.value.set(this.shaderPalette.paperMidtone);
      u.uShadowSepia.value.set(this.shaderPalette.shadowSepia);
      u.uInkColor.value.set(this.shaderPalette.inkColor);
    }

    this.depthBackdrop?.setPalette(this.shaderPalette, sigilColor);
    this.inkParticles?.setColor(this.shaderPalette.sigilColor);
  }

  updateShaderUniforms() {
    getLightDirectionFromAngle(this.params.lightAngle, this._tempLightDir);
    getRimDirectionFromLight(this._tempLightDir, this._tempRimDir);
    const dpr = this._getEffectiveDpr();
    const showOutlines = this.renderStyle !== 'pbr' && this.params.outlineWidth > 0.001;
    const renderMode = this.renderStyle === 'charcoal' ? 1 : 0;

    for (let i = 0; i < this.activeOutlineMeshes.length; i++) {
      this.activeOutlineMeshes[i].visible = showOutlines;
    }

    for (let i = 0; i < this.activeOutlineMaterials.length; i++) {
      this.activeOutlineMaterials[i].uniforms.uOutlineWidth.value = this.params.outlineWidth;
    }

    for (let i = 0; i < this.activeShaderMaterials.length; i++) {
      const u = this.activeShaderMaterials[i].uniforms;
      u.uRenderMode.value = renderMode;
      u.uLightDir.value.copy(this._tempLightDir);
      u.uRimDir.value.copy(this._tempRimDir);
      u.uTintStrength.value = this.params.tintStrength;
      u.uShadowDepth.value = this.params.shadowDepth;
      u.uHighlightLift.value = this.params.highlightLift;
      u.uContrast.value = this.params.contrast;
      u.uHatchDensity.value = this.params.hatchDensity;
      u.uHatchThickness.value = this.params.hatchThickness;
      u.uEdgeStrength.value = this.params.edgeStrength;
      u.uOutlineWidth.value = this.params.outlineWidth;
      u.uDpr.value = dpr;
    }

    this.inkParticles?.setDpr(dpr);
    this.handsAnchor.scale.setScalar(this.params.handsScale);
    this.handsAnchor.position.y = this.params.handsY;
    this.handsAnchor.rotation.x = -THREE.MathUtils.degToRad(this.params.handsPitch);
    this.eyeAnchor.scale.setScalar(this.params.eyeScale);
    this.eyeAnchor.position.y = this.params.eyeY;

    this.eyeAnchor.updateWorldMatrix(true, false);
    this._tempEyeWorld.setFromMatrixPosition(this.eyeAnchor.matrixWorld);
    for (let i = 0; i < this.activeShaderMaterials.length; i++) {
      this.activeShaderMaterials[i].uniforms.uEyeWorldPos.value.copy(this._tempEyeWorld);
    }

    this.depthBackdrop?.update({
      elapsedTime: this.elapsedTotal,
      handsY: this.params.handsY,
      breathOffset: 0,
      handsScale: this.params.handsScale,
      parallaxYaw: this.parallaxCurrent.yaw,
      parallaxPitch: this.parallaxCurrent.pitch,
      cameraDistance: this.camera.position.distanceTo(this.controls.target),
    });
  }

  _mountProceduralHands() {
    this._ensureProceduralAssets();
    disposeObject3D(this.handsAnchor, { protectedTextures: this.sharedProceduralTextures });
    this.handsAnchor.add(buildProceduralHandsGroup(this.proceduralHandTex));
    this.hasCustomHands = false;
    this.handsSource = 'procedural';
    this.handsFileName = 'Procedural Cradle';
    this.applyRenderStyleToGroup(this.handsAnchor);
  }

  _mountProceduralEye() {
    this._ensureProceduralAssets();
    disposeObject3D(this.eyeAnchor, { protectedTextures: this.sharedProceduralTextures });
    const { eyeAssembly, eyeCoreGroup, ringEntries } = buildProceduralEyeGroup(
      this.proceduralEyeTex,
      this.proceduralRingTex
    );
    this.eyeCoreGroup = eyeCoreGroup;
    this.ringEntries = ringEntries;
    this.eyeAnchor.add(eyeAssembly);
    this.hasCustomEye = false;
    this.eyeSource = 'procedural';
    this.eyeFileName = 'Procedural Astrolabe';
    this.applyRenderStyleToGroup(this.eyeAnchor);
  }

  _mountSlotWrapper(slot, normalized, label, sourceKind) {
    if (slot === 'hands') {
      disposeObject3D(this.handsAnchor, { protectedTextures: this.sharedProceduralTextures });
      this.handsAnchor.add(normalized.wrapper);
      this.hasCustomHands = true;
      this.handsSource = sourceKind;
      this.handsFileName = label;
      this.applyRenderStyleToGroup(this.handsAnchor);
    } else {
      disposeObject3D(this.eyeAnchor, { protectedTextures: this.sharedProceduralTextures });
      this.eyeCoreGroup = normalized.eyeCoreGroup;
      this.ringEntries = normalized.ringEntries || [];
      this.eyeAnchor.add(normalized.wrapper);
      this.hasCustomEye = true;
      this.eyeSource = sourceKind;
      this.eyeFileName = label;
      this.applyRenderStyleToGroup(this.eyeAnchor);
    }

    this._syncRendererDpr();
    this.updateShaderUniforms();
    this.statusBadge = this._computeDefaultBadge();
    this._emitStatus();
  }

  _syncRendererDpr() {
    if (!this.renderer || this.isDestroyed) return;
    const dpr = this._getEffectiveDpr();
    if (Math.abs(this.renderer.getPixelRatio() - dpr) > 0.01) {
      const w = Math.max(this.container.clientWidth, 300);
      const h = Math.max(this.container.clientHeight, 300);
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
    }
  }

  _syncBootProgress(label) {
    if (this.isInitialReady || !this._bootSlotProgress) return;
    const avg = (this._bootSlotProgress.hands + this._bootSlotProgress.eye) * 0.5;
    this.bootProgress = Math.max(this.bootProgress, Math.min(94, Math.round(avg * 100)));
    if (label) {
      this.bootLabel = label;
    }
  }

  async _loadGlbInternal(source, displayName, forcedSlot = null, { isDefault = false } = {}) {
    const startEpochs = { ...this.loadEpoch };
    const slotEpoch = forcedSlot ? ++this.loadEpoch[forcedSlot] : null;

    this.statusBadge = isDefault ? 'LOADING DEFAULT...' : 'DECODING GLB...';
    this._emitStatus();

    try {
      let lastEmittedPct = -1;
      const onProgress = (pct) => {
        if (this.isDestroyed) return;
        if (lastEmittedPct !== -1 && pct < 100 && Math.abs(pct - lastEmittedPct) < 4) return;
        lastEmittedPct = pct;
        this.statusBadge = `LOADING ${pct}%`;
        if (isDefault && forcedSlot && !this.isInitialReady) {
          this._bootSlotProgress[forcedSlot] = Math.min(0.84, (pct / 100) * 0.84);
          this._syncBootProgress('FETCHING SCULPTURES');
        }
        this._emitStatus();
      };

      const gltf =
        typeof source === 'string'
          ? await this.loaderManager.loadFromUrl(source, onProgress, { useKtx2: !isDefault })
          : await this.loaderManager.loadFromFile(source, onProgress);

      if (this.isDestroyed) {
        disposeObject3D(gltf.scene || gltf.scenes[0]);
        return false;
      }

      if (isDefault && forcedSlot && !this.isInitialReady) {
        this._bootSlotProgress[forcedSlot] = 0.88;
        this._syncBootProgress('DECODING GEOMETRY');
        this._emitStatus();
      }

      const normalized = normalizeLoadedGltf(gltf, displayName, forcedSlot);
      const isStale = forcedSlot
        ? this.loadEpoch[forcedSlot] !== slotEpoch
        : this.loadEpoch[normalized.slot] !== startEpochs[normalized.slot];

      if (isStale) {
        disposeObject3D(normalized.wrapper);
        return false;
      }

      if (!forcedSlot) {
        this.loadEpoch[normalized.slot] += 1;
      }

      this._mountSlotWrapper(normalized.slot, normalized, displayName, isDefault ? 'default' : 'custom');

      if (isDefault && forcedSlot && !this.isInitialReady) {
        this._bootSlotProgress[forcedSlot] = 0.94;
        this._syncBootProgress('PREPARING INK STAGE');
        this._emitStatus();
      }

      return true;
    } catch (err) {
      console.error('GLB Load Error:', err);
      if (isDefault && forcedSlot) {
        if (forcedSlot === 'hands' && this.handsAnchor.children.length === 0) {
          this._mountProceduralHands();
        } else if (forcedSlot === 'eye' && this.eyeAnchor.children.length === 0) {
          this._mountProceduralEye();
        }
        this.updateShaderUniforms();
        if (!this.isInitialReady) {
          this._bootSlotProgress[forcedSlot] = 0.94;
          this._syncBootProgress('PREPARING INK STAGE');
        }
      }
      this.statusBadge = isDefault ? this._computeDefaultBadge() : 'GLB DECODE ERROR';
      this._emitStatus();
      return false;
    }
  }

  loadGlbFile(file, forcedSlot = null) {
    if (!file || this.isDestroyed) return Promise.resolve(false);
    return this._loadGlbInternal(file, file.name, forcedSlot, { isDefault: false });
  }

  loadGlbUrl(url, forcedSlot = null, { isDefault = false } = {}) {
    if (!url || this.isDestroyed) return Promise.resolve(false);
    const filename = url.split('/').pop() || url;
    return this._loadGlbInternal(url, filename, forcedSlot, { isDefault });
  }

  async restoreDefaults({ isInitialBoot = false } = {}) {
    const { handsUrl, eyeUrl } = this.defaultModels;
    const needsBootGate = isInitialBoot && !this.isInitialReady && Boolean(handsUrl || eyeUrl);

    if (needsBootGate) {
      this.sculptureRoot.visible = false;
      this._bootSlotProgress = {
        hands: handsUrl ? 0 : 1,
        eye: eyeUrl ? 0 : 1,
      };
      this.bootProgress = handsUrl && eyeUrl ? 2 : 50;
      this.bootLabel = 'FETCHING SCULPTURES';
    }

    const tasks = [];
    if (!handsUrl) {
      this.loadEpoch.hands += 1;
      this._mountProceduralHands();
    } else {
      tasks.push(this.loadGlbUrl(handsUrl, 'hands', { isDefault: true }));
    }

    if (!eyeUrl) {
      this.loadEpoch.eye += 1;
      this._mountProceduralEye();
    } else {
      tasks.push(this.loadGlbUrl(eyeUrl, 'eye', { isDefault: true }));
    }

    this.updateShaderUniforms();
    this.statusBadge = handsUrl || eyeUrl ? 'LOADING DEFAULT...' : 'PROCEDURAL SCULPT';
    if (!needsBootGate) {
      this.isInitialReady = true;
      this.bootProgress = 100;
      this.bootLabel = 'READY';
      this.sculptureRoot.visible = true;
    }
    this._emitStatus();

    if (needsBootGate) {
      await Promise.allSettled(tasks);
      if (this.isDestroyed) return;

      this.bootProgress = 96;
      this.bootLabel = 'COMPILING INK SHADERS';
      this._emitStatus();

      this.sculptureRoot.visible = true;
      try {
        if (typeof this.renderer.compileAsync === 'function') {
          await this.renderer.compileAsync(this.scene, this.camera);
        } else {
          this.renderer.compile(this.scene, this.camera);
        }
      } catch (err) {
        console.warn('Shader precompile fallback:', err);
      }

      if (this.isDestroyed) return;
      this.bootProgress = 100;
      this.bootLabel = 'READY';
      this.isInitialReady = true;
      this._emitStatus();
    }
  }

  resetToProcedural() {
    this.loadEpoch.hands += 1;
    this.loadEpoch.eye += 1;

    this._mountProceduralHands();
    this._mountProceduralEye();

    this.statusBadge = 'PROCEDURAL SCULPT';
    this._syncRendererDpr();
    this.updateShaderUniforms();
    this._emitStatus();
  }

  resize(width, height) {
    if (this.isDestroyed || width <= 0 || height <= 0) return;

    const dpr = this._getEffectiveDpr();
    const aspect = width / height;
    this.camera.fov = this._getResponsiveFov(aspect);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.updateShaderUniforms();
  }

  setPaused(paused) {
    if (this.isDestroyed || this.isPaused === paused) return;
    this.isPaused = paused;

    if (paused) {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    } else {
      this.lastFrameTime = performance.now();
      this._startLoop();
    }
  }

  _startLoop() {
    if (this.isDestroyed || this.isPaused || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(this._animate);
  }

  _updateEyeCursorTracking(dt) {
    if (!this.eyeCoreGroup) return;

    let targetYaw = 0;
    let targetPitch = 0;

    if (this.hasPointer) {
      this.eyeCoreGroup.updateWorldMatrix(false, false);
      this._tempEyeNdc.setFromMatrixPosition(this.eyeCoreGroup.matrixWorld).project(this.camera);

      const dx = this.pointerNdc.x - this._tempEyeNdc.x;
      const dy = this.pointerNdc.y - this._tempEyeNdc.y;

      targetYaw = THREE.MathUtils.clamp(dx * 0.65, -0.52, 0.52);
      targetPitch = THREE.MathUtils.clamp(-dy * 0.55, -0.38, 0.38);
    }

    const smooth = 1 - Math.exp(-9.0 * dt);
    this.eyeGazeCurrent.yaw += (targetYaw - this.eyeGazeCurrent.yaw) * smooth;
    this.eyeGazeCurrent.pitch += (targetPitch - this.eyeGazeCurrent.pitch) * smooth;

    this.eyeCoreGroup.rotation.y = this.eyeGazeCurrent.yaw;
    this.eyeCoreGroup.rotation.x = this.eyeGazeCurrent.pitch;
  }

  _updateAtomRings(dt) {
    if (this.ringEntries.length === 0) return;
    const speed = this.params.ringSpin;

    for (let i = 0; i < this.ringEntries.length; i++) {
      const entry = this.ringEntries[i];
      entry.orbitPhase += dt * entry.wobbleRate * speed;
      entry.precessAngle += dt * entry.precessYRate * speed;

      entry.orbitGroup.rotation.x =
        entry.baseTiltX + Math.sin(entry.orbitPhase) * entry.wobbleAmp;
      entry.orbitGroup.rotation.y = entry.precessAngle;
      entry.orbitGroup.rotation.z =
        entry.baseTiltZ + Math.cos(entry.orbitPhase * 0.78) * (entry.wobbleAmp * 0.55);

      entry.spinGroup.rotation.z += dt * entry.spinZRate * speed;
    }
  }

  _updateSculptureParallax(dt) {
    const targetYaw = this.hasPointer
      ? THREE.MathUtils.clamp(this.pointerNdc.x * 0.065, -0.065, 0.065)
      : 0;
    const targetPitch = this.hasPointer
      ? THREE.MathUtils.clamp(-this.pointerNdc.y * 0.035, -0.035, 0.035)
      : 0;

    const smooth = 1 - Math.exp(-5.5 * dt);
    this.parallaxCurrent.yaw += (targetYaw - this.parallaxCurrent.yaw) * smooth;
    this.parallaxCurrent.pitch += (targetPitch - this.parallaxCurrent.pitch) * smooth;

    this.sculptureRoot.rotation.y = this.parallaxCurrent.yaw;
    this.sculptureRoot.rotation.x = this.parallaxCurrent.pitch;
  }

  _animate = (now) => {
    this.rafId = null;
    if (this.isDestroyed || this.isPaused) return;

    this.rafId = requestAnimationFrame(this._animate);

    const dt = Math.min((now - this.lastFrameTime) * 0.001, 0.05);
    this.lastFrameTime = now;
    this.elapsedTotal += dt;

    // Subtle living levitation on the mystical eye & breathing on the hands
    const breathOffset = Math.sin(this.elapsedTotal * 1.45 - 0.6) * 0.015;
    this.eyeAnchor.position.y = this.params.eyeY + Math.sin(this.elapsedTotal * 1.45) * 0.032;
    this.handsAnchor.position.y = this.params.handsY + breathOffset;

    // Eye core tracks cursor using current-frame parallax transform in a single matrix pass
    this._updateSculptureParallax(dt);
    this.eyeAnchor.updateWorldMatrix(true, false);
    this._tempEyeWorld.setFromMatrixPosition(this.eyeAnchor.matrixWorld);
    this._updateEyeCursorTracking(dt);
    this._updateAtomRings(dt);

    for (let i = 0; i < this.activeShaderMaterials.length; i++) {
      this.activeShaderMaterials[i].uniforms.uEyeWorldPos.value.copy(this._tempEyeWorld);
    }

    this.depthBackdrop?.update({
      elapsedTime: this.elapsedTotal,
      handsY: this.params.handsY,
      breathOffset,
      handsScale: this.params.handsScale,
      parallaxYaw: this.parallaxCurrent.yaw,
      parallaxPitch: this.parallaxCurrent.pitch,
      cameraDistance: this.camera.position.distanceTo(this.controls.target),
    });

    this.inkParticles?.update(this.elapsedTotal, this.parallaxCurrent.yaw);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    this.isDestroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    window.removeEventListener('resize', this._handleViewportResize);
    window.removeEventListener('pointermove', this._handlePointerMove);

    this.controls.dispose();
    this.loaderManager.dispose();

    disposeObject3D(this.handsAnchor, { protectedTextures: this.sharedProceduralTextures });
    disposeObject3D(this.eyeAnchor, { protectedTextures: this.sharedProceduralTextures });

    this.depthBackdrop?.dispose();
    this.inkParticles?.dispose();

    this.sharedProceduralTextures.forEach((tex) => tex.dispose());
    this.sharedProceduralTextures.clear();

    if (this.envRenderTarget) {
      this.envRenderTarget.dispose();
    }
    this.scene.environment = null;

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
