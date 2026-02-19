document.addEventListener("DOMContentLoaded", () => {

const API = "http://localhost:3001/api/search";
const PAGE_SIZE = 10;
const START_OFFSET = 4;
const FRAG_SECONDS = 6;

let results = [];
let currentIndex = -1;
let currentQuery = "";
let ytPlayer = null;

const input = document.getElementById("searchInput");
const resultsEl = document.getElementById("results");
const playerWrap = document.getElementById("playerWrap");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const repeatBtn = document.getElementById("repeatBtn");
const speedSelect = document.getElementById("speedSelect");
const progressText = document.getElementById("progressText");
const autoNextToggle = document.getElementById("autoNextToggle");
const currentSnippet = document.getElementById("currentSnippet");
const translateBtn = document.getElementById("translateBtn");
const langSelect = document.getElementById("langSelect");
const translationBox = document.getElementById("translationBox");
const translationText = document.getElementById("translationText");

function highlight(text, word){
 if(!word) return text;
 const re = new RegExp(`(${word})`,"gi");
 return text.replace(re,"<mark>$1</mark>");
}

function updateProgress(){
 progressText.textContent = `${currentIndex+1} of ${results.length}`;
}

function updateActive(){
 const cards = resultsEl.querySelectorAll(".card");
 cards.forEach((c,i)=>c.classList.toggle("active", i===currentIndex));
}

function ensurePlayer(videoId,start){
 if(!window.YT || !YT.Player){
   setTimeout(()=>ensurePlayer(videoId,start),300);
   return;
 }

 if(!ytPlayer){
   ytPlayer = new YT.Player("player",{
     videoId,
     playerVars:{
       autoplay:1,
       start:Math.floor(start),
       rel:0
     },
     events:{
       onReady:e=>{
         e.target.playVideo();
         e.target.setPlaybackRate(parseFloat(speedSelect.value));
       }
     }
   });
 }else{
   ytPlayer.loadVideoById({
     videoId,
     startSeconds:Math.floor(start)
   });
   setTimeout(()=>{
     ytPlayer.playVideo();
     ytPlayer.setPlaybackRate(parseFloat(speedSelect.value));
   },200);
 }
}

function openIndex(i){
 if(i<0 || i>=results.length) return;

 currentIndex=i;
 const item = results[i];
 const start = Math.max(0, item.start - START_OFFSET);

 playerWrap.style.display="block";

 ensurePlayer(item.videoId,start);

 currentSnippet.innerHTML = highlight(item.text,currentQuery);

 updateProgress();
 updateActive();
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

async function search(q){
 currentQuery=q;
 results=[];
 resultsEl.innerHTML="";
 playerWrap.style.display="none";

 const res=await fetch(`${API}?query=${encodeURIComponent(q)}&count=${PAGE_SIZE}&offset=0`);
 const data=await res.json();
 results=data.results||[];

 results.forEach((item,i)=>{
   const card=document.createElement("div");
   card.className="card";
   card.innerHTML=`
     <img class="thumb" src="https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg">
     <div class="meta">${highlight(item.text,q)}</div>
   `;
   card.onclick=()=>openIndex(i);
   resultsEl.appendChild(card);
 });

 if(results.length>0){
   openIndex(0);
 }
}

input.addEventListener("keydown",e=>{
 if(e.key==="Enter") search(input.value);
});

});
