// Rasterise un SVG Kenney avec Chromium (Playwright) à une échelle entière.
//   node tools/rasterize_svg.js <fichier.svg> <sortie.png> [échelle=3]
// Le viewport vaut le viewBox du SVG (ou ses attributs width/height, ou la
// boîte englobante réelle du contenu si le SVG n'en déclare aucun) ; le fond
// est transparent. Généralisation de l'ancien rasterize_ships.js.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');

const [svgPath, outPath, scaleArg] = process.argv.slice(2);
if (!svgPath || !outPath) {
  console.error('usage: node tools/rasterize_svg.js <fichier.svg> <sortie.png> [échelle]');
  process.exit(2);
}
const scale = Math.max(1, parseInt(scaleArg || '3', 10));

(async () => {
  let svg = fs.readFileSync(svgPath, 'utf8');
  const head = svg.slice(0, svg.indexOf('>') + 1);
  let w, h, vb = /viewBox="([^"]+)"/.exec(head);
  if (vb) {
    const p = vb[1].trim().split(/[\s,]+/).map(Number);
    w = p[2]; h = p[3];
  } else {
    const mw = /width="([\d.]+)/.exec(head), mh = /height="([\d.]+)/.exec(head);
    if (mw && mh) { w = +mw[1]; h = +mh[1]; }
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 16, height: 16 }, deviceScaleFactor: scale });
  if (!w || !h) {
    // Ni viewBox ni dimensions (exports Flash « sans cadre ») : on mesure la boîte englobante du contenu.
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    const box = await page.evaluate(() => {
      const s = document.querySelector('svg');
      const b = s.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    w = Math.ceil(box.x + box.w) + 2; h = Math.ceil(box.y + box.h) + 2;
    svg = svg.replace(/<svg\b/, `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"`);
  }
  w = Math.ceil(w); h = Math.ceil(h);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:transparent;overflow:hidden">` +
    `<div style="width:${w}px;height:${h}px">${svg.replace(/<svg\b/, `<svg style="width:${w}px;height:${h}px;display:block"`)}</div></body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: outPath, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  await browser.close();
  console.log(`${outPath} : ${w * scale}×${h * scale} (viewport ${w}×${h}, ×${scale})`);
})().catch((e) => { console.error(e); process.exit(1); });
