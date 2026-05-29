export const STYLES = `
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

  .wrap { max-width: 1400px; margin: 0 auto; padding: 0 40px; }

  /* ── Typography ── */
  .t-name    { font-size: 15px; font-weight: 700; color: #0f172a; }
  .t-heading { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .t-num     { font-size: 15px; font-weight: 700; color: #0f172a; white-space: nowrap; }
  .t-meta    { font-size: 14px; font-weight: 400; color: #64748b; }
  .t-path    { font-size: 13px; font-weight: 400; color: #94a3b8; margin-bottom: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .t-dim     { font-size: 14px; font-weight: 400; color: #94a3b8; }
  .t-lbl     { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }

  .tar     { text-align: right; }
  .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hidden  { display: none !important; }

  /* ── Header ── */
  .hdr {
    background: #fff; border-bottom: 1px solid #e2e8f0;
    padding: 14px 0; position: sticky; top: 0; z-index: 20;
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

  /* ── Date range filter ── */
  .range { display: inline-flex; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 9999px; padding: 3px; gap: 2px; }
  .range button {
    border: none; background: transparent; cursor: pointer;
    font-family: inherit; font-size: 13px; font-weight: 700; color: #64748b;
    padding: 6px 16px; border-radius: 9999px; transition: all 0.12s;
  }
  .range button:hover { color: #0f172a; }
  .range button.active { background: #fff; color: #7c3aed; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }

  /* ── Tabs ── */
  .tabs {
    display: flex; gap: 4px; border-bottom: 1px solid #e2e8f0;
    margin-bottom: 32px; position: sticky; top: 65px; background: #f1f5f9; z-index: 15;
    padding-top: 24px;
  }
  .tab {
    border: none; background: transparent; cursor: pointer;
    font-family: inherit; font-size: 15px; font-weight: 700; color: #94a3b8;
    padding: 12px 20px; border-bottom: 2px solid transparent; margin-bottom: -1px;
    transition: color 0.12s;
  }
  .tab:hover { color: #475569; }
  .tab.active { color: #7c3aed; border-bottom-color: #7c3aed; }

  .main   { padding: 8px 0 80px; }
  .mb-lg  { margin-bottom: 32px; }
  .card   { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

  .sec-lbl    { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 14px; }
  .card-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }

  /* ── Stat cards ── */
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  @media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
  .stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; border-top: 4px solid var(--accent, #e2e8f0); }
  .stat-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 10px; }
  .stat-val { font-size: 40px; font-weight: 700; color: #0f172a; line-height: 1; margin-bottom: 8px; letter-spacing: -0.02em; }
  .stat-val-md { font-size: 22px; }
  .stat-sub { font-size: 14px; color: #64748b; }

  /* ── Timeline ── */
  .tl-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
  .tl-meta   { display: flex; gap: 20px; font-size: 14px; color: #64748b; }
  .tl-meta strong { font-weight: 700; color: #0f172a; }
  .tl-wrap   { background: #f8fafc; border-radius: 8px; padding: 20px 20px 8px; }

  /* ── Bars ── */
  .row     { display: flex; align-items: center; gap: 12px; }
  .row-pad { padding: 8px 0; }
  .row-sep { border-bottom: 1px solid #f1f5f9; }
  .bar-bg  { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .ldot    { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

  .tleg { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #475569; margin-right: 14px; margin-bottom: 4px; }

  /* ── Persona ── */
  .persona-box { display: flex; align-items: center; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
  .persona-name { font-size: 20px; font-weight: 700; color: #0f172a; }
  .persona-desc { font-size: 14px; color: #64748b; margin-top: 3px; }
  .ratio-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .ratio-lbl { font-size: 14px; font-weight: 700; min-width: 60px; }
  .ratio-bg  { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .ratio-pct { font-size: 14px; font-weight: 700; color: #0f172a; min-width: 40px; text-align: right; }

  /* ── Project rows ── */
  .proj-row { display: grid; grid-template-columns: 30px minmax(140px,220px) 1fr 260px; align-items: center; gap: 16px; padding: 12px 18px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px; }

  .ext-badge { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }

  /* ── Repo cards ── */
  .repo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
  .repo-card { background: #fff; border: 1px solid #e2e8f0; border-top: 4px solid #e2e8f0; border-radius: 12px; padding: 24px; }
  .repo-stats { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 18px; }
  .repo-stat  { flex: 1; padding: 12px 8px; text-align: center; border-right: 1px solid #e2e8f0; }
  .repo-stat:last-child { border-right: none; }
  .repo-stat-num { font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1; margin-bottom: 4px; }

  /* ── Heatmap ── */
  .heat { display: grid; grid-template-columns: 40px repeat(7, 1fr); gap: 4px; }
  .heat-cell { aspect-ratio: 1 / 1; border-radius: 4px; min-height: 16px; }
  .heat-axis { font-size: 11px; color: #94a3b8; display: flex; align-items: center; }
  .heat-axis.col { justify-content: center; font-weight: 700; }
  .heat-legend { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #94a3b8; margin-top: 14px; justify-content: flex-end; }
  .heat-legend .box { width: 14px; height: 14px; border-radius: 3px; }

  /* ── Histogram ── */
  .hist { display: flex; align-items: flex-end; gap: 10px; height: 160px; padding-top: 10px; }
  .hist-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 6px; }
  .hist-bar { width: 100%; background: linear-gradient(180deg,#7c3aed,#6d28d9); border-radius: 6px 6px 0 0; min-height: 3px; }
  .hist-lbl { font-size: 12px; color: #64748b; text-align: center; }
  .hist-val { font-size: 13px; font-weight: 700; color: #0f172a; }

  /* ── Empty state ── */
  .empty { color: #94a3b8; font-size: 14px; padding: 20px 0; }

  /* ── Footer ── */
  .footer { border-top: 1px solid #e2e8f0; padding: 20px 0; text-align: center; }
`;
