document.addEventListener("DOMContentLoaded", () => {

const API = "http://localhost:3001/api/search";
const PAGE_SIZE = 10;
const START_OFFSET = 4;

let results = [];
let currentIndex = -1;
let currentQuery = "";
let offset = 0;
let ytPlayer = null;

const input = document.getElementById("searchInput");
const resultsEl = document.getElementById("results");
const playerWrap = document.getElementById("playerWrap");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const repeatBtn = document.getElementById("repeatBtn");
const speedSelect = document.getElementById("speedSelect");
const progressText = document.getElementById("progressText");
const translateBtn = document.getElementById("translateBtn");
const langSelect = document.getElementById("langSelect");
const translationBox = document.getElementById("translationBox");
const translationText = document.getElementById("translationText");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const recentEl = document.getElementById("recent");

function highlight(text, word){
 if(!word) return text;
 const re = new RegExp(`(${word})`,"gi");
 return text.replace(re,"<mark>$1</mark>");
}

function updateProgress(){
 progressText.textContent = `${currentIndex+1} of ${results.length}`;
}

function ensurePlayer(videoId,start){
 if(!window.YT || !YT.Player){
   setTimeout(()=>ensurePlayer(videoId,start),300);
   return;
 }

 if(!ytPlayer){
   ytPlayer = new YT.Player("player",{
     videoId,
     playerVars:{ autoplay:1,start:Math.floor(start),rel:0 },
     events:{
       onReady:e=>{
         e.target.playVideo();
         e.target.setPlaybackRate(parseFloat(speedSelect.value));
       }
     }
   });
 }else{
   ytPlayer.loadVideoById({ videoId,startSeconds:Math.floor(start) });
 }
}

function openIndex(i){
 if(i<0 || i>=results.length) return;
 currentIndex=i;
 const item=results[i];
 const start=Math.max(0,item.start-START_OFFSET);

 playerWrap.style.display="block";
 ensurePlayer(item.videoId,start);

 document.getElementById("currentSnippet").innerHTML=highlight(item.text,currentQuery);
 updateProgress();
}

prevBtn.onclick=()=>openIndex(currentIndex-1);
nextBtn.onclick=()=>openIndex(currentIndex+1);

repeatBtn.onclick=()=>{
 if(currentIndex<0) return;
 const item=results[currentIndex];
 const start=Math.max(0,item.start-START_OFFSET);
 ytPlayer.seekTo(start,true);
 ytPlayer.playVideo();
};

speedSelect.onchange=()=>{
 if(ytPlayer) ytPlayer.setPlaybackRate(parseFloat(speedSelect.value));
};

translateBtn.onclick=async()=>{
 if(currentIndex<0) return;
 const item=results[currentIndex];
 const target=langSelect.value;
 const res=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(item.text)}&langpair=de|${target}`);
 const data=await res.json();
 translationText.textContent=data.responseData.translatedText;
 translationBox.style.display="block";
};

async function loadMore(){
 const res=await fetch(`${API}?query=${encodeURIComponent(currentQuery)}&count=${PAGE_SIZE}&offset=${offset}`);
 const data=await res.json();
 const newResults=data.results||[];

 newResults.forEach((item,i)=>{
   const card=document.createElement("div");
   card.className="card";
   card.innerHTML=`
     <img class="thumb" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
     <div class="meta">${highlight(item.text,currentQuery)}</div>
   `;
   card.onclick=()=>openIndex(results.length+i);
   resultsEl.appendChild(card);
 });

 results=results.concat(newResults);
 offset+=newResults.length;
}

async function search(q){
 currentQuery=q;
 results=[];
 offset=0;
 resultsEl.innerHTML="";
 playerWrap.style.display="none";

 await loadMore();
 if(results.length>0) openIndex(0);

 addHistory(q);
}

loadMoreBtn.onclick=loadMore;

input.addEventListener("keydown",e=>{
 if(e.key==="Enter") search(input.value);
});

/* History */

function addHistory(q){
 let arr=JSON.parse(localStorage.getItem("history")||"[]");
 arr=arr.filter(x=>x!==q);
 arr.unshift(q);
 arr=arr.slice(0,10);
 localStorage.setItem("history",JSON.stringify(arr));
 renderHistory();
}

function renderHistory(){
 let arr=JSON.parse(localStorage.getItem("history")||"[]");
 recentEl.innerHTML='<div id="clearHistory" class="clear-btn">clear</div>';
 arr.forEach(w=>{
   const chip=document.createElement("div");
   chip.className="chip";
   chip.textContent=w;
   chip.onclick=()=>search(w);
   recentEl.appendChild(chip);
 });
 document.getElementById("clearHistory").onclick=()=>{
   localStorage.removeItem("history");
   renderHistory();
 };
}

renderHistory();

});
