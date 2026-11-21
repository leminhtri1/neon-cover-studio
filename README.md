# Neon Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/leminhtri1/neon-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/leminhtri1/neon-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Cover Studio turns your own photos and a caption into multi-panel crime-epic poster art with a sunset or
neon colour grade, and exports a PNG at 1080×1080, 1080×1350 or 1920×1080. It is a static web app with no build
step, no libraries and no network requests. Your photos never leave the browser.

- **Collage grids:** eight layouts with 3 to 8 panels, including asymmetric mosaics and a painted title tile. Portrait
  covers get a transposed version of each layout, so panels keep their shape.
- **Any photo:** pick, drag and drop, or paste images. Use one photo across every panel (each panel gets a different
  crop) or spread several photos. Click a panel to select it, drag to pan, scroll or use the slider to zoom, flip it,
  or drop a photo straight onto it.
- **Grade:** five presets (Sunset Strip, Neon Night, Miami Pastel, Noir Heat, Golden Coast). Each panel goes through
  a gradient map with an S-curve, a halftone dot screen, seeded grain, Sobel ink lines, optional posterize bands, a
  light leak and a vignette. Neighbouring panels cycle through different maps.
- **Lettering:** an original lockup drawn on canvas with generic system fonts (no font files). A neon script line
  sits over a heavy condensed caption with extrusion, outline, rim, a chrome sunset gradient with horizon stripes and
  a glow. Below it are a tagline ribbon and a corner note. There are no Rockstar logos, artwork or fonts.
- **Fast:** choose a size, type a caption, then press **Export PNG** (`canvas.toBlob`).

The sample photos in `app/samples/` were made with an image model and are free to use. The sunset bay and neon
avenue samples are painted procedurally in `app/src/sunset-scenes.js`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

To build the entry's output (`dossier.json` plus copies of `app/` and `screenshots/`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`tools/capture-shots.mjs` drives headless Chrome over the DevTools protocol. It clicks the app's own Export button,
keeps the PNG the app downloads, and scales it down for `screenshots/`.

## Layout

| File | Role |
| --- | --- |
| `app/src/studio-editor.js` | Editor wiring, photo import, panel gestures, export |
| `app/src/cover-renderer.js` | Puts the panels, title tile, lockup and corner note together |
| `app/src/panel-layouts.js` | Layout trees, transposing, gutter-aware rectangles |
| `app/src/panel-grading.js` | Gradient map, halftone, grain, ink, light leak, vignette |
| `app/src/title-lettering.js` | Caption, neon script and tagline ribbon |
| `app/src/style-presets.js` | Colour presets |
| `app/src/sunset-scenes.js` | Procedural sunset, palms and city scenes |

MIT licensed.
