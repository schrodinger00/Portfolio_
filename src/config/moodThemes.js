export const MOOD_THEMES = [
  {
    id: 'serene',
    label: 'SERENE',
    title: 'Mood: Serene — Warm Archival Parchment',
    ariaLabel: 'Set Mood to Serene Parchment',
    dropletFill: '#d9d3c2',
    dropletRing: '#141311',
    isDark: false,
    grainOpacity: 0.56,
    cssVars: {
      '--paper-light': '#f4f2eb',
      '--paper-base': '#efede4',
      '--paper-edge': '#e8e5da',
      '--ink': '#141311',
      '--ink-soft': '#4e4c45',
      '--ink-muted': '#6e6b62',
      '--color-paper-light': '#f4f2eb',
      '--color-paper-center': '#f4f2eb',
      '--color-paper-base': '#efede4',
      '--color-paper-edge': '#e8e5da',
      '--color-paper-card': '#f5f3ec',
      '--color-ink': '#141311',
      '--color-ink-soft': '#4e4c45',
      '--color-ink-muted': '#6e6b62',
      '--color-ink-faint': 'rgba(20, 19, 17, 0.14)',
    },
    tarot: {
      paper: '#f3f2ec',
      ink: '#161513',
      inkRgb: '22, 21, 19',
    },
    shader: {
      paperHighlight: '#dfd9be',
      paperMidtone: '#aea689',
      shadowSepia: '#584f3d',
      inkColor: '#141311',
    },
  },
  {
    id: 'melancholy',
    label: 'MELANCHOLY',
    title: 'Mood: Melancholy — Rain Slate & Indigo',
    ariaLabel: 'Set Mood to Melancholy Slate',
    dropletFill: '#7896b3',
    dropletRing: '#131d2b',
    isDark: false,
    grainOpacity: 0.5,
    cssVars: {
      '--paper-light': '#e6edf4',
      '--paper-base': '#d9e3ee',
      '--paper-edge': '#cad8e6',
      '--ink': '#131d2b',
      '--ink-soft': '#3c4e66',
      '--ink-muted': '#5c708a',
      '--color-paper-light': '#e6edf4',
      '--color-paper-center': '#e6edf4',
      '--color-paper-base': '#d9e3ee',
      '--color-paper-edge': '#cad8e6',
      '--color-paper-card': '#edf2f7',
      '--color-ink': '#131d2b',
      '--color-ink-soft': '#3c4e66',
      '--color-ink-muted': '#5c708a',
      '--color-ink-faint': 'rgba(19, 29, 43, 0.15)',
    },
    tarot: {
      paper: '#ebf0f5',
      ink: '#131d2b',
      inkRgb: '19, 29, 43',
    },
    shader: {
      paperHighlight: '#e8eef5',
      paperMidtone: '#bccad9',
      shadowSepia: '#657a94',
      inkColor: '#111a28',
    },
  },
  {
    id: 'passion',
    label: 'PASSION',
    title: 'Mood: Passion — Candlelit Sanguine Ember',
    ariaLabel: 'Set Mood to Passion Sanguine',
    dropletFill: '#b55642',
    dropletRing: '#2c120d',
    isDark: false,
    grainOpacity: 0.52,
    cssVars: {
      '--paper-light': '#f5e8df',
      '--paper-base': '#ecd7ca',
      '--paper-edge': '#e0c5b4',
      '--ink': '#2c120d',
      '--ink-soft': '#6b392e',
      '--ink-muted': '#8f5a4d',
      '--color-paper-light': '#f5e8df',
      '--color-paper-center': '#f5e8df',
      '--color-paper-base': '#ecd7ca',
      '--color-paper-edge': '#e0c5b4',
      '--color-paper-card': '#f8efe8',
      '--color-ink': '#2c120d',
      '--color-ink-soft': '#6b392e',
      '--color-ink-muted': '#8f5a4d',
      '--color-ink-faint': 'rgba(44, 18, 13, 0.15)',
    },
    tarot: {
      paper: '#f7ede6',
      ink: '#2c120d',
      inkRgb: '44, 18, 13',
    },
    shader: {
      paperHighlight: '#f4e5da',
      paperMidtone: '#dabaa6',
      shadowSepia: '#965d49',
      inkColor: '#2c120d',
    },
  },
  {
    id: 'nocturne',
    label: 'NOCTURNE',
    title: 'Mood: Nocturne — Obsidian Black & Bone',
    ariaLabel: 'Set Mood to Nocturne Black',
    dropletFill: '#111110',
    dropletRing: '#ece4cc',
    isDark: true,
    grainOpacity: 0.12,
    cssVars: {
      '--paper-light': '#141312',
      '--paper-base': '#0c0c0b',
      '--paper-edge': '#050505',
      '--ink': '#ece4cc',
      '--ink-soft': '#bab29e',
      '--ink-muted': '#88806f',
      '--color-paper-light': '#141312',
      '--color-paper-center': '#141312',
      '--color-paper-base': '#0c0c0b',
      '--color-paper-edge': '#050505',
      '--color-paper-card': '#171614',
      '--color-ink': '#ece4cc',
      '--color-ink-soft': '#bab29e',
      '--color-ink-muted': '#88806f',
      '--color-ink-faint': 'rgba(236, 228, 204, 0.14)',
    },
    tarot: {
      paper: '#11100f',
      ink: '#ebe3cb',
      inkRgb: '235, 227, 203',
    },
    shader: {
      paperHighlight: '#e4dec4',
      paperMidtone: '#aba286',
      shadowSepia: '#574f3c',
      inkColor: '#080807',
    },
  },
];

export const DEFAULT_MOOD_INDEX = 0;

export function getMoodTheme(index) {
  return MOOD_THEMES[index] || MOOD_THEMES[DEFAULT_MOOD_INDEX];
}

export function applyMoodThemeToDocument(theme) {
  if (typeof document === 'undefined' || !theme) return;
  const root = document.documentElement;
  Object.entries(theme.cssVars).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
  root.style.setProperty('--grain-opacity', String(theme.grainOpacity));
}
