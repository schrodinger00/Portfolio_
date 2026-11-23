/**
 * Default .glb/.gltf model paths placed inside `public/models/`.
 * Set either slot to `null` to fall back to the procedural sculpture.
 */
export const DEFAULT_MODEL_URLS = {
  handsUrl: `${import.meta.env.BASE_URL}models/hands-final.glb`,
  eyeUrl: `${import.meta.env.BASE_URL}models/eye-final.glb`,
};

export const TAROT_CARDS_META = {
  left: {
    side: 'left',
    plate: 'PLATE I',
    technique: 'ARCHIVAL ETCH',
    title: '01 / ENGINEERING',
    subtitle: 'TYPESCRIPT • REACT • WEBGL',
    modalTitle: 'Plate I — The Architect',
    modalSubtitle: 'Procedural Copperplate Etch',
  },
  right: {
    side: 'right',
    plate: 'PLATE II',
    technique: 'DRYPOINT INK',
    title: '02 / ILLUSTRATION',
    subtitle: 'INK • SKETCHBOOK • 3D',
    modalTitle: 'Plate II — The Horizon',
    modalSubtitle: 'Drypoint Ridge & Ink Study',
  },
};

export const NAV_ITEMS = [
  { id: 'projects', label: 'PROJECTS' },
  { id: 'artwork', label: 'ARTWORK' },
  { id: 'about', label: 'ABOUT' },
  { id: 'contact', label: 'CONTACT' },
];

export const MODAL_HEADERS = {
  projects: {
    eyebrow: '01 / SELECTED SYSTEMS',
    title: 'Engineering & Shader Studies',
  },
  artwork: {
    eyebrow: '02 / COPPERPLATE & SKETCHBOOK',
    title: 'Archival Ink Plates',
  },
  about: {
    eyebrow: '03 / MONOGRAPH & PRACTICE',
    title: 'Between Nib & Shader',
  },
  contact: {
    eyebrow: '04 / CORRESPONDENCE',
    title: 'Studio Inquiries',
  },
};

export const PROJECT_STUDIES = [
  {
    meta: 'STUDY 01 • GLSL / THREE.JS',
    year: '2026',
    title: 'Perceptual Copperplate Crosshatch Engine',
    description:
      'Real-time screen-space nib-pen crosshatching paired with Difference-of-Gaussians engraving detection and perceptual sRGB luminance lifting for dense Draco/WebP scans.',
    tags: ['GLSL ES 3.0', 'Draco / WebP', 'Screen-Space AA'],
  },
  {
    meta: 'STUDY 02 • TYPESCRIPT / REACT',
    year: '2025',
    title: 'Spatial Manuscript & Node Canvas',
    description:
      'Infinite 60fps collaborative editorial canvas combining deterministic CRDT state synchronization with tactile paper physics and calligraphic ink simulation.',
    tags: ['TypeScript', 'Canvas 2D', 'Zero-Latency Ink'],
  },
  {
    meta: 'STUDY 03 • PROCEDURAL GEOMETRY',
    year: '2025',
    title: 'Astrolabe & Botanical SDF Sculptor',
    description:
      'Parametric signed-distance-field generator producing watertight manifold meshes and automated UV-free hatch shading for architectural visualization.',
    tags: ['WebGL2', 'Marching Cubes', 'GLTF Export'],
  },
  {
    meta: 'STUDY 04 • DESIGN SYSTEMS',
    year: '2024',
    title: 'Archival Typography & Micro-Motion Kit',
    description:
      'Accessible monochrome component primitives modeled after 17th-century scientific folios, Swiss grid systems, and museum exhibition catalogues.',
    tags: ['React 19', 'Tailwind', 'WCAG AAA'],
  },
];

export const PRACTICE_DISCIPLINES = [
  {
    label: 'DISCIPLINE I',
    title: 'Frontend Architecture',
    description: 'TypeScript, React, deterministic state machines, and high-craft interactive systems.',
  },
  {
    label: 'DISCIPLINE II',
    title: 'Real-Time Graphics',
    description: 'Three.js, custom GLSL crosshatch & NPR shaders, Draco/WebP pipelines, and procedural geometry.',
  },
  {
    label: 'DISCIPLINE III',
    title: 'Pen & Ink Drawing',
    description: 'Dip-pen crosshatching, tarot iconography, and traditional copperplate etching studies.',
  },
];

export const STUDIO_CONTACT = {
  email: 'atelier@mr-studio.ink',
  availability: 'Q4 2026 — Open for Commissions',
  githubUrl: 'https://github.com',
  linkedinUrl: 'https://linkedin.com',
};
