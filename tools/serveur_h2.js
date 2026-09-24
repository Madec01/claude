// Serveur statique HTTP/2 avec compression, pour mesurer le chargement comme sur GitHub Pages (qui parle HTTP/2 et
// gzippe le texte) plutôt qu'avec python3 -m http.server (HTTP/1.1, six connexions, pas de compression).
// Usage : node tools/serveur_h2.js <port> <cert.pem> <key.pem> [racine=.]   — puis https://127.0.0.1:<port>/index.html
// Le certificat est auto-signé : Playwright l'accepte avec ignoreHTTPSErrors. Rien du jeu ne dépend de ce fichier.
const http2 = require('http2'); const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const [port, cert, key, racine = '.'] = process.argv.slice(2);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.webm': 'video/webm', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg']);
const srv = http2.createSecureServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key) });
srv.on('stream', (stream, headers) => {
  const p = decodeURIComponent(headers[':path'].split('?')[0]); const f = path.join(path.resolve(racine), p === '/' ? 'index.html' : p);
  if (!f.startsWith(path.resolve(racine)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { stream.respond({ ':status': 404 }); stream.end(); return; }
  const ext = path.extname(f).toLowerCase(); const type = TYPES[ext] || 'application/octet-stream';
  const gz = COMPRESSIBLE.has(ext) && /gzip/.test(headers['accept-encoding'] || '');
  stream.respond({ ':status': 200, 'content-type': type, 'cache-control': 'max-age=600', ...(gz ? { 'content-encoding': 'gzip' } : {}) });
  const src = fs.createReadStream(f); (gz ? src.pipe(zlib.createGzip({ level: 6 })) : src).pipe(stream);
});
srv.listen(Number(port), '127.0.0.1', () => console.log(`HTTP/2 sur https://127.0.0.1:${port}/ (${path.resolve(racine)})`));
