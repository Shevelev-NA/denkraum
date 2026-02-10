const resultsEl = document.getElementById("results");
const player = document.getElementById("player");
const playerWrapper = document.getElementById("player-wrapper");
const btnMore = document.getElementById("btn-more");

let page = 1;
let currentQuery = "";

document.getElementById("btn-search").onclick = () => {
  currentQuery = document.getElementById("query").value.trim();
  if (!currentQuery) return;

  page = 1;
  resultsEl.innerHTML = "";
  loadResults();
};

btnMore.onclick = () => {
  page++;
  loadResults();
};

function loadResults() {
  const data = mockSearch(currentQuery, page);

  data.forEach(item => {
    const row = document.createElement("div");
    row.className = "line";

    row.innerHTML = `
      <div>
        <strong>${item.title}</strong><br/>
        ${highlight(item.text, currentQuery)}
      </div>
      <button class="btn btn-ghost">▶</button>
    `;

    row.querySelector("button").onclick = () => {
      play(item.videoId, item.start);
    };

    resultsEl.appendChild(row);
  });

  btnMore.style.display = "inline-block";
}

function play(videoId, start) {
  player.src = `https://www.youtube.com/embed/${videoId}?start=${start}&autoplay=1`;
  playerWrapper.style.display = "block";
  playerWrapper.scrollIntoView({ behavior: "smooth" });
}

function highlight(text, query) {
  const re = new RegExp(`(${query})`, "ig");
  return text.replace(re, `<mark>$1</mark>`);
}

/* ================= MOCK DATA ================= */

function mockSearch(q, page) {
  const base = (page - 1) * 20;
  return Array.from({ length: 20 }).map((_, i) => ({
    videoId: "dQw4w9WgXcQ",
    start: 30 + i * 3,
    title: `Example video ${base + i + 1}`,
    text: `This is an example sentence where the word ${q} is spoken naturally.`
  }));
}
