const input = document.getElementById("input");
const output = document.getElementById("output");

document.getElementById("btn-parallel").onclick = renderParallel;
document.getElementById("btn-toggle").onclick = renderToggle;
document.getElementById("btn-clear").onclick = () => {
  input.value = "";
  output.innerHTML = "";
};

function translateMock(text) {
  return "[RU] " + text;
}

function renderParallel() {
  output.innerHTML = "";
  input.value.split("\n").forEach(line => {
    if (!line.trim()) return;
    output.innerHTML += `
      <div class="line">
        <div>${line}</div>
        <div>${translateMock(line)}</div>
      </div>
    `;
  });
}

function renderToggle() {
  output.innerHTML = "";
  input.value.split("\n").forEach(line => {
    if (!line.trim()) return;

    const row = document.createElement("div");
    row.className = "line";

    const de = document.createElement("div");
    de.textContent = line;

    const ru = document.createElement("div");
    ru.textContent = translateMock(line);
    ru.classList.add("hidden");

    row.append(de, ru);
    row.onclick = () => ru.classList.toggle("hidden");

    output.appendChild(row);
  });
}
