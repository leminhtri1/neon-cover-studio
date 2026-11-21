// The studio: wires the editor around the live cover preview. Photos come from the file picker, drag & drop or
// the clipboard and never leave the page; the preview canvas is a scaled render of the export, and the overlay
// canvas above it handles panel selection, drag-to-pan, wheel-to-zoom and drop-on-panel.

import { PANEL_LAYOUTS, findLayout, layoutPanelsForCover } from './panel-layouts.js';
import { STYLE_PRESETS, findStylePreset } from './style-presets.js';
import { computePhotoPlacement } from './panel-grading.js';
import { renderCover, createPanelCache } from './cover-renderer.js';
import { paintNeonCityScene, paintSunsetSampleScene } from './sunset-scenes.js';
import { runScreenshotScene } from './screenshot-scenes.js';

const MAX_PANELS = 8;
/** Varied starting crops so one photo across many panels reads as a sequence of different shots. */
const AUTO_CROPS = [
  { zoom: 1, cx: 0.5, cy: 0.45 }, { zoom: 2.1, cx: 0.55, cy: 0.27 }, { zoom: 1.5, cx: 0.3, cy: 0.62 },
  { zoom: 2.7, cx: 0.6, cy: 0.22 }, { zoom: 1.3, cx: 0.72, cy: 0.5 }, { zoom: 1.9, cx: 0.4, cy: 0.75 },
  { zoom: 1.15, cx: 0.45, cy: 0.35 }, { zoom: 3.1, cx: 0.52, cy: 0.3 },
];

const $ = (id) => document.getElementById(id);
const coverCanvas = $('cover-canvas');
const overlayCanvas = $('overlay-canvas');
const panelCache = createPanelCache();

/** The photo library: [{ name, image, thumb }]. Samples first, the person's own photos after. */
export const photoLibrary = [];

/** The cover being edited: everything the renderer needs, plain data. */
export const coverDoc = {
  width: 1920, height: 1080,
  layoutId: 'seven-classic', presetId: 'sunset', lockup: 'auto',
  caption: 'Palm City', subtitle: 'Welcome to', tagline: 'One summer · No rules', cornerNote: 'Vol. 06 · 2026',
  effects: { gutter: 0.011, halftone: 0.55, grain: 0.45, ink: 0.15, vignette: 0.6, posterize: false, gradeStrength: 1 },
  panels: [],
};

let selectedPanel = 0;
let panelRects = [];
let previewScale = 0.5;
let renderQueued = false;

/** Fills the panel list so every layout has a panel per cell, each with a varied crop of `photo`. */
export function assignPhotoToAllPanels(photo) {
  coverDoc.panels = Array.from({ length: MAX_PANELS }, (_, i) => ({ photo, flip: false, gradeShift: 0, ...AUTO_CROPS[i] }));
}

/** Deals the library's photos across the panels in turn, each with its own crop. */
export function spreadPhotosAcrossPanels(photoIndexes) {
  coverDoc.panels = Array.from({ length: MAX_PANELS }, (_, i) => ({
    photo: photoIndexes[i % photoIndexes.length], flip: false, gradeShift: 0, ...AUTO_CROPS[(i * 3) % AUTO_CROPS.length],
  }));
}

/** Loads an image from a URL (an object URL of a local file, or a sample under app/). */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds an image to the library with a small thumbnail canvas, returning its index. */
export function addPhotoToLibrary(name, image) {
  const thumb = document.createElement('canvas');
  thumb.width = thumb.height = 96;
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const place = computePhotoPlacement(iw, ih, 96, 96, 0.5, 0.45, 1);
  thumb.getContext('2d').drawImage(image, place.dx, place.dy, place.dw, place.dh);
  photoLibrary.push({ name: `${photoLibrary.length}:${name}`, image, thumb });
  return photoLibrary.length - 1;
}

