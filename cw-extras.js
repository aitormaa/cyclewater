// cw-extras.js — FindWater + WaterQuest (injected UI + logic)
(function(){
  const OVR=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];

  // Inject WaterQuest bar + sidebar card
  function injectWQ(){
    // Top bar (hidden by default)
    const bar=document.createElement('div');
    bar.id='wq-bar';
    bar.style.cssText='position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;padding:10px 16px;padding-top:calc(10px + env(safe-area-inset-top));display:none;align-items:center;gap:12px;z-index:200;font-size:13px';
    bar.innerHTML=`<div style="display:flex;gap:16px;flex:1">
      <div style="text-align:center"><div id="wq-time" style="font-size:20px;font-weight:800;line-height:1">0:00</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Riding</div></div>
      <div style="text-align:center"><div id="wq-found" style="font-size:20px;font-weight:800;line-height:1">0</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Found</div></div>
      <div style="text-align:center"><div id="wq-added" style="font-size:20px;font-weight:800;line-height:1">0</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Added</div></div>
      <div style="text-align:center"><div id="wq-pts" style="font-size:20px;font-weight:800;line-height:1">0</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Pts</div></div>
    </div>
    <button onclick="cwStopWQ&&cwStopWQ()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer">Stop</button>`;
    document.body.prepend(bar);
    // Sidebar card (insert before settings card)
    const sc=document.getElementById('sidebar-content');
    if(!sc)return;
    const card=document.createElement('div');
    card.className='card';
    card.style.cssText='background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(168,85,247,.05));border-color:rgba(124,58,237,.25)';
    card.innerHTML=`<div class="stog col" onclick="this.nextElementSibling.classList.toggle('hid');this.classList.toggle('col')"><span class="ct" style="margin:0;color:#A78BFA">🎮 WaterQuest</span><span class="arr" style="color:#A78BFA">▼</span></div>
    <div class="sbod hid">
      <p style="font-size:12px;color:#C4B5FD;line-height:1.6;margin-bottom:12px">Go for a ride, find and add water points. Compete on the leaderboard!</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:rgba(124,58,237,.15);border-radius:10px;padding:10px 8px;text-align:center;border:1px solid rgba(124,58,237,.2)"><div id="wq-best-pts" style="font-size:20px;font-weight:800;color:#A78BFA">—</div><div style="font-size:10px;color:#7C3AED;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Best score</div></div>
        <div style="background:rgba(124,58,237,.15);border-radius:10px;padding:10px 8px;text-align:center;border:1px solid rgba(124,58,237,.2)"><div id="wq-total-added" style="font-size:20px;font-weight:800;color:#A78BFA">—</div><div style="font-size:10px;color:#7C3AED;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Total added</div></div>
      </div>
      <button id="wq-start-btn" onclick="cwStartWQ&&cwStartWQ()" style="display:inline-flex;align-items:center;justify-content:center;width:100%;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff">🎮 Start WaterQuest</button>
      <div style="font-size:10px;color:#7C3AED;text-align:center;margin-top:8px">+10 pts found · +25 pts added</div>
    </div>`;
    // Insert before settings card (last few cards)
    const cards=sc.querySelectorAll('.card');
    const settingsCard=Array.from(cards).find(c=>c.querySelector('#set-bod'));
    if(settingsCard)sc.insertBefore(card,settingsCard);else sc.appendChild(card);
    loadStats();
  }

  // ─── WATERQUEST LOGIC ────────────────────────────────────────
  const WQ={active:false,start:0,found:0,added:0,pts:0,timer:null,passedIds:new Set()};

  function loadStats(){
    const b=localStorage.getItem('wq_best')||'—';
    const t=localStorage.getItem('wq_total_added')||'—';
    const e1=document.getElementById('wq-best-pts'),e2=document.getElementById('wq-total-added');
    if(e1)e1.textContent=b;if(e2)e2.textContent=t;
  }

  window.cwStartWQ=function(){
    Object.assign(WQ,{active:true,start:Date.now(),found:0,added:0,pts:0,passedIds:new Set()});
    ['wq-found','wq-added','wq-pts'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='0';});
    document.getElementById('wq-time').textContent='0:00';
    document.getElementById('wq-bar').style.display='flex';
    const sb=document.getElementById('wq-start-btn');if(sb)sb.disabled=true;
    WQ.timer=setInterval(()=>{const s=Math.floor((Date.now()-WQ.start)/1000),m=Math.floor(s/60),ss=s%60;document.getElementById('wq-time').textContent=`${m}:${ss<10?'0':''}${ss}`;},1000);
    if(window.innerWidth<=768&&window.setView)setView('map');
  };

  window.cwStopWQ=function(){
    clearInterval(WQ.timer);
    document.getElementById('wq-bar').style.display='none';
    const sb=document.getElementById('wq-start-btn');if(sb)sb.disabled=false;
    WQ.active=false;
    const best=parseInt(localStorage.getItem('wq_best')||'0');
    if(WQ.pts>best){localStorage.setItem('wq_best',WQ.pts);const el=document.getElementById('wq-best-pts');if(el)el.textContent=WQ.pts;}
    const tot=parseInt(localStorage.getItem('wq_total_added')||'0')+WQ.added;
    localStorage.setItem('wq_total_added',tot);const el2=document.getElementById('wq-total-added');if(el2)el2.textContent=tot;
    if(WQ.pts>0)alert(`WaterQuest done!\n🎮 ${WQ.pts} pts  💧 ${WQ.found} found  ➕ ${WQ.added} added`);
  };

  window.cwWQPassedWater=function(w){
    if(!WQ.active||WQ.passedIds.has(w.id))return;
    WQ.passedIds.add(w.id);WQ.found++;WQ.pts+=10;
    const f=document.getElementById('wq-found'),p=document.getElementById('wq-pts');
    if(f)f.textContent=WQ.found;if(p)p.textContent=WQ.pts;
  };

  window.cwWQAddedWater=function(){
    if(!WQ.active)return;
    WQ.added++;WQ.pts+=25;
    const a=document.getElementById('wq-added'),p=document.getElementById('wq-pts');
    if(a)a.textContent=WQ.added;if(p)p.textContent=WQ.pts;
  };

  // ─── FINDWATER LOGIC ─────────────────────────────────────────
  window.cwFindWaterGPS=function(){
    if(!navigator.geolocation){alert('GPS not available.');return;}
    const btn=document.getElementById('fw-btn');if(btn){btn.textContent='⏳…';btn.disabled=true;}
    navigator.geolocation.getCurrentPosition(pos=>{
      if(btn){btn.textContent='🔍 Show Water';btn.disabled=false;}
      document.getElementById('fw-loc').value=`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
      window.cwFindWater();
    },()=>{if(btn){btn.textContent='🔍 Show Water';btn.disabled=false;}alert('Could not get location.');},{enableHighAccuracy:true,timeout:10000});
  };

  window.cwFindWater=async function(){
    const loc=document.getElementById('fw-loc').value.trim();
    const r=parseInt(document.getElementById('fw-r').value)||10;
    if(!loc){alert('Enter a location first.');return;}
    const btn=document.getElementById('fw-btn'),res=document.getElementById('fw-result');
    if(btn){btn.textContent='⏳ Searching…';btn.disabled=true;}if(res)res.textContent='';
    let lat,lng;
    const coord=loc.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if(coord){lat=parseFloat(coord[1]);lng=parseFloat(coord[2]);}
    else{
      try{
        const gd=await(await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1`)).json();
        if(!gd.length){if(res)res.textContent='Location not found.';if(btn){btn.textContent='🔍 Show Water';btn.disabled=false;}return;}
        lat=parseFloat(gd[0].lat);lng=parseFloat(gd[0].lon);
      }catch(e){if(res)res.textContent='Geocoding failed.';if(btn){btn.textContent='🔍 Show Water';btn.disabled=false;}return;}
    }
    const rm=r*1000,q=`[out:json][timeout:30];(node["amenity"="drinking_water"](around:${rm},${lat},${lng});node["amenity"="fountain"]["drinking_water"="yes"](around:${rm},${lat},${lng});node["natural"="spring"]["drinking_water"="yes"](around:${rm},${lat},${lng});node["man_made"="water_tap"]["drinking_water"!="no"](around:${rm},${lat},${lng});node["amenity"="grave_yard"](around:${rm},${lat},${lng}););out;`;
    let pts=[];
    for(const ep of OVR){try{const d=await(await fetch(ep,{method:'POST',body:new URLSearchParams({data:q})})).json();pts=d.elements.map(e=>({id:`osm_${e.id}`,lat:e.lat,lng:e.lon,water_type:e.tags?.amenity||e.tags?.man_made||e.tags?.natural||'drinking_water',name:e.tags?.name||null,source:'fw'}));break;}catch(e){continue;}}
    if(window.S)window.S.fwPts=pts;
    const src=window.cwMap&&window.cwMap.getSource('wfw');
    if(src)src.setData({type:'FeatureCollection',features:pts.map(w=>({type:'Feature',geometry:{type:'Point',coordinates:[w.lng,w.lat]},properties:{...w}}))});
    if(window.cwMap)window.cwMap.flyTo({center:[lng,lat],zoom:r<=5?14:r<=15?12:10,speed:1.5});
    if(res){res.textContent=`${pts.length} water points within ${r}km`;res.style.color=pts.length?'var(--gn)':'var(--tm)';}
    const clr=document.getElementById('fw-clear');if(clr)clr.style.display=pts.length?'block':'none';
    if(btn){btn.textContent='🔍 Show Water';btn.disabled=false;}
    if(window.innerWidth<=768&&window.setView)setView('map');
  };

  window.cwClearFW=function(){
    if(window.S)window.S.fwPts=[];
    const src=window.cwMap&&window.cwMap.getSource('wfw');
    if(src)src.setData({type:'FeatureCollection',features:[]});
    const res=document.getElementById('fw-result'),clr=document.getElementById('fw-clear');
    if(res)res.textContent='';if(clr)clr.style.display='none';
  };

  function init(){injectWQ();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
