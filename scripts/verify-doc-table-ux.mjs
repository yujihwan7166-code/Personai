import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { chromium } from 'playwright';

const port = Number(process.env.DOC_VERIFY_PORT || 3001);
const baseUrl = `http://127.0.0.1:${port}`;
const ownerId = '00000000-0000-0000-0000-000000000000';
const docId = `doc-table-ux-${Date.now()}`;
let devServer = null;

try {
  await ensureServer();
  await verifyTableUx();
  console.log('[doc-table-ux] table quickbar, colors, autofit, and resize guide verified');
} finally {
  await stopServer();
}

async function ensureServer() {
  if (await isServerReady()) return;

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  devServer = spawn(npm, ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      VITE_BYPASS_AUTH: '1',
    },
  });

  devServer.stdout.on('data', (chunk) => {
    if (process.env.DOC_VERIFY_VERBOSE) process.stdout.write(chunk);
  });
  devServer.stderr.on('data', (chunk) => {
    if (process.env.DOC_VERIFY_VERBOSE) process.stderr.write(chunk);
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isServerReady()) return;
    await delay(300);
  }
  throw new Error(`[doc-table-ux] dev server did not start at ${baseUrl}`);
}

async function verifyTableUx() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    const now = new Date().toISOString();
    const body = createTableDoc();

    await page.addInitScript(({ docId: id, ownerId: owner, now: createdAt, body: documentBody }) => {
      localStorage.setItem('personai.cloud.nodes.v1', JSON.stringify([{
        id,
        owner_id: owner,
        parent_folder_id: null,
        kind: 'file',
        name: 'Table UX Verification',
        file_type: 'doc',
        mime_type: 'application/json',
        size_bytes: null,
        storage_path: null,
        original_storage_path: null,
        meta: { body: documentBody },
        starred: false,
        deleted_at: null,
        created_at: createdAt,
        updated_at: createdAt,
      }]));
    }, { docId, ownerId, now, body });

    await page.goto(`${baseUrl}/cloud/doc/${docId}`, { waitUntil: 'networkidle' });
    await verifyToolbarUx(page);

    await page.getByRole('button', { name: '표', exact: true }).click({ timeout: 15_000 });
    await page.waitForSelector('button[aria-label="10행 10열 표 삽입"]', { state: 'visible', timeout: 5_000 });
    const insertPopover = await page.evaluate(() => ({
      hasLargeGrid: Boolean(document.querySelector('button[aria-label="10행 10열 표 삽입"]')),
      hasRowInput: Boolean(document.querySelector('#doc-table-rows')),
      hasColInput: Boolean(document.querySelector('#doc-table-cols')),
      hasHeaderToggle: Array.from(document.querySelectorAll('label')).some((label) => label.textContent?.includes('머리 행')),
    }));
    assert(insertPopover.hasLargeGrid, 'table insert popover should offer a 10x10 quick grid');
    assert(insertPopover.hasRowInput && insertPopover.hasColInput, 'table insert popover should offer direct row and column inputs');
    assert(insertPopover.hasHeaderToggle, 'table insert popover should expose a header-row option');
    await page.keyboard.press('Escape');

    await page.locator('.doc-content table td').first().click({ timeout: 15_000 });
    await page.waitForSelector('.doc-table-quickbar', { state: 'visible', timeout: 10_000 });

    const quickbar = await page.locator('.doc-table-quickbar').evaluate((element) => ({
      visible: getComputedStyle(element).display !== 'none',
      colorInputs: element.querySelectorAll('input[type="color"]').length,
    }));
    assert(quickbar.visible, 'table quickbar should be visible after selecting a cell');
    assert(quickbar.colorInputs >= 2, 'table quickbar should expose fill and border color controls');

    await page.locator('.doc-table-quickbar input[data-color-action="fill"]').evaluate((input) => {
      input.value = '#ffeb3b';
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        data: '#ffeb3b',
        inputType: 'insertText',
      }));
    });
    await page.waitForTimeout(1_800);

    const colorResult = await page.evaluate(() => {
      const cell = document.querySelector('.doc-content table td');
      const stored = JSON.parse(localStorage.getItem('personai.cloud.nodes.v1') || '[]')[0];
      return {
        background: cell ? getComputedStyle(cell).backgroundColor : '',
        storedBackground: stored?.meta?.body?.content?.[1]?.content?.[0]?.content?.[0]?.attrs?.backgroundColor,
      };
    });
    assert(colorResult.background === 'rgb(255, 235, 59)', 'quickbar fill should update the visible cell color');
    assert(colorResult.storedBackground === '#ffeb3b', 'quickbar fill should persist to the document JSON');

    await page.locator('.doc-content table td').first().click();
    await page.locator('.doc-content table td').first().click({ button: 'right' });
    await page.waitForSelector('.doc-table-context-menu', { state: 'visible', timeout: 5_000 });
    const contextMenu = await page.locator('.doc-table-context-menu').evaluate((element) => ({
      visible: getComputedStyle(element).display !== 'none',
      widthFull: Boolean(element.querySelector('button[data-action="widthFull"]')),
      alignCenter: Boolean(element.querySelector('button[data-action="alignCenter"]')),
    }));
    assert(contextMenu.visible, 'right-clicking a table cell should open the table context menu');
    assert(contextMenu.widthFull, 'table context menu should include full-width table control');
    assert(contextMenu.alignCenter, 'table context menu should include table alignment controls');
    await page.locator('.doc-table-context-menu button[data-action="widthFull"]').dispatchEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    await page.waitForTimeout(250);
    const afterContextWidth = await tableWidthAttrs(page);
    assert(
      afterContextWidth.width === '100' && afterContextWidth.widthType === 'percent',
      'context menu full-width action should update table width attrs',
    );

    const autoFitHandle = page.locator('.doc-table-column-resize-handle').nth(1);
    await autoFitHandle.dblclick();
    await page.waitForTimeout(250);
    const afterAutoFit = await tableWidthAttrs(page);
    const autoFitWidths = parseWidths(afterAutoFit.widths);
    assert(
      autoFitWidths[1] > 140,
      `double-clicking a content-heavy column handle should auto-fit that column, got ${afterAutoFit.widths}`,
    );

    const dragHandle = page.locator('.doc-table-column-resize-handle').first();
    const beforeDragWidths = parseWidths((await tableWidthAttrs(page)).widths);
    const box = await dragHandle.boundingBox();
    assert(Boolean(box), 'first column resize handle should be measurable');
    await page.mouse.move(box.x + box.width / 2, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 45, box.y + 10, { steps: 5 });
    const guideDuringDrag = await page.locator('.doc-table-resize-guide').evaluate((element) => getComputedStyle(element).display);
    assert(guideDuringDrag === 'block', 'column resize should show a guide line while dragging');
    await page.mouse.up();
    await page.waitForTimeout(250);

    const afterDrag = await tableWidthAttrs(page);
    const dragWidths = parseWidths(afterDrag.widths);
    assert(
      dragWidths[0] > beforeDragWidths[0],
      `dragging should update the dragged column width, before ${beforeDragWidths.join(',')}, after ${afterDrag.widths}`,
    );
    assert(afterDrag.guideDisplay === 'none', 'resize guide should hide after dragging');
  } finally {
    await browser.close();
  }
}