/** Reads image files picked, dropped or pasted, adds them, and puts them on the panels. */
export async function importPhotoFiles(files, targetPanel = null) {
  const images = [...files].filter((file) => file.type.startsWith('image/'));
  if (!images.length) return;
  const added = [];
  for (const file of images) {
    try {
      added.push(addPhotoToLibrary(file.name, await loadImageElement(URL.createObjectURL(file))));
    } catch {
      setStatus(`Could not read ${file.name}`);
    }
  }
  if (!added.length) return;
  if (targetPanel !== null) {
    coverDoc.panels[targetPanel] = { ...coverDoc.panels[targetPanel], photo: added[0], zoom: 1, cx: 0.5, cy: 0.45 };
    selectedPanel = targetPanel;
  } else if (added.length === 1) {
    assignPhotoToAllPanels(added[0]);
  } else {
    spreadPhotosAcrossPanels(added);
  }
  setStatus(`${added.length} photo${added.length > 1 ? 's' : ''} added`, true);
  refreshControls();
  scheduleRender();
}

function setStatus(text, ok = false) {
  const status = $('status');
  status.textContent = text;
  status.classList.toggle('ok', ok);
}

/** Sizes the preview canvas to fit the stage at screen resolution, keeping the export's aspect. */
function fitPreviewToStage() {
  const stage = document.querySelector('.stage');
  const availW = stage.clientWidth - 28;
  const availH = stage.clientHeight - 48;
  const fit = Math.min(availW / coverDoc.width, availH / coverDoc.height);
  const cssW = Math.floor(coverDoc.width * fit);
  const cssH = Math.floor(coverDoc.height * fit);
  previewScale = Math.min(1, fit * Math.min(2, window.devicePixelRatio || 1));
  coverCanvas.style.width = `${cssW}px`;
  coverCanvas.style.height = `${cssH}px`;
  coverCanvas.width = Math.round(coverDoc.width * previewScale);
  coverCanvas.height = Math.round(coverDoc.height * previewScale);
  overlayCanvas.width = coverCanvas.width;
  overlayCanvas.height = coverCanvas.height;
}

/** Queues one render on the next animation frame, however many edits arrive before it. */
export function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    panelRects = renderCover(coverCanvas, coverDoc, photoLibrary, panelCache);
    drawSelectionOverlay();
  });
}

