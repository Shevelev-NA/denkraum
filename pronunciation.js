document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const loadMoreEl = document.getElementById("loadMore");
  const recentEl = document.getElementById("recent");

  const API_URL = "http://localhost:3001/api/search";

  const PAGE_SIZE = 60;
  const START_OFFSET_SEC = 3;

  let currentQuery = "";
  let offset = 0;
  let loading = false;
  let done = false;
  let loadedVideos = new Set();

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function openEmbed(videoId,startSec){
    const s = Math.max(0,startSec);
    player.src=`https://www.youtube.com/embed/${videoId}?start=${s}&autoplay=1`;
    playerWrap.style.display="block";
  }

  function cardElement(item){
    if (loadedVideos.has(item.videoId)) return null;
    loadedVideos.add(item.videoId);

    const start = Math.max(0,item.start-START_OFFSET_SEC);
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <img class="thumb" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
      <div class="meta">
        <div class="time">${formatTime(start)}</div>
        <div class="snippet">${item.text}</div>
      </div>`;
    card.onclick=()=>openEmbed(item.videoId,start);
    return card;
  }

  async function fetchPage(q,pageOffset){
    const url=`${API_URL}?query=${encodeURIComponent(q)}&count=${PAGE_SIZE}&offset=${pageOffset}`;
    const res=await fetch(url);
    return await res.json();
  }

  async function startSearch(q){
    q=q.trim();
    if(!q) return;
    currentQuery=q;
    offset=0;
    done=false;
    loadedVideos.clear();
    resultsEl.innerHTML="";
    playerWrap.style.display="none";
    await loadNext();
  }

  async function loadNext(){
    if(loading||done) return;
    loading=true;
    loadMoreEl.style.display="flex";
    const data=await fetchPage(currentQuery,offset);
    const list=data.results||[];

    list.forEach(item=>{
      const card=cardElement(item);
      if(card) resultsEl.appendChild(card);
    });

    offset+=list.length;
    if(list.length<PAGE_SIZE) done=true;
    statusEl.textContent=`Results: ${data.totalCount} • shown: ${offset}${done?" • end":""}`;
    loadMoreEl.style.display="none";
    loading=false;
  }

  window.addEventListener("scroll",()=>{
    if(window.innerHeight+window.scrollY>document.body.offsetHeight-600){
      loadNext();
    }
  });

  btn.addEventListener("click",()=>startSearch(input.value));
  input.addEventListener("keydown",e=>{
    if(e.key==="Enter") startSearch(input.value);
  });
});
