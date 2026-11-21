// Neon Cover Studio's hand-in for gta6-cover-art-01 (Node 22, standard library only). The app is app/: plain static
// files a desktop browser loads offline (app/index.html and its own ES modules, no library, no font file, no network
// request) that turn a person's photos and a caption into multi-panel, sunset/neon-graded poster art with an original
// canvas-drawn title lockup, exported as PNG at 1080 x 1080, 1080 x 1350 or 1920 x 1080. This program copies app/ and
// screenshots/ (the first by name is the 1920 x 1080 cover) to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library. The two sample photos in app/samples/ were made with an image
// model and are free to use; the other two samples are painted by app/src/sunset-scenes.js.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The studio itself and the maker's screenshots travel as they are, byte for byte.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repositoryRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repositoryRoot, 'screenshots'))) {
  cpSync(join(repositoryRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
