// Real Speech — SaaS UI (glass + motion) + recent searches + infinite scroll
// API base can be overridden: ?api=https://xxxxx.trycloudflare.com

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const recentEl = document.getElementById("recent");
  const loadMoreEl = document.getElementById("loadMore");

  const themeToggle = document.getElementById("themeToggle");

  const DEFAULT_API_BASE = "https://tech-enrollment-designs-supplier.trycloudflare.com";
  const apiOverride = new URLSearchParams(window.location.search).get("api");
  const API_BASE = (apiOverride || DEFAULT_API_BASE).replace(/\/$/, "");
  const API_URL = `${API_BASE}/api/search`;

  // NOTE: for true pagination backend must support offset.
  // This frontend sends &offset=... ; if backend ignores it, infinite scroll will repeat.
  const PAGE_SIZE = 60;           // bigger page for grid
  const START_OFFSET_SEC = 3;     // start earlier
  const CONTEXT_CHARS = 80;       // more context around match
  const RECENT_MAX = 15;

  let currentQuery = "";
  let offset = 0;
  let loading = false;
  let done = false;

  // ---------- Theme ----------
  const THEME_KEY = "denkraum-theme";
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
  }
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  setTheme(savedTheme);

  themeToggle.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(cur === "dark" ? "light" : "dark");
  });

  // ---------- Utils ----------
  function formatTime(sec) {
    sec = Math.max(0, Number(sec) || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function decodeEntities(s) {
    return String(s || "")
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&#039;", "'");
  }

  function stripTags(s) {
    return String(s || "").replace(/<[^>]*>/g, "");
  }

  function buildSnippet(text, query) {
    const tRaw = decodeEntities(stripTags(text || ""));
    const q = String(query || "").trim();
    if (!q) return escapeHtml(tRaw);

    const lt = tRaw.toLowerCase();
    const lq = q.toLowerCase();
    const pos = lt.indexOf(lq);

    // fallback: show beginning
    if (pos === -1) return escapeHtml(tRaw.slice(0, 220));

    const start = Math.max(0, pos - CONTEXT_CHARS);
    const end = Math.min(tRaw.length, pos + q.length + CONTEXT_CHARS);
    let snippet = tRaw.slice(start, end);

    const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(safeQ, "ig");

    snippet = escapeHtml(snippet).replace(re, (m) => `<mark>${m}</mark>`);

    if (start > 0) snippet = "… " + snippet;
    if (end < tRaw.length) snippet = snippet + " …";
    return snippet;
  }

  function openEmbed(videoId, startSec) {
    const s = Math.max(0, Number(startSec) || 0);
    player.src = `https://www.youtube.com/embed/${videoId}?start=${s}&autoplay=1&rel=0&modestbranding=1`;
    playerWrap.style.display = "block";
    // smooth scroll to player (top of page because player is sticky)
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Recent searches ----------
  const RECENT_KEY = "denkraum-real-speech-recent";
  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
    catch { return []; }
  }
  function setRecent(arr) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, RECENT_MAX)));
  }
  function addRecent(q) {
    q = String(q || "").trim();
    if (!q) return;
    const cur = getRecent().filter(x => x.toLowerCase() !== q.toLowerCase());
    cur.unshift(q);
    setRecent(cur);
    renderRecent();
  }
  function renderRecent() {
    const arr = getRecent();
    recentEl.innerHTML = "";
    if (!arr.length) return;

    for (const q of arr) {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = q;
      chip.onclick = () => {
        input.value = q;
        startSearch(q);
      };
      recentEl.appendChild(chip);
    }
  }

  // ---------- UI helpers ----------
  function skeleton(count = 18) {
    resultsEl.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const d = document.createElement("div");
      d.className = "skeleton";
      resultsEl.appendChild(d);
    }
  }

  function appendSkeleton(count = 12) {
    for (let i = 0; i < count; i++) {
      const d = document.createElement("div");
      d.className = "skeleton";
      resultsEl.appendChild(d);
    }
  }

  function removeAllSkeletons() {
    resultsEl.querySelectorAll(".skeleton").forEach(n => n.remove());
  }

  function showStatus(msg) {
    statusEl.textContent = msg || "";
  }

  function cardElement(item, query) {
    const videoId = item.videoId;
    const start = Math.max(0, (Number(item.start) || 0) - START_OFFSET_SEC);

    const snippet = buildSnippet(item.text, query);
    const time = formatTime(start);

    // Optional fields if backend provides them:
    const channel = item.channel || "";
    // title could be real title; if not present, don't show noisy videoId as title
    // We'll show channel (if exists). If not, keep blank.
    const channelHtml = channel ? `<div class="channel" title="${escapeHtml(channel)}">${escapeHtml(channel)}</div>` : `<div class="channel"></div>`;

    const card = document.createElement("div");
    card.className = "card";

    // smaller thumbnails; lazy loading
    card.innerHTML = `
      <img class="thumb" loading="lazy"
           src="https://img.youtube.com/vi/${escapeHtml(videoId)}/mqdefault.jpg"
           alt="">
      <div class="meta">
        <div class="topline">
          <div class="time">${time}</div>
          ${channelHtml}
        </div>
        <p class="snippet">${snippet}</p>
      </div>
    `;

    card.onclick = () => openEmbed(videoId, start);
    return card;
  }

  function revealCards() {
    const cards = resultsEl.querySelectorAll(".card:not(.show)");
    cards.forEach((c, i) => setTimeout(() => c.classList.add("show"), i * 14));
  }

  // ---------- Data ----------
  async function fetchPage(q, pageOffset) {
    const url = `${API_URL}?query=${encodeURIComponent(q)}&count=${PAGE_SIZE}&offset=${pageOffset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return await res.json();
  }

  async function startSearch(q) {
    q = String(q || "").trim();
    if (!q) return;

    currentQuery = q;
    offset = 0;
    done = false;

    addRecent(q);
    showStatus("Searching…");
    skeleton();

    // hide player only when starting a totally new search
    playerWrap.style.display = "none";
    player.src = "";

    await loadNext(true);
  }

  async function loadNext(isFirst = false) {
    if (loading || done || !currentQuery) return;
    loading = true;

    if (!isFirst) {
      loadMoreEl.style.display = "flex";
      appendSkeleton(10);
    }

    try {
      const data = await fetchPage(currentQuery, offset);

      // if backend doesn't support offset, you will see repeats. Fix backend (patch below).
      const list = Array.isArray(data.results) ? data.results : [];
      const total = Number(data.totalCount || 0);
      const got = list.length;

      removeAllSkeletons();

      if (isFirst) resultsEl.innerHTML = "";

      for (const item of list) {
        resultsEl.appendChild(cardElement(item, currentQuery));
      }
      revealCards();

      offset += got;

      // done condition
      if (got === 0 || offset >= total || got < PAGE_SIZE) done = true;

      showStatus(`Results: ${total} • shown: ${offset}${done ? " • end" : ""}`);
    } catch (e) {
      removeAllSkeletons();
      showStatus("Fetch failed (backend/tunnel not reachable).");
      console.error(e);
    } finally {
      loadMoreEl.style.display = "none";
      loading = false;
    }
  }

  // infinite scroll trigger
  window.addEventListener("scroll", () => {
    const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 800;
    if (nearBottom) loadNext(false);
  });

  // ---------- Events ----------
  btn.addEventListener("click", () => startSearch(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") startSearch(input.value);
  });

  renderRecent();
  input.focus();
});
