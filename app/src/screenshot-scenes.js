// Fixed, repeatable scenes for the maker's screenshots: `?shot=<scene>` sets up the cover from named presets
// below, and `size`, `layout`, `preset`, `caption`, `subtitle`, `tagline` and `corner` override any part of it.
// Photo indexes: 0 boulevard.jpg, 1 pier.jpg, 2 the painted sunset bay, 3 the painted neon avenue.

const crop = (photo, zoom, cx, cy, extra = {}) => ({ photo, zoom, cx, cy, flip: false, gradeShift: 0, ...extra });

/** Hand-framed panel crops for each scene: faces, the car, the rod, the sea. */
export const SCREENSHOT_SCENES = {
  'palm-city': {
    layoutId: 'seven-classic', presetId: 'sunset',
    panels: [
      crop(0, 2.2, 0.56, 0.2), crop(1, 1.3, 0.42, 0.38), crop(1, 2.4, 0.42, 0.22),
      crop(3, 1, 0.5, 0.5), crop(0, 1.05, 0.5, 0.42), crop(2, 1.1, 0.5, 0.5), crop(0, 2.1, 0.17, 0.3),
      crop(1, 1, 0.5, 0.5),
    ],
  },
  'neon-pier': {
    layoutId: 'six-stagger', presetId: 'neon-night',
    panels: [
      crop(1, 1.5, 0.4, 0.3), crop(0, 2.4, 0.56, 0.2), crop(3, 1.1, 0.5, 0.5),
      crop(2, 1.2, 0.5, 0.45), crop(1, 2.6, 0.78, 0.66), crop(0, 1.1, 0.5, 0.35), crop(2, 1, 0.5, 0.5), crop(1, 1, 0.5, 0.5),
    ],
  },
  'pastel-drive': {
    layoutId: 'title-tile-six', presetId: 'miami-pastel',
    panels: [
      crop(0, 2.3, 0.56, 0.2), crop(1, 1.2, 0.45, 0.35), crop(0, 1.6, 0.2, 0.72),
      crop(1, 2.3, 0.42, 0.22), crop(3, 1.2, 0.5, 0.5), crop(1, 1, 0.45, 0.24), crop(0, 1, 0.5, 0.5), crop(1, 1, 0.5, 0.5),
    ],
  },
};

/** Applies the scene named by `query.get('shot')` and any overrides in the query to `doc`. */
export function runScreenshotScene(query, doc) {
  const scene = SCREENSHOT_SCENES[query.get('scene') ?? 'palm-city'] ?? SCREENSHOT_SCENES['palm-city'];
  doc.layoutId = scene.layoutId;
  doc.presetId = scene.presetId;
  doc.panels = scene.panels.map((panel) => ({ ...panel }));
  const size = query.get('size');
  if (size) [doc.width, doc.height] = size.split('x').map(Number);
  if (query.get('layout')) doc.layoutId = query.get('layout');
  if (query.get('preset')) doc.presetId = query.get('preset');
  if (query.get('lockup')) doc.lockup = query.get('lockup');
  for (const [param, key] of [['caption', 'caption'], ['subtitle', 'subtitle'], ['tagline', 'tagline'], ['corner', 'cornerNote']]) {
    if (query.has(param)) doc[key] = query.get(param);
  }
}
