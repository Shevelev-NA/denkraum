document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");

  const playerWrap = document.getElementById("playerWrap");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const repeatBtn = document.getElementById("repeatBtn");
  const speedSelect = document.getElementById("speedSelect");
  const progressText = document.getElementById("progressText");

  const currentSnippet = document.getElementById("currentSnippet");

  const recentEl = document.getElementById("recent");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  const autoNextToggle = document.getElementById("autoNextToggle");
  const showContextToggle = document.getElementById("showContextToggle");

  const translateBtn = document.getElementById("translateBtn");
  const langSelect = document.getElementById("langSelect");
  const translationBox = document.getElementById("translationBox");
  const translationLabel = document.getElementById("translationLabel");
  const translationText = document.getElementById("translationText");

  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 10;
  const START_OFFSET = 4;

  // Окно проигрывания фрагмента (сек). Без реального end-time это лучший стабильный вариант.
  const FRAG_SECONDS = 6;

  const MAX_HISTORY = 10;

  let results = [];
  let currentIndex = -1;
  let currentQuery = "";
  let offset = 0;

  // YouTube API
  let ytReady = false;
  let ytPlayer = null;

  // loop / auto
  let playTimer = null;
  let repeatLeft = 0;

  function clearTimers() {
    if (playTimer) {
      clearTimeout(playTimer);
      playTimer = null;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function highlightHtml(text, word) {
    if (!word) return escapeHtml(text);
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    return escapeHtml(text).replace(re, "<mark>$1</mark>");
  }

  // Делает больше контекста вокруг найденного слова ВНУТРИ строки субтитра
  function buildContext(text, word) {
    const raw = String(text || "");
    if (!word) return raw;

    const lower = raw.toLowerCase();
    const w = word.toLowerCase();
    const idx = lower.indexOf(w);

    // если не нашли (например, морфология) — показываем как есть
    if (idx < 0) return raw;

    // контекст в символах
    const PAD = 60;

    const start = Math.max(0, idx - PAD);
    const end = Math.min(raw.length, idx + w.length + PAD);

    let left = raw.slice(start, idx);
    let mid = raw.slice(idx, idx + w.length);
    let right = raw.slice(idx + w.length, end);

    if (start > 0) left = "… " + left;
    if (end < raw.length) right = right + " …";

    return left + mid + right;
  }

  function setProgress() {
    const total = results.length;
    const pos = currentIndex >= 0 ? currentIndex + 1 : 0;
    progressText.textContent = `${pos} of ${total}`;
  }

  function updateActiveCard() {
    const cards = resultsEl.querySelectorAll(".card");
    cards.forEach((c, i) => c.classList.toggle("active", i === currentIndex));
  }

  function hideTranslation() {
    translationBox.style.display = "none";
    translationText.textContent = "";
    translationLabel.textContent = "";
  }

  function showTranslation(label, text) {
    translationLabel.textContent = label;
    translationText.textContent = text;
    translationBox.style.display = "block";
  }

  async function translateText(text, target) {
    // MyMemory: бесплатный, но может быть неидеален. Отображаем аккуратно.
    // Источник языка: DE (можешь поменять на auto, но это менее стабильно)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=de|${encodeURIComponent(target)}`;

    const res = await fetch(url);
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    return out || "(translation unavailable)";
  }

  function scheduleFragmentBehavior(startSeconds) {
    clearTimers();

    // Repeat 3× имеет приоритет: проигрываем FRAG_SECONDS, потом возвращаемся к startSeconds.
    playTimer = setTimeout(() => {
      if (!ytPlayer) return;

      if (repeatLeft > 0) {
        repeatLeft -= 1;
        ytPlayer.seekTo(startSeconds, true);
        ytPlayer.playVideo();
        scheduleFragmentBehavior(startSeconds);
        return;
      }

      // Автопереход — после окна
      if (autoNextToggle.checked) {
        openByIndex(currentIndex + 1);
      }
    }, FRAG_SECONDS * 1000);
  }

  function applySpeed() {
    if (!ytPlayer) return;
    const rate = parseFloat(speedSelect.value || "1");
    try {
      ytPlayer.setPlaybackRate(rate);
    } catch (_) {}
  }

  function ensurePlayer(videoId, startSeconds) {
    if (!ytReady) return;

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
          onReady: () => {
            applySpeed();
          },
          onStateChange: () => {
            // не используем ENDED, т.к. фрагменты не знают end-time
          }
        }
      });
      return;
    }

    ytPlayer.loadVideoById({
      videoId,
      startSeconds: Math.floor(startSeconds)
    });
    // дать плееру чуть времени и применить скорость
    setTimeout(applySpeed, 150);
  }

  function openByIndex(index) {
    if (index < 0 || index >= results.length) return;

    currentIndex = index;
    const item = results[currentIndex];

    const startSeconds = Math.max(0, Number(item.start || 0) - START_OFFSET);

    playerWrap.style.display = "block";
    hideTranslation();

    ensurePlayer(item.videoId, startSeconds);

    const baseText = showContextToggle.checked
      ? buildContext(item.text, currentQuery)
      : String(item.text || "");

    currentSnippet.innerHTML = highlightHtml(baseText, currentQuery);

    setProgress();
    updateActiveCard();

    // сбрасываем repeat, если просто кликнули
    repeatLeft = 0;
    scheduleFragmentBehavior(startSeconds);
  }

  prevBtn.onclick = () => openByIndex(currentIndex - 1);
  nextBtn.onclick = () => openByIndex(currentIndex + 1);

  repeatBtn.onclick = () => {
    if (currentIndex < 0) return;
    // повторим 3 раза окно (итого 3 рестарта)
    repeatLeft = 3;
    const item = results[currentIndex];
    const startSeconds = Math.max(0, Number(item.start || 0) - START_OFFSET);
    if (ytPlayer) {
      ytPlayer.seekTo(startSeconds, true);
      ytPlayer.playVideo();
      applySpeed();
    }
    scheduleFragmentBehavior(startSeconds);
  };

  speedSelect.onchange = applySpeed;

  showContextToggle.onchange = () => {
    if (currentIndex < 0) return;
    const item = results[currentIndex];
    const baseText = showContextToggle.checked
      ? buildContext(item.text, currentQuery)
      : String(item.text || "");
    currentSnippet.innerHTML = highlightHtml(baseText, currentQuery);
  };

  translateBtn.onclick = async () => {
    if (currentIndex < 0) return;
    const item = results[currentIndex];

    const baseText = showContextToggle.checked
      ? buildContext(item.text, currentQuery)
      : String(item.text || "");

    const target = langSelect.value || "ru";
    showTranslation(
      `Translating to ${target.toUpperCase()}…`,
      ""
    );

    try {
      const t = await translateText(baseText, target);
      showTranslation(`Translation (${target.toUpperCase()})`, t);
    } catch (e) {
      showTranslation("Translation error", String(e?.message || e));
    }
  };

  /* ---------- history ---------- */

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem("realSpeechHistory") || "[]");
    } catch {
      return [];
    }
  }

  function setHistory(arr) {
    localStorage.setItem("realSpeechHistory", JSON.stringify(arr));
  }

  function addToHistory(q) {
    const query = q.trim();
    if (!query) return;
    let arr = getHistory();
    arr = arr.filter((x) => x !== query);
    arr.unshift(query);
    arr = arr.slice(0, MAX_HISTORY);
    setHistory(arr);
    renderHistory();
  }

  function renderHistory() {
    const arr = getHistory();
    recentEl.innerHTML = '<div id="clearHistory" class="clear-btn">clear</div>';

    const clear = document.getElementById("clearHistory");
    clear.onclick = () => {
      setHistory([]);
      renderHistory();
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
  }

  /* ---------- cards + pagination ---------- */

  function renderCards(list, startGlobalIndex) {
    list.forEach((item, idx) => {
      const globalIndex = startGlobalIndex + idx;

      const el = document.createElement("div");
      el.className = "card";

      const textForCard = buildContext(item.text, currentQuery);
      el.innerHTML = `
        <img class="thumb" loading="lazy"
             src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
        <div class="meta">
          <div class="snippet">${highlightHtml(textForCard, currentQuery)}</div>
        </div>
      `;

      el.onclick = () => openByIndex(globalIndex);
      resultsEl.appendChild(el);
    });
  }

  async function loadMore() {
    if (!currentQuery) return;

    const res = await fetch(
      `${API}?query=${encodeURIComponent(currentQuery)}&count=${PAGE_SIZE}&offset=${offset}`
    );
    const data = await res.json();
    const list = data.results || [];

    const startGlobalIndex = results.length;
    results = results.concat(list);
    renderCards(list, startGlobalIndex);

    offset += list.length;
    setProgress();
  }

  async function search(q) {
    const query = q.trim();
    if (!query) return;

    clearTimers();
    hideTranslation();

    results = [];
    currentIndex = -1;
    offset = 0;
    currentQuery = query;

    resultsEl.innerHTML = "";
    setProgress();
    addToHistory(query);

    await loadMore();
  }

  loadMoreBtn.onclick = loadMore;

  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      await search(input.value);
    }
  });

  // init history
  renderHistory();
});

/* YouTube API callback */
window.onYouTubeIframeAPIReady = function () {
  // признак готовности; сам плеер создаём только при первом openByIndex
  // (чтобы не грузить без необходимости)
  try {
    window.__ytReady = true;
  } catch (_) {}
  // прокинем в модуль через глобал (просто надёжно)
  // eslint-disable-next-line no-undef
  if (typeof ytReady !== "undefined") ytReady = true;
};

// Более надёжно: делаем глобальный флаг, который читает ensurePlayer
Object.defineProperty(window, "__REAL_SPEECH_YT_READY__", {
  value: true,
  writable: false
});
