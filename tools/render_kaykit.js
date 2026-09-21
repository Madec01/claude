#!/usr/bin/env node
// Rendus isométriques des modèles 3D KayKit (CC0) à la projection exacte de nos tuiles.
//
//   node tools/render_kaykit.js <models.json> [--src <racine KayKit>] [--out <dossier>]
//
// models.json : { "nom": "chemin/relatif/sans/extension", … } — chemins relatifs à
// Assets/gltf du pack. Chaque modèle est rendu en PNG transparent, rogné à son
// contenu, et meta.json note où tombe l'origine du modèle (le centre de son pied)
// dans l'image rognée : c'est par ce point que build_images.py l'ancre sur la tuile.
//
// Projection : élévation 30°, azimut −30°, orthographique, 120 px par unité monde.
// L'hexagone KayKit mesure 2 unités de large ; nos tuiles 2× en font 240 px : un
// modèle posé sur un hexagone KayKit garde donc sa taille relative chez nous.
// L'éclairage reprend celui des rendus du Hexagon Pack (clé haute au nord-ouest).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, 'tools', 'cache');
const THREE_VERSION = '0.169.0';
// Le canevas doit contenir le plus grand modèle des deux packs : les arbres du pack Forest
// montent à près de cinq unités, soit 600 px de haut à 120 px/unité.
const EL = 30, AZ = -30, PPU = 120, CANVAS = 1280;

function arg(name, def) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; }

/** three.js n'est pas dans le dépôt : on le récupère depuis npm dans tools/cache/ (ignoré par git). */
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
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), alpha: true, antialias: true });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa7b0, 2.0));
const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-4, 7, 3); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(4, 2, -3); scene.add(fill);
const half = ${CANVAS} / 2 / ${PPU};
const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, 400);
const d = 200;
cam.up.set(0, 1, 0); cam.updateProjectionMatrix();
const loader = new GLTFLoader();
let current = null;
// el / az : angles de prise de vue, par défaut ceux des tuiles. Une dalle posée à plat se rend à la
// verticale (el = 90), sans quoi son hexagone, écrasé par la perspective, ne recouvre pas le nôtre.
window.__shot = (url, el, az) => new Promise((res, rej) => {
  const e = (el === undefined ? ${EL} : el) * Math.PI / 180, a = (az === undefined ? ${AZ} : az) * Math.PI / 180;
  loader.load(url, (g) => {
    if (current) scene.remove(current);
    current = g.scene; scene.add(current);
    const b = new THREE.Box3().setFromObject(current);
    // La caméra vise le milieu de la hauteur du modèle : un grand arbre tient alors dans le cadre
    // sans qu'on ait à agrandir le canevas. On rend en échange la position exacte de l'origine du
    // modèle sur l'image, puisqu'elle n'est plus au centre : c'est par elle que le pipeline ancre.
    const cy = (b.min.y + b.max.y) / 2;
    cam.position.set(d * Math.cos(e) * Math.sin(a), cy + d * Math.sin(e), d * Math.cos(e) * Math.cos(a));
    cam.lookAt(0, cy, 0);
    renderer.render(scene, cam);
    res({ min: b.min.toArray(), max: b.max.toArray(), origin: [${CANVAS} / 2, ${CANVAS} / 2 + cy * Math.cos(e) * ${PPU}] });
  }, undefined, (err) => rej(new Error(String((err && err.message) || err))));
});
window.__ready = true;
</script></body>`;

const MIME = { '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.png': 'image/png', '.js': 'text/javascript' };

function serve(kayRoot, forestRoot, extraRoot, threeDir) {
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/render.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(PAGE); return; }
    let file = null, base = null;
    if (url.startsWith('/three/')) { base = threeDir; file = path.join(threeDir, url.slice(7)); }
    else if (url.startsWith('/kk/forest/')) { base = forestRoot; file = path.join(forestRoot, url.slice(11)); }
    else if (url.startsWith('/kk/extra/')) { base = extraRoot; file = path.join(extraRoot, url.slice(10)); }
    else if (url.startsWith('/kk/')) { base = kayRoot; file = path.join(kayRoot, url.slice(4)); }
    if (!file || !path.resolve(file).startsWith(path.resolve(base)) || !fs.existsSync(file)) {
      res.writeHead(404); res.end('non'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

(async () => {
  // Chaque entrée vaut « alias: "chemin" », ou « alias: { model, el, az } » pour une prise de vue à part.
  const models = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')))
    .map(([k, v]) => [k, typeof v === 'string' ? { model: v } : v]));
  const kayRoot = path.join(arg('--src', '/home/user/kaykit/KayKit-Medieval-Hexagon-Pack-1.0'),
    'addons', 'kaykit_medieval_hexagon_pack', 'Assets', 'gltf');
  // second pack : la forêt. Un chemin de modèle qui commence par « forest/ » y est cherché.
  const forestRoot = path.join(arg('--forest', '/home/user/kaykit/KayKit-Forest-Nature-Pack-1.0'), 'gltf');
  // troisième pack : l'EXTRA du Hexagon Pack, préfixe « extra/ ». Il contient les 221 modèles du pack de base
  // (à deux près, un moulin bleu et un pont, que nous n'employons pas) plus 183 autres : on le garde à part
  // plutôt que d'y basculer la racine, pour qu'aucun des modèles déjà en place ne change sans qu'on le veuille.
  const extraRoot = path.join(arg('--extra', '/home/user/kaykit/extra/Asset4'), 'gltf');
  const out = arg('--out', path.join(CACHE, 'kaykit'));
  fs.mkdirSync(out, { recursive: true });
  const threeDir = ensureThree();
  const srv = await serve(kayRoot, forestRoot, extraRoot, threeDir);
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage();
  page.on('pageerror', (e) => console.log('[page]', e.message));
  await page.goto(`http://127.0.0.1:${port}/render.html`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });

  const meta = {};
  const errors = [];
  for (const [name, spec] of Object.entries(models)) {
    const rel = spec.model;
    const url = `/kk/${rel}.gltf`;
    const disk = rel.startsWith('forest/') ? path.join(forestRoot, `${rel.slice(7)}.gltf`)
      : rel.startsWith('extra/') ? path.join(extraRoot, `${rel.slice(6)}.gltf`)
        : path.join(kayRoot, `${rel}.gltf`);
    if (!fs.existsSync(disk)) { errors.push(`${name} : modèle absent (${rel}.gltf)`); continue; }
    let box;
    try { box = await page.evaluate(([u, el, az]) => window.__shot(u, el, az), [url, spec.el, spec.az]); }
    catch (e) { errors.push(`${name} : ${e.message}`); continue; }
    const buf = await page.locator('#c').screenshot({ omitBackground: true });
    const tmp = path.join(out, `${name}.raw.png`);
    fs.writeFileSync(tmp, buf);
    meta[name] = { model: rel, el: spec.el, az: spec.az, box: { min: box.min.map((x) => +x.toFixed(4)), max: box.max.map((x) => +x.toFixed(4)) }, origin: box.origin.map((x) => +x.toFixed(2)) };
  }
  await b.close();
  srv.close();
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({
    projection: { elevation: EL, azimuth: AZ, pixelsPerUnit: PPU, canvas: CANVAS },
    models: meta,
  }, null, 1));
  if (errors.length) { console.error(`${errors.length} modèle(s) en échec :\n` + errors.join('\n')); process.exit(1); }
  console.log(`${Object.keys(meta).length} modèles rendus dans ${out}`);
})();
