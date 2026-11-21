// Composes a whole cover: the gutter ground, every graded panel in its layout cell, the painted title tile (when
// the layout has one), the lettering lockup and the corner note. Panels are cached by everything that shapes
// them, so dragging one panel only re-grades that one.

import { findLayout, layoutPanelsForCover } from './panel-layouts.js';
import { findStylePreset } from './style-presets.js';
import { renderGradedPanel } from './panel-grading.js';
import { drawTitleLockup } from './title-lettering.js';
import { paintSynthSunset } from './sunset-scenes.js';

const PANEL_CACHE_LIMIT = 48;

/** A cache of graded panel canvases, keyed by the panel's crop, size, preset and effects. */
export function createPanelCache() {
  return new Map();
}

function panelCacheKey(panel, photoName, w, h, presetId, effects, index) {
  return [photoName, panel.cx.toFixed(4), panel.cy.toFixed(4), panel.zoom.toFixed(3), panel.flip ? 1 : 0,
    panel.gradeShift ?? 0, w, h, presetId, effects.halftone, effects.grain, effects.ink, effects.posterize,
    effects.vignette, effects.gradeStrength, index].join('|');
}

/** Where the lockup goes: inside the title tile when the layout has one, else a band at the chosen position. */
export function computeLockupBox(position, rects, width, height) {
  const tile = rects.find((rect) => rect.id === 'T');
  if (tile && position === 'auto') {
    return { x: tile.x + tile.w * 0.04, y: tile.y + tile.h * 0.08, w: tile.w * 0.92, h: tile.h * 0.84 };
  }
  const wide = width > height * 1.2;
  const bandW = width * (wide ? 0.62 : 0.9);
  const bandH = height * (wide ? 0.42 : 0.34);
  const x = (width - bandW) / 2;
  if (position === 'top') return { x, y: height * 0.05, w: bandW, h: bandH };
  if (position === 'center') return { x, y: (height - bandH) / 2, w: bandW, h: bandH };
  return { x, y: height * 0.95 - bandH, w: bandW, h: bandH };
}

/** Darkens softly behind the lockup so the lettering reads over a busy panel. */
function drawLockupShade(ctx, box, strength) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, box.h / box.w);
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, box.w * 0.62);
  shade.addColorStop(0, `rgba(8, 0, 16, ${0.55 * strength})`);
  shade.addColorStop(0.6, `rgba(8, 0, 16, ${0.3 * strength})`);
  shade.addColorStop(1, 'rgba(8, 0, 16, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(-box.w, -box.w, box.w * 2, box.w * 2);
  ctx.restore();
}

/** The small boxed note in the lower corner (an edition line, a date, a handle). */
function drawCornerNote(ctx, text, width, height, gutter, preset) {
  const note = text.trim().toUpperCase();
  if (!note) return;
  const size = Math.max(9, Math.min(width, height) * 0.017);
  ctx.save();
  ctx.font = `900 ${size}px "Arial Black", "Segoe UI Black", sans-serif`;
  ctx.letterSpacing = `${size * 0.22}px`;
  const tw = ctx.measureText(note).width;
  const padX = size * 0.7;
  const boxH = size * 1.9;
  const x = width - gutter - tw - padX * 2 - size * 0.6;
  const y = height - gutter - boxH - size * 0.6;
  ctx.fillStyle = preset.letter.ribbon;
  ctx.fillRect(x, y, tw + padX * 2, boxH);
  ctx.fillStyle = preset.letter.ribbonText;
  ctx.textBaseline = 'middle';
  ctx.fillText(note, x + padX, y + boxH / 2 + size * 0.05);
  ctx.restore();
}

/**
 * Renders `doc` onto `canvas` at the canvas's current size (the export size times a preview scale).
 * `photos` is the photo library ([{ name, image }]). Returns the panel rectangles in canvas pixels.
 */
export function renderCover(canvas, doc, photos, cache) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  const preset = findStylePreset(doc.presetId);
  const layout = findLayout(doc.layoutId);
  const unit = Math.min(width, height);
  const { gutter, rects } = layoutPanelsForCover(layout, width, height, doc.effects.gutter);
  ctx.save();
  ctx.fillStyle = preset.gutter;
  ctx.fillRect(0, 0, width, height);
  for (const rect of rects) {
    if (rect.id === 'T') {
      paintSynthSunset(ctx, rect.x, rect.y, rect.w, rect.h, preset.tile, true);
      continue;
    }
    const panel = doc.panels[rect.id];
    const photo = photos[panel?.photo] ?? photos[0];
    const key = panelCacheKey(panel, photo?.name ?? '-', rect.w, rect.h, preset.id, doc.effects, rect.id);
    let tile = cache?.get(key);
    if (!tile) {
      tile = renderGradedPanel(photo?.image, panel, rect.w, rect.h, preset, doc.effects, rect.id, unit);
      if (cache) {
        cache.set(key, tile);
        if (cache.size > PANEL_CACHE_LIMIT) cache.delete(cache.keys().next().value);
      }
    }
    ctx.drawImage(tile, rect.x, rect.y);
    ctx.strokeStyle = preset.frame;
    ctx.lineWidth = Math.max(1, unit * 0.0016);
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  }
  const box = computeLockupBox(doc.lockup, rects, width, height);
  const inTile = rects.some((rect) => rect.id === 'T') && doc.lockup === 'auto';
  if (!inTile) drawLockupShade(ctx, box, 1);
  drawTitleLockup(ctx, box, { caption: doc.caption, subtitle: doc.subtitle, tagline: doc.tagline }, preset.letter);
  drawCornerNote(ctx, doc.cornerNote, width, height, gutter, preset);
  ctx.restore();
  return rects;
}
