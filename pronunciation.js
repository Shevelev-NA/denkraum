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

  function syncHeaderOffset() {
    if (!headerEl || !mainWrapper) return;
    const h = Math.ceil(headerEl.getBoundingClientRect().height);
    mainWrapper.style.paddingTop = `${h}px`;
  }

  window.addEventListener("resize", syncHeaderOffset);
  syncHeaderOffset();

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
    translateRequestId++;
    translationBox.style.display = "none";
    translationText.textContent = "";
  }

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
        }
      });
      return;
    }

    ytPlayer.loadVideoById({ videoId, startSeconds: Math.floor(startSeconds) });
  }

  function openIndex(i) {
    if (i < 0 || i >= results.length) return;

    currentIndex = i;
    const item = results[i];
    const start = Math.max(0, Number(item.start || 0) - START_OFFSET);

    playerWrap.style.display = "block";
    clearTranslation();

    ensurePlayer(item.videoId, start);

    const rawText = pickText(item);
    currentSnippetEl.innerHTML = highlightHtml(rawText, currentQuery);

    updateProgress();
    updateActive();
  }

  prevBtn.onclick = () => openIndex(currentIndex - 1);
  nextBtn.onclick = () => openIndex(currentIndex + 1);

  speedSelect.onchange = () => {
    if (!ytPlayer) return;
    try { ytPlayer.setPlaybackRate(parseFloat(speedSelect.value || "1")); } catch {}
  };

  // =========================
  // FIXED TRANSLATION (NEW ENGINE)
  // =========================

  translateBtn.onclick = async () => {
    if (currentIndex < 0) return;

    const requestId = ++translateRequestId;

    const item = results[currentIndex];
    const target = langSelect.value || "ru";
    const rawText = pickText(item);

    if (!rawText.trim()) return;

    translationBox.style.display = "block";
    translationText.textContent = "Translating...";

    try {
      const res = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: rawText,
          source: "de",
          target: target,
          format: "text"
        })
      });

      if (requestId !== translateRequestId) return;

      const data = await res.json();

      if (data?.translatedText) {
        translationText.textContent = data.translatedText;
      } else {
        translationText.textContent = "Translation unavailable";
      }

    } catch (e) {
      translationText.textContent = "Translation error";
    }
  };

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

      card.innerHTML = `
        <img class="thumb" loading="lazy" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
        <div class="meta">${highlightHtml(rawText, currentQuery)}</div>
      `;

      card.onclick = () => openIndex(Number(card.dataset.index));
      resultsEl.appendChild(card);
    });

    results = results.concat(newResults);
    offset += newResults.length;

    updateProgress();
    updateActive();

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

    await loadMore();

    if (results.length > 0) openIndex(0);
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") search(input.value);
  });

});
