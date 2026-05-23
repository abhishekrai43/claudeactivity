import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type { FileAccess, SessionData } from "../types";

interface RawEntry {
  type: string;
  uuid?: string;
  timestamp?: string;
  projectPath?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
}

interface ToolUseBlock {
  type: "tool_use";
  name: string;
  input?: Record<string, unknown>;
}

/** Parse a single JSONL session file into SessionData. */
export function parseSession(logPath: string): SessionData {
  const sessionId = crypto.randomUUID();
  const accesses: FileAccess[] = [];
  const toolCounts: Record<string, number> = {};
  let projectPath = "";
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;
  let messageCount = 0;

  const raw = fs.readFileSync(logPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry: RawEntry;
    try {
      entry = JSON.parse(trimmed) as RawEntry;
    } catch {
      continue;
    }

    if (!projectPath && entry.projectPath) {
      projectPath = entry.projectPath;
    }

    // Track timestamps
    if (entry.timestamp) {
      if (firstTimestamp === null) firstTimestamp = entry.timestamp;
      lastTimestamp = entry.timestamp;
    }

    // Count user messages
    if (entry.type === "user") {
      messageCount++;
    }

    if (entry.type !== "assistant" || !entry.message) continue;

    const content = entry.message.content;
    if (!Array.isArray(content)) continue;

    for (const block of content as unknown[]) {
      const b = block as Record<string, unknown>;
      if (b["type"] !== "tool_use") continue;
      const tb = b as unknown as ToolUseBlock;
      const norm = normalizeTool(tb.name);

      // Increment tool count for every tool_use block
      toolCounts[norm] = (toolCounts[norm] ?? 0) + 1;

      const input = tb.input ?? {};
      const access = extractAccess(norm, input);
      if (access) accesses.push(access);
    }
  }

  return {
    sessionId,
    logPath,
    projectPath,
    projectDir: "",
    accesses,
    toolCounts,
    firstTimestamp,
    lastTimestamp,
    messageCount,
  };
}

function extractAccess(
  norm: string,
  input: Record<string, unknown>
): FileAccess | null {
  const filePath = input["file_path"] as string | undefined;
  const pattern = input["pattern"] as string | undefined;

  switch (norm) {
    case "read":
      return filePath ? { filePath, kind: "read" } : null;
    case "write":
      return filePath ? { filePath, kind: "write" } : null;
    case "edit":
      return filePath ? { filePath, kind: "edit" } : null;
    case "grep":
      return pattern ? { filePath: pattern, kind: "grep" } : null;
    case "glob":
      return pattern ? { filePath: pattern, kind: "glob" } : null;
    default:
      return null;
  }
}

function normalizeTool(name: string): string {
  return name.toLowerCase().replace(/tool$/, "");
}

/** Parse all .jsonl files in a directory. Returns one SessionData per file. */
export function parseAllSessions(
  files: string[],
  claudeProjectsRoot: string,
  onProgress?: (current: string, index: number, total: number) => void
): SessionData[] {
  const sessions: SessionData[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    onProgress?.(path.basename(f), i + 1, files.length);
    try {
      const session = parseSession(f);
      const rel = path.relative(claudeProjectsRoot, f);
      const projectDir = rel.split(path.sep)[0] ?? "";
      session.projectDir = projectDir;
      if (session.accesses.length > 0 || Object.keys(session.toolCounts).length > 0) {
        sessions.push(session);
      }
    } catch {
      // skip unreadable files
    }
  }
  return sessions;
}
