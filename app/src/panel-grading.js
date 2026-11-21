// The colour grade of one panel: the cropped photo is mapped through a gradient map (a duotone/tritone ramp
// from shadow to highlight), with an S-curve, optional posterize bands, an ink outline from a Sobel edge pass,
// seeded film grain, a halftone dot screen, a light leak and a vignette. Pure canvas 2D and typed arrays.

/** Parses '#rrggbb' into [r, g, b]. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A 256-entry RGB lookup table spreading the colours evenly from shadows (index 0) to highlights (255). */
export function buildGradientMapLut(colors) {
  const stops = colors.map(hexToRgb);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    const f = t - k;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = stops[k][c] + (stops[k + 1][c] - stops[k][c]) * f;
  }
  return lut;
}

/** A small seeded random generator (mulberry32), so grain and dots stay still between redraws. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Where to draw a photo of size (iw, ih) so it covers a panel (pw, ph): `zoom` >= 1 magnifies beyond the
 * cover fit, (cx, cy) is the photo point (0..1) placed at the panel centre, clamped so no empty edge shows.
 */
export function computePhotoPlacement(iw, ih, pw, ph, cx, cy, zoom) {
  const scale = Math.max(pw / iw, ph / ih) * Math.max(1, zoom);
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = pw / 2 - cx * dw;
  let dy = ph / 2 - cy * dh;
  dx = Math.min(0, Math.max(pw - dw, dx));
  dy = Math.min(0, Math.max(ph - dh, dy));
  return { dx, dy, dw, dh, scale };
}

/** Applies gradient map, contrast curve, posterize, ink edges and grain to the panel's pixels in place. */
export function gradePanelPixels(image, options) {
  const { data, width: w, height: h } = image;
  const { lut, mapMix, contrast, saturationKeep, posterizeLevels, inkStrength, inkRgb, grain, seed } = options;
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; p < lum.length; p++, i += 4) {
    lum[p] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  const random = seededRandom(seed);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = p * 4;
      let l = (lum[p] - 0.5) * contrast + 0.5;
      l = l < 0 ? 0 : l > 1 ? 1 : l;
      l = l * l * (3 - 2 * l) * 0.55 + l * 0.45; // gentle S-curve
      if (posterizeLevels > 1) l = Math.round(l * (posterizeLevels - 1)) / (posterizeLevels - 1);
      const k = Math.round(l * 255) * 3;
      // the photo's own colour, saturation boosted, keeps skin and sky readable under the map
      const r0 = data[i], g0 = data[i + 1], b0 = data[i + 2];
      const grey = lum[p] * 255;
      const rs = grey + (r0 - grey) * saturationKeep;
      const gs = grey + (g0 - grey) * saturationKeep;
      const bs = grey + (b0 - grey) * saturationKeep;
      let r = lut[k] * mapMix + rs * (1 - mapMix);
      let g = lut[k + 1] * mapMix + gs * (1 - mapMix);
      let b = lut[k + 2] * mapMix + bs * (1 - mapMix);
      if (inkStrength > 0 && x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        const gx = lum[p - w + 1] + 2 * lum[p + 1] + lum[p + w + 1] - lum[p - w - 1] - 2 * lum[p - 1] - lum[p + w - 1];
        const gy = lum[p + w - 1] + 2 * lum[p + w] + lum[p + w + 1] - lum[p - w - 1] - 2 * lum[p - w] - lum[p - w + 1];
        const edge = Math.min(1, Math.max(0, Math.sqrt(gx * gx + gy * gy) * 2.2 - 0.35)) * inkStrength;
        r += (inkRgb[0] - r) * edge;
        g += (inkRgb[1] - g) * edge;
        b += (inkRgb[2] - b) * edge;
      }
      if (grain > 0) {
        const n = (random() - 0.5) * grain * 255;
        r += n; g += n; b += n;
      }
      data[i] = r; data[i + 1] = g; data[i + 2] = b;
    }
  }
  return lum;
}

/** Lays a halftone dot screen over the panel: dots grow in the shadows, multiplied in the preset's ink colour. */
export function drawHalftoneScreen(ctx, lum, w, h, cell, inkColor, strength) {
  if (strength <= 0 || cell < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = Math.min(1, strength);
  ctx.fillStyle = inkColor;
  ctx.beginPath();
  for (let gy = 0, rowIndex = 0; gy < h + cell; gy += cell * 0.866, rowIndex++) {
    const offset = rowIndex % 2 ? cell / 2 : 0;
    for (let gx = offset; gx < w + cell; gx += cell) {
      const sx = Math.min(w - 1, Math.max(0, Math.round(gx)));
      const sy = Math.min(h - 1, Math.max(0, Math.round(gy)));
      const dark = 1 - lum[sy * w + sx];
      // dots only bloom from the mid-tones down, and fade toward the top of the panel like a printed screen
      const fade = 0.35 + 0.65 * (gy / h);
      const radius = cell * 0.52 * Math.sqrt(Math.max(0, dark - 0.25) / 0.75) * fade;
      if (radius < 0.4) continue;
      ctx.moveTo(gx + radius, gy);
      ctx.arc(gx, gy, radius, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

/** A sunset light leak from one corner and a soft vignette, the finishing pass on every panel. */
export function drawLightLeakAndVignette(ctx, w, h, leakColors, panelIndex, vignette) {
  const corner = panelIndex % 4;
  const lx = corner === 0 || corner === 3 ? w * 1.05 : -w * 0.05;
  const ly = corner < 2 ? -h * 0.05 : h * 1.05;
  const leak = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(w, h) * 0.95);
  leak.addColorStop(0, leakColors[panelIndex % leakColors.length]);
  leak.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = leak;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  if (vignette > 0) {
    const r = Math.hypot(w, h) / 2;
    const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r * 1.05);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, `rgba(0, 0, 0, ${0.75 * vignette})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}

/**
 * Paints one finished panel onto a new canvas of size (w, h): the photo cropped by the panel's pan and zoom,
 * then graded with the preset. `unit` is the cover's short side, so effect sizes scale with the export size.
 */
export function renderGradedPanel(source, panel, w, h, preset, effects, panelIndex, unit) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = preset.gutter;
  ctx.fillRect(0, 0, w, h);
  if (source) {
    const iw = source.naturalWidth || source.width;
    const ih = source.naturalHeight || source.height;
    const place = computePhotoPlacement(iw, ih, w, h, panel.cx, panel.cy, panel.zoom);
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    if (panel.flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(source, place.dx, place.dy, place.dw, place.dh);
    ctx.restore();
  }
  const image = ctx.getImageData(0, 0, w, h);
  const maps = preset.gradeMaps;
  const lum = gradePanelPixels(image, {
    lut: buildGradientMapLut(maps[(panelIndex + (panel.gradeShift ?? 0)) % maps.length]),
    mapMix: preset.mapMix * effects.gradeStrength,
    contrast: preset.contrast,
    saturationKeep: preset.saturationKeep,
    posterizeLevels: effects.posterize ? 6 : 0,
    inkStrength: effects.ink,
    inkRgb: hexToRgb(preset.inkLine),
    grain: effects.grain * 0.16,
    seed: 1000 + panelIndex * 7919,
  });
  ctx.putImageData(image, 0, 0);
  drawHalftoneScreen(ctx, lum, w, h, Math.max(3, unit * 0.0085), preset.halftoneInk, effects.halftone * 0.55);
  drawLightLeakAndVignette(ctx, w, h, preset.leak, panelIndex, effects.vignette);
  return canvas;
}
