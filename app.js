const input = document.getElementById("input");
const output = document.getElementById("output");

document.getElementById("btn-parallel").onclick = renderParallel;
document.getElementById("btn-toggle").onclick = renderToggle;
document.getElementById("btn-clear").onclick = () => {
  input.value = "";
  output.innerHTML = "";
};

// ВРЕМЕННАЯ заглушка перевода
function mockTranslate(text) {
  return "[RU] " + text;
}

function renderParallel() {
  output.innerHTML = "";
  const lines = input.value.split("\n");

  lines.forEach(line => {
    if (!line.trim()) return;

    const ru = mockTranslate(line);

    output.innerHTML += `
      <div class="line">
        <div class="de">${escapeHtml(line)}</div>
        <div class="ru">${escapeHtml(ru)}</div>
      </div>
    `;
  });
}

function renderToggle() {
  output.innerHTML = "";
  const lines = input.value.split("\n");

  lines.forEach(line => {
    if (!line.trim()) return;

    const ru = mockTranslate(line);

    const row = document.createElement("div");
    row.className = "line";

    const de = document.createElement("div");
    de.className = "de";
    de.textContent = line;

    const ruDiv = document.createElement("div");
    ruDiv.className = "ru hidden";
    ruDiv.textContent = ru;

    row.appendChild(de);
    row.appendChild(ruDiv);

    row.onclick = () => {
      ruDiv.classList.toggle("hidden");
    };

    output.appendChild(row);
  });
}

// защита от XSS
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
