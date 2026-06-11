import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const port = Number(process.env.PLANNER_VERIFY_PORT || (3200 + (process.pid % 500)));
const baseUrl = `http://127.0.0.1:${port}`;
let devServer = null;

function isBenignConsoleError(text) {
  return text.includes('Failed to load resource: net::ERR_NAME_NOT_RESOLVED');
}

const DAY_KEY = '2026-06-10';
const TODO_HINT = '일정을 할일로 전환';
const TODO_DATE_HINT = '놓으면 이 날짜 할 일로';
const LIBRARY_TO_TODO_HINT = '놓으면 할 일로 추가';
const TODO_TO_SCHEDULE_HINT = '할일을 일정으로 변환';
const LIBRARY_TO_SCHEDULE_HINT = '놓으면 일정으로 추가';

try {
  await ensureServer();
  await verifyScheduledTaskToTodo();
  await verifyTodoDateToDate();
  await verifyTodoToSchedulePromptKeyboard();
  await verifyLibraryTemplateToWeekTodoAndSchedule();
  console.log('[planner-week-drag] schedule/todo drag, todo date move, library drops, prompt keyboard, and field cleanup verified');
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
    if (process.env.PLANNER_VERIFY_VERBOSE) process.stdout.write(chunk);
  });
  devServer.stderr.on('data', (chunk) => {
    if (process.env.PLANNER_VERIFY_VERBOSE) process.stderr.write(chunk);
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isServerReady()) return;
    await delay(300);
  }
  throw new Error(`[planner-week-drag] dev server did not start at ${baseUrl}`);
}

async function verifyScheduledTaskToTodo() {
  await withPlannerPage(async (page) => {
    const now = new Date().toISOString();
    const start = new Date(2026, 5, 10, 10, 30).toISOString();
    const end = new Date(2026, 5, 10, 12, 0).toISOString();
    const taskId = 'tsk_week_drag_scheduled';

    await seedPlanner(page, [{
      id: taskId,
      title: 'Week drag scheduled task',
      done: false,
      startAt: start,
      endAt: end,
      laneOrder: 12,
      todoOrder: 99,
      color: 'violet',
      createdAt: now,
    }]);
    await openPlannerWeek(page);

    const source = page.locator(`#week-schedule-${DAY_KEY} [aria-roledescription="draggable"]`).first();
    const target = page.locator(`#week-todo-${DAY_KEY}`);
    await dragElementToSection(page, source, target);
    await expectDropHint(target, TODO_HINT, 'todo drop hint missing');
    await page.mouse.up();
    await page.waitForTimeout(500);

    const task = await getTask(page, taskId);
    assert(task, 'scheduled task missing after drag');
    assert(task.startAt === undefined && task.endAt === undefined, 'schedule fields should be cleared');
    assert(task.plannedFor === DAY_KEY, `plannedFor mismatch: ${task.plannedFor}`);
    assert(task.laneOrder === undefined, `laneOrder should be cleared: ${task.laneOrder}`);
    assert(task.todoOrder === 10, `todoOrder should append in target todo list: ${task.todoOrder}`);
  });
}

async function verifyTodoDateToDate() {
  await withPlannerPage(async (page) => {
    const fromKey = '2026-06-09';
    const taskId = 'tsk_week_drag_todo_date';
    const title = 'Week drag planned task';

    await seedPlanner(page, [{
      id: taskId,
      title,
      done: false,
      plannedFor: fromKey,
      startAt: undefined,
      endAt: undefined,
      laneOrder: 7,
      todoOrder: 3,
      createdAt: new Date().toISOString(),
    }]);
    await openPlannerWeek(page);

    const source = page.locator(`#week-todo-${fromKey} [aria-roledescription="draggable"]`).filter({ hasText: title }).first();
    const target = page.locator(`#week-todo-${DAY_KEY}`);
    await dragElementToSection(page, source, target);
    await expectDropHint(target, TODO_DATE_HINT, 'todo date move hint missing');
    await page.mouse.up();
    await page.waitForTimeout(500);

    const task = await getTask(page, taskId);
    assert(task, 'planned task missing after date move');
    assert(task.plannedFor === DAY_KEY, `plannedFor should move to target day: ${task.plannedFor}`);
    assert(task.startAt === undefined && task.endAt === undefined, 'date-only task should stay unscheduled');
    assert(task.laneOrder === undefined, `laneOrder should be cleared on todo move: ${task.laneOrder}`);
    assert(task.todoOrder === 10, `todoOrder should append in target todo list: ${task.todoOrder}`);
    const oldColumnText = await page.locator(`#week-todo-${fromKey}`).evaluate((el) => el.innerText);
    const newColumnText = await target.evaluate((el) => el.innerText);
    assert(!oldColumnText.includes(title), 'old day still shows moved todo');
    assert(newColumnText.includes(title), 'target day does not show moved todo');
  });
}

