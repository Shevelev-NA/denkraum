document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const currentSnippet = document.getElementById("currentSnippet");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const recentEl = document.getElementById("recent");

  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 10;
  const START_OFFSET = 4;
  const MAX_HISTORY = 10;

  let results = [];
  let currentIndex = -1;
  let currentQuery = "";
  let offset = 0;

  function highlight(text, word) {
    if (!word) return text;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    return text.replace(re, "<mark>$1</mark>");
  }

  function openByIndex(index) {
    if (index < 0 || index >= results.length) return;

    currentIndex = index;
    const item = results[index];

    const s = Math.max(0, item.start - START_OFFSET);
    player.src = `https://www.youtube.com/embed/${item.videoId}?start=${s}&autoplay=1`;

    currentSnippet.innerHTML = highlight(item.text, currentQuery);
    playerWrap.style.display = "block";
  }

  prevBtn.onclick = () => openByIndex(currentIndex - 1);
  nextBtn.onclick = () => openByIndex(currentIndex + 1);

  function renderCards(list) {
    list.forEach((item, index) => {
      const el = document.createElement("div");
      el.className = "card";

      el.innerHTML = `
        <img class="thumb"
             src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
        <div class="meta">
          <div class="snippet">${highlight(item.text, currentQuery)}</div>
        </div>
      `;

      el.onclick = () => openByIndex(index + offset - list.length);
      resultsEl.appendChild(el);
    });
  }

  async function loadMore() {
    const res = await fetch(
      `${API}?query=${encodeURIComponent(currentQuery)}&count=${PAGE_SIZE}&offset=${offset}`
    );
    const data = await res.json();
    const list = data.results || [];

    results = results.concat(list);
    renderCards(list);

    offset += PAGE_SIZE;
  }

  async function search(q) {
    results = [];
    offset = 0;
    resultsEl.innerHTML = "";
    currentQuery = q;

    await loadMore();
  }

  loadMoreBtn.onclick = loadMore;

  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      if (!q) return;
      await search(q);
    }
  });

});
