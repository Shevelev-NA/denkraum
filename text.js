const input = document.getElementById("input");
const output = document.getElementById("output");

document.getElementById("btn-parallel").addEventListener("click", renderParallel);
document.getElementById("btn-toggle").addEventListener("click", renderToggle);
document.getElementById("btn-clear").addEventListener("click", () => {
  input.value = "";
  output.innerHTML = "";
});

// Временная заглушка перевода (потом заменим на реальный источник)
function mockTranslate(text) {
  return "[RU] " + text;
}

function renderParallel() {
  output.innerHTML = "";
  const lines = input.value.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    const ru = mockTranslate(line);

    const row = document.createElement("div");
    row.className = "tool-line";

    const de = document.createElement("div");
    de.className = "tool-de";
    de.textContent = line;

    const ruDiv = document.createElement("div");
    ruDiv.className = "tool-ru";
    ruDiv.textContent = ru;

    row.appendChild(de);
    row.appendChild(ruDiv);
    output.appendChild(row);
  }
}

function renderToggle() {
  output.innerHTML = "";
  const lines = input.value.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    const ru = mockTranslate(line);

    const row = document.createElement("div");
    row.className = "tool-line tool-line-toggle";

    const de = document.createElement("div");
    de.className = "tool-de";
    de.textContent = line;

    const ruDiv = document.createElement("div");
    ruDiv.className = "tool-ru tool-hidden";
    ruDiv.textContent = ru;

    row.appendChild(de);
    row.appendChild(ruDiv);

    row.addEventListener("click", () => {
      ruDiv.classList.toggle("tool-hidden");
    });

    output.appendChild(row);
  }
}
