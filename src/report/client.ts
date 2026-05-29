// @ts-nocheck — this function is serialized to a string and runs in the browser.
/* eslint-disable */

/**
 * Client-side report app. Reads window.__DATA__ (ReportPayload), filters
 * sessions by the selected date range, aggregates everything, and renders
 * the tab panels. Re-runs fully whenever the range changes.
 */
function clientApp() {
  const D = window.__DATA__;
  const GEN = new Date(window.__GEN__);

  const PALETTE = ["#7c3aed", "#0284c7", "#059669", "#d97706", "#dc2626", "#7e22ce", "#0369a1"];
  const TOOL_COLOR = {
    read: "#2563eb", edit: "#7c3aed", grep: "#059669", bash: "#d97706",
    write: "#dc2626", glob: "#0891b2", agent: "#ea580c", mcp: "#db2777",
    todoread: "#6d28d9", todowrite: "#7e22ce",
  };
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const FILE_KINDS = { read: 1, write: 1, edit: 1 };

  const MODEL_COLOR = (model) => {
    const m = model.toLowerCase();
    if (m.indexOf("opus") >= 0) return "#7c3aed";
    if (m.indexOf("haiku") >= 0) return "#059669";
    if (m.indexOf("sonnet") >= 0) return "#2563eb";
    return "#94a3b8";
  };
  function prettyModel(model) {
    const m = model.toLowerCase();
    let fam = "";
    if (m.indexOf("opus") >= 0) fam = "Opus";
    else if (m.indexOf("sonnet") >= 0) fam = "Sonnet";
    else if (m.indexOf("haiku") >= 0) fam = "Haiku";
    if (!fam) return model;
    const ver = (model.match(/(\d+)-(\d+)/) || []);
    return ver.length ? fam + " " + ver[1] + "." + ver[2] : fam;
  }
  const fmtTok = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n));

  let range = 90; // 7 | 30 | 90 | 'all'

  // ── helpers ──
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const fmt = (n) => Number(n).toLocaleString();
  const isoDay = (d) => {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + dd;
  };
  const extOf = (name) => name.indexOf(".") > 0 ? name.split(".").pop().toLowerCase() : "";

  function extColor(ext) {
    const map = {
      ts: ["#dbeafe", "#1d4ed8"], tsx: ["#dbeafe", "#1d4ed8"], js: ["#fef9c3", "#a16207"],
      jsx: ["#fef9c3", "#a16207"], py: ["#dcfce7", "#15803d"], go: ["#e0f2fe", "#0369a1"],
      rs: ["#ffedd5", "#c2410c"], kt: ["#f3e8ff", "#7e22ce"], css: ["#f3e8ff", "#7e22ce"],
      scss: ["#f3e8ff", "#6b21a8"], html: ["#fee2e2", "#b91c1c"], json: ["#d1fae5", "#065f46"],
      md: ["#f5f5f4", "#44403c"], sh: ["#dcfce7", "#166534"], yaml: ["#e0f2fe", "#075985"],
      yml: ["#e0f2fe", "#075985"], toml: ["#faf5ff", "#6b21a8"], sql: ["#fee2e2", "#991b1b"],
    };
    return map[ext] || ["#f1f5f9", "#475569"];
  }

  function inRange(t) {
    if (range === "all") return true;
    if (!t) return false;
    return t >= Date.now() - range * 86400000;
  }

  // ── aggregation ──
  function aggregate() {
    const sessions = D.sessions.filter((s) => inRange(s.t));

    const tc = {}; let totalTools = 0, fileAccesses = 0;
    const fileCount = {}, fileProj = {}, editCount = {}, editProj = {}, dirCount = {}, lang = {};
    const daily = {};
    const projMap = {};
    const hourDow = []; for (let h = 0; h < 24; h++) hourDow.push([0, 0, 0, 0, 0, 0, 0]);
    const durations = [];
    const modelUsage = {};   // model -> {i,o,cc,cr}
    const dailyTokens = {};  // day -> total tokens

    for (const s of sessions) {
      for (const k in s.tc) { tc[k] = (tc[k] || 0) + s.tc[k]; totalTools += s.tc[k]; }

      let pm = projMap[s.p];
      if (!pm) pm = projMap[s.p] = { name: s.p, path: s.pp, sessions: 0, accesses: 0, files: {}, tok: 0 };
      pm.sessions++;

      // token usage per model + per project + per day
      for (const model in s.u) {
        if (model === "<synthetic>") continue; // Claude Code internal, non-billable
        const a4 = s.u[model];
        let mu = modelUsage[model];
        if (!mu) mu = modelUsage[model] = { i: 0, o: 0, cc: 0, cr: 0 };
        mu.i += a4[0]; mu.o += a4[1]; mu.cc += a4[2]; mu.cr += a4[3];
        const tot = a4[0] + a4[1] + a4[2] + a4[3];
        pm.tok += tot;
        if (s.t) { const day = isoDay(new Date(s.t)); dailyTokens[day] = (dailyTokens[day] || 0) + tot; }
      }

      if (s.t) {
        const d = new Date(s.t);
        hourDow[d.getHours()][d.getDay()] += s.a.length;
        const day = isoDay(d);
        daily[day] = (daily[day] || 0) + s.a.length;
      }
      if (s.t && s.e && s.e > s.t) durations.push((s.e - s.t) / 60000);

      for (const acc of s.a) {
        if (!FILE_KINDS[acc.k]) continue;
        const p = acc.p;
        fileAccesses++;
        pm.accesses++;
        fileCount[p] = (fileCount[p] || 0) + 1; fileProj[p] = s.p;
        pm.files[p] = (pm.files[p] || 0) + 1;

        const nm = p.split("/").pop() || p;
        const ext = extOf(nm);
        if (ext) lang[ext] = (lang[ext] || 0) + 1;

        const parts = p.split("/").filter(Boolean);
        if (parts.length > 1) {
          const dir = "/" + parts.slice(0, Math.min(parts.length - 1, 4)).join("/");
          dirCount[dir] = (dirCount[dir] || 0) + 1;
        }
        if (acc.k === "edit" || acc.k === "write") {
          editCount[p] = (editCount[p] || 0) + 1; editProj[p] = s.p;
        }
      }
    }

    // tool families
    const read = tc.read || 0;
    const edit = (tc.edit || 0) + (tc.write || 0);
    const grep = (tc.grep || 0) + (tc.glob || 0);
    const exec = tc.bash || 0;
    const agent = tc.agent || 0;
    const other = Math.max(0, totalTools - read - edit - grep - exec - agent);
    const pc = (n) => totalTools > 0 ? Math.round((n / totalTools) * 100) : 0;
    const fam = {
      read, edit, grep, exec, agent, other,
      readPct: pc(read), editPct: pc(edit), grepPct: pc(grep),
      execPct: pc(exec), agentPct: pc(agent),
    };
    fam.otherPct = Math.max(0, 100 - fam.readPct - fam.editPct - fam.grepPct - fam.execPct - fam.agentPct);

    // persona
    let persona = "Balanced Coder";
    if (fam.readPct > 45) persona = "Deep Reader";
    else if (fam.editPct > 40) persona = "Heavy Builder";
    else if (fam.grepPct > 25) persona = "Code Navigator";
    else if (fam.execPct > 30) persona = "Shell Runner";
    else if (fam.editPct > 25 && fam.readPct > 30) persona = "Iterative Coder";

    // projects sorted
    const projects = Object.values(projMap).sort((a, b) => b.accesses - a.accesses).map((p) => {
      const topFiles = Object.keys(p.files).map((fp) => ({ name: fp.split("/").pop() || fp, fullPath: fp, count: p.files[fp] }))
        .sort((a, b) => b.count - a.count).slice(0, 6);
      return { name: p.name, path: p.path, sessions: p.sessions, accesses: p.accesses, topFiles, tok: p.tok };
    });

    // token aggregation
    let sumIn = 0, sumOut = 0, sumCC = 0, sumCR = 0;
    const models = Object.keys(modelUsage).map((model) => {
      const mu = modelUsage[model];
      sumIn += mu.i; sumOut += mu.o; sumCC += mu.cc; sumCR += mu.cr;
      return { model, name: prettyModel(model), color: MODEL_COLOR(model), tokens: mu.i + mu.o + mu.cc + mu.cr, mu };
    }).sort((a, b) => b.tokens - a.tokens);
    const totalTokens = sumIn + sumOut + sumCC + sumCR;
    const cacheRate = (sumIn + sumCC + sumCR) > 0 ? Math.round((sumCR / (sumIn + sumCC + sumCR)) * 100) : 0;

    const mkList = (counts, proj) => Object.keys(counts).map((fp) => ({
      name: fp.split("/").pop() || fp, fullPath: fp, project: proj[fp] || "", count: counts[fp],
    })).sort((a, b) => b.count - a.count);

    const topFiles = mkList(fileCount, fileProj).slice(0, 15);
    const editedFiles = mkList(editCount, editProj).slice(0, 15);
    const dirs = Object.keys(dirCount).map((d) => ({ dir: d, count: dirCount[d] }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    const langTotal = Object.values(lang).reduce((a, b) => a + b, 0);
    const langs = Object.keys(lang).map((ext) => ({ ext, count: lang[ext], pct: langTotal > 0 ? Math.round((lang[ext] / langTotal) * 100) : 0 }))
      .sort((a, b) => b.count - a.count).slice(0, 12);

    // heatmap max
    let heatMax = 1;
    for (let h = 0; h < 24; h++) for (let w = 0; w < 7; w++) if (hourDow[h][w] > heatMax) heatMax = hourDow[h][w];

    // peak day-of-week
    const dow = [0, 0, 0, 0, 0, 0, 0];
    for (let h = 0; h < 24; h++) for (let w = 0; w < 7; w++) dow[w] += hourDow[h][w];
    const peakDayIdx = dow.indexOf(Math.max.apply(null, dow));
    const peakDay = dow[peakDayIdx] > 0 ? DAY_NAMES[peakDayIdx] : "—";

    // durations
    durations.sort((a, b) => a - b);
    const durAvg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const durMax = durations.length ? durations[durations.length - 1] : 0;
    const durMed = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
    const buckets = [0, 0, 0, 0, 0]; // <5, 5-15, 15-30, 30-60, 60+
    for (const m of durations) {
      if (m < 5) buckets[0]++; else if (m < 15) buckets[1]++; else if (m < 30) buckets[2]++;
      else if (m < 60) buckets[3]++; else buckets[4]++;
    }

    // streak + active days (computed over full data so they stay meaningful)
    const fullDaily = {};
    for (const s of D.sessions) if (s.t) { const day = isoDay(new Date(s.t)); fullDaily[day] = (fullDaily[day] || 0) + s.a.length; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let i = 0; i < 365; i++) { const d = new Date(today); d.setDate(today.getDate() - i); if ((fullDaily[isoDay(d)] || 0) > 0) streak++; else break; }

    // trend within range window vs prior equal window
    let activeDays = 0; const seen = {};
    for (const k in daily) if (daily[k] > 0) activeDays++;
    const windowDays = range === "all" ? null : range;
    let trendPct = null;
    if (windowDays) {
      let cur = 0, prev = 0;
      for (let i = 0; i < windowDays * 2; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const c = fullDaily[isoDay(d)] || 0;
        if (i < windowDays) cur += c; else prev += c;
      }
      if (prev > 0) trendPct = Math.round(((cur - prev) / prev) * 100);
    }

    return {
      sessionCount: sessions.length, projectCount: projects.length,
      fileAccesses, totalTools, tc, fam, persona,
      projects, topFiles, editedFiles, dirs, langs,
      daily, hourDow, heatMax, peakDay,
      durAvg, durMax, durMed, buckets, durCount: durations.length,
      streak, activeDays, trendPct,
      models, totalTokens, cacheRate, dailyTokens,
      sumIn, sumOut, sumCC, sumCR,
    };
  }

  // ── timeline svg ──
  function timeline(daily, unit) {
    unit = unit || "accesses";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let span;
    if (range === "all") {
      let earliest = today.getTime();
      for (const s of D.sessions) if (s.t && s.t < earliest) earliest = s.t;
      span = Math.min(180, Math.max(30, Math.ceil((today.getTime() - earliest) / 86400000) + 1));
    } else span = range;

    const days = [];
    for (let i = span - 1; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); days.push({ date: isoDay(d), count: daily[isoDay(d)] || 0 }); }
    let max = 1; for (const d of days) if (d.count > max) max = d.count;

    const svgH = 120, gap = 2;
    const barW = Math.max(3, Math.min(14, Math.floor((1320 - (days.length - 1) * gap) / days.length)));
    const totalW = days.length * (barW + gap) - gap;

    let bars = "";
    days.forEach((day, i) => {
      const h = day.count === 0 ? 3 : Math.max(6, Math.round((day.count / max) * (svgH - 6)));
      const x = i * (barW + gap), y = svgH - h;
      const fill = day.count === 0 ? "#e2e8f0" : "url(#bg)";
      const disp = unit === "tokens" ? fmtTok(day.count) : String(day.count);
      bars += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" fill="' + fill + '" rx="2"><title>' + esc(day.date + ": " + disp + " " + unit) + '</title></rect>';
    });

    let labels = "", prevMonth = "";
    days.forEach((day, i) => {
      const d = new Date(day.date + "T12:00:00");
      const month = d.toLocaleDateString("en-US", { month: "short" });
      if (d.getDate() <= 7 && month !== prevMonth) {
        labels += '<text x="' + (i * (barW + gap)) + '" y="' + (svgH + 16) + '" font-size="12" fill="#94a3b8" font-family="Arial,sans-serif">' + esc(month) + "</text>";
        prevMonth = month;
      }
    });

    return '<svg viewBox="0 0 ' + totalW + " " + (svgH + 24) + '" width="100%" height="' + (svgH + 24) + '" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient></defs>' + bars + labels + "</svg>";
  }

  // ── renderers ──
  function bar(pct, color, h) {
    return '<div class="bar-bg"' + (h ? ' style="height:' + h + 'px;"' : "") + '><div class="bar-fill" style="width:' + pct + '%;background:' + color + ';"></div></div>';
  }

  function renderHeader(a) {
    document.getElementById("pills").innerHTML =
      '<div class="pill"><strong>' + a.projectCount + "</strong>&nbsp;repos</div>" +
      '<div class="pill"><strong>' + a.sessionCount + "</strong>&nbsp;sessions</div>" +
      '<div class="pill"><strong>' + fmt(a.totalTools) + "</strong>&nbsp;tool calls</div>" +
      (a.totalTokens > 0 ? '<div class="pill"><strong>' + fmtTok(a.totalTokens) + "</strong>&nbsp;tokens</div>" : "");
  }

  const PERSONA_EMOJI = { "Deep Reader": "📖", "Heavy Builder": "⚡", "Code Navigator": "🔍", "Shell Runner": "💻", "Iterative Coder": "🔄", "Balanced Coder": "⚖️" };
  function personaDesc(p, f) {
    const m = {
      "Deep Reader": f.readPct + "% reads — methodical, understands before acting",
      "Heavy Builder": f.editPct + "% edits — high output, builds fast",
      "Code Navigator": f.grepPct + "% searches — explores codebases deeply",
      "Shell Runner": f.execPct + "% bash — automation-heavy workflows",
      "Iterative Coder": f.readPct + "% read / " + f.editPct + "% edit — refines and improves",
      "Balanced Coder": "Spread across read (" + f.readPct + "%), edit (" + f.editPct + "%), search (" + f.grepPct + "%)",
    };
    return m[p] || "Broad usage of Claude tool capabilities";
  }

  function trendHtml(t) {
    if (t === null) return "";
    const col = t >= 0 ? "#16a34a" : "#dc2626";
    return '<span style="color:' + col + ';font-weight:700;">' + (t >= 0 ? "+" : "") + t + "%</span> vs prev period";
  }

  function stackedTools(f) {
    const seg = (n, c, lbl, p) => n > 0 ? '<div style="flex:' + n + ";background:" + c + ';" title="' + lbl + ": " + p + '%"></div>' : "";
    const parts = [
      seg(f.read, "#2563eb", "Read", f.readPct), seg(f.edit, "#7c3aed", "Edit/Write", f.editPct),
      seg(f.grep, "#059669", "Search", f.grepPct), seg(f.exec, "#d97706", "Exec", f.execPct),
      seg(f.agent, "#dc2626", "Agent", f.agentPct), seg(f.other, "#d1d5db", "Other", f.otherPct),
    ].filter(Boolean);
    return parts.join('<div style="width:2px;background:#fff;flex-shrink:0;"></div>');
  }

  function toolLegend(f) {
    const leg = (p, c, lbl) => p > 0 ? '<span class="tleg"><span class="ldot" style="background:' + c + ';"></span>' + lbl + " " + p + "%</span>" : "";
    return [leg(f.readPct, "#2563eb", "Read"), leg(f.editPct, "#7c3aed", "Edit/Write"), leg(f.grepPct, "#059669", "Search"),
      leg(f.execPct, "#d97706", "Exec"), leg(f.agentPct, "#dc2626", "Agent"), leg(f.otherPct, "#9ca3af", "Other")].join("");
  }

  function renderOverview(a) {
    const f = a.fam;
    const top = a.projects[0];
    const topTool = Object.keys(a.tc).sort((x, y) => a.tc[y] - a.tc[x])[0] || "—";
    const topToolPct = a.totalTools > 0 && a.tc[topTool] ? Math.round((a.tc[topTool] / a.totalTools) * 100) : 0;

    const cards =
      '<div class="stat-grid mb-lg">' +
        '<div class="stat-card" style="--accent:#7c3aed;"><div class="stat-lbl">Most active repo</div><div class="stat-val stat-val-md">' + esc(top ? top.name : "—") + '</div><div class="stat-sub">' + fmt(top ? top.accesses : 0) + " accesses</div></div>" +
        '<div class="stat-card" style="--accent:#2563eb;"><div class="stat-lbl">Active days</div><div class="stat-val">' + a.activeDays + '</div><div class="stat-sub">' + (trendHtml(a.trendPct) || "in selected range") + "</div></div>" +
        '<div class="stat-card" style="--accent:#059669;"><div class="stat-lbl">Top tool</div><div class="stat-val stat-val-md">' + esc(topTool) + '</div><div class="stat-sub">' + topToolPct + "% of all calls</div></div>" +
        '<div class="stat-card" style="--accent:#d97706;"><div class="stat-lbl">Current streak</div><div class="stat-val">' + a.streak + ' <span class="stat-sub">days</span></div><div class="stat-sub">peak day: ' + esc(a.peakDay) + "</div></div>" +
      "</div>";

    const tl =
      '<div class="card mb-lg"><div class="tl-header"><span class="card-title" style="margin-bottom:0;">Activity Timeline</span>' +
      '<div class="tl-meta"><span>' + (range === "all" ? "All time" : "Last " + range + " days") + "</span>" +
      (a.trendPct !== null ? "<span>" + trendHtml(a.trendPct) + "</span>" : "") +
      "<span>Peak day: <strong>" + esc(a.peakDay) + '</strong></span></div></div><div class="tl-wrap">' + timeline(a.daily) + "</div></div>";

    const ratios = [["Read", "#2563eb", f.readPct], ["Edit", "#7c3aed", f.editPct], ["Search", "#059669", f.grepPct], ["Exec", "#d97706", f.execPct]]
      .map((r) => '<div class="ratio-row"><span class="ratio-lbl" style="color:' + r[1] + ';">' + r[0] + '</span><div class="ratio-bg"><div class="bar-fill" style="width:' + r[2] + "%;background:" + r[1] + ';"></div></div><span class="ratio-pct">' + r[2] + "%</span></div>").join("");

    const persona =
      '<div class="card"><div class="card-title">Coding Persona</div>' +
      '<div class="persona-box"><div style="font-size:36px;line-height:1;">' + (PERSONA_EMOJI[a.persona] || "🤖") + '</div><div><div class="persona-name">' + esc(a.persona) + '</div><div class="persona-desc">' + esc(personaDesc(a.persona, f)) + "</div></div></div>" + ratios + "</div>";

    const tools =
      '<div class="card"><div class="card-title">Tool Breakdown</div>' +
      '<div style="display:flex;height:26px;border-radius:6px;overflow:hidden;margin-bottom:12px;border:1px solid #e2e8f0;">' + stackedTools(f) + "</div>" +
      '<div style="line-height:2;">' + toolLegend(f) + "</div></div>";

    document.getElementById("tab-overview").innerHTML = cards + tl + '<div class="two-col mb-lg">' + tools + persona + "</div>";
  }

  function renderProjects(a) {
    if (!a.projects.length) { document.getElementById("tab-projects").innerHTML = '<div class="empty">No project activity in this range.</div>'; return; }
    const maxAccess = a.projects[0].accesses || 1;

    const rows = a.projects.map((p, i) => {
      const pct = Math.max(1, Math.round((p.accesses / maxAccess) * 100));
      const color = PALETTE[i % PALETTE.length];
      const avg = p.sessions > 0 ? (p.accesses / p.sessions).toFixed(1) : "—";
      return '<div class="proj-row"><span class="t-dim tar">' + String(i + 1).padStart(2, "0") + '</span>' +
        '<span class="t-name ellipsis" title="' + esc(p.path) + '">' + esc(p.name) + "</span>" + bar(pct, color) +
        '<span class="t-meta tar">' + fmt(p.accesses) + " accesses &middot; " + p.sessions + "s &middot; " + avg + "/s</span></div>";
    }).join("");

    const cards = a.projects.map((p, i) => {
      const color = PALETTE[i % PALETTE.length];
      const maxFile = p.topFiles[0] ? p.topFiles[0].count : 1;
      const avg = p.sessions > 0 ? (p.accesses / p.sessions).toFixed(1) : "—";
      const files = p.topFiles.map((f) => {
        const fpct = Math.max(2, Math.round((f.count / maxFile) * 100));
        return '<div style="margin-bottom:10px;"><div class="row" style="margin-bottom:4px;"><span class="t-name ellipsis" style="flex:1;max-width:220px;" title="' + esc(f.fullPath) + '">' + esc(f.name) + '</span><span class="t-num">' + f.count + "</span></div>" + bar(fpct, color + ";opacity:0.7", 4) + "</div>";
      }).join("") || '<span class="t-dim">No file data</span>';
      return '<div class="repo-card" style="border-top-color:' + color + ';"><div class="t-heading">' + esc(p.name) + '</div><div class="t-path">' + esc(p.path) + '</div>' +
        '<div class="repo-stats"><div class="repo-stat"><div class="repo-stat-num">' + p.sessions + '</div><div class="t-lbl">sessions</div></div><div class="repo-stat"><div class="repo-stat-num">' + fmt(p.accesses) + '</div><div class="t-lbl">accesses</div></div><div class="repo-stat"><div class="repo-stat-num">' + avg + '</div><div class="t-lbl">avg/session</div></div></div>' +
        '<div class="t-lbl" style="margin-bottom:10px;">Top Files</div>' + files + "</div>";
    }).join("");

    document.getElementById("tab-projects").innerHTML =
      '<div class="mb-lg"><div class="sec-lbl">Project Activity</div>' + rows + "</div>" +
      '<div><div class="sec-lbl">Repository Breakdown</div><div class="repo-grid">' + cards + "</div></div>";
  }

  function fileRows(list) {
    if (!list.length) return '<div class="empty">No data in this range.</div>';
    const max = list[0].count || 1;
    return list.slice(0, 12).map((f, i) => {
      const pct = Math.max(1, Math.round((f.count / max) * 100));
      const ext = extOf(f.name); const ec = extColor(ext);
      return '<div class="row row-pad row-sep"><span class="t-dim tar" style="min-width:22px;">' + (i + 1) + '</span>' +
        '<span class="ext-badge" style="background:' + ec[0] + ";color:" + ec[1] + ';">' + esc(ext.slice(0, 4) || "?") + "</span>" +
        '<span class="t-name ellipsis" style="flex:1;" title="' + esc(f.fullPath) + '">' + esc(f.name) + "</span>" +
        '<span class="t-dim" style="min-width:90px;">' + esc(f.project) + "</span>" +
        '<div class="bar-bg" style="width:70px;flex:none;"><div class="bar-fill" style="width:' + pct + '%;background:#7c3aed;opacity:0.6;"></div></div>' +
        '<span class="t-num tar" style="min-width:36px;">' + f.count + "</span></div>";
    }).join("");
  }

  function renderFiles(a) {
    const dirsHtml = a.dirs.length ? a.dirs.map((d) => {
      const maxDir = a.dirs[0].count || 1;
      const pct = Math.max(1, Math.round((d.count / maxDir) * 100));
      const parts = d.dir.split("/").filter(Boolean);
      const label = parts.length > 2 ? ".../" + parts.slice(-2).join("/") : d.dir;
      return '<div style="margin-bottom:16px;"><div class="row" style="margin-bottom:5px;"><span class="t-name ellipsis" title="' + esc(d.dir) + '">' + esc(label) + '</span><span class="t-num">' + d.count + "</span></div>" + bar(pct, "linear-gradient(90deg,#2563eb,#7c3aed)") + "</div>";
    }).join("") : '<div class="empty">No data in this range.</div>';

    const langsHtml = a.langs.length ? a.langs.map((l) => {
      const ec = extColor(l.ext);
      return '<div class="row" style="margin-bottom:12px;"><span class="ext-badge" style="background:' + ec[0] + ";color:" + ec[1] + ";min-width:46px;text-align:center;\">" + esc(l.ext) + "</span>" + bar(l.pct, ec[1]) + '<span class="t-num tar" style="min-width:80px;">' + fmt(l.count) + " &middot; " + l.pct + "%</span></div>";
    }).join("") : '<div class="empty">No data in this range.</div>';

    document.getElementById("tab-files").innerHTML =
      '<div class="two-col mb-lg"><div class="card"><div class="card-title">Most Accessed Files</div>' + fileRows(a.topFiles) + "</div>" +
      '<div class="card"><div class="card-title">Most Edited Files</div>' + fileRows(a.editedFiles) + "</div></div>" +
      '<div class="two-col"><div class="card"><div class="card-title">Directory Hotspots</div>' + dirsHtml + "</div>" +
      '<div class="card"><div class="card-title">Language Breakdown</div>' + langsHtml + "</div></div>";
  }

  function heatColor(c, max) {
    if (c === 0) return "#f1f5f9";
    const a = 0.15 + 0.85 * (c / max);
    return "rgba(124,58,237," + a.toFixed(3) + ")";
  }

  function renderSessions(a) {
    // heatmap: 7 rows (days) x 24 cols (hours)
    const hourTicks = [];
    for (let h = 0; h < 24; h++) hourTicks.push(h % 6 === 0 ? '<div class="heat-axis col">' + h + "</div>" : '<div class="heat-axis col"></div>');
    let grid = '<div style="display:grid;grid-template-columns:46px repeat(24,1fr);gap:3px;">' +
      '<div class="heat-axis"></div>' + hourTicks.join("");
    for (let w = 0; w < 7; w++) {
      grid += '<div class="heat-axis">' + DAY_NAMES[w] + "</div>";
      for (let h = 0; h < 24; h++) {
        const c = a.hourDow[h][w];
        grid += '<div class="heat-cell" style="background:' + heatColor(c, a.heatMax) + ';" title="' + DAY_NAMES[w] + " " + h + ":00 — " + c + ' accesses"></div>';
      }
    }
    grid += "</div>";
    grid += '<div class="heat-legend">Less<span class="box" style="background:#f1f5f9;"></span><span class="box" style="background:rgba(124,58,237,0.35);"></span><span class="box" style="background:rgba(124,58,237,0.65);"></span><span class="box" style="background:rgba(124,58,237,1);"></span>More</div>';

    const fmtDur = (m) => m >= 60 ? (m / 60).toFixed(1) + "h" : Math.round(m) + "m";
    const stats =
      '<div class="stat-grid mb-lg">' +
        '<div class="stat-card" style="--accent:#7c3aed;"><div class="stat-lbl">Sessions</div><div class="stat-val">' + a.sessionCount + "</div><div class=\"stat-sub\">in selected range</div></div>" +
        '<div class="stat-card" style="--accent:#2563eb;"><div class="stat-lbl">Avg duration</div><div class="stat-val stat-val-md">' + (a.durCount ? fmtDur(a.durAvg) : "—") + "</div><div class=\"stat-sub\">median " + (a.durCount ? fmtDur(a.durMed) : "—") + "</div></div>" +
        '<div class="stat-card" style="--accent:#059669;"><div class="stat-lbl">Longest session</div><div class="stat-val stat-val-md">' + (a.durCount ? fmtDur(a.durMax) : "—") + "</div><div class=\"stat-sub\">single session</div></div>" +
        '<div class="stat-card" style="--accent:#d97706;"><div class="stat-lbl">Avg depth</div><div class="stat-val">' + (a.sessionCount ? (a.fileAccesses / a.sessionCount).toFixed(1) : "—") + "</div><div class=\"stat-sub\">accesses / session</div></div>" +
      "</div>";

    const labels = ["<5m", "5–15m", "15–30m", "30–60m", "1h+"];
    const maxB = Math.max.apply(null, a.buckets.concat([1]));
    const hist = '<div class="hist">' + a.buckets.map((b, i) =>
      '<div class="hist-col"><div class="hist-val">' + b + '</div><div class="hist-bar" style="height:' + Math.round((b / maxB) * 130) + 'px;"></div><div class="hist-lbl">' + labels[i] + "</div></div>"
    ).join("") + "</div>";

    document.getElementById("tab-sessions").innerHTML =
      stats +
      '<div class="card mb-lg"><div class="card-title">When You Use Claude</div><div class="t-meta" style="margin-bottom:18px;">file accesses by hour and day of week (local time)</div>' + grid + "</div>" +
      '<div class="card"><div class="card-title">Session Length Distribution</div>' + (a.durCount ? hist : '<div class="empty">No timestamped sessions in this range.</div>') + "</div>";
  }

  function renderTools(a) {
    const sorted = Object.keys(a.tc).map((k) => [k, a.tc[k]]).sort((x, y) => y[1] - x[1]).slice(0, 12);
    const maxTool = sorted[0] ? sorted[0][1] : 1;
    const rows = sorted.length ? sorted.map((e) => {
      const tool = e[0], count = e[1];
      const pct = Math.max(1, Math.round((count / maxTool) * 100));
      const color = TOOL_COLOR[tool.toLowerCase()] || "#6b7280";
      const tp = a.totalTools > 0 ? Math.round((count / a.totalTools) * 100) : 0;
      return '<div class="row row-pad row-sep"><span class="ldot" style="background:' + color + ';"></span>' +
        '<span class="t-name" style="min-width:90px;">' + esc(tool) + "</span>" + bar(pct, color) +
        '<span class="t-meta tar" style="min-width:100px;">' + fmt(count) + " &middot; " + tp + "%</span></div>";
    }).join("") : '<div class="empty">No tool calls in this range.</div>';

    document.getElementById("tab-tools").innerHTML =
      '<div class="two-col"><div class="card"><div class="card-title">Tool Distribution</div>' +
      '<div style="display:flex;height:26px;border-radius:6px;overflow:hidden;margin-bottom:12px;border:1px solid #e2e8f0;">' + stackedTools(a.fam) + "</div>" +
      '<div style="line-height:2;">' + toolLegend(a.fam) + "</div></div>" +
      '<div class="card"><div class="card-title">Tool Rankings</div>' + rows + "</div></div>";
  }

  function renderTokens(a) {
    if (!a.models.length) {
      document.getElementById("tab-tokens").innerHTML = '<div class="empty">No token usage data in this range.</div>';
      return;
    }

    const tokPerSession = a.sessionCount > 0 ? a.totalTokens / a.sessionCount : 0;
    const stats =
      '<div class="stat-grid mb-lg">' +
        '<div class="stat-card" style="--accent:#7c3aed;"><div class="stat-lbl">Total tokens</div><div class="stat-val stat-val-md">' + fmtTok(a.totalTokens) + '</div><div class="stat-sub">' + fmtTok(tokPerSession) + " / session</div></div>" +
        '<div class="stat-card" style="--accent:#2563eb;"><div class="stat-lbl">Output tokens</div><div class="stat-val stat-val-md">' + fmtTok(a.sumOut) + '</div><div class="stat-sub">' + fmtTok(a.sumIn) + " fresh input</div></div>" +
        '<div class="stat-card" style="--accent:#059669;"><div class="stat-lbl">Cache hit rate</div><div class="stat-val">' + a.cacheRate + '%</div><div class="stat-sub">' + fmtTok(a.sumCR) + " cached reads</div></div>" +
        '<div class="stat-card" style="--accent:#d97706;"><div class="stat-lbl">Models used</div><div class="stat-val">' + a.models.length + '</div><div class="stat-sub">' + esc(a.models[0].name) + " leads</div></div>" +
      "</div>";

    // model breakdown rows (by tokens)
    const maxModelTok = a.models[0].tokens || 1;
    const modelRows = a.models.map((m) => {
      const pct = Math.max(1, Math.round((m.tokens / maxModelTok) * 100));
      const share = a.totalTokens > 0 ? Math.round((m.tokens / a.totalTokens) * 100) : 0;
      return '<div class="row row-pad row-sep"><span class="ldot" style="background:' + m.color + ';"></span>' +
        '<span class="t-name" style="min-width:110px;">' + esc(m.name) + "</span>" + bar(pct, m.color) +
        '<span class="t-meta tar" style="min-width:140px;">' + fmtTok(m.tokens) + " &middot; " + share + "%</span></div>";
    }).join("");

    // token composition: input / output / cacheWrite / cacheRead
    const comp = [["Fresh input", a.sumIn, "#2563eb"], ["Output", a.sumOut, "#7c3aed"], ["Cache write", a.sumCC, "#d97706"], ["Cache read", a.sumCR, "#059669"]];
    const compTotal = a.totalTokens || 1;
    const compBar = comp.filter((c) => c[1] > 0).map((c) =>
      '<div style="flex:' + c[1] + ";background:" + c[2] + ';" title="' + c[0] + ": " + fmtTok(c[1]) + '"></div>'
    ).join('<div style="width:2px;background:#fff;flex-shrink:0;"></div>');
    const compLegend = comp.map((c) =>
      '<span class="tleg"><span class="ldot" style="background:' + c[2] + ';"></span>' + c[0] + " " + Math.round((c[1] / compTotal) * 100) + "%</span>"
    ).join("");

    // tokens by project
    const projTok = a.projects.filter((p) => p.tok > 0).sort((x, y) => y.tok - x.tok).slice(0, 10);
    const maxProjTok = projTok.length ? projTok[0].tok : 1;
    const projRows = projTok.length ? projTok.map((p, i) => {
      const pct = Math.max(1, Math.round((p.tok / maxProjTok) * 100));
      const share = a.totalTokens > 0 ? Math.round((p.tok / a.totalTokens) * 100) : 0;
      return '<div class="row row-pad row-sep"><span class="t-dim tar" style="min-width:22px;">' + (i + 1) + '</span>' +
        '<span class="t-name ellipsis" style="flex:1;" title="' + esc(p.path) + '">' + esc(p.name) + "</span>" + bar(pct, PALETTE[i % PALETTE.length]) +
        '<span class="t-meta tar" style="min-width:130px;">' + fmtTok(p.tok) + " &middot; " + share + "%</span></div>";
    }).join("") : '<div class="empty">No data.</div>';

    const tl = '<div class="card mb-lg"><div class="tl-header"><span class="card-title" style="margin-bottom:0;">Token Usage Over Time</span>' +
      '<div class="tl-meta"><span>' + (range === "all" ? "All time" : "Last " + range + " days") + "</span></div></div>" +
      '<div class="tl-wrap">' + timeline(a.dailyTokens, "tokens") + "</div></div>";

    document.getElementById("tab-tokens").innerHTML =
      stats + tl +
      '<div class="two-col mb-lg">' +
        '<div class="card"><div class="card-title">Tokens by Model</div>' + modelRows +
          '<div class="t-dim" style="margin-top:16px;">Token counts read directly from session logs.</div></div>' +
        '<div class="card"><div class="card-title">Token Composition</div>' +
          '<div style="display:flex;height:26px;border-radius:6px;overflow:hidden;margin-bottom:12px;border:1px solid #e2e8f0;">' + compBar + "</div>" +
          '<div style="line-height:2;margin-bottom:20px;">' + compLegend + "</div>" +
          '<div class="t-meta">A high cache hit rate (' + a.cacheRate + '%) means most input is reused from cache rather than reprocessed.</div></div>' +
      "</div>" +
      '<div class="card"><div class="card-title">Tokens by Project</div>' + projRows + "</div>";
  }

  function renderAll() {
    const a = aggregate();
    renderHeader(a);
    renderOverview(a);
    renderProjects(a);
    renderFiles(a);
    renderSessions(a);
    renderTools(a);
    renderTokens(a);
  }

  // ── wiring ──
  function init() {
    document.getElementById("genDate").textContent = GEN.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    document.querySelectorAll(".range button").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".range button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        const r = b.getAttribute("data-range");
        range = r === "all" ? "all" : parseInt(r, 10);
        renderAll();
      });
    });

    document.querySelectorAll(".tab").forEach((t) => {
      t.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
        document.querySelectorAll(".panel").forEach((x) => x.classList.add("hidden"));
        t.classList.add("active");
        document.getElementById("tab-" + t.getAttribute("data-tab")).classList.remove("hidden");
      });
    });

    renderAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}

export const CLIENT_JS = "(" + clientApp.toString() + ")();";
