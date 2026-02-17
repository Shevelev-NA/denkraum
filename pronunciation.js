document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const recentEl = document.getElementById("recent");
  const clearBtn = document.getElementById("clearHistory");
  const scrollBtn = document.getElementById("scrollTopBtn");

  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 60;
  const START_OFFSET = 4;
  const DEBOUNCE = 300;
  const MAX_HISTORY = 10;

  let currentQuery = "";
  let rawOffset = 0;
  let loading = false;
  let total = 0;
  let debounceTimer = null;

  const shownVideoIds = new Set();

  function stopPlayer(){
    player.src = "";
    playerWrap.style.display = "none";
  }

  function openVideo(id, sec){
    const s = Math.max(0, sec - START_OFFSET);
    player.src = `https://www.youtube.com/embed/${id}?start=${s}&autoplay=1`;
    playerWrap.style.display = "block";
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function highlight(text, word){
    if(!word) return text;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    return text.replace(re, "<mark>$1</mark>");
  }

  function formatTime(sec){
    sec = Number(sec)||0;
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function saveRecent(word){
    let arr = JSON.parse(localStorage.getItem("recentWords") || "[]");
    arr = arr.filter(x => x !== word);
    arr.unshift(word);
    arr = arr.slice(0, MAX_HISTORY);
    localStorage.setItem("recentWords", JSON.stringify(arr));
    renderRecent();
  }

  function renderRecent(){
    const arr = JSON.parse(localStorage.getItem("recentWords") || "[]");
    recentEl.innerHTML = '<div id="clearHistory" class="clear-btn">clear</div>';
    arr.forEach(w=>{
      const chip=document.createElement("div");
      chip.className="chip";
      chip.textContent=w;
      chip.onclick=()=>startSearch(w,true);
      recentEl.appendChild(chip);
    });
    document.getElementById("clearHistory").onclick=()=>{
      localStorage.removeItem("recentWords");
      renderRecent();
    };
  }

  function card(item){
    if(shownVideoIds.has(item.videoId)) return null;
    shownVideoIds.add(item.videoId);

    const el=document.createElement("div");
    el.className="card";

    el.innerHTML=`
      <div class="thumbwrap">
        <img class="thumb" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
        <div class="time-badge">${formatTime(item.start)}</div>
      </div>
      <div class="meta">
        <div class="snippet">${highlight(item.text,currentQuery)}</div>
      </div>
    `;

    el.onclick=()=>openVideo(item.videoId,item.start);
    return el;
  }

  async function fetchPage(){
    const res=await fetch(`${API}?query=${encodeURIComponent(currentQuery)}&count=${PAGE_SIZE}&offset=${rawOffset}`);
    return await res.json();
  }

  async function startSearch(q,save=false){
    const qq=q.trim();
    if(!qq) return;

    stopPlayer();
    if(save) saveRecent(qq);

    currentQuery=qq;
    rawOffset=0;
    shownVideoIds.clear();
    resultsEl.innerHTML="";

    await loadNext();
  }

  async function loadNext(){
    if(loading) return;
    loading=true;

    const data=await fetchPage();
    const list=data.results||[];
    total=data.totalCount||0;
    rawOffset+=list.length;

    list.forEach(item=>{
      const el=card(item);
      if(el) resultsEl.appendChild(el);
    });

    statusEl.textContent=`Results: ${total}`;
    loading=false;
  }

  window.addEventListener("scroll",()=>{
    if(window.innerHeight+window.scrollY>document.body.offsetHeight-600){
      loadNext();
    }
    scrollBtn.style.display = window.scrollY > 400 ? "block" : "none";
  });

  scrollBtn.onclick=()=>{
    window.scrollTo({top:0,behavior:"smooth"});
  };

  input.addEventListener("input",()=>{
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(()=>{
      if(input.value.trim().length>=2){
        startSearch(input.value,false);
      }
    },DEBOUNCE);
  });

  input.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){
      clearTimeout(debounceTimer);
      startSearch(input.value,true);
    }
  });

  renderRecent();
});
