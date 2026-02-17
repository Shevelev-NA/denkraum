// Real Speech (Subtitle Search) — frontend
// API is your local backend exposed via Cloudflare Tunnel.
// You can override API base with URL param: ?api=https://xxxxx.trycloudflare.com

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerBox = document.getElementById("playerBox");
  const player = document.getElementById("player");

  if (!input || !btn || !resultsEl || !statusEl || !playerBox || !player) {
    console.error("Missing required elements in pronunciation.html");
    return;
  }

  const DEFAULT_API_BASE = "https://tech-enrollment-designs-supplier.trycloudflare.com";
  const apiOverride = new URLSearchParams(window.location.search).get("api");
  const API_BASE = (apiOverride || DEFAULT_API_BASE).replace(/\/$/, "");
  const API_URL = `${API_BASE}/api/search`;

  const START_OFFSET_SEC = 3;   // start video a few seconds earlier
  const CONTEXT_CHARS = 55;     // chars before/after highlight
  const COUNT = 20;

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildSnippet(text, query) {
    const t = String(text || "");
    const q = String(query || "").trim();
    if (!q) return escapeHtml(t);

    const lt = t.toLowerCase();
    const lq = q.toLowerCase();
    const pos = lt.indexOf(lq);

    if (pos === -1) return escapeHtml(t);

    const start = Math.max(0, pos - CONTEXT_CHARS);
    const end = Math.min(t.length, pos + q.length + CONTEXT_CHARS);

    let snippet = t.slice(start, end);

    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    snippet = escapeHtml(snippet).replace(re, (m) => `<mark>${m}</mark>`);

    if (start > 0) snippet = "… " + snippet;
    if (end < t.length) snippet = snippet + " …";

    return snippet;
  }

  function openEmbed(videoId, startSec) {
    const s = Math.max(0, Number(startSec) || 0);
    player.src = `https://www.youtube.com/embed/${videoId}?start=${s}&autoplay=1`;
    playerBox.style.display = "block";
    playerBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function youtubeLink(videoId, startSec) {
    const s = Math.max(0, Number(startSec) || 0);
    return `https://www.youtube.com/watch?v=${videoId}&t=${s}s`;
  }

  function renderResults(list, query) {
    resultsEl.innerHTML = "";
    playerBox.style.display = "none";
    player.src = "";

    if (!Array.isArray(list) || list.length === 0) {
      resultsEl.innerHTML = `<div class="rs-hint">No results.</div>`;
      return;
    }

    for (const item of list) {
      const videoId = item.videoId;
      const start = Math.max(0, (Number(item.start) || 0) - START_OFFSET_SEC);
      const snippet = buildSnippet(item.text, query);

      const row = document.createElement("div");
      row.className = "rs-item";

      row.innerHTML = `
        <img class="rs-thumb" src="https://img.youtube.com/vi/${escapeHtml(videoId)}/hqdefault.jpg" alt="">
        <div class="rs-meta">
          <p class="rs-title">${escapeHtml(item.title || videoId)}</p>
          <p class="rs-snippet">${snippet}</p>
          <div class="rs-actions">
            <a href="${youtubeLink(videoId, start)}" target="_blank" rel="noreferrer">Open on YouTube</a>
            <a href="#" data-play="1">Play here</a>
          </div>
        </div>
      `;

      row.querySelector('[data-play="1"]').addEventListener("click", (e) => {
        e.preventDefault();
        openEmbed(videoId, start);
      });

      resultsEl.appendChild(row);
    }
  }

  async function doSearch() {
    const q = input.value.trim();
    if (!q) return;

    statusEl.textContent = "Searching…";
    resultsEl.innerHTML = "";

    const url = `${API_URL}?query=${encodeURIComponent(q)}&count=${COUNT}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        statusEl.textContent = `API error: ${res.status}`;
        return;
      }

      const data = await res.json();
      statusEl.textContent = `Results: ${data.count || 0}`;
      renderResults(data.results || [], q);
    } catch (e) {
      statusEl.textContent = "Fetch failed (backend/tunnel not reachable).";
      console.error(e);
    }
  }

  btn.addEventListener("click", doSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  // optional: auto-focus
  input.focus();
});
