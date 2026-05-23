import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** Returns the default Claude Code projects path if it exists, or null. */
export function findDefaultClaudePath(): string | null {
  const candidates = [
    path.join(os.homedir(), ".claude", "projects"),
    path.join(os.homedir(), ".config", "claude", "projects"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Walk a directory and return all .jsonl file paths. */
export function collectJsonlFiles(root: string): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        results.push(full);
      }
    }
  }
  walk(root);
  return results;
}
