import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { splitEyeIntoCoreAndRings } from './eyeMeshSplitter.js';
import { consumePrefetchedGlb } from './assetPrefetch.js';

export function detectModelSlot(filename, sizeVec) {
  const lower = (filename || '').toLowerCase();
  if (/(hand|palm|finger|wrist|cradle|arm)/.test(lower)) return 'hands';
  if (/(eye|iris|orb|ring|pupil|sphere|astrolabe)/.test(lower)) return 'eye';
  // Aspect-ratio fallback: hands are wider than tall (width > height * 1.25)
  if (sizeVec.x > sizeVec.y * 1.25) return 'hands';
  return 'eye';
}

export function normalizeLoadedGltf(gltf, filename, forcedSlot = null) {
  const loadedRoot = gltf.scene || gltf.scenes[0];
  if (!loadedRoot) {
    throw new Error('GLTF scene graph is empty.');
  }

  // Ensure every geometry has valid normals without simplifying or altering triangles
  loadedRoot.traverse((child) => {
    if (child.isMesh && child.geometry) {
      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
    }
  });

  // Measure raw bounding box to auto-detect Hands vs Eye
  loadedRoot.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(loadedRoot);
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const rawCenter = rawBox.getCenter(new THREE.Vector3());

  const slot = forcedSlot || detectModelSlot(filename, rawSize);
  const targetExtent = slot === 'hands' ? 2.15 : 1.18;

  // For eye models with fused eyeball + rings, split into animated core & atom orbital rings
  if (slot === 'eye') {
    const splitResult = splitEyeIntoCoreAndRings(loadedRoot, targetExtent);
    if (splitResult) {
      return {
        wrapper: splitResult.wrapper,
        slot,
        eyeCoreGroup: splitResult.eyeCoreGroup,
        ringEntries: splitResult.ringEntries,
      };
    }
  }

  // Normalize scale & center cleanly at origin facing front (+Z)
  const wrapper = new THREE.Group();
  loadedRoot.position.sub(rawCenter);

  const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 1e-4);
  const normScale = targetExtent / maxDim;
  loadedRoot.scale.multiplyScalar(normScale);
  wrapper.add(loadedRoot);

  return {
    wrapper,
    slot,
    eyeCoreGroup: slot === 'eye' ? loadedRoot : null,
    ringEntries: [],
  };
}

export function createGlbLoaderManager(renderer) {
  const baseUrl = import.meta.env.BASE_URL || '/';

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(`${baseUrl}draco/`);
  dracoLoader.preload();

  let ktx2Loader = null;
  const ensureKtx2Loader = () => {
    if (ktx2Loader) return ktx2Loader;
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(`${baseUrl}basis/`);
    try {
      ktx2Loader.detectSupport(renderer);
    } catch (e) {
      console.warn('KTX2 detectSupport fallback:', e);
    }
    gltfLoader.setKTX2Loader(ktx2Loader);
    return ktx2Loader;
  };

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  if (MeshoptDecoder) {
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  }

  function parseGlbBuffer(buffer, resourcePath) {
    return new Promise((resolve, reject) => {
      gltfLoader.parse(buffer, resourcePath, resolve, reject);
    });
  }

  async function loadFromUrl(url, onProgress, { useKtx2 = false } = {}) {
    if (useKtx2) ensureKtx2Loader();

    const prefetched = await consumePrefetchedGlb(url, onProgress).catch(() => null);
    if (prefetched) {
      const resourcePath = url.slice(0, url.lastIndexOf('/') + 1);
      try {
        return await parseGlbBuffer(prefetched, resourcePath);
      } catch (err) {
        if (!useKtx2 && /ktx2|basisu/i.test(String(err))) {
          ensureKtx2Loader();
          return parseGlbBuffer(prefetched, resourcePath);
        }
        throw err;
      }
    }

    return new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        (event) => {
          if (onProgress && event.lengthComputable) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
        (err) => reject(err)
      );
    });
  }

  async function loadFromFile(file, onProgress) {
    ensureKtx2Loader();
    const objectUrl = URL.createObjectURL(file);
    try {
      const gltf = await loadFromUrl(objectUrl, onProgress, { useKtx2: true });
      return gltf;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function dispose() {
    dracoLoader.dispose();
    if (ktx2Loader) {
      ktx2Loader.dispose();
      ktx2Loader = null;
    }
  }

  return {
    loadFromUrl,
    loadFromFile,
    dispose,
  };
}
