// The title lockup, our own design drawn entirely with canvas: a neon script line, the caption in heavy
// condensed capitals (generic system faces only, no font file) with a deep extrusion, a black outline, a light
// rim, a chrome sunset gradient cut by horizon stripes and a glow, then a tagline ribbon underneath.

const HEAVY_FACE = '"Arial Black", "Segoe UI Black", Impact, "Helvetica Neue", sans-serif';
const SCRIPT_FACE = '"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive';
const CONDENSE_X = 0.9;
const STRETCH_Y = 1.12;
const LEAN = -0.13;

/** The canvas font string for the heavy caption face at `size` pixels. */
export function heavyFont(size) {
  return `900 ${size}px ${HEAVY_FACE}`;
}

/** The canvas font string for the neon script face at `size` pixels. */
export function scriptFont(size) {
  return `italic 400 ${size}px ${SCRIPT_FACE}`;
}

/** Splits a caption into one line, or two balanced lines when it is long and has a space to break at. */
export function splitCaptionLines(caption) {
  const text = caption.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!text) return [];
  if (text.includes('\n') || text.length <= 11 || !text.includes(' ')) return [text];
  const words = text.split(' ');
  let best = [text];
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const score = Math.abs(a.length - b.length);
    if (score < bestScore) { bestScore = score; best = [a, b]; }
  }
  return best;
}

/** Mixes two '#rrggbb' colours, t = 0 giving the first. */
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** Fills the caption face with the chrome gradient and horizon stripes on its own canvas, ready to stamp. */
function paintChromeFace(text, size, spacing, style) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = heavyFont(size);
  ctx.letterSpacing = `${spacing}px`;
  const width = Math.ceil(ctx.measureText(text).width);
  const pad = Math.ceil(size * 0.3);
  canvas.width = width + pad * 2;
  canvas.height = Math.ceil(size * 1.2) + pad;
  const baseline = pad + Math.round(size * 0.78);
  ctx.font = heavyFont(size);
  ctx.letterSpacing = `${spacing}px`;
  ctx.textBaseline = 'alphabetic';
  const capTop = baseline - size * 0.73;
  const fill = ctx.createLinearGradient(0, capTop, 0, baseline);
  for (const [at, color] of style.fill) fill.addColorStop(at, color);
  ctx.fillStyle = fill;
  ctx.fillText(text, pad, baseline);
  // horizon stripes across the lower letters, thickening toward the baseline like a setting sun
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = style.stripes;
  const capHeight = baseline - capTop;
  let y = capTop + capHeight * 0.62;
  for (let i = 0; i < 4; i++) {
    const thick = capHeight * (0.025 + i * 0.018);
    ctx.fillRect(0, y, canvas.width, thick);
    y += thick + capHeight * (0.085 - i * 0.012);
  }
  // a thin specular line along the top of the letters
  const shine = ctx.createLinearGradient(0, capTop, 0, capTop + capHeight * 0.3);
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, capTop - pad, canvas.width, capHeight * 0.3 + pad);
  return { canvas, width, pad, baseline };
}

