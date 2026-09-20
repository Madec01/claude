#!/usr/bin/env node
// Rendus isométriques des animaux 3D : une bande d'images par espèce, quatre orientations.
//
//   node tools/render_animals.js <animals.json> [--src <racine des modèles>] [--out <dossier>]
//
// animals.json : { "espèce": { "file": "models/x.glb", "clip": "Walk"|null, "frames": 8 }, … }
//
// Pour chaque espèce et chaque orientation (l'animal tourné de 0, 90, 180 et 270°), le cycle
// est échantillonné en `frames` images à intervalle régulier. La caméra ne bouge pas : même
// projection que les tuiles (élévation 30°, azimut −30°, 120 px par unité monde), même
// éclairage. Chaque image est rendue sur un canevas fixe, l'origine du modèle (le centre de
// son pied) au centre ; build_images.py rogne ensuite toutes les images d'une espèce sur une
// **boîte commune**, sans quoi l'animal tressauterait d'une image à l'autre.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, 'tools', 'cache');
const THREE_VERSION = '0.169.0';
const EL = 30, AZ = -30, PPU = 120, CANVAS = 512;
const YAWS = [0, 90, 180, 270];

function arg(name, def) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; }

function ensureThree() {
  const dir = path.join(CACHE, 'three');
  if (fs.existsSync(path.join(dir, 'build', 'three.module.js'))) return dir;
  fs.mkdirSync(CACHE, { recursive: true });
  console.log(`three.js ${THREE_VERSION} absent : récupération depuis npm…`);
  const tgz = execFileSync('npm', ['pack', `three@${THREE_VERSION}`, '--pack-destination', CACHE], { encoding: 'utf8' }).trim().split('\n').pop();
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('tar', ['xzf', path.join(CACHE, tgz), '-C', dir, '--strip-components=1']);
  fs.unlinkSync(path.join(CACHE, tgz));
  return dir;
}

const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0000">
<canvas id="c" width="${CANVAS}" height="${CANVAS}"></canvas>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), alpha: true, antialias: true });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa7b0, 2.0));
const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-4, 7, 3); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(4, 2, -3); scene.add(fill);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 400);
const loader = new GLTFLoader();
// plusieurs modèles sont compressés en Draco : le décodeur est celui livré avec three.js
const draco = new DRACOLoader(); draco.setDecoderPath('/three/examples/jsm/libs/draco/'); loader.setDRACOLoader(draco);
let root = null, pivot = null, mixer = null, clips = [], radius = 1;

/** Charge un modele, le pose sur le sol, le centre, et rend sa taille et ses clips. */
window.__load = (url) => new Promise((res, rej) => {
  loader.load(url, (g) => {
    if (pivot) scene.remove(pivot);
    root = g.scene;
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    // le modèle est recentré sur (0,0,0) au sol : le pivot de rotation est son centre au sol
    root.position.set(-c.x, -box.min.y, -c.z);
    pivot = new THREE.Group(); pivot.add(root); scene.add(pivot);
    clips = g.animations || [];
    mixer = clips.length ? new THREE.AnimationMixer(root) : null;
    radius = Math.max(s.x, s.y, s.z);
    res({ size: s.toArray().map((x) => +x.toFixed(3)), clips: clips.map((x) => x.name) });
  }, undefined, (err) => rej(new Error(String((err && err.message) || err))));
});

/** Une image : orientation yaw (degrés), instant t du clip (0 à 1), échelle k (unité monde → px). */
window.__frame = (yaw, clipName, t, k) => {
  pivot.rotation.y = yaw * Math.PI / 180;
  if (mixer && clipName) {
    const clip = clips.find((x) => x.name === clipName);
    if (clip) { mixer.stopAllAction(); mixer.clipAction(clip).play(); mixer.setTime(0); mixer.setTime(t * clip.duration); }
  }
  const half = ${CANVAS} / 2 / k;
  cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix();
  const e = ${EL} * Math.PI / 180, a = ${AZ} * Math.PI / 180, d = 200;
  // la caméra vise le milieu de la hauteur du modèle, pour qu'il tienne dans le cadre
  const cy = radius * 0.45;
  cam.position.set(d * Math.cos(e) * Math.sin(a), cy + d * Math.sin(e), d * Math.cos(e) * Math.cos(a));
  cam.up.set(0, 1, 0); cam.lookAt(0, cy, 0);
  renderer.render(scene, cam);
  return { radius };
};
window.__ready = true;
</script></body>`;

const MIME = { '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.png': 'image/png', '.js': 'text/javascript' };

function serve(srcRoot, threeDir) {
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/render.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(PAGE); return; }
    const base = url.startsWith('/three/') ? threeDir : srcRoot;
    const file = url.startsWith('/three/') ? path.join(threeDir, url.slice(7)) : path.join(srcRoot, url.slice(1));
    if (!path.resolve(file).startsWith(path.resolve(base)) || !fs.existsSync(file)) { res.writeHead(404); res.end('non'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const srcRoot = arg('--src', '/home/user/animaux3d');
  const out = arg('--out', path.join(CACHE, 'animaux'));
  fs.mkdirSync(out, { recursive: true });
  const threeDir = ensureThree();
  const srv = await serve(srcRoot, threeDir);
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage();
  page.on('pageerror', (e) => console.log('[page]', e.message));
  await page.goto(`http://127.0.0.1:${port}/render.html`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });

  const meta = {}; const errors = [];
  for (const [species, spec] of Object.entries(jobs)) {
    let info;
    try { info = await page.evaluate((u) => window.__load(u), `/${spec.file}`); }
    catch (e) { errors.push(`${species} : ${e.message}`); continue; }
    if (spec.clip && !info.clips.includes(spec.clip)) {
      errors.push(`${species} : clip « ${spec.clip} » absent (disponibles : ${info.clips.join(', ') || 'aucun'})`);
      continue;
    }
    // l'animal est cadré sur sa plus grande dimension : k px par unité monde
    const k = Math.min(PPU * 4, (CANVAS * 0.82) / Math.max(...info.size));
    const frames = spec.clip ? (spec.frames || 8) : 1;
    for (const yaw of YAWS) {
      for (let f = 0; f < frames; f++) {
        await page.evaluate(([y, c, t, kk]) => window.__frame(y, c, t, kk), [yaw, spec.clip || null, f / frames, k]);
        const buf = await page.locator('#c').screenshot({ omitBackground: true });
        fs.writeFileSync(path.join(out, `${species}_${yaw}_${f}.png`), buf);
      }
    }
    meta[species] = { file: spec.file, clip: spec.clip || null, frames, yaws: YAWS, pixelsPerUnit: k, size: info.size, clips: info.clips };
    console.log(`${species} : ${YAWS.length} × ${frames} images${spec.clip ? ` (clip « ${spec.clip} »)` : ' (modèle fixe)'}`);
  }
  await b.close();
  srv.close();
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ projection: { elevation: EL, azimuth: AZ, canvas: CANVAS }, species: meta }, null, 1));
  if (errors.length) { console.error(`${errors.length} espèce(s) en échec :\n` + errors.join('\n')); process.exit(1); }
  console.log(`${Object.keys(meta).length} espèces rendues dans ${out}`);
})();
