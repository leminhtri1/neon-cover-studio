// Procedural scenery painted with canvas: a striped synth-sun over the sea with palm silhouettes (used for the
// title tile and as a sample "photo"), and a neon city street at night. No image files, no external art.

/** Draws a palm tree silhouette rooted at (x, y), `height` tall, its trunk bending by `lean`. */
export function drawPalmSilhouette(ctx, x, y, height, lean, color) {
  const topX = x + lean * height;
  const topY = y - height;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  // trunk: tapered segments along a quadratic curve
  const segments = 24;
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const px = (t) => x + (topX - x) * t * t;
    const py = (t) => y + (topY - y) * t;
    ctx.lineWidth = height * (0.05 - 0.028 * t0);
    ctx.beginPath();
    ctx.moveTo(px(t0), py(t0));
    ctx.lineTo(px(t1), py(t1));
    ctx.stroke();
  }
  // fronds: drooping leaf blades fanned around the crown
  const fronds = [-2.9, -2.45, -2.0, -1.55, -1.15, -0.7, -0.25, 0.2];
  for (const angle of fronds) {
    const reach = height * (0.42 + 0.1 * Math.cos(angle * 3));
    const ex = topX + Math.cos(angle) * reach;
    const ey = topY + Math.sin(angle) * reach * 0.5 + reach * 0.35;
    const mx = topX + Math.cos(angle) * reach * 0.55;
    const my = topY + Math.sin(angle) * reach * 0.6 - reach * 0.12;
    const width = height * 0.06;
    const steps = 18;
    const upper = [];
    const lower = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const qx = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * mx + t * t * ex;
      const qy = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * my + t * t * ey;
      const half = Math.sin(Math.PI * Math.min(1, t * 1.15)) * width * (1 - t * 0.6);
      const jag = i % 2 ? 1 : 0.55;
      upper.push([qx, qy - half * jag]);
      lower.push([qx, qy + half]);
    }
    ctx.beginPath();
    ctx.moveTo(upper[0][0], upper[0][1]);
    for (const [px, py] of upper) ctx.lineTo(px, py);
    for (const [px, py] of lower.reverse()) ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(topX, topY, height * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Paints the synth sunset into the rectangle (x, y, w, h): a sky ramp of `colors` (top to horizon), a striped
 * sun, a glittering sea and, when `palms` is set, two palm silhouettes framing the view.
 */
export function paintSynthSunset(ctx, x, y, w, h, colors, palms = true) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const horizon = y + h * 0.64;
  const sky = ctx.createLinearGradient(0, y, 0, horizon);
  colors.forEach((color, i) => sky.addColorStop(i / (colors.length - 1), color));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, horizon - y);
  // sun with horizontal cuts in its lower half
  const r = Math.min(w, h) * 0.3;
  const sx = x + w * 0.5;
  const sy = horizon - r * 0.15;
  const sun = ctx.createLinearGradient(0, sy - r, 0, sy + r * 0.2);
  sun.addColorStop(0, '#fff6c8');
  sun.addColorStop(0.5, colors[colors.length - 1]);
  sun.addColorStop(1, colors[Math.max(0, colors.length - 3)]);
  ctx.shadowColor = colors[colors.length - 2];
  ctx.shadowBlur = r * 0.6;
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sx, sy, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors[Math.max(0, colors.length - 4)];
  for (let i = 0; i < 6; i++) {
    const band = r * (0.03 + i * 0.022);
    const by = sy - r * 0.62 + i * r * 0.115 + i * i * r * 0.004;
    ctx.fillRect(sx - r, by, r * 2, band);
  }
  // sea: darker ramp with glints of the sun's column
  const sea = ctx.createLinearGradient(0, horizon, 0, y + h);
  sea.addColorStop(0, colors[1] ?? colors[0]);
  sea.addColorStop(1, colors[0]);
  ctx.fillStyle = sea;
  ctx.fillRect(x, horizon, w, y + h - horizon);
  ctx.fillStyle = colors[colors.length - 1];
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const gy = horizon + (y + h - horizon) * t * t + 2;
    const gw = r * (1.6 - t * 0.9) * (0.6 + 0.4 * Math.sin(i * 2.3));
    ctx.globalAlpha = 0.75 - t * 0.5;
    ctx.fillRect(sx - gw / 2, gy, gw, Math.max(1, h * 0.006 * (1 + t * 2)));
  }
  ctx.globalAlpha = 1;
  if (palms) {
    const ink = colors[0];
    drawPalmSilhouette(ctx, x + w * 0.1, y + h * 1.02, h * 0.78, 0.22, ink);
    drawPalmSilhouette(ctx, x + w * 0.2, y + h * 1.04, h * 0.55, 0.32, ink);
    drawPalmSilhouette(ctx, x + w * 0.92, y + h * 1.03, h * 0.7, -0.3, ink);
  }
  ctx.restore();
}

/** Paints a night street of lit towers with neon bars and a wet road reflecting them, on a new canvas. */
export function paintNeonCityScene(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#07021a');
  sky.addColorStop(0.55, '#3a0f5e');
  sky.addColorStop(0.7, '#ff4f8a');
  sky.addColorStop(1, '#16061f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ground = height * 0.7;
  for (let layer = 0; layer < 2; layer++) {
    let x = -20;
    while (x < width) {
      const bw = width * (0.06 + rand() * 0.1);
      const bh = height * (0.25 + rand() * 0.4) * (layer ? 1 : 0.7);
      ctx.fillStyle = layer ? '#0b0418' : '#24103f';
      ctx.fillRect(x, ground - bh, bw, bh);
      if (layer) {
        for (let wy = ground - bh + 8; wy < ground - 6; wy += 9) {
          for (let wx = x + 5; wx < x + bw - 6; wx += 8) {
            if (rand() < 0.4) {
              ctx.fillStyle = rand() < 0.5 ? '#ffcf7a' : '#7ff0ff';
              ctx.fillRect(wx, wy, 3, 4);
            }
          }
        }
        if (rand() < 0.6) {
          ctx.save();
          ctx.shadowBlur = 18;
          ctx.shadowColor = ctx.strokeStyle = rand() < 0.5 ? '#ff2fb0' : '#2ff3ff';
          ctx.lineWidth = 4;
          ctx.strokeRect(x + bw * 0.15, ground - bh + bh * 0.2, bw * 0.7, height * 0.05);
          ctx.restore();
        }
      }
      x += bw + (layer ? 4 : -6);
    }
  }
  // wet road: mirrored, squashed and darkened copy of the street
  ctx.save();
  ctx.translate(0, ground * 2);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.45;
  ctx.drawImage(canvas, 0, 0, width, ground, 0, 0, width, ground);
  ctx.restore();
  const road = ctx.createLinearGradient(0, ground, 0, height);
  road.addColorStop(0, 'rgba(10, 2, 20, 0.35)');
  road.addColorStop(1, 'rgba(10, 2, 20, 0.95)');
  ctx.fillStyle = road;
  ctx.fillRect(0, ground, width, height - ground);
  ctx.strokeStyle = '#ffd36a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 2 - t * 40, ground + (height - ground) * t * t + 6);
    ctx.lineTo(width / 2 - 2 - (t + 0.06) * 40, ground + (height - ground) * (t + 0.08) * (t + 0.08) + 6);
    ctx.stroke();
  }
  return canvas;
}

/** A sunset-over-the-sea sample image on a new canvas. */
export function paintSunsetSampleScene(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paintSynthSunset(canvas.getContext('2d'), 0, 0, width, height, ['#1c0838', '#6a1a6e', '#e63a6e', '#ff9a4a', '#ffe0a0']);
  return canvas;
}