async function verifyToolbarUx(page) {
  const toolbar = await page.evaluate(() => ({
    fontSizeInput: Boolean(document.querySelector('input[aria-label="글자 크기"]')),
    fontSizeDecrease: Boolean(document.querySelector('button[aria-label="글자 크기 줄이기"]')),
    fontSizeIncrease: Boolean(document.querySelector('button[aria-label="글자 크기 키우기"]')),
  }));
  assert(toolbar.fontSizeInput, 'toolbar should expose a direct font-size input');
  assert(toolbar.fontSizeDecrease && toolbar.fontSizeIncrease, 'toolbar should expose direct font-size stepper buttons');

  await page.getByRole('button', { name: '글자색' }).click();
  await page.waitForSelector('button[aria-label="글자색 #cc0000"]', { state: 'visible', timeout: 5_000 });
  const colorPalette = await page.evaluate(() => ({
    swatches: document.querySelectorAll('button[aria-label^="글자색 #"]').length,
    customPicker: Boolean(document.querySelector('input[aria-label="글자색 직접 선택"]')),
    clearButton: Array.from(document.querySelectorAll('[role="menuitem"]')).some((item) => item.textContent?.includes('기본값으로 지우기')),
  }));
  assert(colorPalette.swatches >= 24, `text color picker should expose common swatches, got ${colorPalette.swatches}`);
  assert(colorPalette.customPicker, 'text color picker should expose a custom color input');
  assert(colorPalette.clearButton, 'text color picker should expose a clear/default action');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '줄 및 문단 간격' }).click();
  await page.waitForSelector('#doc-lineHeight', { state: 'visible', timeout: 5_000 });
  const paragraphMenu = await page.evaluate(() => ({
    lineHeightInput: Boolean(document.querySelector('#doc-lineHeight')),
    firstLineInput: Boolean(document.querySelector('#doc-firstLineIndent')),
    tabsSection: Array.from(document.querySelectorAll('div')).some((node) => node.textContent === '탭 정지'),
  }));
  assert(paragraphMenu.lineHeightInput, 'line spacing menu should expose a custom line-height input');
  assert(paragraphMenu.firstLineInput, 'line spacing menu should expose first-line indent input');
  assert(paragraphMenu.tabsSection, 'line spacing menu should expose tab stop controls');
  await page.keyboard.press('Escape');
}

function parseWidths(value) {
  return String(value || '')
    .split(',')
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

async function tableWidthAttrs(page) {
  return page.locator('.doc-content table').evaluate((table) => ({
    widths: table.getAttribute('data-table-column-widths'),
    width: table.getAttribute('data-table-width'),
    widthType: table.getAttribute('data-table-width-type'),
    guideDisplay: getComputedStyle(document.querySelector('.doc-table-resize-guide')).display,
  }));
}

function createTableDoc() {
  return {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Table UX verification' }] },
      {
        type: 'table',
        attrs: {
          tableColumnWidths: [140, 140, 140],
          tableWidth: 420,
          tableWidthType: 'px',
          tableLayout: 'fixed',
        },
        content: [
          {
            type: 'tableRow',
            content: [
              cell('A', 140),
              cell('Long text for autofit', 140),
              cell('C', 140),
            ],
          },
          {
            type: 'tableRow',
            content: [
              cell('body', 140),
              cell('value', 140),
              cell('value', 140),
            ],
          },
        ],
      },
    ],
  };
}

function cell(text, width) {
  return {
    type: 'tableCell',
    attrs: { colwidth: [width] },
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

async function isServerReady() {
  return new Promise((resolve) => {
    const req = request(baseUrl, { method: 'GET', timeout: 1200 }, (res) => {
      res.resume();
      resolve(Boolean(res.statusCode && res.statusCode < 500));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function stopServer() {
  if (!devServer) return;
  const pid = devServer.pid;
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore' });
      killer.on('exit', resolve);
      killer.on('error', resolve);
    });
  } else {
    devServer.kill('SIGTERM');
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`[doc-table-ux] ${message}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
