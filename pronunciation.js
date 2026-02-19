document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const currentSnippet = document.getElementById("currentSnippet");

  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 30;
  const START_OFFSET = 4;

  let currentQuery = "";
  let uniqueOffset = 0;
  let results = [];
  let currentIndex = -1;

  function openVideoByIndex(index) {
    if (index < 0 || index >= results.length) return;

    currentIndex = index;
    const item = results[index];

    const s = Math.max(0, item.start - START_OFFSET);
    player.src = `https://www.youtube.com/embed/${item.videoId}?start=${s}&autoplay=1`;

    currentSnippet.innerHTML = item.text;
    playerWrap.style.display = "block";
  }

  prevBtn.onclick = () => openVideoByIndex(currentIndex - 1);
  nextBtn.onclick = () => openVideoByIndex(currentIndex + 1);

  function card(item, index) {
    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <img class="thumb"
           src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
      <div class="meta">
        <div class="snippet">${item.text}</div>
      </div>
    `;

    el.onclick = () => openVideoByIndex(index);
    return el;
  }

  async function search(query) {
    const res = await fetch(
      `${API}?query=${encodeURIComponent(query)}&count=${PAGE_SIZE}&offset=0`
    );
    const data = await res.json();

    results = data.results || [];
    resultsEl.innerHTML = "";

    results.forEach((item, index) => {
      resultsEl.appendChild(card(item, index));
    });
  }

  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      currentQuery = input.value.trim();
      await search(currentQuery);
    }
  });
});
