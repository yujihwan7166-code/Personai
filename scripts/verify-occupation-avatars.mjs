import { chromium } from 'playwright';

const baseUrl = process.env.OCC_VERIFY_URL || 'http://127.0.0.1:3001';
const outPath = process.env.OCC_VERIFY_OUT || 'tmp/occupation-tab-verify.png';

const expected = ['doctor', 'pharmacist', 'vet'];

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    bypassCSP: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Try to open custom-model panel and switch to occupation tab.
  const customBtn = page.locator('button:has-text("커스텀 모델"), button:has-text("커스텀모델"), button:has-text("Custom Model")').first();
  if (await customBtn.count()) {
    await customBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }
  const occTab = page.locator('button:has-text("직업"), [role="tab"]:has-text("직업")').first();
  if (await occTab.count()) {
    await occTab.click().catch(() => {});
    await page.waitForTimeout(600);
  }

  // Probe each expected avatar URL via fetch to confirm bytes served by dev server.
  const probe = await page.evaluate(async (ids) => {
    const out = [];
    for (const id of ids) {
      const url = `/logos/occupation/${id}.png`;
      try {
        const r = await fetch(url, { cache: 'no-store' });
        const buf = await r.arrayBuffer();
        const u8 = new Uint8Array(buf);
        const w = (u8[16] << 24) | (u8[17] << 16) | (u8[18] << 8) | u8[19];
        const h = (u8[20] << 24) | (u8[21] << 16) | (u8[22] << 8) | u8[23];
        out.push({ id, status: r.status, bytes: buf.byteLength, w, h });
      } catch (e) {
        out.push({ id, error: String(e) });
      }
    }
    return out;
  }, expected);

  console.log('[occ-verify] avatar probe:');
  for (const row of probe) console.log(' -', row);

  await page.screenshot({ path: outPath, fullPage: true });
  console.log('[occ-verify] screenshot saved:', outPath);

  if (errors.length) {
    console.log('[occ-verify] console errors:');
    for (const e of errors.slice(0, 10)) console.log('  *', e);
  }
} finally {
  await browser.close();
}
