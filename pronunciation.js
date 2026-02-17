document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");

  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 30;
  const START_OFFSET = 4;

  let currentQuery = "";
  let uniqueOffset = 0;
  let loading = false;
  let total = 0;

  function openVideo(id, sec) {
    const s = Math.max(0, sec - START_OFFSET);
    player.src = `https://www.youtube.com/embed/${id}?start=${s}&autoplay=1`;
    playerWrap.style.display = "block";
  }

  function highlight(text, word) {
    if (!word) return text;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    return text.replace(re, "<mark>$1</mark>");
  }

  function card(item) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="thumbwrap">
        <img class="thumb" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
        <div class="time-badge">${item.start}</div>
      </div>
      <div class="meta">
        <div class="snippet">${highlight(item.text, currentQuery)}</div>
      </div>
    `;
    el.onclick = () => openVideo(item.videoId, item.start);
    return el;
  }

  async function fetchPage() {
    const res = await fetch(
      `${API}?query=${encodeURIComponent(currentQuery)}&count=${PAGE_SIZE}&offset=${uniqueOffset}`
    );
    return await res.json();
  }

  async function loadNext() {
    if (loading) return;
    loading = true;

    const data = await fetchPage();
    const list = data.results || [];
    total = data.totalCount || 0;

    uniqueOffset += list.length;

    list.forEach(item => {
      resultsEl.appendChild(card(item));
    });

    statusEl.textContent = `Results: ${total}`;
    loading = false;
  }

  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      currentQuery = input.value.trim();
      uniqueOffset = 0;
      resultsEl.innerHTML = "";
      await loadNext();
    }
  });
});
