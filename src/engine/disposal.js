const TEXTURE_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
  'envMap',
  'lightMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'specularColorMap',
  'specularIntensityMap',
  'transmissionMap',
  'thicknessMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
];

export function disposeMaterialSafely(material, protectedTextures = new Set()) {
  if (!material) return;
  const mats = Array.isArray(material) ? material : [material];

  mats.forEach((mat) => {
    if (!mat || typeof mat.dispose !== 'function') return;

    for (const key of TEXTURE_KEYS) {
      const tex = mat[key];
      if (tex && typeof tex.dispose === 'function' && !protectedTextures.has(tex)) {
        tex.dispose();
      }
    }

    if (mat.uniforms && mat.uniforms.uMap && mat.uniforms.uMap.value) {
      const uTex = mat.uniforms.uMap.value;
      if (typeof uTex.dispose === 'function' && !protectedTextures.has(uTex)) {
        uTex.dispose();
      }
    }

    mat.dispose();
  });
}

export function disposeObject3D(root, { protectedTextures = new Set(), removeChildren = true } = {}) {
  if (!root) return;

  const disposedGeometries = new Set();
  const disposedMaterials = new Set();

  root.traverse((child) => {
    if (child.geometry && !disposedGeometries.has(child.geometry)) {
      disposedGeometries.add(child.geometry);
      child.geometry.dispose();
    }

    const originalMat = child.userData?.originalMaterial;
    if (originalMat && !disposedMaterials.has(originalMat)) {
      disposedMaterials.add(originalMat);
      disposeMaterialSafely(originalMat, protectedTextures);
      child.userData.originalMaterial = null;
    }

    if (child.material && !disposedMaterials.has(child.material)) {
      disposedMaterials.add(child.material);
      disposeMaterialSafely(child.material, protectedTextures);
    }
  });

  if (removeChildren) {
    while (root.children.length > 0) {
      root.remove(root.children[0]);
    }
  }
}
