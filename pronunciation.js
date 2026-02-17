const input = document.getElementById("searchInput");
const btnSearch = document.getElementById("btnSearch");
const resultsEl = document.getElementById("results");
const btnMore = document.getElementById("btnMore");

let currentQuery = "";
let page = 0;

btnSearch.onclick = () => {
  currentQuery = input.value.trim();
  if (!currentQuery) return;

  page = 0;
  resultsEl.innerHTML = "";
  loadResults();
};

async function loadResults() {
  const res = await fetch(
    "https://tech-enrollment-designs-supplier.trycloudflare.com/api/search?query=" +
    encodeURIComponent(currentQuery) +
    "&count=20"
  );

  const data = await res.json();

  if (!data.results.length) {
    resultsEl.innerHTML = "<p>No results</p>";
    return;
  }

  data.results.forEach(item => {
    const row = document.createElement("div");
    row.className = "line";

    const start = Math.max(0, (item.start || 0) - 3);

    row.innerHTML = `
      <div style="margin-bottom:10px;">
        <img src="https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg" 
             style="width:200px;border-radius:8px;"><br>
        <strong>${item.title}</strong><br>
        <div>${item.text}</div>
      </div>
      <button class="btn btn-ghost">▶ Play</button>
      <hr>
    `;

    row.querySelector("button").onclick = () => {
      window.open(
        "https://www.youtube.com/watch?v=" +
          item.videoId +
          "&t=" +
          start +
          "s",
        "_blank"
      );
    };

    resultsEl.appendChild(row);
  });

  btnMore.style.display = "none";
}
