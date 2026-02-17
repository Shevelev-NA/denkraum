document.addEventListener("DOMContentLoaded", () => {

const API = "https://tech-enrollment-designs-supplier.trycloudflare.com/api/search";
const START_OFFSET = 3;
const COUNT = 20;

const input = document.getElementById("searchInput");
const btn = document.getElementById("searchBtn");
const results = document.getElementById("results");
const playerWrap = document.getElementById("playerWrap");
const player = document.getElementById("player");

function formatTime(sec){
  const m = Math.floor(sec/60).toString().padStart(2,"0");
  const s = Math.floor(sec%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}

function cleanText(t){
  return String(t)
    .replace(/<[^>]*>/g,"")
    .replaceAll("&amp;","&")
    .replaceAll("&lt;","<")
    .replaceAll("&gt;",">");
}

function highlight(text, query){
  const re = new RegExp(`(${query})`, "ig");
  return text.replace(re, "<mark>$1</mark>");
}

function skeleton(){
  results.innerHTML="";
  for(let i=0;i<6;i++){
    const div=document.createElement("div");
    div.className="skeleton";
    results.appendChild(div);
  }
}

function openVideo(id,start){
  player.src=`https://www.youtube.com/embed/${id}?start=${start}&autoplay=1`;
  playerWrap.style.display="block";
  window.scrollTo({top:0,behavior:"smooth"});
}

function render(list,query){
  results.innerHTML="";

  list.forEach((item,i)=>{

    const videoId=item.videoId;
    const start=Math.max(0,item.start-START_OFFSET);
    const text=cleanText(item.text);
    const snippet=highlight(text,query);

    const card=document.createElement("div");
    card.className="rs-card";

    card.innerHTML=`
      <img class="rs-thumb" loading="lazy"
        src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg">
      <div class="rs-body">
        <div class="rs-time">${formatTime(start)}</div>
        <div class="rs-snippet">${snippet}</div>
      </div>
    `;

    card.onclick=()=>openVideo(videoId,start);

    results.appendChild(card);

    setTimeout(()=>card.classList.add("show"), i*40);
  });
}

async function search(){
  const q=input.value.trim();
  if(!q)return;

  skeleton();

  const res=await fetch(`${API}?query=${encodeURIComponent(q)}&count=${COUNT}`);
  const data=await res.json();

  render(data.results||[],q);
}

btn.onclick=search;
input.addEventListener("keydown",e=>{
  if(e.key==="Enter") search();
});

});
