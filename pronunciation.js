document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const recentEl = document.getElementById("recent");
  const scrollBtn = document.getElementById("scrollTopBtn");

  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 30; // 20–40 по желанию
  const START_OFFSET = 4;
  const DEBOUNCE = 300;
  const MAX_HISTORY = 10;

  let currentQuery = "";
  let uniqueOffset = 0; // offset уже по уникальным videoId
  let loading = false;
  let total = 0;
  let debounceTimer = null;

  /* ---------------- PLAYER ---------------- */

  function stopPlayer() {
    player.src = "";
    playerWrap.style.display = "none";
  }

  function openVideo(id, sec) {
    const s = Math.max(0, sec - START_OFFSET);
    player.src = `https://www.youtube.com/embed/${id}?start=${s}&autoplay=1`;
    playerWrap.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- HELPERS ---------------- */

  function highlight(text, word) {
    if (!word) return text;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    return text.replace(re, "<mark>$1</mark>");
  }

  function formatTime(sec) {
    sec = Number(sec) || 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  /* ---------------- HISTORY ---------------- */

  function saveRecent(word) {
    let arr = JSON.parse(localStorage.getItem("recentWords") || "[]");
    arr = arr.filter((x) => x !== word);
    arr.unshift(word);
    arr = arr.slice(0, MAX_HISTORY);
    localStorage.setItem("recentWords", JSON.stringify(arr));
    renderRecent();
  }

  function renderRecent() {
    const arr = JSON.parse(localStorage.getItem("recentWords") || "[]");
    recentEl.innerHTML = '<div id="clearHistory" class="clear-btn">clear</div>';

    arr.forEach((w) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = w;
      chip.onclick = () => startSearch(w, true);
      recentEl.appendChild(chip);
    });

    document.getElementById("clearHistory").onclick = () => {
      localStorage.removeItem("recentWords");
      renderRecent();
    };
  }

  /* ---------------- CARD ---------------- */

  function card(item) {
    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <div class="thumbwrap">
        <img class="thumb" loading="lazy"
             src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
        <div class="time-badge">${formatTime(item.start)}</div>
      </div>
      <div class="meta">
        <div class="snippet">${highlight(item.text, currentQuery)}</div>
      </div>
    `;

    el.onclick = () => openVideo(item.videoId, item.start);
    return el;
  }

  /* ---------------- API ---------------- */

  async function fetchPage() {
    const res = await fetch(
      `${API}?query=${encodeURIComponent(
        currentQuery
      )}&count=${PAGE_SIZE}&offset=${uniqueOffset}`
    );
    return await res.json();
  }

  async function startSearch(q, save = false) {
    const qq = q.trim();
    if (!qq) return;

    stopPlayer();
    if (save) saveRecent(qq);

    currentQuery = qq;
    uniqueOffset = 0;
    total = 0;
    resultsEl.innerHTML = "";

    await loadNext();
  }

  async function loadNext() {
    if (loading) return;
    if (total !== 0 && uniqueOffset >= total) return;

    loading = true;

    const data = await fetchPage();
    const list = data.results || [];
    total = data.totalCount || 0;

    // offset по unique videoId
    uniqueOffset += list.length;

    list.forEach((item) => {
      resultsEl.appendChild(card(item));
    });

    statusEl.textContent = `Results: ${total}`;
    loading = false;
  }

  /* ---------------- INTERSECTION OBSERVER ---------------- */

  const sentinel = document.createElement("div");
  sentinel.style.height = "1px";
  resultsEl.after(sentinel);

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadNext();
      }
    },
    {
      root: null,
      rootMargin: "600px",
      threshold: 0,
    }
  );

  observer.observe(sentinel);

  /* ---------------- SCROLL TOP ---------------- */

  window.addEventListener("scroll", () => {
    scrollBtn.style.display = window.scrollY > 400 ? "block" : "none";
  });

  scrollBtn.onclick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------- INPUT ---------------- */

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (input.value.trim().length >= 2) {
        startSearch(input.value, false);
      }
    }, DEBOUNCE);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceTimer);
      startSearch(input.value, true);
    }
  });

  renderRecent();
});
