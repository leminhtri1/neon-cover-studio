// Style presets: the colour grade of the panels and the paint of the lettering. Each panel cycles through the
// preset's gradient maps (shadows to highlights), so a grid of one photo still reads as a sequence of shots
// lit by different neon. Every colour here is our own palette; nothing is sampled from any game's artwork.

export const STYLE_PRESETS = [
  {
    id: 'sunset', name: 'Sunset Strip',
    swatch: ['#2a0b3d', '#ff3d7f', '#ff9a3c', '#ffe9a8'],
    gradeMaps: [
      ['#1a0630', '#5e1466', '#d42a6c', '#ff7b47', '#ffd27a', '#fff6d8'],
      ['#06122e', '#0f3f6e', '#1c8c9e', '#ff8e6e', '#ffe0b0'],
      ['#22062b', '#8a1458', '#ff4d6d', '#ffb15c', '#fff1c2'],
      ['#0e0830', '#3a1d8a', '#b83ab8', '#ff7aa0', '#ffe0c8'],
    ],
    mapMix: 0.84, contrast: 1.18, saturationKeep: 1.25,
    gutter: '#0c0612', frame: 'rgba(255, 214, 170, 0.22)',
    leak: ['rgba(255, 120, 60, 0.38)', 'rgba(255, 40, 140, 0.30)'],
    halftoneInk: '#2a0630', inkLine: '#16041c',
    letter: {
      fill: [[0, '#fffbe0'], [0.36, '#ffd04a'], [0.52, '#ff8a2a'], [0.53, '#ff3d7f'], [1, '#a01a8c']],
      outline: '#12040f', rim: '#fff4e6', extrude: ['#5a0f4a', '#1c0420'], glow: 'rgba(255, 60, 140, 0.75)',
      script: '#ff5fb4', scriptGlow: '#ff2f9a', ribbon: '#12040f', ribbonText: '#ffd9a0', stripes: '#3a0838',
    },
    tile: ['#2b0a45', '#8c1d6b', '#ff4f6d', '#ffa64a', '#ffe7a3'],
  },
  {
    id: 'neon-night', name: 'Neon Night',
    swatch: ['#06021a', '#3a0ca3', '#f72585', '#4cc9f0'],
    gradeMaps: [
      ['#04010f', '#2a0a7a', '#8f1fd1', '#f72585', '#ffd6f2'],
      ['#020a1a', '#073a5c', '#0a8fa8', '#2ff3e0', '#e8fffb'],
      ['#08021a', '#45108f', '#c42bd6', '#4cc9f0', '#ffffff'],
      ['#060214', '#1b1270', '#e0237a', '#ffb3d9'],
    ],
    mapMix: 0.9, contrast: 1.3, saturationKeep: 1.1,
    gutter: '#04020c', frame: 'rgba(120, 220, 255, 0.28)',
    leak: ['rgba(60, 200, 255, 0.30)', 'rgba(255, 30, 170, 0.34)'],
    halftoneInk: '#120430', inkLine: '#05010e',
    letter: {
      fill: [[0, '#ffffff'], [0.3, '#9ef6ff'], [0.52, '#33c6ff'], [0.53, '#ff3fbf'], [1, '#6a12c9']],
      outline: '#05010e', rim: '#ffffff', extrude: ['#3b0d7a', '#0a0220'], glow: 'rgba(60, 200, 255, 0.85)',
      script: '#ff5fd2', scriptGlow: '#ff1fb0', ribbon: '#05010e', ribbonText: '#7ff0ff', stripes: '#1a0640',
    },
    tile: ['#050116', '#2a0a6e', '#8a1fc4', '#ff2f9a', '#ffb3e6'],
  },
  {
    id: 'miami-pastel', name: 'Miami Pastel',
    swatch: ['#3d2c5e', '#ff6fb5', '#4fd1c5', '#fff4e0'],
    gradeMaps: [
      ['#2a1648', '#8f2f86', '#ff5fa8', '#ffb39a', '#fff3e0'],
      ['#0f2f4a', '#16808c', '#3fd6c6', '#ffc2dc', '#ffffff'],
      ['#2e1650', '#6f45b8', '#ff6fae', '#ffd3a8', '#fffaf0'],
      ['#14345a', '#2f8fc0', '#ff86b4', '#ffe8c8'],
    ],
    mapMix: 0.82, contrast: 1.18, saturationKeep: 1.3,
    gutter: '#fff3f6', frame: 'rgba(60, 30, 70, 0.18)',
    leak: ['rgba(255, 170, 200, 0.40)', 'rgba(120, 240, 230, 0.30)'],
    halftoneInk: '#5a2f6e', inkLine: '#3a1f4a',
    letter: {
      fill: [[0, '#ffffff'], [0.35, '#ffd3ea'], [0.52, '#ff7fbf'], [0.53, '#43d6c9'], [1, '#1f8fa3']],
      outline: '#2a1238', rim: '#ffffff', extrude: ['#8a3f8f', '#3a1a4a'], glow: 'rgba(255, 140, 200, 0.6)',
      script: '#1fb5b0', scriptGlow: '#5ff0e6', ribbon: '#ff6fb5', ribbonText: '#ffffff', stripes: '#ffffff',
    },
    tile: ['#2e1a5a', '#8f3f9a', '#ff6fae', '#ffb39a', '#fff0d0'],
  },
  {
    id: 'noir-heat', name: 'Noir Heat',
    swatch: ['#000000', '#5a0b0b', '#e3321f', '#ffd0a0'],
    gradeMaps: [
      ['#000000', '#2a0606', '#8f1410', '#e3321f', '#ffb37a', '#fff3e6'],
      ['#000000', '#1a1a1a', '#5a5a5a', '#c8c8c8', '#ffffff'],
      ['#050000', '#3a0a08', '#b0221a', '#ff7a3d', '#ffe6c8'],
    ],
    mapMix: 0.95, contrast: 1.42, saturationKeep: 0.6,
    gutter: '#000000', frame: 'rgba(255, 80, 50, 0.3)',
    leak: ['rgba(255, 50, 20, 0.30)', 'rgba(255, 150, 60, 0.22)'],
    halftoneInk: '#000000', inkLine: '#000000',
    letter: {
      fill: [[0, '#fff6ea'], [0.4, '#ffc48a'], [0.52, '#ff5a2a'], [0.53, '#d0150f'], [1, '#5a0505']],
      outline: '#000000', rim: '#ffe8d6', extrude: ['#3a0505', '#000000'], glow: 'rgba(255, 50, 20, 0.7)',
      script: '#ff3a24', scriptGlow: '#ff2010', ribbon: '#d0150f', ribbonText: '#ffffff', stripes: '#000000',
    },
    tile: ['#000000', '#2a0505', '#8f1410', '#ff3a24', '#ffb37a'],
  },
  {
    id: 'golden-coast', name: 'Golden Coast',
    swatch: ['#0c2430', '#1d7f8c', '#ffb347', '#fff1c9'],
    gradeMaps: [
      ['#081a24', '#14505e', '#2a9a9e', '#ffb347', '#fff1c9'],
      ['#1a0f0a', '#6a2e14', '#d9742a', '#ffcf6a', '#fff8e0'],
      ['#0a1e2c', '#1d5f80', '#ff9f5a', '#ffe3a8'],
    ],
    mapMix: 0.8, contrast: 1.2, saturationKeep: 1.2,
    gutter: '#0a0f14', frame: 'rgba(255, 220, 150, 0.25)',
    leak: ['rgba(255, 180, 60, 0.38)', 'rgba(40, 200, 210, 0.22)'],
    halftoneInk: '#0a2a34', inkLine: '#06141c',
    letter: {
      fill: [[0, '#fffdf0'], [0.38, '#ffe27a'], [0.52, '#ffa53a'], [0.53, '#22b5b8'], [1, '#0d5a6e']],
      outline: '#06121a', rim: '#fff8e8', extrude: ['#0d3a4a', '#03121a'], glow: 'rgba(255, 180, 60, 0.7)',
      script: '#ffb347', scriptGlow: '#ff8a1f', ribbon: '#06121a', ribbonText: '#ffd27a', stripes: '#0b3340',
    },
    tile: ['#0a2a3a', '#1d6f80', '#ff9f5a', '#ffd27a', '#fff3c8'],
  },
];

/** Finds a preset by id, falling back to Sunset Strip. */
export function findStylePreset(id) {
  return STYLE_PRESETS.find((preset) => preset.id === id) ?? STYLE_PRESETS[0];
}
