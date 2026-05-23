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

## What it shows

- **Activity timeline** — 90-day bar chart of daily file accesses
- **Tool breakdown** — Read / Edit / Search / Exec proportions and per-tool counts
- **Coding persona** — inferred from your tool usage ratios
- **Project activity** — all repos ranked by access count, sessions, and avg session depth
- **Directory hotspots** — most accessed directories across all projects
- **Most accessed files** — top files with project and access count
- **Repository breakdown** — per-repo cards with session stats and top files

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

Reads JSONL session logs from `~/.claude/projects/` (or `~/.config/claude/projects/`), extracts file accesses and tool usage from each session, and renders a self-contained HTML report with no external dependencies.

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
