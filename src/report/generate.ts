import { STYLES } from "./styles";
import { CLIENT_JS } from "./client";
import type { ReportPayload } from "./payload";

export type { ReportPayload, SessionPayload } from "./payload";

const FAVICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAEyklEQVR4AexUa2xURRT+zsy92yfa1BeCTUvpQ1tKKYmWGksAKWsQEzQxEHyAmPALEwzaiNEfBhoS/WECCUbQoAlEm0DE0FqDmvRBi9bGamjZbWtpu7UPwNZal7a7e+8dz2yLP8zeJSEmGtOz57szmcc5334zcwT+ZZsnMK/Af1uBJXmrn88tfLQmr7Dii7yi9XX5RRvq8pf/Hd66/OIbY+vr7ud+FCUb6h5Y6a0pKK54Nt5Dc1Xg7iXL7iFhHAdoIwQ9RiS9JIghohBCeqOQwitI8NjcnCSvMIXXMAyvlHKjMI2P7issS4eLuRIwQolpvIcY0B8CzTqI+QjcuzQLK9aVo2RtebSvyEHe5hwUb1+KshdysGH3cqSmJYBJC9OhBXAxVwI31ivuzEJxQ8h9eB12HD7KOIKnXn8NT7+xD5v3VmJRRRZGeq7g4sd96Ph0BK2f+FG+PR+KfxzC1W9KAJxXOToMoXTryyh97hWYaYsxMwOEwoTpKaD9fAtkZjqcgIPc3CyUla5ATkYuwqEIDIN5Y/rWCCidnPc7joP8R57BomUVsCOAxQj4Azhz6EOcPHAQ3539DGEhMTExCZBEf2AIA4MjmFEOLNtBPIurABMgDU9yOrJXboHixLABX2MbTlTuRtuZk9RZfw4Tw8MINP+MnG2luNTVA193L8LpM/h9yoZtOXTLBHijchylFmatBtkGwASmx6fRWn0cwp5ieQ1lGCYSPIkItQygt6sf2XvKkbunFEkPLcLEKLMlYg05kovHVUDfH2aABbdng0IcgY9yemgK18e7IVlyKQS3AqZhUkpSKiIXAujYX4P2/efQcex7DBcvxJ0liwEkMWK7K4Hw7Hqmr0jYJogvm/wDSAl5oDUlAmkTgiClgGGalJiQTMlJqRpIQQJNHvwGV9sGCWDmiG2uBDxz63k3pn4bgQgqyAkgzU5Bxl1FIJAiIpaXexBKMExhKCll9FhMM0ElIREC0WcAN3MlMLeBkwh1ZagZmGICQUAGBR5/cDeSPbcBDpgIopaRuhAfrK3E1swySE4reIYJ8hwx3F24T/EMgWMQxsYv4epwK4S+B3wR0xKz8ZL3KDYt34k1SzdhR8kuHFjzFu5YkIkXizZjW+YqfX04ADs/ZXDN4F5Mj0uAeAuXUj5jieYfqhCcDEBYPMiX2xRpWJX9JJ4o2onSjHUQRhIcIeH/dRSnL7fyIqVrGLfQYXQbEyLm6F+DpLhL0pCwnCBONe5Cd/+XEI7NNwAMjm3rEIQIV6evfE14teEQgirMChCDSfAzjiMAHxbiGOcnnYYImoTNb/FsexUO125B7bfv4PzFatR3nMKJliPY+/kevPvjMVwXYZAQULp8cwXl/Ihnmn7M+ZCIBLkK6n9B4K9eJDiw6fFg0h7DhcFanO54D9Ud7+PrwTqMWtcgDAMggsOJFWO25SjT4EeMmOZKYOyXn4bsSORNy450Wpblt22GY/lsx/Yp5fhYGB8R+TmqXynld2zbb1kRRthnWWFfJBL225bV6VihfaOj7dd4XUx3JaBXD/a1VAV6mpYN9DQWRNHdWDjQ3VDYz20UPN6v0d1Q0KfR1VBw2d9QqNEX7dcX9XY1va1juSEuAbdN/+T4PIF5Bf7/CtzsxfwJAAD//9ec3+wAAAAGSURBVAMA6Ar8UHtceCoAAAAASUVORK5CYII=";

function embed(payload: ReportPayload): string {
  // Escape `<` so a `</script>` inside any path can't break out of the tag.
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

export function generateReport(payload: ReportPayload): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>claudeactivity &mdash; activity report</title>
  <link rel="icon" type="image/png" sizes="32x32" href="${FAVICON}">
  <style>${STYLES}</style>
</head>
<body>

<header class="hdr">
  <div class="wrap hdr-inner">
    <div>
      <span class="hdr-logo">claudeactivity</span>
      <span class="hdr-tag">activity report</span>
    </div>
    <div class="hdr-pills" id="pills"></div>
    <div style="display:flex;align-items:center;gap:16px;">
      <div class="range">
        <button data-range="7">7d</button>
        <button data-range="30">30d</button>
        <button data-range="90" class="active">90d</button>
        <button data-range="all">All</button>
      </div>
      <div class="hdr-date" id="genDate"></div>
    </div>
  </div>
</header>

<div class="wrap">
  <nav class="tabs">
    <button class="tab active" data-tab="overview">Overview</button>
    <button class="tab" data-tab="projects">Projects</button>
    <button class="tab" data-tab="files">Files</button>
    <button class="tab" data-tab="sessions">Sessions</button>
    <button class="tab" data-tab="tools">Tools</button>
    <button class="tab" data-tab="tokens">Tokens</button>
  </nav>
</div>

<main class="main">
  <div class="wrap">
    <section id="tab-overview" class="panel"></section>
    <section id="tab-projects" class="panel hidden"></section>
    <section id="tab-files" class="panel hidden"></section>
    <section id="tab-sessions" class="panel hidden"></section>
    <section id="tab-tools" class="panel hidden"></section>
    <section id="tab-tokens" class="panel hidden"></section>
  </div>
</main>

<footer class="footer">
  <div class="wrap t-dim">claudeactivity &middot; activity visualizer for Claude Code</div>
</footer>

<script>
window.__DATA__ = ${embed(payload)};
window.__GEN__ = ${JSON.stringify(payload.generatedAt)};
${CLIENT_JS}
</script>
</body>
</html>`;
}
