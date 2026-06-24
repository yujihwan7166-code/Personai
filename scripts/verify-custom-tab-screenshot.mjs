import { chromium } from 'playwright';

const baseUrl = process.env.OCC_VERIFY_URL || 'http://127.0.0.1:3001';
const outPath = process.env.OUT || 'tmp/custom-tab-after.png';

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console-error]', m.text()); });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Dismiss any onboarding modal: "건너뛰기" (skip) button.
  const skip = page.locator('button:has-text("건너뛰기"), button:has-text("Skip")').first();
  for (let i = 0; i < 5 && await skip.count(); i++) {
    await skip.click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(200);
  }

  // Open the expert selection panel — typical opener label is "전문가 추가" or "+".
  for (const sel of [
    'button:has-text("전문가 추가")',
    'button:has-text("커스텀 모델")',
    'button:has-text("커스텀모델")',
    'button:has-text("AI 추가")',
    '[data-testid="open-experts"]',
  ]) {
    const loc = page.locator(sel).first();
    if (await loc.count()) { await loc.click().catch(() => {}); await page.waitForTimeout(300); }
  }

  // Switch to custom-model tab.
  const customTab = page.locator('button:has-text("커스텀 모델"), [role="tab"]:has-text("커스텀 모델")').first();
  if (await customTab.count()) { await customTab.click().catch(() => {}); await page.waitForTimeout(400); }

  // Pick "전체보기" preset.
  const allTab = page.locator('button:has-text("전체보기"), [role="tab"]:has-text("전체보기")').first();
  if (await allTab.count()) { await allTab.click().catch(() => {}); await page.waitForTimeout(400); }

  // Click "전문가" type filter so we see specialist cards.
  const specialistFilter = page.locator('label:has-text("전문가"), button:has-text("전문가")').first();
  // Don't fail if not present.

  // Probe a few specialist URLs directly.
  const probe = await page.evaluate(async (ids) => {
    const out = [];
    for (const id of ids) {
      const r = await fetch('/logos/specialist/' + id + '.png', { cache: 'no-store' });
      const buf = await r.arrayBuffer();
      const u8 = new Uint8Array(buf);
      out.push({ id, status: r.status, bytes: buf.byteLength, w: (u8[16]<<24)|(u8[17]<<16)|(u8[18]<<8)|u8[19], h: (u8[20]<<24)|(u8[21]<<16)|(u8[22]<<8)|u8[23] });
    }
    return out;
  }, ['medical', 'legal', 'philosophy', 'finance', 'history']);

  console.log('[verify] specialist probe:');
  for (const r of probe) console.log(' -', r);

  await page.screenshot({ path: outPath, fullPage: false });
  console.log('[verify] screenshot saved:', outPath);
} finally {
  await browser.close();
}
