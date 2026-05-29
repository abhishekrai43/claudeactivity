#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { program } from "commander";
import { findDefaultClaudePath, collectJsonlFiles } from "./scanner/find-logs";
import { parseAllSessions } from "./scanner/parse-session";
import { buildPayload } from "./report/payload";
import { generateReport } from "./report/generate";
import { openInBrowser } from "./report/open";

program
  .name("claudeactivity")
  .description("Activity visualizer for Claude Code")
  .version("0.1.2");

program
  .command("scan")
  .description("Scan Claude session logs and generate an activity report")
  .argument("[path]", "Path to Claude projects directory (default: ~/.claude/projects/)")
  .option("-o, --output <dir>", "Output directory for reports", ".claudeactivity")
  .option("--no-open", "Do not open report in browser after generation")
  .option("--project", "Scope scan to the current directory only (default: all projects)")
  .action(async (claudePath: string | undefined, options: { output: string; open: boolean; project: boolean }) => {
    const scanPath = claudePath ?? findDefaultClaudePath();

    if (!scanPath || !fs.existsSync(scanPath)) {
      process.stderr.write(
        `No Claude projects directory found.\n` +
        `Tried: ~/.claude/projects/ and ~/.config/claude/projects/\n` +
        `Pass a path explicitly: claudeactivity scan <path>\n`
      );
      process.exit(1);
    }

    const cwd = process.cwd();
    const scopeAll = !options.project;
    process.stdout.write(`Scanning ${scopeAll ? "all projects" : cwd}\n`);

    const files = collectJsonlFiles(scanPath);
    if (files.length === 0) {
      process.stdout.write("No session logs found. Nothing to report.\n");
      process.exit(0);
    }

    let parsed = 0;
    const allSessions = parseAllSessions(files, scanPath, () => {
      parsed++;
      process.stdout.write(`\rParsing sessions... ${parsed}/${files.length}`);
    });
    process.stdout.write(`\rParsed ${allSessions.length} session${allSessions.length !== 1 ? "s" : ""}.          \n`);

    const cwdSlash = cwd.endsWith("/") ? cwd : cwd + "/";
    const sessions = scopeAll ? allSessions : allSessions.filter((s) => {
      if (s.projectPath) {
        const proj = s.projectPath.endsWith("/") ? s.projectPath : s.projectPath + "/";
        return cwdSlash.startsWith(proj) || proj.startsWith(cwdSlash);
      }
      return s.accesses.some((a) => a.filePath.startsWith(cwdSlash));
    });

    if (sessions.length === 0) {
      process.stdout.write(
        options.project
          ? `No sessions found for ${cwd}\nTry running without --project to scan all projects.\n`
          : "No sessions found. Nothing to report.\n"
      );
      process.exit(0);
    }

    const payload = buildPayload(sessions);

    // Compact terminal summary: file accesses + sessions per project.
    const summary = new Map<string, { accesses: number; sessions: number }>();
    for (const s of payload.sessions) {
      const cur = summary.get(s.p) ?? { accesses: 0, sessions: 0 };
      cur.sessions += 1;
      cur.accesses += s.a.filter((a) => a.k === "read" || a.k === "write" || a.k === "edit").length;
      summary.set(s.p, cur);
    }
    const ranked = [...summary.entries()].sort((a, b) => b[1].accesses - a[1].accesses);

    process.stdout.write(`\nProjects: ${ranked.length}\n\n`);
    for (const [name, st] of ranked) {
      process.stdout.write(`  ${name.padEnd(32)} ${st.accesses.toLocaleString()} accesses · ${st.sessions} session${st.sessions !== 1 ? "s" : ""}\n`);
    }
    process.stdout.write("\n");

    const html = generateReport(payload);

    const outDir = path.resolve(options.output);
    const reportsDir = path.join(outDir, "reports");
    fs.mkdirSync(reportsDir, { recursive: true });

    const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "-");
    const timestampedPath = path.join(reportsDir, `report-${stamp}.html`);
    const latestPath = path.join(outDir, "latest-report.html");

    fs.writeFileSync(timestampedPath, html, "utf8");
    fs.writeFileSync(latestPath, html, "utf8");

    process.stdout.write(`Report: ${latestPath}\n`);

    if (options.open) {
      openInBrowser(latestPath);
      process.stdout.write(`Opening in browser... (if it doesn't open, copy the path above)\n`);
    } else {
      process.stdout.write(`Open with: open "${latestPath}"\n`);
    }
  });

program.parse();
