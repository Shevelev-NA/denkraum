document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const recentEl = document.getElementById("recent");

  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 60;
  const START_OFFSET = 4;
  const DEBOUNCE = 300;

  // paging по "сырым" хитам
  let currentQuery = "";
  let rawOffset = 0;
  let loading = false;
  let total = 0;
  let debounceTimer = null;

  // dedupe по видео на клиенте (убирает миллион одинаковых карточек)
  const shownVideoIds = new Set();

  function stopPlayer(){
    player.src = "";
    playerWrap.style.display = "none";
  }

  function openVideo(id, sec){
    const s = Math.max(0, sec - START_OFFSET);
    player.src = `https://www.youtube.com/embed/${id}?start=${s}&autoplay=1`;
    playerWrap.style.display = "block";
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // highlight: подсвечиваем совпадения даже с пунктуацией/внутри слова
  function highlight(text, word){
    const safeText = escapeHtml(text);
    const w = String(word || "").trim();
    if (!w) return safeText;

    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    return safeText.replace(re, "<mark>$1</mark>");
  }

  function saveRecent(word){
    const w = String(word || "").trim();
    if(!w) return;

    let arr = JSON.parse(localStorage.getItem("recentWords") || "[]");
    arr = arr.filter(x => x !== w);
    arr.unshift(w);
    arr = arr.slice(0, 12);
    localStorage.setItem("recentWords", JSON.stringify(arr));
    renderRecent();
  }

  function renderRecent(){
    recentEl.innerHTML = "";
    const arr = JSON.parse(localStorage.getItem("recentWords") || "[]");
    arr.forEach(w => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = w;
      chip.onclick = () => startSearch(w, true);
      recentEl.appendChild(chip);
    });
  }

  function card(item){
    if (!item || !item.videoId) return null;

    // dedupe
    if (shownVideoIds.has(item.videoId)) return null;
    shownVideoIds.add(item.videoId);

    const el = document.createElement("div");
    el.className = "card";

    const snippetHtml = highlight(item.text || "", currentQuery);

    el.innerHTML = `
      <img class="thumb" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
      <div class="meta">
        <div class="time">${item.start}s</div>
        <div class="snippet">${snippetHtml}</div>
      </div>
    `;

    el.onclick = () => openVideo(item.videoId, item.start || 0);
    return el;
  }

  async function fetchPage(){
    const res = await fetch(
      `${API}?query=${encodeURIComponent(currentQuery)}&count=${PAGE_SIZE}&offset=${rawOffset}`
    );
    return await res.json();
  }

  async function startSearch(q, save=false){
    const qq = String(q || "").trim();
    if (!qq) return;

    stopPlayer();

    if (save) saveRecent(qq);

    currentQuery = qq;
    rawOffset = 0;
    total = 0;
    loading = false;
    resultsEl.innerHTML = "";
    shownVideoIds.clear();

    await loadNextFillScreen();
  }

  // грузим страницы, пока:
  // - не набрали достаточно уникальных видео
  // - и/или пока экран "пустой"
  async function loadNextFillScreen(){
    // защита от бесконечного цикла
    let guard = 0;

    while (guard < 6) {
      guard++;
      const before = resultsEl.childElementCount;

      await loadNext();

      const after = resultsEl.childElementCount;

      // если ничего нового не добавили — смысла дальше долбиться нет
      if (after === before) break;

      // если контента всё ещё мало для экрана — догружаем
      if (document.body.offsetHeight < window.innerHeight + 200) continue;

      // контента хватает
      break;
    }
  }

  async function loadNext(){
    if (loading) return;
    if (total && rawOffset >= total) return;

    loading = true;

    const data = await fetchPage();
    const list = data.results || [];

    total = data.totalCount || 0;

    // rawOffset увеличиваем на количество "сырых" хитов,
    // иначе paging по Meili ломается
    rawOffset += list.length;

    let added = 0;
    for (const item of list) {
      const el = card(item);
      if (el) {
        resultsEl.appendChild(el);
        added++;
      }
    }

    statusEl.textContent = `Results: ${total} • shown unique videos: ${resultsEl.childElementCount}`;

    loading = false;

    // если пришла партия, но уникальных почти не добавилось — догрузить ещё
    if (added < Math.max(8, Math.floor(PAGE_SIZE * 0.25)) && rawOffset < total) {
      await loadNextFillScreen();
    }
  }

  window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY > document.body.offsetHeight - 700) {
      loadNextFillScreen();
    }
  });

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (input.value.trim().length >= 2) {
        // автопоиск НЕ сохраняем в историю
        startSearch(input.value, false);
      }
    }, DEBOUNCE);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceTimer);
      // Enter — это "финальный" запрос, сохраняем
      startSearch(input.value, true);
    }
  });

  renderRecent();
});
