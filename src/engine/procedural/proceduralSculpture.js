import * as THREE from 'three';

const FINGER_SPECS = [
  { x: -0.22, len: 0.56, rad: 0.068, curl: 0.52, splay: 0.12 },
  { x: -0.075, len: 0.64, rad: 0.072, curl: 0.48, splay: 0.04 },
  { x: 0.075, len: 0.59, rad: 0.068, curl: 0.54, splay: -0.04 },
  { x: 0.21, len: 0.46, rad: 0.058, curl: 0.62, splay: -0.13 },
];

const RING_CONFIGS = [
  { radius: 0.46, tube: 0.022, tiltX: 0.62, tiltY: 0.45, tiltZ: 0.15, spinZ: 1.45, precessY: 0.85, wobbleRate: 0.72, wobbleAmp: 0.36 },
  { radius: 0.56, tube: 0.02, tiltX: -0.58, tiltY: -0.52, tiltZ: -0.25, spinZ: -1.05, precessY: -0.64, wobbleRate: 0.54, wobbleAmp: -0.42 },
  { radius: 0.67, tube: 0.024, tiltX: 0.28, tiltY: -0.68, tiltZ: 0.32, spinZ: 0.72, precessY: 0.48, wobbleRate: 0.38, wobbleAmp: 0.30 },
];

export function buildSculptedHandHalf(isRightHand, boneMat, wristMat) {
  const hand = new THREE.Group();

  // Cupped Palm (slightly concave sculpted bowl)
  const palmGeo = new THREE.SphereGeometry(0.42, 36, 28);
  palmGeo.scale(0.86, 1.08, 0.34);
  const pos = palmGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const cupCurve = (px * px * 1.4 + py * py * 0.7) * 0.42;
    const wristTaper = py < 0 ? 1.0 + py * 0.42 : 1.0;
    pos.setXYZ(i, px * wristTaper, py, pz + cupCurve);
  }
  palmGeo.computeVertexNormals();
  const palmMesh = new THREE.Mesh(palmGeo, boneMat);
  palmMesh.rotation.set(-0.55, isRightHand ? -0.36 : 0.36, isRightHand ? 0.24 : -0.24);
  hand.add(palmMesh);

  // Four Articulated Cupped Fingers (Index, Middle, Ring, Pinky)
  FINGER_SPECS.forEach((spec) => {
    const fingerRoot = new THREE.Group();
    fingerRoot.position.set(spec.x, 0.36, 0.05);
    fingerRoot.rotation.set(spec.curl, 0, spec.splay);

    const seg1Len = spec.len * 0.46;
    const seg2Len = spec.len * 0.34;
    const seg3Len = spec.len * 0.24;

    const g1 = new THREE.CapsuleGeometry(spec.rad, seg1Len, 10, 18);
    const m1 = new THREE.Mesh(g1, boneMat);
    m1.position.y = seg1Len * 0.5;
    fingerRoot.add(m1);

    const joint2 = new THREE.Group();
    joint2.position.set(0, seg1Len, 0);
    joint2.rotation.x = 0.38;
    const g2 = new THREE.CapsuleGeometry(spec.rad * 0.88, seg2Len, 10, 18);
    const m2 = new THREE.Mesh(g2, boneMat);
    m2.position.y = seg2Len * 0.5;
    joint2.add(m2);
    fingerRoot.add(joint2);

    const joint3 = new THREE.Group();
    joint3.position.set(0, seg2Len, 0);
    joint3.rotation.x = 0.34;
    const g3 = new THREE.CapsuleGeometry(spec.rad * 0.76, seg3Len, 10, 18);
    const m3 = new THREE.Mesh(g3, boneMat);
    m3.position.y = seg3Len * 0.5;
    joint3.add(m3);
    joint2.add(joint3);

    palmMesh.add(fingerRoot);
  });

  // Opposable Thumb
  const thumbRoot = new THREE.Group();
  thumbRoot.position.set(-0.31, -0.08, 0.11);
  thumbRoot.rotation.set(0.45, -0.55, 0.62);
  const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.074, 0.28, 10, 16), boneMat);
  t1.position.y = 0.14;
  thumbRoot.add(t1);
  const t2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.22, 10, 16), boneMat);
  t2.position.set(0, 0.34, 0.04);
  t2.rotation.x = 0.36;
  thumbRoot.add(t2);
  palmMesh.add(thumbRoot);

  // Jagged Feathery / Torn-Parchment Wrist Cuff at Bottom
  const wristGroup = new THREE.Group();
  wristGroup.position.set(0, -0.44, -0.04);
  const featherCount = 13;
  for (let f = 0; f < featherCount; f++) {
    const angle = (f / featherCount) * Math.PI * 2;
    const radius = 0.21;
    const len = 0.28 + ((f * 7) % 5) * 0.048;
    const plumeGeo = new THREE.ConeGeometry(0.066, len, 6);
    plumeGeo.scale(1.25, 1.0, 0.35);
    const plume = new THREE.Mesh(plumeGeo, wristMat);
    plume.position.set(
      Math.cos(angle) * radius,
      -len * 0.42,
      Math.sin(angle) * radius * 0.68
    );
    plume.rotation.set(
      Math.PI + Math.sin(angle) * 0.22,
      -angle,
      Math.cos(angle) * 0.18
    );
    wristGroup.add(plume);
  }
  palmMesh.add(wristGroup);

  if (!isRightHand) {
    hand.scale.x = -1;
  }
  return hand;
}