/** Outlines the selected panel and labels it, on the overlay only (never in the export). */
function drawSelectionOverlay() {
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  const rect = panelRects.find((r) => r.id === selectedPanel);
  if (!rect) return;
  const line = Math.max(2, overlayCanvas.width / 400);
  ctx.strokeStyle = '#2fe0d6';
  ctx.lineWidth = line;
  ctx.setLineDash([line * 4, line * 2]);
  ctx.strokeRect(rect.x + line / 2, rect.y + line / 2, rect.w - line, rect.h - line);
  ctx.setLineDash([]);
  const tag = Math.max(14, overlayCanvas.width / 45);
  ctx.fillStyle = '#2fe0d6';
  ctx.fillRect(rect.x + line, rect.y + line, tag * 1.4, tag * 1.2);
  ctx.fillStyle = '#0d0716';
  ctx.font = `900 ${tag * 0.8}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(selectedPanel + 1), rect.x + line + tag * 0.7, rect.y + line + tag * 0.62);
}

/** The panel under a pointer event, as an index, or null over a gutter or the title tile. */
function panelAtPointer(event) {
  const bounds = overlayCanvas.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * overlayCanvas.width;
  const y = ((event.clientY - bounds.top) / bounds.height) * overlayCanvas.height;
  const hit = panelRects.find((r) => r.id !== 'T' && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  return hit ? hit.id : null;
}

/** Moves a panel's crop by a pointer movement of (dx, dy) canvas pixels, clamped to the photo's edges. */
function panPanelBy(index, dx, dy) {
  const panel = coverDoc.panels[index];
  const rect = panelRects.find((r) => r.id === index);
  const photo = photoLibrary[panel.photo];
  if (!rect || !photo) return;
  const iw = photo.image.naturalWidth || photo.image.width;
  const ih = photo.image.naturalHeight || photo.image.height;
  const place = computePhotoPlacement(iw, ih, rect.w, rect.h, panel.cx, panel.cy, panel.zoom);
  const halfX = rect.w / 2 / place.dw;
  const halfY = rect.h / 2 / place.dh;
  panel.cx = Math.min(1 - halfX, Math.max(halfX, panel.cx - (panel.flip ? -dx : dx) / place.dw));
  panel.cy = Math.min(1 - halfY, Math.max(halfY, panel.cy - dy / place.dh));
}

function wirePanelGestures() {
  let drag = null;
  overlayCanvas.addEventListener('pointerdown', (event) => {
    const hit = panelAtPointer(event);
    if (hit === null) return;
    selectedPanel = hit;
    drag = { x: event.clientX, y: event.clientY };
    overlayCanvas.setPointerCapture(event.pointerId);
    overlayCanvas.classList.add('panning');
    refreshPanelInspector();
    drawSelectionOverlay();
  });
  overlayCanvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const ratio = overlayCanvas.width / overlayCanvas.getBoundingClientRect().width;
    panPanelBy(selectedPanel, (event.clientX - drag.x) * ratio, (event.clientY - drag.y) * ratio);
    drag = { x: event.clientX, y: event.clientY };
    scheduleRender();
  });
  const endDrag = () => { drag = null; overlayCanvas.classList.remove('panning'); };
  overlayCanvas.addEventListener('pointerup', endDrag);
  overlayCanvas.addEventListener('pointercancel', endDrag);
  overlayCanvas.addEventListener('wheel', (event) => {
    const hit = panelAtPointer(event);
    if (hit === null) return;
    event.preventDefault();
    selectedPanel = hit;
    const panel = coverDoc.panels[hit];
    panel.zoom = Math.min(4, Math.max(1, panel.zoom * Math.exp(-event.deltaY * 0.0015)));
    refreshPanelInspector();
    scheduleRender();
  }, { passive: false });
}

function wireFileInputs() {
  $('photo-input').addEventListener('change', (event) => importPhotoFiles(event.target.files));
  window.addEventListener('dragover', (event) => {
    event.preventDefault();
    document.body.classList.add('dragging');
  });
  window.addEventListener('dragleave', (event) => {
    if (!event.relatedTarget) document.body.classList.remove('dragging');
  });
  window.addEventListener('drop', (event) => {
    event.preventDefault();
    document.body.classList.remove('dragging');
    const onPanel = event.target === overlayCanvas ? panelAtPointer(event) : null;
    importPhotoFiles(event.dataTransfer.files, onPanel);
  });
  window.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.items ?? [])].filter((item) => item.kind === 'file').map((item) => item.getAsFile());
    if (files.length) importPhotoFiles(files, null);
  });
}

/** Draws a layout's cells into a small thumbnail canvas for the layout picker. */
function drawLayoutThumbnail(layout) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0716';
  ctx.fillRect(0, 0, 64, 40);
  const { rects } = layoutPanelsForCover(layout, 64, 40, 0.05);
  for (const rect of rects) {
    const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    g.addColorStop(0, rect.id === 'T' ? '#ffd27a' : '#ff3d8b');
    g.addColorStop(1, rect.id === 'T' ? '#ff3d8b' : '#6a1a8e');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  return canvas;
}

function buildLayoutPicker() {
  const picker = $('layout-picker');
  for (const layout of PANEL_LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = layout.id;
    button.title = `${layout.name} (${layout.panels} panels)`;
    button.append(drawLayoutThumbnail(layout), layout.name.split(' ')[0]);
    button.addEventListener('click', () => {
      coverDoc.layoutId = layout.id;
      if (selectedPanel >= layout.panels) selectedPanel = 0;
      refreshControls();
      scheduleRender();
    });
    picker.append(button);
  }
}

function buildPresetPicker() {
  const picker = $('preset-picker');
  for (const preset of STYLE_PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.preset = preset.id;
    const swatch = document.createElement('i');
    swatch.style.background = `linear-gradient(90deg, ${preset.swatch.join(', ')})`;
    button.append(swatch, preset.name);
    button.addEventListener('click', () => {
      coverDoc.presetId = preset.id;
      refreshControls();
      scheduleRender();
    });
    picker.append(button);
  }
}

/** Rebuilds a strip of photo thumbnails; `onPick(index)` runs on click, `activeIndex` is highlighted. */
function fillPhotoStrip(strip, activeIndex, onPick) {
  strip.replaceChildren(...photoLibrary.map((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = photo.name.split(':').slice(1).join(':');
    button.classList.toggle('active', index === activeIndex);
    const thumb = document.createElement('canvas');
    thumb.width = thumb.height = 96;
    thumb.getContext('2d').drawImage(photo.thumb, 0, 0);
    button.append(thumb);
    button.addEventListener('click', () => onPick(index));
    return button;
  }));
}

let libraryPick = 0;
function refreshPanelInspector() {
  const panel = coverDoc.panels[selectedPanel];
  $('panel-number').textContent = `${selectedPanel + 1} of ${findLayout(coverDoc.layoutId).panels}`;
  $('panel-zoom').value = panel.zoom;
  fillPhotoStrip($('panel-photo-picker'), panel.photo, (index) => {
    coverDoc.panels[selectedPanel] = { ...panel, photo: index, zoom: 1, cx: 0.5, cy: 0.45 };
    refreshPanelInspector();
    scheduleRender();
  });
}

/** Brings every control in line with coverDoc (after a preset, layout, size or photo change). */
export function refreshControls() {
  document.querySelectorAll('#size-buttons button').forEach((button) => {
    button.classList.toggle('active', button.dataset.size === `${coverDoc.width}x${coverDoc.height}`);
  });
  document.querySelectorAll('#layout-picker button').forEach((b) => b.classList.toggle('active', b.dataset.layout === coverDoc.layoutId));
  document.querySelectorAll('#preset-picker button').forEach((b) => b.classList.toggle('active', b.dataset.preset === coverDoc.presetId));
  const fx = coverDoc.effects;
  $('fx-grade').value = fx.gradeStrength;
  $('fx-halftone').value = fx.halftone;
  $('fx-grain').value = fx.grain;
  $('fx-ink').value = fx.ink;
  $('fx-vignette').value = fx.vignette;
  $('fx-gutter').value = fx.gutter;
  $('fx-posterize').checked = fx.posterize;
  $('text-caption').value = coverDoc.caption;
  $('text-subtitle').value = coverDoc.subtitle;
  $('text-tagline').value = coverDoc.tagline;
  $('text-corner').value = coverDoc.cornerNote;
  $('lockup-position').value = coverDoc.lockup;
  fillPhotoStrip($('photo-strip'), libraryPick, (index) => { libraryPick = index; refreshControls(); });
  refreshPanelInspector();
}

function wireControls() {
  document.querySelectorAll('#size-buttons button').forEach((button) => {
    button.addEventListener('click', () => {
      [coverDoc.width, coverDoc.height] = button.dataset.size.split('x').map(Number);
      fitPreviewToStage();
      refreshControls();
      scheduleRender();
    });
  });
  const sliders = { 'fx-grade': 'gradeStrength', 'fx-halftone': 'halftone', 'fx-grain': 'grain', 'fx-ink': 'ink', 'fx-vignette': 'vignette', 'fx-gutter': 'gutter' };
  for (const [id, key] of Object.entries(sliders)) {
    $(id).addEventListener('input', (event) => { coverDoc.effects[key] = Number(event.target.value); scheduleRender(); });
  }
  $('fx-posterize').addEventListener('change', (event) => { coverDoc.effects.posterize = event.target.checked; scheduleRender(); });
  const texts = { 'text-caption': 'caption', 'text-subtitle': 'subtitle', 'text-tagline': 'tagline', 'text-corner': 'cornerNote' };
  for (const [id, key] of Object.entries(texts)) {
    $(id).addEventListener('input', (event) => { coverDoc[key] = event.target.value; scheduleRender(); });
  }
  $('lockup-position').addEventListener('change', (event) => { coverDoc.lockup = event.target.value; scheduleRender(); });
  $('fill-all').addEventListener('click', () => { assignPhotoToAllPanels(libraryPick); refreshControls(); scheduleRender(); });
  $('spread-photos').addEventListener('click', () => {
    spreadPhotosAcrossPanels(photoLibrary.map((_, i) => i).reverse());
    refreshControls();
    scheduleRender();
  });
  $('shuffle-crops').addEventListener('click', shufflePanelCrops);
  $('panel-zoom').addEventListener('input', (event) => { coverDoc.panels[selectedPanel].zoom = Number(event.target.value); scheduleRender(); });
  $('panel-flip').addEventListener('click', () => { coverDoc.panels[selectedPanel].flip = !coverDoc.panels[selectedPanel].flip; scheduleRender(); });
  $('panel-tint').addEventListener('click', () => { coverDoc.panels[selectedPanel].gradeShift = (coverDoc.panels[selectedPanel].gradeShift ?? 0) + 1; scheduleRender(); });
  $('panel-reset').addEventListener('click', () => {
    Object.assign(coverDoc.panels[selectedPanel], { zoom: 1, cx: 0.5, cy: 0.45, flip: false });
    refreshPanelInspector();
    scheduleRender();
  });
  $('export-png').addEventListener('click', exportCoverPng);
  window.addEventListener('resize', () => { fitPreviewToStage(); scheduleRender(); });
}

/** Gives every panel a fresh random crop of its photo. */
export function shufflePanelCrops() {
  for (const panel of coverDoc.panels) {
    panel.zoom = 1 + Math.random() * 2;
    panel.cx = 0.25 + Math.random() * 0.5;
    panel.cy = 0.2 + Math.random() * 0.55;
  }
  refreshPanelInspector();
  scheduleRender();
}

/** Renders the cover at full export size and downloads it as a PNG via canvas.toBlob. */
export function exportCoverPng() {
  const full = document.createElement('canvas');
  full.width = coverDoc.width;
  full.height = coverDoc.height;
  renderCover(full, coverDoc, photoLibrary, panelCache);
  const name = `neon-cover-${coverDoc.width}x${coverDoc.height}.png`;
  full.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    setStatus(`Saved ${name}`, true);
    window.__lastExport = name;
  }, 'image/png');
}

/** Loads the two sample photos and paints the two procedural scenes, so the studio opens ready to play. */
async function loadSamplePhotos() {
  for (const name of ['boulevard', 'pier']) {
    try {
      addPhotoToLibrary(`${name}.jpg`, await loadImageElement(`samples/${name}.jpg`));
    } catch {
      setStatus(`Sample ${name} missing`);
    }
  }
  addPhotoToLibrary('Sunset bay (painted)', paintSunsetSampleScene(900, 900));
  addPhotoToLibrary('Neon avenue (painted)', paintNeonCityScene(900, 700));
}

async function startStudio() {
  buildLayoutPicker();
  buildPresetPicker();
  wireControls();
  wirePanelGestures();
  wireFileInputs();
  await loadSamplePhotos();
  spreadPhotosAcrossPanels([0, 1, 0, 2, 1, 0, 3, 1]);
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) runScreenshotScene(query, coverDoc);
  fitPreviewToStage();
  refreshControls();
  scheduleRender();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__studioReady = true; }));
}

startStudio();
