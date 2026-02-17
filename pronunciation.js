document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const loadMoreEl = document.getElementById("loadMore");
  const themeToggle = document.getElementById("themeToggle");

  const API_BASE = "http://localhost:3001";
  const API_URL = `${API_BASE}/api/search`;

  const PAGE_SIZE = 60;
  const START_OFFSET_SEC = 3;

  let currentQuery = "";
  let offset = 0;
  let loading = false;
  let done = false;

  function formatTime(sec) {
    sec = Math.max(0, Number(sec) || 0);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function openEmbed(videoId, startSec) {
    const s = Math.max(0, Number(startSec) || 0);
    player.src =
      `https://www.youtube.com/embed/${videoId}?start=${s}&autoplay=1&rel=0&modestbranding=1`;
    playerWrap.style.display = "block";
    // scroll удалён — больше не кидает вверх
  }

  function cardElement(item) {
    const start = Math.max(0, item.start - START_OFFSET_SEC);

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img class="thumb"
           src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
      <div class="meta">
        <div class="topline">
          <div class="time">${formatTime(start)}</div>
        </div>
        <p class="snippet">${item.text}</p>
      </div>
    `;

    card.onclick = () => openEmbed(item.videoId, start);
    return card;
  }

  async function fetchPage(q, pageOffset) {
    const url =
      `${API_URL}?query=${encodeURIComponent(q)}&count=${PAGE_SIZE}&offset=${pageOffset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  }

  async function startSearch(q) {
    q = q.trim();
    if (!q) return;

    currentQuery = q;
    offset = 0;
    done = false;

    resultsEl.innerHTML = "";
    playerWrap.style.display = "none";
    player.src = "";

    await loadNext(true);
  }

  async function loadNext(first = false) {
    if (loading || done || !currentQuery) return;
    loading = true;
    loadMoreEl.style.display = "flex";

    try {
      const data = await fetchPage(currentQuery, offset);
      const list = data.results || [];

      for (const item of list) {
        resultsEl.appendChild(cardElement(item));
      }

      offset += list.length;

      if (list.length < PAGE_SIZE) done = true;

      statusEl.textContent =
        `Results: ${data.totalCount} • shown: ${offset}${done ? " • end" : ""}`;

    } catch {
      statusEl.textContent = "Backend error";
    } finally {
      loadMoreEl.style.display = "none";
      loading = false;
    }
  }

  window.addEventListener("scroll", () => {
    const nearBottom =
      window.innerHeight + window.scrollY >
      document.body.offsetHeight - 600;

    if (nearBottom) loadNext();
  });

  btn.addEventListener("click", () => startSearch(input.value));
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") startSearch(input.value);
  });

  themeToggle.addEventListener("click", () => {
    const t =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    document.documentElement.setAttribute("data-theme", t);
  });
});
