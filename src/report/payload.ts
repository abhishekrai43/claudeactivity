import * as fs from "fs";
import * as path from "path";
import type { SessionData } from "../types";

/** One session, compacted for the embedded JSON payload. */
export interface SessionPayload {
  t: number;                        // start timestamp, epoch ms (0 if unknown)
  e: number;                        // end timestamp, epoch ms (0 if unknown)
  p: string;                        // project name
  pp: string;                       // project full path
  tc: Record<string, number>;       // tool name -> count
  a: Array<{ p: string; k: string }>; // accesses: { path, kind }
  u: Record<string, [number, number, number, number]>; // model -> [input, output, cacheCreate, cacheRead]
}

export interface ReportPayload {
  generatedAt: string;              // ISO timestamp
  sessions: SessionPayload[];
}

/**
 * Decode an encoded Claude project dir name back into a path + display name.
 * e.g. "-home-abhishek-projects-claudescope" -> { name, fullPath }.
 * Uses filesystem checks to find the correct dash/slash split points.
 */
export function decodeProjectDir(encoded: string): { name: string; fullPath: string } {
  const stripped = encoded.startsWith("-") ? encoded.slice(1) : encoded;
  const tokens = stripped.split("-");

  const segments: string[] = [];
  let bufTokens: string[] = [];

  for (const token of tokens) {
    bufTokens.push(token);
    const segment = bufTokens.join("-");
    const candidate = path.posix.join("/", ...segments, segment);
    let isDir = false;
    try { isDir = fs.statSync(candidate).isDirectory(); } catch {}
    if (isDir) {
      segments.push(segment);
      bufTokens = [];
    }
  }
  if (bufTokens.length > 0) segments.push(bufTokens.join("-"));

  const fullPath = "/" + segments.join("/");
  const name = path.basename(fullPath) || encoded;
  return { name, fullPath };
}

/** Build the compact embedded payload from parsed sessions. */
export function buildPayload(sessions: SessionData[]): ReportPayload {
  const out: SessionPayload[] = [];
  const decodeCache = new Map<string, { name: string; fullPath: string }>();

  for (const s of sessions) {
    const key = s.projectDir || "unknown";
    let decoded = decodeCache.get(key);
    if (!decoded) {
      decoded = decodeProjectDir(key);
      decodeCache.set(key, decoded);
    }

    const u: Record<string, [number, number, number, number]> = {};
    for (const [model, mu] of Object.entries(s.usage)) {
      u[model] = [mu.input, mu.output, mu.cacheCreate, mu.cacheRead];
    }

    out.push({
      t: s.firstTimestamp ? Date.parse(s.firstTimestamp) : 0,
      e: s.lastTimestamp ? Date.parse(s.lastTimestamp) : 0,
      p: decoded.name,
      pp: decoded.fullPath,
      tc: s.toolCounts,
      a: s.accesses.map((x) => ({ p: x.filePath, k: x.kind })),
      u,
    });
  }

  return { generatedAt: new Date().toISOString(), sessions: out };
}
