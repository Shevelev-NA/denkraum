// pronunciation.js

document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 10;
  const START_OFFSET = 4;

  let results = [];
  let currentIndex = -1;
  let currentQuery = "";
  let offset = 0;
  let ytPlayer = null;

  // anti-race for translation
  let translateRequestId = 0;

  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const playerWrap = document.getElementById("playerWrap");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const repeatBtn = document.getElementById("repeatBtn");
  const speedSelect = document.getElementById("speedSelect");
  const progressText = document.getElementById("progressText");
  const translateBtn = document.getElementById("translateBtn");
  const langSelect = document.getElementById("langSelect");
  const translationBox = document.getElementById("translationBox");
  const translationText = document.getElementById("translationText");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const recentEl = document.getElementById("recent");
  const currentSnippetEl = document.getElementById("currentSnippet");
  const rsTop = document.getElementById("rsTop");

  const HISTORY_KEY = "realSpeechHistory";
  const HISTORY_MAX = 10;

  // ===== fixed header: padding-top = header height
  function syncTopPadding() {
    if (!rsTop) return;
    const h = Math.ceil(rsTop.getBoundingClientRect().height);
    document.body.style.paddingTop = `${h}px`;
  }

  // ResizeObserver: обновляет padding при любых изменениях в шапке (плеер, перевод, история)
  if (rsTop) {
  const ro = new ResizeObserver(() => syncTopPadding());
  ro.observe(rsTop);
  }

  // =========================
  // Utils
  // =========================

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function highlightHtml(text, word) {
    const safe = escapeHtml(text ?? "");
    if (!word) return safe;
    const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
  }

  function buildContext(text, word) {
    const raw = String(text ?? "");
    if (!word) return raw;
    const lower = raw.toLowerCase();
    const w = String(word).toLowerCase();
    const idx = lower.indexOf(w);
    if (idx < 0) return raw;

    const PAD = 70;
    const start = Math.max(0, idx - PAD);
    const end = Math.min(raw.length, idx + w.length + PAD);

    let left = raw.slice(start, idx);
    const mid = raw.slice(idx, idx + w.length);
    let right = raw.slice(idx + w.length, end);

    if (start > 0) left = "… " + left;
    if (end < raw.length) right = right + " …";

    return left + mid + right;
  }

  function updateProgress() {
    const total = results.length;
    const pos = currentIndex >= 0 ? currentIndex + 1 : 0;
    progressText.textContent = `${pos} of ${total}`;
  }

  function updateActive() {
    resultsEl.querySelectorAll(".card").forEach((card) => {
      card.classList.toggle(
        "active",
        Number(card.dataset.index) === currentIndex
      );
    });
  }

  function clearTranslation() {
    translateRequestId++; // отменяет все прошлые запросы
    translationBox.style.display = "none";
    translationText.textContent = "";
  }

  // =========================
  // Player
  // =========================

  function ensurePlayer(videoId, startSeconds) {
    if (!window.YT || !YT.Player) {
      setTimeout(() => ensurePlayer(videoId, startSeconds), 250);
      return;
    }

    if (!ytPlayer) {
      ytPlayer = new YT.Player("player", {
        videoId,
        playerVars: {
          autoplay: 1,
          start: Math.floor(startSeconds),
          controls: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (e) => {
            try {
              e.target.setPlaybackRate(parseFloat(speedSelect.value || "1"));
            } catch {}
            try { e.target.playVideo(); } catch {}
          }
        }
      });
      return;
    }

    ytPlayer.loadVideoById({
      videoId,
      startSeconds: Math.floor(startSeconds)
    });

    setTimeout(() => {
      try {
        ytPlayer.setPlaybackRate(parseFloat(speedSelect.value || "1"));
      } catch {}
      try {
        ytPlayer.playVideo();
      } catch {}
    }, 150);
  }

  function openIndex(i) {
    if (i < 0 || i >= results.length) return;

    currentIndex = i;
    const item = results[i];
    const start = Math.max(0, Number(item.start || 0) - START_OFFSET);

    playerWrap.style.display = "block";
    clearTranslation();

    ensurePlayer(item.videoId, start);

    const contextText = buildContext(item.text, currentQuery);
    currentSnippetEl.innerHTML = highlightHtml(contextText, currentQuery);

    updateProgress();
    updateActive();
    syncTopPadding();
  }

  prevBtn.onclick = () => openIndex(currentIndex - 1);
  nextBtn.onclick = () => openIndex(currentIndex + 1);

  repeatBtn.onclick = () => {
    if (currentIndex < 0 || !ytPlayer) return;
    const item = results[currentIndex];
    const start = Math.max(0, Number(item.start || 0) - START_OFFSET);

    let n = 0;
    const doOnce = () => {
      if (!ytPlayer) return;
      try {
        ytPlayer.seekTo(start, true);
        ytPlayer.playVideo();
      } catch {}
      n++;
      if (n < 3) setTimeout(doOnce, 1500);
    };
    doOnce();
  };

  speedSelect.onchange = () => {
    if (!ytPlayer) return;
    try {
      ytPlayer.setPlaybackRate(parseFloat(speedSelect.value || "1"));
    } catch {}
  };

  // =========================
  // Translation
  // =========================

  translateBtn.onclick = async () => {
    if (currentIndex < 0) return;

    const requestId = ++translateRequestId;

    const item = results[currentIndex];
    const target = langSelect.value || "ru";
    const textForTranslate = buildContext(item.text, currentQuery);

    translationBox.style.display = "block";
    translationText.textContent = "…";

    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textForTranslate)}&langpair=de|${encodeURIComponent(target)}`
      );

      if (requestId !== translateRequestId) return;

      const data = await res.json();
      const out = data?.responseData?.translatedText || "(translation unavailable)";
      translationText.textContent = out;
    } catch {
      if (requestId === translateRequestId) {
        translationText.textContent = "translation error";
      }
    }

    syncTopPadding();
  };

  // =========================
  // Search
  // =========================

  async function loadMore() {
    if (!currentQuery) return;

    const res = await fetch(
      `${API}?query=${encodeURIComponent(currentQuery)}&count=${PAGE_SIZE}&offset=${offset}`
    );
    const data = await res.json();
    const newResults = data.results || [];

    const baseIndex = results.length;

    newResults.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "card";

      const absoluteIndex = baseIndex + idx;
      card.dataset.index = String(absoluteIndex);

      const ctx = buildContext(item.text, currentQuery);
      card.innerHTML = `
        <img class="thumb" loading="lazy" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
        <div class="meta">${highlightHtml(ctx, currentQuery)}</div>
      `;

      card.onclick = () => openIndex(Number(card.dataset.index));
      resultsEl.appendChild(card);
    });

    results = results.concat(newResults);
    offset += newResults.length;

    updateProgress();
    updateActive();
  }

  async function search(q) {
    const query = String(q || "").trim();
    if (!query) return;

    currentQuery = query;
    results = [];
    offset = 0;
    currentIndex = -1;

    resultsEl.innerHTML = "";
    playerWrap.style.display = "none";
    clearTranslation();
    updateProgress();
    updateActive();

    // останавливаем старое видео (если есть)
    try { ytPlayer?.stopVideo?.(); } catch {}

    addHistory(query);

    await loadMore();

    if (results.length > 0) openIndex(0);
    syncTopPadding();
  }

  loadMoreBtn.onclick = loadMore;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") search(input.value);
  });

  // =========================
  // History
  // =========================

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setHistory(arr) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
  }

  function addHistory(q) {
    let arr = getHistory();
    arr = arr.filter((x) => x !== q);
    arr.unshift(q);
    arr = arr.slice(0, HISTORY_MAX);
    setHistory(arr);
    renderHistory();
  }

  function renderHistory() {
    const arr = getHistory();
    recentEl.innerHTML = '<div id="clearHistory" class="clear-btn">clear</div>';

    const clearBtn = document.getElementById("clearHistory");
    clearBtn.onclick = () => {
      setHistory([]);
      renderHistory();
      syncTopPadding();
    };

    arr.forEach((w) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = w;
      chip.onclick = () => {
        input.value = w;
        search(w);
      };
      recentEl.appendChild(chip);
    });

    syncTopPadding();
  }

  // =========================
  // SHRINK (NO PLAYER RESIZE, NO JANK)
  // =========================

  let ticking = false;
  let compact = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const y = window.scrollY || 0;

      // гистерезис, чтобы не дрожало на границе
      if (!compact && y > 140) {
        compact = true;
        rsTop.classList.add("compact");
        syncTopPadding();
      } else if (compact && y < 60) {
        compact = false;
        rsTop.classList.remove("compact");
        syncTopPadding();
      }

      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", syncTopPadding);

  // init
  renderHistory();
  syncTopPadding();
  onScroll();
});