export function buildProceduralHandsGroup(proceduralHandTex) {
  const boneMat = new THREE.MeshStandardMaterial({
    map: proceduralHandTex,
    color: 0xf4f1e4,
    roughness: 0.62,
    metalness: 0.04,
  });
  const wristMat = new THREE.MeshStandardMaterial({
    map: proceduralHandTex,
    color: 0x7a7467,
    roughness: 0.75,
    metalness: 0.05,
  });

  const handsPair = new THREE.Group();
  const leftHand = buildSculptedHandHalf(false, boneMat, wristMat);
  leftHand.position.set(-0.56, 0.0, 0.04);
  const rightHand = buildSculptedHandHalf(true, boneMat, wristMat);
  rightHand.position.set(0.56, 0.0, 0.04);
  handsPair.add(leftHand, rightHand);
  return handsPair;
}

export function buildProceduralEyeGroup(proceduralEyeTex, proceduralRingTex) {
  const eyeAssembly = new THREE.Group();
  const proceduralRings = [];

  const eyeMat = new THREE.MeshStandardMaterial({
    map: proceduralEyeTex,
    color: 0xf5f2e6,
    roughness: 0.42,
    metalness: 0.02,
  });

  const ringMat = new THREE.MeshStandardMaterial({
    map: proceduralRingTex,
    color: 0xd8d2c0,
    roughness: 0.48,
    metalness: 0.18,
  });

  // Central Eyeball Core pivoted so UV center (0.5, 0.5) faces directly toward viewer (+Z)
  const eyeCoreGroup = new THREE.Group();
  eyeCoreGroup.rotation.order = 'YXZ';
  const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.36, 64, 48), eyeMat);
  eyeball.rotation.y = -Math.PI * 0.5;
  eyeCoreGroup.add(eyeball);
  eyeAssembly.add(eyeCoreGroup);

  // Shared geometry for astrolabe pips reduces draw-data allocation across rings
  const pipGeometry = new THREE.OctahedronGeometry(0.022, 0);

  // Three Concentric Hatched Orbital Rings with Celestial Pips (Atom-style orbital structure)
  RING_CONFIGS.forEach((rc, idx) => {
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.order = 'YXZ';
    orbitGroup.rotation.set(rc.tiltX, rc.tiltY, rc.tiltZ);

    const spinGroup = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(rc.radius, rc.tube, 20, 84), ringMat);
    spinGroup.add(torus);

    const nodeCount = 6 + idx * 2;
    for (let n = 0; n < nodeCount; n++) {
      const a = (n / nodeCount) * Math.PI * 2;
      const node = new THREE.Mesh(pipGeometry, ringMat);
      node.position.set(Math.cos(a) * rc.radius, Math.sin(a) * rc.radius, 0);
      spinGroup.add(node);
    }

    orbitGroup.add(spinGroup);
    proceduralRings.push({
      orbitGroup,
      spinGroup,
      baseTiltX: rc.tiltX,
      baseTiltY: rc.tiltY,
      baseTiltZ: rc.tiltZ,
      spinZRate: rc.spinZ,
      precessYRate: rc.precessY,
      wobbleRate: rc.wobbleRate,
      wobbleAmp: rc.wobbleAmp,
      orbitPhase: idx * 2.1,
      precessAngle: rc.tiltY,
    });
    eyeAssembly.add(orbitGroup);
  });

  return { eyeAssembly, eyeCoreGroup, ringEntries: proceduralRings };
}
