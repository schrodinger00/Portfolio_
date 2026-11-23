export const DEFAULT_SHADER_PARAMS = {
  tintStrength: 0.0,
  edgeStrength: 0.96,
  shadowDepth: 0.81,
  highlightLift: 1.17,
  contrast: 4.0,
  hatchDensity: 1.15,
  hatchThickness: 0.57,
  outlineWidth: 0.34,
  eyeScale: 1.17,
  eyeY: 0.47,
  handsScale: 0.99,
  handsY: -0.82,
  handsPitch: -25,
  ringSpin: 0.8,
  lightAngle: 22,
};

export const RENDER_STYLES = [
  { id: 'crosshatch', label: 'Crosshatch Etch' },
  { id: 'charcoal', label: 'Charcoal Wash' },
  { id: 'pbr', label: 'Original PBR' },
];

const fmtFixed2 = (v) => v.toFixed(2);
const fmtDegrees = (v) => `${Math.round(v)}°`;

export const INK_SHADER_SLIDERS = [
  { id: 'SliderTintStrength', label: 'Warm & Albedo Tint', key: 'tintStrength', min: 0.0, max: 1.0, step: 0.01, format: fmtFixed2 },
  { id: 'SliderEdgeStrength', label: 'Eye & Hand Texture', key: 'edgeStrength', min: 0.0, max: 1.5, step: 0.01, format: fmtFixed2 },
  { id: 'SliderShadowDepth', label: 'Shadow Depth', key: 'shadowDepth', min: 0.0, max: 1.0, step: 0.01, format: fmtFixed2 },
  { id: 'SliderHighlightLift', label: 'Highlight Lift', key: 'highlightLift', min: 0.5, max: 2.2, step: 0.01, format: fmtFixed2 },
  { id: 'SliderContrast', label: 'Shadow Contrast', key: 'contrast', min: 0.6, max: 4.0, step: 0.05, format: fmtFixed2 },
  { id: 'SliderHatchDensity', label: 'Hatch Density', key: 'hatchDensity', min: 0.4, max: 3.0, step: 0.05, format: fmtFixed2 },
  { id: 'SliderHatchThickness', label: 'Hatch Thickness', key: 'hatchThickness', min: 0.1, max: 0.85, step: 0.01, format: fmtFixed2 },
  { id: 'SliderOutlineWidth', label: 'Outline Weight', key: 'outlineWidth', min: 0.0, max: 1.5, step: 0.01, format: fmtFixed2 },
];

export const SPATIAL_ALIGNMENT_SLIDERS = [
  { id: 'SliderEyeScale', label: 'Eye Scale', key: 'eyeScale', min: 0.45, max: 1.75, step: 0.01, format: fmtFixed2 },
  { id: 'SliderEyeY', label: 'Eye Y-Offset', key: 'eyeY', min: -0.4, max: 1.45, step: 0.01, format: fmtFixed2 },
  { id: 'SliderHandsScale', label: 'Hands Scale', key: 'handsScale', min: 0.5, max: 1.65, step: 0.01, format: fmtFixed2 },
  { id: 'SliderHandsY', label: 'Hands Y-Offset', key: 'handsY', min: -1.65, max: 0.4, step: 0.01, format: fmtFixed2 },
  { id: 'SliderHandsPitch', label: 'Hands Tilt', key: 'handsPitch', min: -45, max: 45, step: 1, format: fmtDegrees },
  { id: 'SliderRingSpin', label: 'Ring Spin', key: 'ringSpin', min: 0.0, max: 2.0, step: 0.05, format: fmtFixed2 },
  { id: 'SliderLightAngle', label: 'Light Angle', key: 'lightAngle', min: -180, max: 180, step: 1, format: fmtDegrees },
];
