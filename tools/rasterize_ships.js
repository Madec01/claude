const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const svg = fs.readFileSync('/home/user/etdofresh/kenney.nl/kenney_piratepack/Vector/shipsMiscellaneous_vector.svg', 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 3 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: process.argv[2] || '/tmp/ships_svg_3x.png', omitBackground: true });
  await browser.close();
  console.log('done');
})();
