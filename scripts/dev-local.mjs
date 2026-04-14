import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const children = [];
let shuttingDown = false;

loadEnvFile(".env");
loadEnvFile(".env.local");

const hasLawCredential = Boolean(
  process.env.OPEN_LAW_ID ||
    process.env.LAW_OC ||
    process.env.LAW_API_KEY
);

if (hasLawCredential) {
  process.env.LEGAL_MCP_BRIDGE_URL ||= "http://127.0.0.1:8788";
  process.env.LEGAL_RESEARCH_PROVIDER ||= "auto";
}

function loadEnvFile(filename) {
  const fullPath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(fullPath)) return;

  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function resolveCommand(command) {
  return isWindows ? `${command}.cmd` : command;
}

function quoteWindowsArg(value) {
  const stringValue = String(value);
  return /[\s"]/u.test(stringValue) ? `"${stringValue.replace(/"/g, '\\"')}"` : stringValue;
}

function killChild(child) {
  if (!child || child.killed || child.exitCode !== null) return;

  if (isWindows) {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      shell: false,
    });
    return;
  }

  child.kill("SIGTERM");
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    killChild(child);
  }

  setTimeout(() => process.exit(exitCode), 250);
}

function startProcess(name, command, args, extraEnv = {}) {
  const [resolvedCommand, resolvedArgs] = isWindows
    ? [
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", [resolveCommand(command), ...args].map(quoteWindowsArg).join(" ")],
      ]
    : [resolveCommand(command), args];

  const child = spawn(resolvedCommand, resolvedArgs, {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.error(`[${name}] exited with code ${code ?? 0}`);
    shutdown(code ?? 1);
  });

  children.push(child);
  return child;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (hasLawCredential) {
  console.log("Starting legal MCP bridge on http://127.0.0.1:8788 ...");
  startProcess("legal-mcp", "npm", ["run", "dev:legal-mcp"]);
}

setTimeout(() => {
  console.log("Starting web app + local API on http://127.0.0.1:3001 ...");
  startProcess("web", "npm", ["run", "dev:web", "--", "--host", "127.0.0.1", "--port", "3001"]);
}, hasLawCredential ? 2200 : 0);
