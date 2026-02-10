const input = document.getElementById("input");
const output = document.getElementById("output");

const MODE_KEY = "denkraum-text-mode";
let mode = localStorage.getItem(MODE_KEY) || "parallel";

document.getElementById("btn-parallel").onclick = () => {
  mode = "parallel";
  localStorage.setItem(MODE_KEY, mode);
  render();
};

document.getElementById("btn-toggle").onclick = () => {
  mode = "toggle";
  localStorage.setItem(MODE_KEY, mode);
  render();
};

document.getElementById("btn-clear").onclick = () => {
  input.value = "";
  output.innerHTML = "";
};

document.getElementById("btn-copy-all").onclick = () => {
  navigator.clipboard.writeText(output.innerText);
};

function translateMock(text) {
  return "[RU] " + text;
}

function render() {
  output.innerHTML = "";
  const lines = input.value.split("\n");

  lines.forEach(line => {
    if (!line.trim()) return;

    const ru = translateMock(line);
    const row = document.createElement("div");
    row.className = "line";

    const de = document.createElement("div");
    de.className = "de";
    de.textContent = line;

    const ruDiv = document.createElement("div");
    ruDiv.className = "ru";
    ruDiv.textContent = ru;

    if (mode === "toggle") {
      ruDiv.classList.add("hidden");
    }

    const actions = document.createElement("div");
    actions.className = "line-actions";

    ["DE", "RU", "↔"].forEach(type => {
      const b = document.createElement("button");
      b.textContent = type;
      b.onclick = e => {
        e.stopPropagation();
        if (type === "DE") copy(line);
        if (type === "RU") copy(ru);
        if (type === "↔") copy(`${line}\n${ru}`);
      };
      actions.appendChild(b);
    });

    row.append(de, ruDiv, actions);

    row.onclick = () => {
      document.querySelectorAll(".line").forEach(l => l.classList.remove("active"));
      row.classList.add("active");
      if (mode === "toggle") ruDiv.classList.toggle("hidden");
    };

    output.appendChild(row);
  });
}

function copy(text) {
  navigator.clipboard.writeText(text);
}

render();
