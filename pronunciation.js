document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const recentEl = document.getElementById("recent");
  const typeFilterEl = document.getElementById("typeFilter");

  const API_URL = "http://localhost:3001/api/search";

  const PAGE_SIZE = 40;          // ✅
  const START_OFFSET_SEC = 4;    // ✅ видео за 4 секунды

  let currentQuery = "";
  let offset = 0;
  let loading = false;
  let done = false;
  let loadedVideos = new Set();
  let debounceTimer = null;

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function stopPlayer() {
    player.src = "";
    playerWrap.style.display = "none";
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${safe})`, "gi");
    return escapeHtml(text).replace(re, "<mark>$1</mark>");
  }

  function saveRecent(q) {
    let arr = JSON.parse(localStorage.getItem("recentWords") || "[]");
    arr = arr.filter((x) => x !== q);
    arr.unshift(q);
    arr = arr.slice(0, 10);
    localStorage.setItem("recentWords", JSON.stringify(arr));
    renderRecent();
  }

  function renderRecent() {
    recentEl.innerHTML = "";
    const arr = JSON.parse(localStorage.getItem("recentWords") || "[]");
    arr.forEach((word) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = word;
      chip.onclick = () => startSearch(word, true);
      recentEl.appendChild(chip);
    });
  }

  function openEmbed(videoId, startSec) {
    const s = Math.max(0, startSec);
    player.src = `https://www.youtube.com/embed/${videoId}?start=${s}&autoplay=1&rel=0&modestbranding=1`;
    playerWrap.style.display = "block";
  }

  function cardElement(item) {
    if (loadedVideos.has(item.videoId)) return null;
    loadedVideos.add(item.videoId);

    const start = Math.max(0, item.start - START_OFFSET_SEC);

    const card = document.createElement("div");
    card.className = "card";

    const type = item.type || "unknown";
    const channel = item.channel || "Unknown";

    const snippetHtml = highlight(item.text || "", currentQuery);

    card.innerHTML = `
      <div class="thumb-wrap">
        <img loading="lazy" class="thumb" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg" alt="">
        <div class="thumb-overlay">
          <div class="badge-row">
            <span class="badge badge-type">${escapeHtml(type)}</span>
            <span class="badge badge-channel">${escapeHtml(channel)}</span>
          </div>
          <div class="time-pill">${formatTime(start)}</div>
        </div>
      </div>
      <div class="meta">
        <div class="snippet">${snippetHtml}</div
