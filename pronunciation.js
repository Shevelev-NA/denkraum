const input = document.getElementById("searchInput");
const resultsEl = document.getElementById("results");
const playerEl = document.getElementById("player");

const PAGE_SIZE = 60;
let offset = 0;
let currentQuery = "";
let loading = false;

// -------- time formatter --------
function formatTime(sec) {
  sec = Number(sec) || 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// -------- highlight --------
function highlight(text, word) {
  if (!word) return text;
  const reg = new RegExp(`(${word})`, "gi");
  return text.replace(reg, `<span class="highlight">$1</span>`);
}

// -------- search --------
async function search(reset = true) {
  const query = input.value.trim();
  if (!query) return;

  if (reset) {
    offset = 0;
    resultsEl.innerHTML = "";
  }

  if (loading) return;
  loading = true;

  const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&count=${PAGE_SIZE}&offset=${offset}`);
  const data = await res.json();

  render(data.hits, query);

  offset += PAGE_SIZE;
  currentQuery = query;
  loading = false;

  autoLoadIfScreenEmpty();
}

// -------- render --------
function render(items, query) {
  const seen = new Set();

  items.forEach(item => {

    const uniqueKey = item.videoId + "_" + item.start;
    if (seen.has(uniqueKey)) return;
    seen.add(uniqueKey);

    const card = document.createElement("div");
    card.className = "card fade-in";

    const thumbUrl = `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`;
    const videoUrl = `https://www.youtube.com/embed/${item.videoId}?start=${Math.max(0, item.start - 4)}&autoplay=1`;

    card.innerHTML = `
      <div class="thumb-wrapper">
        <img src="${thumbUrl}" loading="lazy" />
        <div class="time-badge">${formatTime(item.start)}</div>
      </div>
      <div class="text">${highlight(item.text, query)}</div>
    `;

    card.onclick = () => {
      playerEl.innerHTML = `
        <iframe
          src="${videoUrl}"
          frameborder="0"
          allow="autoplay; encrypted-media"
          allowfullscreen>
        </iframe>
      `;
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    resultsEl.appendChild(card);
  });
}

// -------- infinite scroll --------
window.addEventListener("scroll", () => {
  if (loading) return;
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
    search(false);
  }
});

// -------- auto load if empty screen --------
function autoLoadIfScreenEmpty() {
  if (document.body.scrollHeight <= window.innerHeight + 100) {
    search(false);
  }
}

// -------- enter key --------
input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    search(true);
  }
});
