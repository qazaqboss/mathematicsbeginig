const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [theme, out] of [['dark','og-image.png'],['light','og-image-light.png']]) {
    const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errs=[]; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + require('path').join(__dirname, 'og.html') + '?theme=' + theme);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(4500);
    await p.screenshot({ path: require('path').join(__dirname, '..', out) }); console.log(out, errs);
    await p.close();
  }
  await b.close();
})();