async function verifyTodoToSchedulePromptKeyboard() {
  await withPlannerPage(async (page) => {
    const taskId = 'tsk_week_prompt_enter_guard';
    const title = 'Week prompt enter guard task';
    await seedPlanner(page, [{
      id: taskId,
      title,
      done: false,
      plannedFor: DAY_KEY,
      createdAt: new Date().toISOString(),
    }]);
    await openPlannerWeek(page);

    await dragTodoToSchedule(page, title);
    const dialog = page.locator('[role="dialog"][aria-labelledby]').first();
    await dialog.waitFor({ timeout: 8_000 });
    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    assert(activeTag === 'INPUT', `time input was not focused: ${activeTag}`);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached', timeout: 5_000 });

    await dragTodoToSchedule(page, title);
    const dialog2 = page.locator('[role="dialog"][aria-labelledby]').first();
    await dialog2.waitFor({ timeout: 8_000 });
    const startInput = dialog2.getByLabel('시작 시간');
    const endInput = dialog2.getByLabel('종료 시간');
    await startInput.fill('15:45');
    await endInput.fill('17:15');
    assert(await dialog2.getByText('15:45 ~ 17:15 · 1시간 30분').nth(1).isVisible(), 'time range summary did not update');
    await page.keyboard.press('Enter');
    await dialog2.waitFor({ state: 'detached', timeout: 5_000 });
    await page.waitForTimeout(500);

    const task = await getTask(page, taskId);
    assert(task, 'task missing after keyboard confirm');
    const start = new Date(task.startAt);
    const end = new Date(task.endAt);
    assert(task.plannedFor === undefined, `plannedFor should be cleared: ${task.plannedFor}`);
    assert(
      start.getFullYear() === 2026 &&
        start.getMonth() === 5 &&
        start.getDate() === 10 &&
        start.getHours() === 15 &&
        start.getMinutes() === 45,
      `unexpected scheduled start: ${task.startAt}`,
    );
    assert(end.getTime() - start.getTime() === 90 * 60_000, `duration preset was not applied: ${task.endAt}`);
  });
}

async function verifyLibraryTemplateToWeekTodoAndSchedule() {
  await withPlannerPage(async (page) => {
    const now = new Date().toISOString();
    const todoLibraryId = 'lib_week_verify_todo';
    const scheduleLibraryId = 'lib_week_verify_schedule';
    const todoTitle = 'Library to week todo';
    const scheduleTitle = 'Library to week schedule';
    await seedPlanner(page, [], [{
      id: todoLibraryId,
      kind: 'task',
      title: todoTitle,
      durationMin: 45,
      color: 'green',
      priority: 1,
      createdAt: now,
      updatedAt: now,
    }, {
      id: scheduleLibraryId,
      kind: 'task',
      title: scheduleTitle,
      durationMin: 75,
      color: 'amber',
      priority: 2,
      createdAt: now,
      updatedAt: new Date(Date.now() + 1).toISOString(),
    }]);
    await openPlannerWeek(page);
    await openLibraryPanel(page);

    await dragLibraryItemToSection(page, todoLibraryId, `#week-todo-${DAY_KEY}`, LIBRARY_TO_TODO_HINT);
    let tasks = await getTasks(page);
    const todoTask = tasks.find((task) => task.title === todoTitle);
    assert(todoTask, 'library todo task was not created');
    assert(todoTask.plannedFor === DAY_KEY, `library todo plannedFor mismatch: ${todoTask.plannedFor}`);
    assert(todoTask.startAt === undefined && todoTask.endAt === undefined, 'library todo should not be scheduled');
    assert(todoTask.color === 'green', `library todo color mismatch: ${todoTask.color}`);

    await dragLibraryItemToSection(page, scheduleLibraryId, `#week-schedule-${DAY_KEY}`, LIBRARY_TO_SCHEDULE_HINT);
    tasks = await getTasks(page);
    const scheduledTask = tasks.find((task) => task.title === scheduleTitle);
    assert(scheduledTask, 'library schedule task was not created');
    assert(scheduledTask.plannedFor === undefined, `library schedule plannedFor should be empty: ${scheduledTask.plannedFor}`);
    assert(scheduledTask.startAt && scheduledTask.endAt, 'library schedule should have start/end');
    const start = new Date(scheduledTask.startAt);
    const end = new Date(scheduledTask.endAt);
    assert(
      start.getFullYear() === 2026 &&
        start.getMonth() === 5 &&
        start.getDate() === 10 &&
        start.getHours() === 9 &&
        start.getMinutes() === 0,
      `library schedule should land at 09:00 on target day: ${scheduledTask.startAt}`,
    );
    assert(end.getTime() - start.getTime() === 75 * 60_000, `library duration mismatch: ${scheduledTask.endAt}`);
    assert(scheduledTask.color === 'amber', `library schedule color mismatch: ${scheduledTask.color}`);
  });
}

