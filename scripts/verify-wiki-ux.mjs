import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const port = Number(process.env.WIKI_VERIFY_PORT || (3100 + (process.pid % 500)));
const baseUrl = `http://127.0.0.1:${port}`;
let devServer = null;

try {
  await ensureServer();
  await verifyWikiEditorUx();
  console.log('[wiki-ux] route, page creation, table insert, link popover, archive, and restore verified');
} finally {
  await stopServer();
}

async function ensureServer() {
  if (await isServerReady()) return;

  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/c', 'npm.cmd', 'run', 'dev:web', '--', '--host', '127.0.0.1', '--port', String(port)]
    : ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', String(port)];
  devServer = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });

  devServer.stdout.on('data', (chunk) => {
    if (process.env.WIKI_VERIFY_VERBOSE) process.stdout.write(chunk);
  });
  devServer.stderr.on('data', (chunk) => {
    if (process.env.WIKI_VERIFY_VERBOSE) process.stderr.write(chunk);
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isServerReady()) return;
    await delay(300);
  }
  throw new Error(`[wiki-ux] dev server did not start at ${baseUrl}`);
}

async function verifyWikiEditorUx() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(`${baseUrl}/wiki`, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.getByText('마이위키 시작하기').waitFor({ timeout: 15_000 });

    await page.getByRole('button', { name: /빈 페이지로 시작/ }).click();
    await page.getByRole('dialog', { name: '새 페이지 템플릿 선택' }).waitFor({ timeout: 10_000 });
    const title = `위키 UX 검증 ${Date.now()}`;
    await page.getByPlaceholder('제목 (선택, 비우면 템플릿 기본 제목 사용)').fill(title);
    await page.getByRole('button', { name: '만들기', exact: true }).click();

    await page.locator('.wiki-block-editor').waitFor({ timeout: 15_000 });
    await page.locator('.wiki-block-editor').click();
    await page.keyboard.press('ControlOrMeta+K');
    await page.getByRole('dialog', { name: '하이퍼링크 만들기' }).waitFor({ timeout: 10_000 });
    await page.keyboard.press('Escape');

    await page.locator('button[title="표 삽입"]').click();
    await page.locator('button[aria-label="4열 3행 표 삽입"]').click();
    await page.locator('.wiki-block-editor table').waitFor({ timeout: 10_000 });

    await page.locator('button[title="하이퍼링크 (Ctrl+K)"]').click();
    await page.locator('input[placeholder="https://"]').fill('example.com');
    await page.locator('label:has-text("표시") input').fill('예시 링크');
    await page.getByRole('button', { name: '적용' }).click();

    const linkOk = await page.evaluate(() =>
      Boolean(document.querySelector('.wiki-block-editor a[href="https://example.com"]')),
    );
    assert(linkOk, 'link popover should insert a normalized external link');

    await page.getByRole('button', { name: '저장' }).click();
    await page.locator('button[title="보관"]').waitFor({ timeout: 10_000 });
    await page.locator('button[title="보관"]').click();
    await page.getByText('보관된 문서입니다').waitFor({ timeout: 10_000 });
    const sidebar = page.locator('aside').first();
    await sidebar.getByRole('button', { name: '보관', exact: true }).click();
    await sidebar.getByRole('button', { name: title }).waitFor({ timeout: 10_000 });
    await page.getByRole('button', { name: /복원/ }).click();
    await page.getByText('보관된 문서입니다').waitFor({ state: 'detached', timeout: 10_000 });

    if (errors.length) {
      throw new Error(`[wiki-ux] browser errors\n${errors.join('\n')}`);
    }
  } finally {
    await browser.close();
  }
}

async function isServerReady() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function stopServer() {
  if (!devServer) return;
  if (process.platform === 'win32' && devServer.pid) {
    spawnSync('taskkill.exe', ['/PID', String(devServer.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    devServer.kill();
  }
  devServer = null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(`[wiki-ux] ${message}`);
}
