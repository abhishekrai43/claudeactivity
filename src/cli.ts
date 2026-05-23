#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { program } from "commander";
import { findDefaultClaudePath, collectJsonlFiles } from "./scanner/find-logs";
import { parseAllSessions } from "./scanner/parse-session";
import { generateReport } from "./report/generate";
import type { ActivityData, ProjectStat } from "./report/generate";
import { openInBrowser } from "./report/open";

function decodeProjectDir(encoded: string): { name: string; fullPath: string } {
  // encoded = "-home-abhishek-projects-claudescope"
  // Decode: leading - means root /, then each - is either / or literal dash
  // Use filesystem checks to find correct split points
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

program
  .name("claudeactivity")
  .description("Activity visualizer for Claude Code")
  .version("0.1.0");

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

    // Group by projectDir
    const byProject = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const key = s.projectDir || "unknown";
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(s);
    }

    // Build ActivityData
    const allToolCounts: Record<string, number> = {};
    const fileCounts = new Map<string, number>(); // fullPath -> count
    const fileToProject = new Map<string, string>();
    const dailyActivity: Record<string, number> = {};

    const projects: ProjectStat[] = [];

    for (const [projectDir, projectSessions] of byProject) {
      const { name, fullPath } = decodeProjectDir(projectDir);

      let accessCount = 0;
      const localFileCounts = new Map<string, number>();

      for (const s of projectSessions) {
        // Tool counts
        for (const [tool, count] of Object.entries(s.toolCounts)) {
          allToolCounts[tool] = (allToolCounts[tool] ?? 0) + count;
        }

        // File accesses
        for (const a of s.accesses) {
          accessCount++;
          localFileCounts.set(a.filePath, (localFileCounts.get(a.filePath) ?? 0) + 1);
          fileCounts.set(a.filePath, (fileCounts.get(a.filePath) ?? 0) + 1);
          fileToProject.set(a.filePath, name);
        }

        // Daily activity from timestamps
        const ts = s.firstTimestamp;
        if (ts) {
          const day = ts.slice(0, 10); // YYYY-MM-DD
          dailyActivity[day] = (dailyActivity[day] ?? 0) + s.accesses.length;
        }
      }

      // Top files for this project
      const topFiles = [...localFileCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([fp, count]) => ({
          name: fp.split("/").pop() ?? fp,
          fullPath: fp,
          count,
        }));

      projects.push({
        projectName: name,
        projectPath: fullPath,
        sessionCount: projectSessions.length,
        accessCount,
        topFiles,
      });
    }

    projects.sort((a, b) => b.accessCount - a.accessCount);

    const topFiles = [...fileCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([fp, count]) => ({
        name: fp.split("/").pop() ?? fp,
        fullPath: fp,
        projectName: fileToProject.get(fp) ?? "",
        count,
      }));

    // Sort toolCounts descending
    const sortedToolCounts: Record<string, number> = {};
    for (const [k, v] of Object.entries(allToolCounts).sort((a, b) => b[1] - a[1])) {
      sortedToolCounts[k] = v;
    }

    const activityData: ActivityData = {
      generatedAt: new Date(),
      totalSessions: sessions.length,
      totalProjects: projects.length,
      totalAccesses: projects.reduce((n, p) => n + p.accessCount, 0),
      projects,
      toolCounts: sortedToolCounts,
      topFiles,
      dailyActivity,
    };

    // Print compact terminal summary
    process.stdout.write(`\nProjects: ${projects.length}\n\n`);
    for (const proj of projects) {
      const name = proj.projectName.padEnd(32);
      process.stdout.write(`  ${name} ${proj.accessCount.toLocaleString()} accesses · ${proj.sessionCount} session${proj.sessionCount !== 1 ? "s" : ""}\n`);
    }
    process.stdout.write("\n");

    const html = generateReport(activityData);

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
