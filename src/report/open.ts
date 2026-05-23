import { exec, execFile, execSync } from "child_process";
import { readFileSync } from "fs";

function isWsl(): boolean {
  try {
    const v = readFileSync("/proc/version", "utf8").toLowerCase();
    return v.includes("microsoft") || v.includes("wsl");
  } catch {
    return false;
  }
}

export function openInBrowser(filePath: string): void {
  const url = `file://${filePath}`;
  let cmd: string;

  if (process.platform === "darwin") {
    cmd = `open "${url}"`;
  } else if (process.platform === "win32") {
    cmd = `start "" "${url}"`;
  } else if (isWsl()) {
    try {
      // wslpath -w gives the correct Windows path for any Linux path
      const winPath = execSync(`wslpath -w "${filePath}"`).toString().trim();
      const ps = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
      // execFile skips the shell so backslashes in UNC path are not consumed
      execFile(ps, ["-NoProfile", "-Command", `Start-Process '${winPath}'`], (err) => {
        if (err) process.stderr.write(`Could not open browser: ${err.message}\n`);
      });
    } catch (err: unknown) {
      process.stderr.write(`Could not open browser: ${String(err)}\n`);
    }
    return;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) process.stderr.write(`Could not open browser: ${err.message}\n`);
  });
}
