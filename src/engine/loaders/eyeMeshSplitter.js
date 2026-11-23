import * as THREE from 'three';

const ATOM_RING_PRESETS = [
  { baseTiltX: 0.62, baseTiltY: 0.45, baseTiltZ: 0.15, spinZ: 1.45, precessY: 0.85, wobbleRate: 0.72, wobbleAmp: 0.36 },
  { baseTiltX: -0.58, baseTiltY: -0.52, baseTiltZ: -0.25, spinZ: -1.05, precessY: -0.64, wobbleRate: 0.54, wobbleAmp: 0.42 },
  { baseTiltX: 0.28, baseTiltY: -0.68, baseTiltZ: 0.32, spinZ: 0.72, precessY: 0.48, wobbleRate: 0.38, wobbleAmp: 0.30 },
];

function quantizeCoordKey(x, y, z) {
  const qx = Math.round(x * 1000) + 65536;
  const qy = Math.round(y * 1000) + 65536;
  const qz = Math.round(z * 1000) + 65536;
  if (qx >= 0 && qx < 131072 && qy >= 0 && qy < 131072 && qz >= 0 && qz < 131072) {
    // 17 bits per axis (51 bits total <= Number.MAX_SAFE_INTEGER) avoids BigInt heap allocations
    return qx * 17179869184 + qy * 131072 + qz;
  }
  const bx = BigInt(Math.round(x * 1000) + 1000000);
  const by = BigInt(Math.round(y * 1000) + 1000000);
  const bz = BigInt(Math.round(z * 1000) + 1000000);
  return `b:${(bx << 42n) | (by << 21n) | bz}`;
}

/**
 * Splits a fused eye GLB (e.g. eye sphere + concentric rings exported in one mesh)
 * into separate concentric sub-groups: an eyeball core that can track the cursor,
 * and individual orbital rings that animate like an atom.
 *
 * Returns null if the model only has 1 topological shell so standard loading applies.
 */
