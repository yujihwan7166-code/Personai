import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const children = [];
let shuttingDown = false;

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

function startProcess(name, command, args) {
  const [resolvedCommand, resolvedArgs] = isWindows
    ? [
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", [resolveCommand(command), ...args].map(quoteWindowsArg).join(" ")],
      ]
    : [resolveCommand(command), args];

  const child = spawn(resolvedCommand, resolvedArgs, {
    stdio: "inherit",
    shell: false,
    env: process.env,
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

console.log("Starting local API on http://127.0.0.1:3000 ...");
startProcess("api", "npx", ["vercel", "dev", "--listen", "3000"]);

setTimeout(() => {
  console.log("Starting web app on http://127.0.0.1:3001 ...");
  startProcess("web", "npm", ["run", "dev:web", "--", "--host", "127.0.0.1", "--port", "3001"]);
}, 1500);
