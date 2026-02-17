document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const playerWrap = document.getElementById("playerWrap");
  const player = document.getElementById("player");
  const recentEl = document.getElementById("recent");

  const API = "http://localhost:3001/api/search";
  const PAGE_SIZE = 60;
  const START_OFFSET = 4;
  const DEBOUNCE = 300;

  let currentQuery="";
  let offset=0;
  let loading=false;
  let total=0;
  let debounceTimer=null;

  function stopPlayer(){
    player.src="";
    playerWrap.style.display="none";
  }

  function openVideo(id,sec){
    const s=Math.max(0,sec-START_OFFSET);
    player.src=`https://www.youtube.com/embed/${id}?start=${s}&autoplay=1`;
    playerWrap.style.display="block";
  }

  function highlight(text, word){
    if(!word) return text;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b(${escaped})\\b`, "gi");
    return text.replace(regex, '<mark>$1</mark>');
  }

  function card(item){
    const el=document.createElement("div");
    el.className="card";

    const highlighted = highlight(item.text, currentQuery);

    el.innerHTML=`
      <img class="thumb" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
      <div class="meta">
        <div class="time">${item.start}s</div>
        <div class="snippet">${highlighted}</div>
      </div>
    `;
    el.onclick=()=>openVideo(item.videoId,item.start);
    return el;
  }

  async function fetchPage(){
    const res=await fetch(
      `${API}?query=${encodeURIComponent(currentQuery)}&count=${PAGE_SIZE}&offset=${offset}`
    );
    return await res.json();
  }

  async function startSearch(q){
    q=q.trim();
    if(!q) return;

    stopPlayer();

    currentQuery=q;
    offset=0;
    total=0;
    resultsEl.innerHTML="";

    await loadNext();

    // автодогрузка если экран пустой
    setTimeout(()=>{
      if(document.body.offsetHeight < window.innerHeight){
        loadNext();
      }
    },200);
  }

  async function loadNext(){
    if(loading) return;
    if(total && offset >= total) return;

    loading=true;

    const data=await fetchPage();
    const list=data.results||[];

    total=data.totalCount || 0;

    list.forEach(item=>{
      resultsEl.appendChild(card(item));
    });

    offset+=list.length;

    statusEl.textContent=`Results: ${total} • shown: ${offset}`;

    loading=false;
  }

  window.addEventListener("scroll",()=>{
    if(window.innerHeight+window.scrollY>document.body.offsetHeight-600){
      loadNext();
    }
  });

  input.addEventListener("input",()=>{
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(()=>{
      if(input.value.trim().length>=2){
        startSearch(input.value);
      }
    },DEBOUNCE);
  });

});
