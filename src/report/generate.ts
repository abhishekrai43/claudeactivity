export interface ProjectStat {
  projectName: string;
  projectPath: string;
  sessionCount: number;
  accessCount: number;
  topFiles: Array<{ name: string; fullPath: string; count: number }>;
}

export interface ActivityData {
  generatedAt: Date;
  totalSessions: number;
  totalProjects: number;
  totalAccesses: number;
  projects: ProjectStat[];
  toolCounts: Record<string, number>;
  topFiles: Array<{ name: string; fullPath: string; projectName: string; count: number }>;
  dailyActivity: Record<string, number>;
}

export function generateReport(data: ActivityData): string {
  const dateLabel = data.generatedAt.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const totalTools = Object.values(data.toolCounts).reduce((a, b) => a + b, 0);

  const readCount  = data.toolCounts["read"]  ?? 0;
  const editCount  = (data.toolCounts["edit"]  ?? 0) + (data.toolCounts["write"] ?? 0);
  const grepCount  = (data.toolCounts["grep"]  ?? 0) + (data.toolCounts["glob"]  ?? 0);
  const execCount  = data.toolCounts["bash"]  ?? 0;
  const agentCount = data.toolCounts["agent"] ?? 0;
  const otherCount = Math.max(0, totalTools - readCount - editCount - grepCount - execCount - agentCount);

  const readPct  = totalTools > 0 ? Math.round((readCount  / totalTools) * 100) : 0;
  const editPct  = totalTools > 0 ? Math.round((editCount  / totalTools) * 100) : 0;
  const grepPct  = totalTools > 0 ? Math.round((grepCount  / totalTools) * 100) : 0;
  const execPct  = totalTools > 0 ? Math.round((execCount  / totalTools) * 100) : 0;
  const agentPct = totalTools > 0 ? Math.round((agentCount / totalTools) * 100) : 0;
  const otherPct = Math.max(0, 100 - readPct - editPct - grepPct - execPct - agentPct);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  let last30Activity = 0, prev30Activity = 0, activeDays30 = 0;
  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 60; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const c = data.dailyActivity[ds] ?? 0;
    if (i < 30) { last30Activity += c; if (c > 0) activeDays30++; dowTotals[d.getDay()] += c; }
    else prev30Activity += c;
  }

  const trendPct = prev30Activity > 0
    ? Math.round(((last30Activity - prev30Activity) / prev30Activity) * 100)
    : null;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const peakDayIdx = dowTotals.indexOf(Math.max(...dowTotals));
  const peakDay = dayNames[peakDayIdx] ?? "—";

  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if ((data.dailyActivity[ds] ?? 0) > 0) currentStreak++;
    else break;
  }

  const dirMap = new Map<string, number>();
  for (const f of data.topFiles) {
    const parts = f.fullPath.split("/").filter(Boolean);
    if (parts.length <= 1) continue;
    const dir = "/" + parts.slice(0, Math.min(parts.length - 1, 4)).join("/");
    dirMap.set(dir, (dirMap.get(dir) ?? 0) + f.count);
  }
  const topDirs = [...dirMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxDirCount = topDirs[0]?.[1] ?? 1;

  const topTool = Object.keys(data.toolCounts)[0] ?? "—";
  const topToolPct = totalTools > 0 && data.toolCounts[topTool]
    ? Math.round((data.toolCounts[topTool]! / totalTools) * 100)
    : 0;

  const mostActiveProject = data.projects[0];
  const maxAccess = data.projects[0]?.accessCount ?? 1;
  const barColors = ["#7c3aed", "#0284c7", "#059669", "#d97706", "#dc2626", "#7e22ce", "#0369a1"];

  const persona = (() => {
    if (readPct > 45) return "Deep Reader";
    if (editPct > 40) return "Heavy Builder";
    if (grepPct > 25) return "Code Navigator";
    if (execPct > 30) return "Shell Runner";
    if (editPct > 25 && readPct > 30) return "Iterative Coder";
    return "Balanced Coder";
  })();
  const pDesc = personaDesc(persona, readPct, editPct, grepPct, execPct);

  const timelineSvg = buildTimeline(data.dailyActivity, todayDate);

  const stackedBar = [
    readCount  > 0 ? `<div style="flex:${readCount};background:#2563eb;" title="Read: ${readPct}%"></div>` : "",
    editCount  > 0 ? `<div style="flex:${editCount};background:#7c3aed;" title="Edit/Write: ${editPct}%"></div>` : "",
    grepCount  > 0 ? `<div style="flex:${grepCount};background:#059669;" title="Search: ${grepPct}%"></div>` : "",
    execCount  > 0 ? `<div style="flex:${execCount};background:#d97706;" title="Exec: ${execPct}%"></div>` : "",
    agentCount > 0 ? `<div style="flex:${agentCount};background:#dc2626;" title="Agent: ${agentPct}%"></div>` : "",
    otherCount > 0 ? `<div style="flex:${otherCount};background:#d1d5db;" title="Other: ${otherPct}%"></div>` : "",
  ].filter(Boolean).join('<div style="width:2px;background:#fff;flex-shrink:0;"></div>');

  const toolLegend = [
    readPct  > 0 ? `<span class="tleg"><span class="ldot" style="background:#2563eb;"></span>Read ${readPct}%</span>` : "",
    editPct  > 0 ? `<span class="tleg"><span class="ldot" style="background:#7c3aed;"></span>Edit/Write ${editPct}%</span>` : "",
    grepPct  > 0 ? `<span class="tleg"><span class="ldot" style="background:#059669;"></span>Search ${grepPct}%</span>` : "",
    execPct  > 0 ? `<span class="tleg"><span class="ldot" style="background:#d97706;"></span>Exec ${execPct}%</span>` : "",
    agentPct > 0 ? `<span class="tleg"><span class="ldot" style="background:#dc2626;"></span>Agent ${agentPct}%</span>` : "",
    otherPct > 0 ? `<span class="tleg"><span class="ldot" style="background:#9ca3af;"></span>Other ${otherPct}%</span>` : "",
  ].filter(Boolean).join("");

  const sortedTools = Object.entries(data.toolCounts).slice(0, 12);
  const maxTool = sortedTools[0]?.[1] ?? 1;
  const toolColorMap: Record<string, string> = {
    read: "#2563eb", edit: "#7c3aed", grep: "#059669", bash: "#d97706",
    write: "#dc2626", glob: "#0891b2", agent: "#ea580c", mcp: "#db2777",
    todoread: "#6d28d9", todowrite: "#7e22ce",
  };

  // Tool rows
  const toolRowsHtml = sortedTools.map(([tool, count]) => {
    const pct = Math.max(1, Math.round((count / maxTool) * 100));
    const color = toolColorMap[tool.toLowerCase()] ?? "#6b7280";
    const tp = totalTools > 0 ? Math.round((count / totalTools) * 100) : 0;
    return `<div class="row row-pad row-sep">
      <span class="ldot" style="background:${color};"></span>
      <span class="t-name" style="min-width:90px;">${escHtml(tool)}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${color};"></div></div>
      <span class="t-meta tar" style="min-width:100px;">${count.toLocaleString()} &middot; ${tp}%</span>
    </div>`;
  }).join("");

  // Project rows
  const projectRowsHtml = data.projects.map((p, i) => {
    const pct = Math.max(1, Math.round((p.accessCount / maxAccess) * 100));
    const color = barColors[i % barColors.length]!;
    const avgDepth = p.sessionCount > 0 ? (p.accessCount / p.sessionCount).toFixed(1) : "—";
    return `<div class="proj-row">
      <span class="t-dim tar">${String(i + 1).padStart(2, "0")}</span>
      <span class="t-name ellipsis" title="${escAttr(p.projectPath)}">${escHtml(p.projectName)}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${color};"></div></div>
      <span class="t-meta tar">${p.accessCount.toLocaleString()} accesses &middot; ${p.sessionCount}s &middot; ${avgDepth}/s</span>
    </div>`;
  }).join("");

  // Session depth rows
  const maxDepth = Math.max(...data.projects.map(p => p.sessionCount > 0 ? p.accessCount / p.sessionCount : 0), 1);
  const depthRowsHtml = data.projects.slice(0, 7).map(p => {
    const depth = p.sessionCount > 0 ? p.accessCount / p.sessionCount : 0;
    const dpct = Math.max(1, Math.round((depth / maxDepth) * 100));
    return `<div class="row" style="margin-bottom:10px;">
      <span class="t-name ellipsis" style="min-width:130px;">${escHtml(p.projectName)}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${dpct}%;background:linear-gradient(90deg,#2563eb,#7c3aed);"></div></div>
      <span class="t-num tar" style="min-width:40px;">${depth.toFixed(1)}</span>
    </div>`;
  }).join("");

  // Directory rows
  const dirRowsHtml = topDirs.map(([dir, count]) => {
    const pct = Math.max(1, Math.round((count / maxDirCount) * 100));
    const parts = dir.split("/").filter(Boolean);
    const label = parts.length > 2 ? ".../" + parts.slice(-2).join("/") : dir;
    return `<div style="margin-bottom:16px;">
      <div class="row" style="margin-bottom:5px;">
        <span class="t-name ellipsis" title="${escAttr(dir)}">${escHtml(label)}</span>
        <span class="t-num">${count}</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#2563eb,#7c3aed);"></div></div>
    </div>`;
  }).join("");

  // File rows
  const maxFileCount = data.topFiles[0]?.count ?? 1;
  const fileRowsHtml = data.topFiles.slice(0, 12).map((f, i) => {
    const pct = Math.max(1, Math.round((f.count / maxFileCount) * 100));
    const nameParts = f.name.split(".");
    const ext = nameParts.length > 1 ? nameParts[nameParts.length - 1]! : "";
    const ec = extColor(ext);
    return `<div class="row row-pad row-sep">
      <span class="t-dim tar" style="min-width:22px;">${i + 1}</span>
      <span class="ext-badge" style="background:${ec.bg};color:${ec.fg};">${escHtml(ext.slice(0, 4) || "?")}</span>
      <span class="t-name ellipsis" style="flex:1;" title="${escAttr(f.fullPath)}">${escHtml(f.name)}</span>
      <span class="t-dim" style="min-width:90px;">${escHtml(f.projectName)}</span>
      <div class="bar-bg" style="width:70px;flex:none;"><div class="bar-fill" style="width:${pct}%;background:#7c3aed;opacity:0.6;"></div></div>
      <span class="t-num tar" style="min-width:36px;">${f.count}</span>
    </div>`;
  }).join("");

  // Repo cards
  const repoCardsHtml = data.projects.filter(p => p.accessCount > 0).map((p, pi) => {
    const cardColor = barColors[pi % barColors.length]!;
    const maxFile = p.topFiles[0]?.count ?? 1;
    const avgDepth = p.sessionCount > 0 ? (p.accessCount / p.sessionCount).toFixed(1) : "—";
    const filesHtml = p.topFiles.slice(0, 6).map(f => {
      const fpct = Math.max(2, Math.round((f.count / maxFile) * 100));
      return `<div style="margin-bottom:10px;">
        <div class="row" style="margin-bottom:4px;">
          <span class="t-name ellipsis" style="flex:1;max-width:220px;" title="${escAttr(f.fullPath)}">${escHtml(f.name)}</span>
          <span class="t-num">${f.count}</span>
        </div>
        <div class="bar-bg" style="height:4px;"><div class="bar-fill" style="width:${fpct}%;background:${cardColor};opacity:0.7;"></div></div>
      </div>`;
    }).join("");
    return `<div class="repo-card" style="border-top-color:${cardColor};">
      <div class="t-heading">${escHtml(p.projectName)}</div>
      <div class="t-path">${escHtml(p.projectPath)}</div>
      <div class="repo-stats">
        <div class="repo-stat"><div class="repo-stat-num">${p.sessionCount}</div><div class="t-lbl">sessions</div></div>
        <div class="repo-stat"><div class="repo-stat-num">${p.accessCount.toLocaleString()}</div><div class="t-lbl">accesses</div></div>
        <div class="repo-stat"><div class="repo-stat-num">${avgDepth}</div><div class="t-lbl">avg/session</div></div>
      </div>
      <div class="t-lbl" style="margin-bottom:10px;">Top Files</div>
      ${filesHtml || '<span class="t-dim">No file data</span>'}
    </div>`;
  }).join("");

  const trendHtml = trendPct !== null
    ? `<span style="color:${trendPct >= 0 ? "#16a34a" : "#dc2626"};font-weight:700;">${trendPct >= 0 ? "+" : ""}${trendPct}%</span> vs prev month`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>claudeactivity &mdash; activity report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      background: #f1f5f9;
      color: #0f172a;
      min-height: 100vh;
    }

    .wrap { max-width: 1600px; margin: 0 auto; padding: 0 40px; }

    /* ── Typography classes ── */
    /* Primary: bold names — file names, tool names, project names, dir names */
    .t-name    { font-size: 15px; font-weight: 700; color: #0f172a; }
    /* Heading: larger bold name for card titles */
    .t-heading { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    /* Number: bold stat value inline */
    .t-num     { font-size: 15px; font-weight: 700; color: #0f172a; white-space: nowrap; }
    /* Meta: normal weight secondary info — paths, counts, descriptions */
    .t-meta    { font-size: 14px; font-weight: 400; color: #64748b; }
    /* Path: for file/dir paths */
    .t-path    { font-size: 13px; font-weight: 400; color: #94a3b8; margin-bottom: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    /* Dim: lightest text — indices, very secondary */
    .t-dim     { font-size: 14px; font-weight: 400; color: #94a3b8; }
    /* Label: uppercase tiny caps */
    .t-lbl     { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }

    /* Helpers */
    .tar     { text-align: right; }
    .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── Layout ── */
    .hdr {
      background: #fff; border-bottom: 1px solid #e2e8f0;
      padding: 14px 0; position: sticky; top: 0; z-index: 10;
    }
    .hdr-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
    .hdr-logo  { font-size: 22px; font-weight: 700; color: #0f172a; }
    .hdr-tag   { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-left: 10px; }
    .hdr-pills { display: flex; gap: 8px; flex-wrap: wrap; }
    .pill {
      display: flex; align-items: center; gap: 4px;
      padding: 6px 14px; border-radius: 9999px;
      background: #f8fafc; border: 1px solid #e2e8f0;
      font-size: 14px; color: #475569;
    }
    .pill strong { color: #0f172a; font-weight: 700; }
    .hdr-date { font-size: 13px; color: #94a3b8; }

    .main   { padding: 36px 0 80px; }
    .mb-lg  { margin-bottom: 32px; }
    .card   { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

    .sec-lbl   { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 14px; }
    .card-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }

    /* ── Stat cards ── */
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
    .stat-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 22px; border-top: 4px solid var(--accent, #e2e8f0);
    }
    .stat-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 10px; }
    .stat-val { font-size: 40px; font-weight: 700; color: #0f172a; line-height: 1; margin-bottom: 8px; letter-spacing: -0.02em; }
    .stat-val-md { font-size: 22px; }
    .stat-sub { font-size: 14px; color: #64748b; }

    /* ── Timeline ── */
    .tl-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
    .tl-meta   { display: flex; gap: 20px; font-size: 14px; color: #64748b; }
    .tl-meta strong { font-weight: 700; color: #0f172a; }
    .tl-wrap   { background: #f8fafc; border-radius: 8px; padding: 20px 20px 8px; }

    /* ── Bar helpers ── */
    .row     { display: flex; align-items: center; gap: 12px; }
    .row-pad { padding: 8px 0; }
    .row-sep { border-bottom: 1px solid #f1f5f9; }
    .bar-bg  { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; }
    .ldot    { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

    /* ── Tool legend ── */
    .tleg { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #475569; margin-right: 14px; margin-bottom: 4px; }

    /* ── Persona ── */
    .persona-box {
      display: flex; align-items: center; gap: 16px;
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;
    }
    .persona-name { font-size: 20px; font-weight: 700; color: #0f172a; }
    .persona-desc { font-size: 14px; color: #64748b; margin-top: 3px; }
    .ratio-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .ratio-lbl { font-size: 14px; font-weight: 700; min-width: 60px; }
    .ratio-bg  { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .ratio-pct { font-size: 14px; font-weight: 700; color: #0f172a; min-width: 40px; text-align: right; }

    /* ── Project rows ── */
    .proj-row {
      display: grid; grid-template-columns: 30px minmax(140px,220px) 1fr 260px;
      align-items: center; gap: 16px;
      padding: 12px 18px; background: #fff;
      border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px;
    }

    /* ── Ext badge ── */
    .ext-badge { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }

    /* ── Repo cards ── */
    .repo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
    .repo-card { background: #fff; border: 1px solid #e2e8f0; border-top: 4px solid #e2e8f0; border-radius: 12px; padding: 24px; }
    .repo-stats { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 18px; }
    .repo-stat  { flex: 1; padding: 12px 8px; text-align: center; border-right: 1px solid #e2e8f0; }
    .repo-stat:last-child { border-right: none; }
    .repo-stat-num { font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1; margin-bottom: 4px; }

    /* ── Footer ── */
    .footer { border-top: 1px solid #e2e8f0; padding: 20px 0; text-align: center; }
  </style>
</head>
<body>

<header class="hdr">
  <div class="wrap hdr-inner">
    <div>
      <span class="hdr-logo">claudeactivity</span>
      <span class="hdr-tag">activity report</span>
    </div>
    <div class="hdr-pills">
      <div class="pill"><strong>${data.totalProjects}</strong>&nbsp;repos</div>
      <div class="pill"><strong>${data.totalSessions}</strong>&nbsp;sessions</div>
      <div class="pill"><strong>${data.totalAccesses.toLocaleString()}</strong>&nbsp;accesses</div>
      <div class="pill"><strong>${totalTools.toLocaleString()}</strong>&nbsp;tool calls</div>
    </div>
    <div class="hdr-date">${escHtml(dateLabel)}</div>
  </div>
</header>

<main class="main">
  <div class="wrap">

    <!-- Stat cards -->
    <div class="stat-grid mb-lg">
      <div class="stat-card" style="--accent:#7c3aed;">
        <div class="stat-lbl">Most active repo</div>
        <div class="stat-val stat-val-md">${escHtml(mostActiveProject?.projectName ?? "—")}</div>
        <div class="stat-sub">${(mostActiveProject?.accessCount ?? 0).toLocaleString()} accesses</div>
      </div>
      <div class="stat-card" style="--accent:#2563eb;">
        <div class="stat-lbl">Active days (30d)</div>
        <div class="stat-val">${activeDays30}</div>
        <div class="stat-sub">${trendHtml || "no comparison data"}</div>
      </div>
      <div class="stat-card" style="--accent:#059669;">
        <div class="stat-lbl">Top tool</div>
        <div class="stat-val stat-val-md">${escHtml(topTool)}</div>
        <div class="stat-sub">${topToolPct}% of all calls</div>
      </div>
      <div class="stat-card" style="--accent:#d97706;">
        <div class="stat-lbl">Current streak</div>
        <div class="stat-val">${currentStreak} <span class="stat-sub">days</span></div>
        <div class="stat-sub">peak day: ${escHtml(peakDay)}</div>
      </div>
    </div>

    <!-- Activity Timeline -->
    <div class="card mb-lg">
      <div class="tl-header">
        <span class="card-title" style="margin-bottom:0;">Activity Timeline</span>
        <div class="tl-meta">
          <span>Last 90 days</span>
          ${trendPct !== null ? `<span>${trendHtml}</span>` : ""}
          <span>Peak day: <strong>${escHtml(peakDay)}</strong></span>
        </div>
      </div>
      <div class="tl-wrap">${timelineSvg}</div>
    </div>

    <!-- Tool Breakdown + Coding Persona -->
    <div class="two-col mb-lg">
      <div class="card">
        <div class="card-title">Tool Breakdown</div>
        <div style="display:flex;height:26px;border-radius:6px;overflow:hidden;margin-bottom:12px;border:1px solid #e2e8f0;">${stackedBar}</div>
        <div style="margin-bottom:24px;line-height:2;">${toolLegend}</div>
        <div class="t-lbl" style="margin-bottom:8px;">By Tool</div>
        ${toolRowsHtml}
      </div>
      <div class="card">
        <div class="card-title">Coding Persona</div>
        <div class="persona-box">
          <div style="font-size:36px;line-height:1;">${personaEmoji(persona)}</div>
          <div>
            <div class="persona-name">${escHtml(persona)}</div>
            <div class="persona-desc">${escHtml(pDesc)}</div>
          </div>
        </div>
        <div style="margin-bottom:24px;">
          <div class="ratio-row"><span class="ratio-lbl" style="color:#2563eb;">Read</span><div class="ratio-bg"><div class="bar-fill" style="width:${readPct}%;background:#2563eb;"></div></div><span class="ratio-pct">${readPct}%</span></div>
          <div class="ratio-row"><span class="ratio-lbl" style="color:#7c3aed;">Edit</span><div class="ratio-bg"><div class="bar-fill" style="width:${editPct}%;background:#7c3aed;"></div></div><span class="ratio-pct">${editPct}%</span></div>
          <div class="ratio-row"><span class="ratio-lbl" style="color:#059669;">Search</span><div class="ratio-bg"><div class="bar-fill" style="width:${grepPct}%;background:#059669;"></div></div><span class="ratio-pct">${grepPct}%</span></div>
          <div class="ratio-row"><span class="ratio-lbl" style="color:#d97706;">Exec</span><div class="ratio-bg"><div class="bar-fill" style="width:${execPct}%;background:#d97706;"></div></div><span class="ratio-pct">${execPct}%</span></div>
        </div>
        <div class="t-lbl" style="margin-bottom:4px;">Session Depth by Repo</div>
        <div class="t-meta" style="margin-bottom:14px;">avg file accesses per session</div>
        ${depthRowsHtml}
      </div>
    </div>

    <!-- Project Activity -->
    <div class="mb-lg">
      <div class="sec-lbl">Project Activity</div>
      ${projectRowsHtml || '<span class="t-dim">No data</span>'}
    </div>

    <!-- Directory Hotspots + Most Accessed Files -->
    <div class="two-col mb-lg">
      <div class="card">
        <div class="card-title">Directory Hotspots</div>
        ${dirRowsHtml || '<span class="t-dim">No data</span>'}
      </div>
      <div class="card">
        <div class="card-title">Most Accessed Files</div>
        ${fileRowsHtml || '<span class="t-dim">No data</span>'}
      </div>
    </div>

    <!-- Repo cards -->
    <div>
      <div class="sec-lbl">Repository Breakdown</div>
      <div class="repo-grid">${repoCardsHtml || '<span class="t-dim">No data</span>'}</div>
    </div>

  </div>
</main>

<footer class="footer">
  <div class="wrap t-dim">claudeactivity &middot; activity visualizer for Claude Code</div>
</footer>

</body>
</html>`;
}

function buildTimeline(dailyActivity: Record<string, number>, todayDate: Date): string {
  const days: Array<{ date: string; count: number }> = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    days.push({ date: ds, count: dailyActivity[ds] ?? 0 });
  }

  const max = Math.max(...days.map(d => d.count), 1);
  const svgH = 120;
  const barW = 12;
  const gap = 2;
  const totalW = 90 * (barW + gap) - gap;

  const bars = days.map((day, i) => {
    const h = day.count === 0 ? 3 : Math.max(6, Math.round((day.count / max) * (svgH - 6)));
    const x = i * (barW + gap);
    const y = svgH - h;
    const fill = day.count === 0 ? "#e2e8f0" : i >= 60 ? "url(#barGrad)" : "#c4b5fd";
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${fill}" rx="3"><title>${escAttr(day.date + ": " + day.count + " file accesses")}</title></rect>`;
  }).join("");

  const labels: string[] = [];
  let prevMonth = "";
  days.forEach((day, i) => {
    const d = new Date(day.date + "T12:00:00");
    const month = d.toLocaleDateString("en-US", { month: "short" });
    if (d.getDate() <= 7 && month !== prevMonth) {
      labels.push(`<text x="${i * (barW + gap)}" y="${svgH + 16}" font-size="12" fill="#94a3b8" font-family="Arial,sans-serif">${escHtml(month)}</text>`);
      prevMonth = month;
    }
  });

  return `<svg viewBox="0 0 ${totalW} ${svgH + 24}" width="100%" height="${svgH + 24}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </linearGradient>
  </defs>
  ${bars}${labels.join("")}
</svg>`;
}

function extColor(ext: string): { bg: string; fg: string } {
  const map: Record<string, { bg: string; fg: string }> = {
    ts:   { bg: "#dbeafe", fg: "#1d4ed8" },
    tsx:  { bg: "#dbeafe", fg: "#1d4ed8" },
    js:   { bg: "#fef9c3", fg: "#a16207" },
    jsx:  { bg: "#fef9c3", fg: "#a16207" },
    py:   { bg: "#dcfce7", fg: "#15803d" },
    go:   { bg: "#e0f2fe", fg: "#0369a1" },
    rs:   { bg: "#ffedd5", fg: "#c2410c" },
    kt:   { bg: "#f3e8ff", fg: "#7e22ce" },
    css:  { bg: "#f3e8ff", fg: "#7e22ce" },
    scss: { bg: "#f3e8ff", fg: "#6b21a8" },
    html: { bg: "#fee2e2", fg: "#b91c1c" },
    json: { bg: "#d1fae5", fg: "#065f46" },
    md:   { bg: "#f5f5f4", fg: "#44403c" },
    sh:   { bg: "#dcfce7", fg: "#166534" },
    yaml: { bg: "#e0f2fe", fg: "#075985" },
    yml:  { bg: "#e0f2fe", fg: "#075985" },
    toml: { bg: "#faf5ff", fg: "#6b21a8" },
    sql:  { bg: "#fee2e2", fg: "#991b1b" },
  };
  return map[ext.toLowerCase()] ?? { bg: "#f1f5f9", fg: "#475569" };
}

function personaEmoji(persona: string): string {
  const m: Record<string, string> = {
    "Deep Reader": "📖", "Heavy Builder": "⚡", "Code Navigator": "🔍",
    "Shell Runner": "💻", "Iterative Coder": "🔄", "Balanced Coder": "⚖️",
  };
  return m[persona] ?? "🤖";
}

function personaDesc(persona: string, read: number, edit: number, grep: number, exec: number): string {
  const m: Record<string, string> = {
    "Deep Reader": `${read}% reads — methodical, understands before acting`,
    "Heavy Builder": `${edit}% edits — high output, builds fast`,
    "Code Navigator": `${grep}% searches — explores codebases deeply`,
    "Shell Runner": `${exec}% bash — automation-heavy workflows`,
    "Iterative Coder": `${read}% read / ${edit}% edit — refines and improves`,
    "Balanced Coder": `Spread across read (${read}%), edit (${edit}%), search (${grep}%)`,
  };
  return m[persona] ?? "Broad usage of Claude tool capabilities";
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escAttr(s: string): string {
  return escHtml(s).replace(/\n/g, "&#10;").replace(/\r/g, "&#13;");
}
