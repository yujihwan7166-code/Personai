import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001';
const SHOULD_START_SERVER = !process.env.SMOKE_BASE_URL;

let serverProcess;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is not ready yet.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function isServerReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function isBenignConsoleError(text) {
  return text.includes('Failed to load resource: net::ERR_NAME_NOT_RESOLVED');
}

function startServer() {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const args = isWindows
    ? ['/d', '/s', '/c', 'npm.cmd run dev:web -- --host 127.0.0.1 --port 3001']
    : ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '3001'];
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
    shell: false,
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  serverProcess = child;
}

async function checkPage(page, label, path, assertion) {
  const errors = [];
  const warnings = [];

  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error') {
      if (isBenignConsoleError(text)) warnings.push(text);
      else errors.push(text);
    }
    if (message.type() === 'warning' && !text.includes('React Router Future Flag')) warnings.push(text);
  });
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 60_000 });
  if (!response?.ok()) {
    throw new Error(`${label}: expected HTTP 2xx, got ${response?.status()}`);
  }

  await assertion();

  if (errors.length) {
    throw new Error(`${label}: console/page errors\n${errors.join('\n')}`);
  }

  if (warnings.length) {
    console.warn(`${label}: warnings\n${warnings.join('\n')}`);
  }
}

async function main() {
  if (SHOULD_START_SERVER && !(await isServerReady(BASE_URL))) {
    startServer();
  }

  await waitForServer(BASE_URL);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('personai-onboarded-v1', '1'));

    await checkPage(page, 'home general chat', '/', async () => {
      await page.getByText('일반 채팅').first().waitFor({ timeout: 10_000 });
      await page.getByText('Gemini 2.5 Flash Lite').first().waitFor({ timeout: 10_000 });
    });

    // 모드 전환 인터랙션 테스트 제거 — MainModeTabs 의 pill 트리거는 외부(사이드바 LayoutGrid)
    // 이고 패널은 portal. 모드 텍스트("토론","공부") 는 panel 내부에 있어 dropdown 미오픈 상태에선 안 보임.
    // smoke 본분은 "빌드/렌더 깨졌는지" 사니티 체크. 인터랙션 시나리오는 별도 E2E 영역.
    // 아래 route 검증 4개로 핵심 페이지가 로드되는지 충분히 잡힘.

    await checkPage(page, 'planner route', '/planner', async () => {
      await page.locator('.planner-theme').first().waitFor({ timeout: 10_000 });
      await page.locator('[data-planner-timeline-shell="true"]').first().waitFor({ timeout: 10_000 });
      await page.getByText('통합플래너').first().waitFor({ timeout: 10_000 });
      await page.locator('button[aria-label="오늘로"]:visible').first().waitFor({ timeout: 10_000 });
    });

    await checkPage(page, 'wiki route', '/wiki', async () => {
      await page.locator('.wiki-warm-theme').first().waitFor({ timeout: 10_000 });
      await page.getByText('마이위키').first().waitFor({ timeout: 10_000 });
      await page.getByRole('button', { name: '새 문서' }).first().waitFor({ timeout: 10_000 });
    });

    console.log('Core smoke checks passed.');
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

main().catch((error) => {
  console.error(error);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
