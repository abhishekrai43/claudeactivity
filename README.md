<img width="1418" height="877" alt="image" src="https://github.com/user-attachments/assets/92790a1e-6cb6-4c6b-b594-1e14bc662469" />


# claudeactivity

Activity visualizer for Claude Code. Scans your local Claude session logs and generates a clean HTML report showing which repos, files, and tools you use most.

## Usage

No install needed:

```bash
npx claudeactivity scan
```

Or install globally:

```bash
npm install -g claudeactivity
claudeactivity scan
```

The report opens in your browser automatically. If it doesn't, the path is printed — copy it and open manually.

The report is a tabbed dashboard with a date-range filter (7d / 30d / 90d / All) that recomputes every section live.

## What it shows

**Overview**
- **Activity timeline** — daily file accesses across the selected range
- **Tool breakdown** — Read / Edit / Search / Exec proportions
- **Coding persona** — inferred from your tool usage ratios

**Projects**
- **Project activity** — all repos ranked by access count, sessions, and avg session depth
- **Repository breakdown** — per-repo cards with session stats and top files

**Files**
- **Most accessed files** and **most edited files** (edits/writes only)
- **Directory hotspots** — most accessed directories
- **Language breakdown** — share of activity by file extension

**Sessions**
- **Time-of-day heatmap** — when you use Claude, by hour and day of week
- **Session duration** — average, median, longest, and a length histogram

**Tokens** (read directly from session logs — no estimates)
- **Total tokens** and **cache hit rate**
- **Tokens by model** (Opus / Sonnet / Haiku) and **by project**
- **Token composition** — fresh input / output / cache write / cache read
- **Token usage over time**

## Options

```bash
claudeactivity scan                        # scan all projects, open report
claudeactivity scan --no-open              # generate but don't open browser
claudeactivity scan --project              # scope to current directory only
claudeactivity scan --output /tmp/reports  # custom output directory
claudeactivity scan /custom/claude/path    # custom Claude projects directory
```

Reports are saved to:
```
.claudeactivity/latest-report.html                     # always overwritten
.claudeactivity/reports/report-YYYY-MM-DD-HH-MM.html  # timestamped copy
```

## How it works

Reads JSONL session logs from `~/.claude/projects/` (or `~/.config/claude/projects/`), extracts file accesses, tool usage, and token counts from each session, and renders a self-contained HTML report with no external dependencies. All filtering and charts run client-side, so the date filter works without regenerating the report.

## Requirements

- Node.js 18+
- Claude Code installed and used at least once

## Platform support

| Platform | Status |
|---|---|
| macOS | ✓ |
| Linux | ✓ |
| WSL | ✓ |
| Windows | ✓ |