/** Draws one caption line centred on (cx, baseline): glow, extrusion, outline, rim and chrome face. */
export function drawHeavyCaptionLine(ctx, text, cx, baseline, size, style) {
  const spacing = -size * 0.015;
  const face = paintChromeFace(text, size, spacing, style);
  ctx.save();
  ctx.translate(cx, baseline);
  ctx.transform(1, 0, LEAN, 1, 0, 0);
  ctx.scale(CONDENSE_X, STRETCH_Y);
  ctx.font = heavyFont(size);
  ctx.letterSpacing = `${spacing}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  // glow halo
  ctx.shadowColor = style.glow;
  ctx.shadowBlur = size * 0.45;
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = size * 0.22;
  ctx.strokeText(text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  // extrusion: a stack of offset copies falling down and right
  const depth = size * 0.13;
  const steps = Math.max(6, Math.round(depth / 1.5));
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = size * 0.2;
  ctx.strokeText(text, depth * 0.55, depth);
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const color = mixHex(style.extrude[0], style.extrude[1], t);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.1;
    ctx.strokeText(text, depth * 0.55 * t, depth * t);
    ctx.fillText(text, depth * 0.55 * t, depth * t);
  }
  // outline and rim
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(text, 0, 0);
  ctx.strokeStyle = style.rim;
  ctx.lineWidth = size * 0.055;
  ctx.strokeText(text, 0, 0);
  ctx.drawImage(face.canvas, -face.width / 2 - face.pad, -face.baseline);
  ctx.restore();
}

/** Draws the neon script line, tilted, with a dark backing stroke so it reads over any panel. */
export function drawNeonScriptLine(ctx, text, x, y, size, style, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = scriptFont(size);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = style.scriptGlow;
  ctx.shadowBlur = size * 0.45;
  ctx.fillStyle = style.script;
  ctx.fillText(text, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = size * 0.12;
  ctx.shadowColor = '#ffffff';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, size * 0.01, -size * 0.01);
  ctx.restore();
}

/** Draws the tagline in spaced capitals on a slanted ribbon centred at (cx, cy). Returns the ribbon width. */
export function drawTaglineRibbon(ctx, text, cx, cy, size, style) {
  const label = text.trim().toUpperCase();
  if (!label) return 0;
  ctx.save();
  ctx.font = `900 ${size}px ${HEAVY_FACE}`;
  ctx.letterSpacing = `${size * 0.32}px`;
  const textWidth = ctx.measureText(label).width - size * 0.32;
  const padX = size * 0.9;
  const halfH = size * 0.95;
  const left = cx - textWidth / 2 - padX;
  const right = cx + textWidth / 2 + padX;
  const slant = halfH * 0.5;
  ctx.fillStyle = style.ribbon;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = size * 0.6;
  ctx.shadowOffsetY = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(left + slant, cy - halfH);
  ctx.lineTo(right + slant, cy - halfH);
  ctx.lineTo(right - slant, cy + halfH);
  ctx.lineTo(left - slant, cy + halfH);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = style.ribbonText;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = style.ribbonText;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx - textWidth / 2, cy + size * 0.06);
  ctx.restore();
  return right - left;
}

/**
 * Draws the whole lockup fitted into `box` ({ x, y, w, h }): script line, caption, tagline. `texts` holds
 * caption, subtitle and tagline; `style` is the preset's letter paint. Returns the box the caption took.
 */
export function drawTitleLockup(ctx, box, texts, style) {
  const lines = splitCaptionLines(texts.caption);
  const subtitle = texts.subtitle.trim();
  const tagline = texts.tagline.trim();
  ctx.save();
  ctx.font = heavyFont(100);
  ctx.letterSpacing = '-1.5px';
  const widest = Math.max(1, ...lines.map((line) => ctx.measureText(line).width)) / 100;
  ctx.restore();
  const lineAdvance = 0.84 * STRETCH_Y;
  const scriptShare = subtitle ? 0.42 : 0;
  const tagShare = tagline ? 0.62 : 0;
  const byWidth = (box.w * 0.9) / (widest * CONDENSE_X + 0.3);
  const byHeight = box.h / (Math.max(1, lines.length) * lineAdvance + scriptShare + tagShare + 0.15);
  const size = Math.max(8, Math.min(byWidth, byHeight));
  const totalH = Math.max(1, lines.length) * lineAdvance * size + scriptShare * size + tagShare * size;
  const cx = box.x + box.w / 2;
  let y = box.y + (box.h - totalH) / 2 + scriptShare * size;
  const captionTop = y;
  for (const line of lines) {
    y += size * 0.75 * STRETCH_Y;
    drawHeavyCaptionLine(ctx, line, cx, y, size, style);
    y += (lineAdvance - 0.75 * STRETCH_Y) * size;
  }
  if (subtitle) {
    const scriptSize = size * 0.72;
    ctx.save();
    ctx.font = scriptFont(scriptSize);
    const scriptWidth = ctx.measureText(subtitle).width;
    ctx.restore();
    const firstWidth = lines.length ? widest * CONDENSE_X * size : scriptWidth;
    const sx = Math.max(box.x + size * 0.1, cx - firstWidth / 2 - size * 0.15);
    drawNeonScriptLine(ctx, subtitle, Math.min(sx, box.x + box.w - scriptWidth), captionTop + size * 0.12, scriptSize, style, -0.1);
  }
  if (tagline) {
    drawTaglineRibbon(ctx, tagline, cx, y + size * 0.36, Math.max(7, size * 0.15), style);
  }
  return { x: cx - (widest * CONDENSE_X * size) / 2, y: captionTop, w: widest * CONDENSE_X * size, h: totalH };
}