export function splitEyeIntoCoreAndRings(loadedRoot, targetExtent = 1.18) {
  loadedRoot.updateMatrixWorld(true);
  const rootInvMatrix = new THREE.Matrix4().copy(loadedRoot.matrixWorld).invert();

  const sourceMeshes = [];
  loadedRoot.traverse((child) => {
    if (child.isMesh && child.geometry && child.geometry.attributes.position) {
      sourceMeshes.push(child);
    }
  });

  if (sourceMeshes.length === 0) return null;

  // Pre-count vertices & triangles to allocate flat typed buffers without array resizing/GC spikes
  let totalVerts = 0;
  let totalTris = 0;
  let hasAnyUv = false;
  for (let m = 0; m < sourceMeshes.length; m++) {
    const geom = sourceMeshes[m].geometry;
    if (geom.attributes.uv) hasAnyUv = true;
    totalVerts += geom.attributes.position.count;
    totalTris += geom.index
      ? Math.floor(geom.index.count / 3)
      : Math.floor(geom.attributes.position.count / 3);
  }
  if (totalTris === 0) return null;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = hasAnyUv ? new Float32Array(totalVerts * 2) : null;
  const triVertices = new Uint32Array(totalTris * 3);
  const triMaterials = new Array(totalTris);

  const tempVec = new THREE.Vector3();
  const tempNorm = new THREE.Vector3();
  const relMatrix = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();

  let vertWrite = 0;
  let triWrite = 0;

  for (let m = 0; m < sourceMeshes.length; m++) {
    const mesh = sourceMeshes[m];
    const geom = mesh.geometry;
    const posAttr = geom.attributes.position;
    const normAttr = geom.attributes.normal;
    const uvAttr = geom.attributes.uv;

    relMatrix.multiplyMatrices(rootInvMatrix, mesh.matrixWorld);
    normalMatrix.getNormalMatrix(relMatrix);

    const vertOffset = vertWrite;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const vi = vertWrite++;
      const pBase = vi * 3;
      tempVec.fromBufferAttribute(posAttr, i).applyMatrix4(relMatrix);
      positions[pBase] = tempVec.x;
      positions[pBase + 1] = tempVec.y;
      positions[pBase + 2] = tempVec.z;

      if (normAttr) {
        tempNorm.fromBufferAttribute(normAttr, i).applyMatrix3(normalMatrix).normalize();
        normals[pBase] = tempNorm.x;
        normals[pBase + 1] = tempNorm.y;
        normals[pBase + 2] = tempNorm.z;
      } else {
        normals[pBase] = 0;
        normals[pBase + 1] = 1;
        normals[pBase + 2] = 0;
      }

      if (hasAnyUv) {
        const uBase = vi * 2;
        if (uvAttr) {
          uvs[uBase] = uvAttr.getX(i);
          uvs[uBase + 1] = uvAttr.getY(i);
        } else {
          uvs[uBase] = 0;
          uvs[uBase + 1] = 0;
        }
      }
    }

    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const indexAttr = geom.index;
    if (indexAttr) {
      for (let i = 0; i + 2 < indexAttr.count; i += 3) {
        const ti = triWrite++;
        const tBase = ti * 3;
        triVertices[tBase] = indexAttr.getX(i) + vertOffset;
        triVertices[tBase + 1] = indexAttr.getX(i + 1) + vertOffset;
        triVertices[tBase + 2] = indexAttr.getX(i + 2) + vertOffset;
        triMaterials[ti] = mat;
      }
    } else {
      for (let i = 0; i + 2 < count; i += 3) {
        const ti = triWrite++;
        const tBase = ti * 3;
        triVertices[tBase] = i + vertOffset;
        triVertices[tBase + 1] = i + 1 + vertOffset;
        triVertices[tBase + 2] = i + 2 + vertOffset;
        triMaterials[ti] = mat;
      }
    }
  }

  // Stitch coincident vertices across GLTF primitive seams
  const spatialToRep = new Map();
  const parent = new Int32Array(totalVerts);
  for (let i = 0; i < totalVerts; i++) {
    const key = quantizeCoordKey(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    let rep = spatialToRep.get(key);
    if (rep === undefined) {
      spatialToRep.set(key, i);
      rep = i;
    }
    parent[i] = rep;
  }

  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function unite(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  for (let t = 0; t < totalTris; t++) {
    const a = triVertices[t * 3];
    const b = triVertices[t * 3 + 1];
    const c = triVertices[t * 3 + 2];
    unite(a, b);
    unite(b, c);
  }

  // Group triangles by topological component
  const componentMap = new Map();
  for (let t = 0; t < totalTris; t++) {
    const a = triVertices[t * 3];
    const b = triVertices[t * 3 + 1];
    const c = triVertices[t * 3 + 2];
    const root = find(a);

    let comp = componentMap.get(root);
    if (!comp) {
      comp = {
        tris: [],
        material: triMaterials[t],
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity],
      };
      componentMap.set(root, comp);
    }
    comp.tris.push(a, b, c);

    for (const vi of [a, b, c]) {
      const px = positions[vi * 3];
      const py = positions[vi * 3 + 1];
      const pz = positions[vi * 3 + 2];
      if (px < comp.min[0]) comp.min[0] = px;
      if (py < comp.min[1]) comp.min[1] = py;
      if (pz < comp.min[2]) comp.min[2] = pz;
      if (px > comp.max[0]) comp.max[0] = px;
      if (py > comp.max[1]) comp.max[1] = py;
      if (pz > comp.max[2]) comp.max[2] = pz;
    }
  }

  // Filter degenerate shells (< 16 tris)
  const validComponents = [];
  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];

  for (const comp of componentMap.values()) {
    if (comp.tris.length < 48) continue; // < 16 triangles
    const size = [
      comp.max[0] - comp.min[0],
      comp.max[1] - comp.min[1],
      comp.max[2] - comp.min[2],
    ];
    const maxDim = Math.max(size[0], size[1], size[2], 1e-4);
    const minDim = Math.min(size[0], size[1], size[2]);
    comp.maxDim = maxDim;
    comp.minDim = minDim;
    comp.sphericity = minDim / maxDim;
    comp.center = [
      (comp.min[0] + comp.max[0]) * 0.5,
      (comp.min[1] + comp.max[1]) * 0.5,
      (comp.min[2] + comp.max[2]) * 0.5,
    ];
    validComponents.push(comp);

    for (let k = 0; k < 3; k++) {
      globalMin[k] = Math.min(globalMin[k], comp.min[k]);
      globalMax[k] = Math.max(globalMax[k], comp.max[k]);
    }
  }

  if (validComponents.length < 2) {
    return null;
  }

  // Separate bulky spherical eyeball core(s) from flat orbital ring shells
  const coreComponents = [];
  const ringComponents = [];
  for (const comp of validComponents) {
    if (comp.sphericity >= 0.28) coreComponents.push(comp);
    else ringComponents.push(comp);
  }

  if (coreComponents.length === 0) {
    // Fallback: pick the thickest shell as core
    validComponents.sort((a, b) => b.sphericity - a.sphericity);
    coreComponents.push(validComponents[0]);
    ringComponents.push(...validComponents.slice(1));
  }

  if (ringComponents.length === 0) {
    return null;
  }

  // Sort rings from innermost to outermost diameter
  ringComponents.sort((a, b) => a.maxDim - b.maxDim);

  // Use eyeball core's bounding-box center as the shared concentric pivot for eyeball + rings
  const coreMin = [Infinity, Infinity, Infinity];
  const coreMax = [-Infinity, -Infinity, -Infinity];
  for (const c of coreComponents) {
    for (let k = 0; k < 3; k++) {
      coreMin[k] = Math.min(coreMin[k], c.min[k]);
      coreMax[k] = Math.max(coreMax[k], c.max[k]);
    }
  }
  const pivotCenter = new THREE.Vector3(
    (coreMin[0] + coreMax[0]) * 0.5,
    (coreMin[1] + coreMax[1]) * 0.5,
    (coreMin[2] + coreMax[2]) * 0.5
  );

  const overallMaxDim = Math.max(
    globalMax[0] - globalMin[0],
    globalMax[1] - globalMin[1],
    globalMax[2] - globalMin[2],
    1e-4
  );
  const normScale = targetExtent / overallMaxDim;

  const vertexStamp = new Int32Array(totalVerts);
  const vertexLocalIdx = new Int32Array(totalVerts);
  let currentStamp = 0;

  function buildComponentMesh(comp) {
    const stamp = ++currentStamp;
    const triCountLen = comp.tris.length;
    const localIndices = new Uint32Array(triCountLen);
    let uniqueCount = 0;

    for (let i = 0; i < triCountLen; i++) {
      const gIdx = comp.tris[i];
      if (vertexStamp[gIdx] !== stamp) {
        vertexStamp[gIdx] = stamp;
        vertexLocalIdx[gIdx] = uniqueCount++;
      }
      localIndices[i] = vertexLocalIdx[gIdx];
    }

    const localPos = new Float32Array(uniqueCount * 3);
    const localNorm = new Float32Array(uniqueCount * 3);
    const localUv = hasAnyUv ? new Float32Array(uniqueCount * 2) : null;

    const writeStamp = ++currentStamp;
    for (let i = 0; i < triCountLen; i++) {
      const gIdx = comp.tris[i];
      if (vertexStamp[gIdx] === writeStamp) continue;
      vertexStamp[gIdx] = writeStamp;
      const lIdx = vertexLocalIdx[gIdx];
      const dst3 = lIdx * 3;
      const src3 = gIdx * 3;
      localPos[dst3] = positions[src3] - pivotCenter.x;
      localPos[dst3 + 1] = positions[src3 + 1] - pivotCenter.y;
      localPos[dst3 + 2] = positions[src3 + 2] - pivotCenter.z;
      localNorm[dst3] = normals[src3];
      localNorm[dst3 + 1] = normals[src3 + 1];
      localNorm[dst3 + 2] = normals[src3 + 2];
      if (hasAnyUv) {
        const dst2 = lIdx * 2;
        const src2 = gIdx * 2;
        localUv[dst2] = uvs[src2];
        localUv[dst2 + 1] = uvs[src2 + 1];
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(localPos, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(localNorm, 3));
    if (hasAnyUv) {
      geom.setAttribute('uv', new THREE.BufferAttribute(localUv, 2));
    }

    const indexBuffer = uniqueCount > 65535 ? localIndices : new Uint16Array(localIndices);
    geom.setIndex(new THREE.BufferAttribute(indexBuffer, 1));
    geom.computeBoundingBox();
    geom.computeBoundingSphere();

    return new THREE.Mesh(geom, comp.material);
  }

  // Dispose original merged geometries now that triangles are cleanly split
  for (const mesh of sourceMeshes) {
    mesh.geometry.dispose();
  }

  const wrapper = new THREE.Group();
  wrapper.scale.setScalar(normScale);

  const eyeCoreGroup = new THREE.Group();
  eyeCoreGroup.rotation.order = 'YXZ';
  for (const comp of coreComponents) {
    eyeCoreGroup.add(buildComponentMesh(comp));
  }
  wrapper.add(eyeCoreGroup);

  const ringEntries = [];
  ringComponents.forEach((comp, idx) => {
    const preset = ATOM_RING_PRESETS[idx % ATOM_RING_PRESETS.length];
    const sign = idx % 2 === 0 ? 1 : -1;
    const speedFactor = 1.0 - Math.min(idx, 3) * 0.18;

    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.order = 'YXZ';
    orbitGroup.rotation.set(
      preset.baseTiltX,
      preset.baseTiltY,
      preset.baseTiltZ
    );

    const spinGroup = new THREE.Group();
    spinGroup.add(buildComponentMesh(comp));
    orbitGroup.add(spinGroup);
    wrapper.add(orbitGroup);

    ringEntries.push({
      orbitGroup,
      spinGroup,
      baseTiltX: preset.baseTiltX,
      baseTiltY: preset.baseTiltY,
      baseTiltZ: preset.baseTiltZ,
      spinZRate: preset.spinZ * speedFactor,
      precessYRate: preset.precessY * speedFactor,
      wobbleRate: preset.wobbleRate,
      wobbleAmp: preset.wobbleAmp * sign,
      orbitPhase: idx * 2.1,
      precessAngle: preset.baseTiltY,
    });
  });

  return {
    wrapper,
    eyeCoreGroup,
    ringEntries,
  };
}
