document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const recentEl = document.getElementById("recent");

  const API_URL = "http://localhost:3001/api/search";

  const PAGE_SIZE = 40;            // ✅ 40
  const START_OFFSET_SEC = 4;      // ✅ -4 секунды
  const DEBOUNCE_MS = 300;         // ✅ 300ms

  let currentQuery = "";
  let offset = 0;
  let loading = false;
  let done = false;
  let loadedVideos = new Set();
  let debounceTimer = null;

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function stopPlayer(){
    player.src="";
    playerWrap.style.display="none";
  }

  function openEmbed(videoId,startSec){
    const s = Math.max(0,startSec);
    player.src=`https://www.youtube.com/embed/${videoId}?start=${s}&autoplay=1`;
    playerWrap.style.display="block";
  }

  function saveRecent(q){
    let arr = JSON.parse(localStorage.getItem("recentWords")||"[]");
    arr = arr.filter(x=>x!==q);
    arr.unshift(q);
    arr = arr.slice(0,10);
    localStorage.setItem("recentWords",JSON.stringify(arr));
    renderRecent();
  }

  function renderRecent(){
    recentEl.innerHTML="";
    const arr = JSON.parse(localStorage.getItem("recentWords")||"[]");
    arr.forEach(word=>{
      const chip=document.createElement("div");
      chip.className="chip";
      chip.textContent=word;
      chip.onclick=()=>startSearch(word,true);
      recentEl.appendChild(chip);
    });
  }

  function cardElement(item){
    if(loadedVideos.has(item.videoId)) return null;
    loadedVideos.add(item.videoId);

    const start=Math.max(0,item.start-START_OFFSET_SEC);

    const card=document.createElement("div");
    card.className="card fade-in";

    card.innerHTML=`
      <img class="thumb" 
           loading="lazy"
           src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
      <div class="meta">
        <div class="time">${formatTime(start)}</div>
        <div class="snippet">${item.text}</div>
      </div>`;

    // 🔥 hover preview
    const img = card.querySelector(".thumb");
    card.addEventListener("mouseenter",()=>{
      img.src=`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;
    });
    card.addEventListener("mouseleave",()=>{
      img.src=`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`;
    });

    card.onclick=()=>openEmbed(item.videoId,start);

    return card;
  }

  async function fetchPage(q,pageOffset){
    const res=await fetch(
      `${API_URL}?query=${encodeURIComponent(q)}&count=${PAGE_SIZE}&offset=${pageOffset}`
    );
    return await res.json();
  }

  async function startSearch(q,fromUser=false){
    q=q.trim();
    if(!q) return;

    stopPlayer();

    if(fromUser) saveRecent(q);

    currentQuery=q;
    offset=0;
    done=false;
    loadedVideos.clear();
    resultsEl.innerHTML="";

    await loadNext();
  }

  async function loadNext(){
    if(loading||done) return;
    loading=true;

    const data=await fetchPage(currentQuery,offset);
    const list=data.results||[];

    list.forEach(item=>{
      const card=cardElement(item);
      if(card) resultsEl.appendChild(card);
    });

    offset+=list.length;
    if(list.length<PAGE_SIZE) done=true;

    statusEl.textContent=`Results: ${data.totalCount} • shown: ${offset}`;
    loading=false;
  }

  window.addEventListener("scroll",()=>{
    if(window.innerHeight+window.scrollY>document.body.offsetHeight-600){
      loadNext();
    }
  });

  // 🔥 debounce
  input.addEventListener("input",()=>{
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(()=>{
      if(input.value.trim().length>=2){
        startSearch(input.value,true);
      }
    },DEBOUNCE_MS);
  });

  input.addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      clearTimeout(debounceTimer);
      startSearch(input.value,true);
    }
  });

  renderRecent();
});