async function withPlannerPage(fn) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    const warnings = [];
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (isBenignConsoleError(text)) warnings.push(text);
      else errors.push(text);
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await fn(page);
    if (errors.length) {
      throw new Error(`[planner-week-drag] browser errors\n${errors.join('\n')}`);
    }
    if (warnings.length) {
      console.warn(`[planner-week-drag] browser warnings\n${warnings.join('\n')}`);
    }
  } finally {
    await browser.close();
  }
}

async function seedPlanner(page, tasks, libraryItems = []) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ nextTasks, nextLibraryItems }) => {
    localStorage.clear();
    localStorage.setItem('planner.tasks.v1', JSON.stringify(nextTasks));
    localStorage.setItem('planner.events.v1', '[]');
    localStorage.setItem('planner.library.v1', JSON.stringify(nextLibraryItems));
    localStorage.setItem('planner.view.v1', 'week');
  }, { nextTasks: tasks, nextLibraryItems: libraryItems });
}

async function openPlannerWeek(page) {
  await page.goto(`${baseUrl}/planner?view=week&date=${DAY_KEY}`, { waitUntil: 'networkidle' });
  await page.locator(`#week-todo-${DAY_KEY}`).waitFor({ timeout: 15_000 });
}

async function dragTodoToSchedule(page, title) {
  const source = page.locator(`#week-todo-${DAY_KEY} [aria-roledescription="draggable"]`).filter({ hasText: title }).first();
  const target = page.locator(`#week-schedule-${DAY_KEY}`);
  await dragElementToSection(page, source, target);
  await expectDropHint(target, TODO_TO_SCHEDULE_HINT, 'todo schedule drop hint missing');
  await page.mouse.up();
}

async function openLibraryPanel(page) {
  const libraryButton = page.getByRole('button', { name: '보관함' }).first();
  await libraryButton.click();
  await page.locator('[data-planner-library-panel="true"]').waitFor({ timeout: 8_000 });
}

async function dragLibraryItemToSection(page, libraryId, targetSelector, expectedHint) {
  const source = page.locator(`[data-library-template-id="${libraryId}"]`).first();
  const target = page.locator(targetSelector);
  await dragElementToSection(page, source, target);
  if (expectedHint) {
    await expectDropHint(target, expectedHint, 'library drop hint missing');
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function expectDropHint(target, expectedHint, message) {
  try {
    await target.page().waitForFunction(
      ([selector, hint]) => document.querySelector(selector)?.getAttribute('data-week-drop-hint') === hint,
      [await target.evaluate((el) => `#${CSS.escape(el.id)}`), expectedHint],
      { timeout: 2_000 },
    );
  } catch {
    const actualHint = await target.getAttribute('data-week-drop-hint');
    const targetText = await target.evaluate((el) => el.innerText);
    assert(false, `${message}: expected "${expectedHint}", actual "${actualHint ?? ''}" / ${targetText}`);
  }
}

async function dragElementToSection(page, source, target) {
  await source.waitFor({ timeout: 15_000 });
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert(sourceBox && targetBox, 'source or target box missing');
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + Math.max(72, targetBox.height / 3), { steps: 18 });
}

async function getTask(page, taskId) {
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem('planner.tasks.v1') || '[]'));
  return tasks.find((task) => task.id === taskId);
}

async function getTasks(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('planner.tasks.v1') || '[]'));
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
  if (!condition) throw new Error(`[planner-week-drag] ${message}`);
}
