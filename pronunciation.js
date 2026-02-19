// pronunciation.js

document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3001/api/search";

  const PAGE_SIZE = 20;
  const MIN_FIRST_BATCH = 10;
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
  const headerEl = document.querySelector(".header");
  const mainWrapper = document.querySelector(".main-wrapper");

  const HISTORY_KEY = "realSpeechHistory";
  const HISTORY_MAX = 15;

  // =========================
  // Fixed header offset
  // =========================
  function syncHeaderOffset() {
    if (!headerEl || !mainWrapper) return;
    const h = Math.ceil(headerEl.getBoundingClientRect().height);
    mainWrapper.style.paddingTop = `${h}px`;
  }

  window.addEventListener("resize", syncHeaderOffset);
  syncHeaderOffset();

  // =========================
  // Utils
  // =========================
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function highlightHtml(text, word) {
    const safe = escapeHtml(text);
    if (!word) return safe;
    const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
  }

  function pickText(item) {
    return (
      item?.text ??
      item?.subtitle ??
      item?.caption ??
      item?.content ??
      ""
    );
  }

  function buildContext(text, word) {
    const raw = String(text ?? "");
    if (!raw) return "";
    if (!word) return raw;
    return raw;
  }

  function updateProgress() {
    const total = results.length;
    const pos = currentIndex >= 0 ? currentIndex + 1 : 0;
    progressText.textContent = `${pos} of ${total}`;
  }

  function updateActive() {
    resultsEl.querySelectorAll(".card").forEach((card) => {
      card.classList.toggle("active", Number(card.dataset.index) === currentIndex);
    });
  }

  function clearTranslation() {
    translateRequestId++; // отменяет все прошлые запросы
    translationBox.style.display = "none";
    translationText.textContent = "";
    syncHeaderOffset();
  }

  // =========================
  // Player
  // =========================
  function ensurePlayer(videoId, startSeconds) {
    if (!window.YT || !YT.Player) {
      setTimeout(() => ensurePlayer(videoId, startSeconds), 200);
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

    ytPlayer.loadVideoById({ videoId, startSeconds: Math.floor(startSeconds) });

    setTimeout(() => {
      try {
        ytPlayer.setPlaybackRate(parseFloat(speedSelect.value || "1"));
      } catch {}
      try { ytPlayer.playVideo(); } catch {}
    }, 120);
  }

  function openIndex(i) {
    if (i < 0 || i >= results.length) return;

    currentIndex = i;
    const item = results[i];
    const start = Math.max(0, Number(item.start || 0) - START_OFFSET);

    playerWrap.style.display = "block";
    syncHeaderOffset();       // FIX: пересчёт отступа, когда плеер появляется
    clearTranslation();       // внутри тоже пересчитывает

    ensurePlayer(item.videoId, start);

    const rawText = pickText(item);
    const ctx = buildContext(rawText, currentQuery);
    currentSnippetEl.innerHTML = highlightHtml(ctx, currentQuery);

    updateProgress();
    updateActive();

    syncHeaderOffset();       // FIX: на всякий случай после отрисовки текста
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
      try { ytPlayer.seekTo(start, true); ytPlayer.playVideo(); } catch {}
      n++;
      if (n < 3) setTimeout(doOnce, 1500);
    };

    doOnce();
  };

  speedSelect.onchange = () => {
    if (!ytPlayer) return;
    try { ytPlayer.setPlaybackRate(parseFloat(speedSelect.value || "1")); } catch {}
  };

  // =========================
  // Translation (anti-race)
  // =========================
  translateBtn.onclick = async () => {
    if (currentIndex < 0) return;

    const requestId = ++translateRequestId;

    const item = results[currentIndex];
    const target = langSelect.value || "ru";

    const rawText = pickText(item);
    const textForTranslate = buildContext(rawText, currentQuery);

    if (!textForTranslate.trim()) return;

    translationBox.style.display = "block";
    translationText.textContent = "…";
    syncHeaderOffset(); // FIX: переводный блок тоже меняет высоту header

    // 1) MyMemory + de= (чтобы меньше резало)
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textForTranslate)}&langpair=de|${encodeURIComponent(target)}&de=denkraum@app.com`
      );

      if (requestId !== translateRequestId) return;

      const data = await res.json();
      const out = data?.responseData?.translatedText;

      if (out) {
        translationText.textContent = out;
        syncHeaderOffset();
        return;
      }
      throw new Error("no translatedText");
    } catch {}

    // 2) Fallback: Google gtx
    try {
      const res2 = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(textForTranslate)}`
      );

      if (requestId !== translateRequestId) return;

      const data2 = await res2.json();
      const out2 = Array.isArray(data2?.[0]) ? data2[0].map(x => x?.[0]).join("") : "";
      translationText.textContent = out2 || "translation error";
    } catch {
      if (requestId === translateRequestId) {
        translationText.textContent = "translation error";
      }
    }

    syncHeaderOffset();
  };

  // =========================
  // Search
  // =========================
  async function loadMore() {
    if (!currentQuery) return 0;

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

      const rawText = pickText(item);
      const ctx = buildContext(rawText, currentQuery);

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

    loadMoreBtn.style.display = newResults.length === 0 ? "none" : "block";

    return newResults.length;
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

    try { ytPlayer?.stopVideo?.(); } catch {}

    addHistory(query);

    let got = await loadMore();

    while (results.length < MIN_FIRST_BATCH && got > 0) {
      got = await loadMore();
    }

    if (results.length > 0) openIndex(0);

    syncHeaderOffset();
  }

  loadMoreBtn.onclick = () => loadMore();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") search(input.value);
  });

  // =========================
  // History (safe for blocked storage)
  // =========================
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setHistory(arr) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch {
      // storage blocked -> just ignore
    }
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
    if (clearBtn) {
      clearBtn.onclick = () => {
        setHistory([]);
        renderHistory();
        syncHeaderOffset();
      };
    }

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

    syncHeaderOffset();
  }

  // =========================
  // Shrink (stable)
  // =========================
  let ticking = false;
  let compact = false;

  function onScroll() {
    if (!rsTop) return;
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const y = window.scrollY || 0;

      if (!compact && y > 160) {
        compact = true;
        rsTop.classList.add("compact");
        syncHeaderOffset();
      } else if (compact && y < 60) {
        compact = false;
        rsTop.classList.remove("compact");
        syncHeaderOffset();
      }

      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  // init
  renderHistory();
  syncHeaderOffset();
  onScroll();
});
