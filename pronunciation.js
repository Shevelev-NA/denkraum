document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const repeatBtn = document.getElementById("repeatBtn");
  const speedSelect = document.getElementById("speedSelect");
  const progressText = document.getElementById("progressText");
  const currentSnippet = document.getElementById("currentSnippet");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const translateRU = document.getElementById("translateRU");
  const translateEN = document.getElementById("translateEN");

  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 10;
  const START_OFFSET = 4;

  let results = [];
  let currentIndex = -1;
  let currentQuery = "";
  let offset = 0;
  let repeatCount = 0;

  function highlight(text, word) {
    if (!word) return text;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
  }

  function updateActiveCard() {
    document.querySelectorAll(".card").forEach((c, i) => {
      c.classList.toggle("active", i === currentIndex);
    });
  }

  function openByIndex(index) {
    if (index < 0 || index >= results.length) return;

    currentIndex = index;
    const item = results[index];

    const s = Math.max(0, item.start - START_OFFSET);
    player.src = `https://www.youtube.com/embed/${item.videoId}?start=${s}&autoplay=1&controls=1`;

    currentSnippet.innerHTML = highlight(item.text, currentQuery);
    progressText.textContent = `${currentIndex + 1} of ${results.length}`;
    playerWrap.style.display = "block";

    updateActiveCard();
  }

  prevBtn.onclick = () => openByIndex(currentIndex - 1);
  nextBtn.onclick = () => openByIndex(currentIndex + 1);

  repeatBtn.onclick = () => {
    repeatCount = 3;
    openByIndex(currentIndex);
  };

  speedSelect.onchange = () => {
    const rate = speedSelect.value;
    player.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: "setPlaybackRate", args: [parseFloat(rate)] }),
      "*"
    );
  };

  async function translate(text, lang) {
    const res = await fetch("https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(text) + "&langpair=de|" + lang);
    const data = await res.json();
    return data.responseData.translatedText;
  }

  translateRU.onclick = async () => {
    const translated = await translate(results[currentIndex].text, "ru");
    currentSnippet.innerHTML += `<hr>${translated}`;
  };

  translateEN.onclick = async () => {
    const translated = await translate(results[currentIndex].text, "en");
    currentSnippet.innerHTML += `<hr>${translated}`;
  };

  function renderCards(list) {
    list.forEach((item, index) => {
      const globalIndex = results.length + index;
      const el = document.createElement("div");
      el.className = "card";

      const extended = item.text;

      el.innerHTML = `
        <img class="thumb"
             src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
        <div class="meta">
          <div>${highlight(extended, currentQuery)}</div>
        </div>
      `;

      el.onclick = () => openByIndex(globalIndex);
      resultsEl.appendChild(el);
    });
  }

  async function loadMore() {
    const res = await fetch(
      `${API}?query=${encodeURIComponent(currentQuery)}&count=${PAGE_SIZE}&offset=${offset}`
    );
    const data = await res.json();
    const list = data.results || [];

    renderCards(list);
    results = results.concat(list);
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
