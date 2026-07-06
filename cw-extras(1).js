// cw-extras.js — FindWater + WaterQuest + Enhanced mobile UX
(function(){
  const OVR=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];

  // ─── ENHANCED setView (overrides index.html version) ─────────
  // Runs after DOMContentLoaded so it wraps the base version
  function enhanceSetView(){
    const _base = window.setView;
    window.setView = function(v){
      _base(v);
      if(window.innerWidth > 768) return;
      const sc = document.getElementById('sidebar-content');
      if(v === 'water'){
        setTimeout(()=>{
          const fw = document.getElementById('fw-bod');
          if(fw){ fw.classList.remove('hid'); fw.previousElementSibling?.classList.remove('col'); }
          const card = fw?.closest('.card');
          if(card && sc) sc.scrollTo({top: card.offsetTop - 8, behavior:'smooth'});
        }, 380);
      } else if(v === 'profile'){
        setTimeout(()=>{
          const s = document.getElementById('set-bod');
          if(s){ s.classList.remove('hid'); }
          const card = s?.closest('.card');
          if(card && sc) sc.scrollTo({top: card.offsetTop - 8, behavior:'smooth'});
        }, 380);
      } else if(v === 'panel'){
        setTimeout(()=>{ if(sc) sc.scrollTop = 0; }, 50);
      }
    };
  }

  // ─── SWIPE to resize bottom sheet ────────────────────────────
  function initSwipe(){
    const hdr = document.getElementById('sidebar-header');
    if(!hdr) return;
    let sy = 0;
    hdr.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, {passive:true});
    hdr.addEventListener('touchend', e => {
      if(window.innerWidth > 768) return;
      const dy = e.changedTouches[0].clientY - sy;
      const sb = document.getElementById('sidebar');
      if(dy > 55){ // drag down
        if(sb.classList.contains('open')){
          sb.classList.remove('open'); sb.classList.add('half');
        } else if(sb.classList.contains('half')){
          window.setView('map');
        }
      } else if(dy < -55){ // drag up
        if(sb.classList.contains('half')){
          sb.classList.remove('half'); sb.classList.add('open');
          // update active tab
          ['map','panel','water','profile'].forEach(t=>document.getElementById('bnav-'+t)?.classList.remove('vactive'));
          document.getElementById('bnav-panel')?.classList.add('vactive');
        }
      }
      setTimeout(()=>window.cwMap?.resize(), 360);
    }, {passive:true});
  }

  // ─── MAP WATER DENSITY FILTER ─────────────────────────────────
  // Inject density setting into Settings card
  function injectDensitySetting(){
    const gpxRow = document.querySelector('#gpx-int')?.closest('.sr');
    if(!gpxRow) return;
    const div = document.createElement('div');
    div.className = 'sr';
    div.innerHTML = `<div><div class="sl">Map water density</div><div class="ss">Filter dots shown on map · 0 = all</div></div><div class="si"><input type="number" id="map-int" value="0" min="0" max="50" step="5" oninput="cwRefreshWithDensity()"><span class="unit">km</span></div>`;
    gpxRow.parentNode.insertBefore(div, gpxRow);
  }

  // Override refreshLayers to apply density filter
  window.cwRefreshWithDensity = function(){
    if(window.cwApp) cwApp.refreshLayers();
  };

  const _baseRefresh = null; // will be set after load
  function patchRefreshLayers(){
    const orig = window.refreshLayers;
    if(!orig) return;
    window.refreshLayers = function(){
      const S = window.S;
      if(!S) return orig();
      const interval = parseFloat(document.getElementById('map-int')?.value) || 0;
      let act = S.waterPts.filter(w => !window.REPORTED?.has(w.id));
      if(interval > 0 && S.routePts.length){
        const bk = {};
        act.forEach(w => {
          if(!window.nearestOnRoute) return;
          const nr = nearestOnRoute(w, S.routePts);
          const b = Math.floor(nr.km / interval);
          if(!bk[b] || nr.dist < bk[b].dist) bk[b] = {w, dist: nr.dist};
        });
        act = Object.values(bk).map(b => b.w);
      }
      // Call original with modified S temporarily
      const orig_pts = S.waterPts;
      const rep = orig_pts.filter(w => window.REPORTED?.has(w.id));
      const map = window.cwMap;
      if(!map) return;
      const EMPTY = {type:'FeatureCollection',features:[]};
      const toFC = arr => ({type:'FeatureCollection',features:arr.map(w=>({type:'Feature',geometry:{type:'Point',coordinates:[w.lng,w.lat]},properties:{...w}}))});
      map.getSource('wosm')?.setData(toFC(act));
      map.getSource('wrep')?.setData(toFC(rep));
      map.getSource('wcomm')?.setData(toFC(S.commPts));
    };
  }

  // ─── AUTO-CONNECT SUPABASE ─────────────────────────────────────
  function autoConnectSB(){
    const u = localStorage.getItem('cw_sb_url');
    const k = localStorage.getItem('cw_sb_key');
    if(u && k){
      const eu = document.getElementById('sb-url'), ek = document.getElementById('sb-key');
      if(eu) eu.value = u;
      if(ek) ek.value = k;
      // auto-connect silently
      setTimeout(()=>{ if(window.initSB) initSB(); }, 800);
    }
  }

  // Patch initSB to save credentials
  function patchInitSB(){
    const orig = window.initSB;
    if(!orig) return;
    window.initSB = function(){
      const u = document.getElementById('sb-url')?.value.trim().replace(/\/+$/,'');
      const k = document.getElementById('sb-key')?.value.trim();
      if(u && k){ localStorage.setItem('cw_sb_url', u); localStorage.setItem('cw_sb_key', k); }
      orig();
    };
  }

  // ─── WATERQUEST ──────────────────────────────────────────────
  const WQ={active:false,start:0,found:0,added:0,pts:0,timer:null,passedIds:new Set()};

  function loadStats(){
    const b=localStorage.getItem('wq_best')||'—';
    const t=localStorage.getItem('wq_total_added')||'—';
    const e1=document.getElementById('wq-best-pts');
    const e2=document.getElementById('wq-total-added');
    if(e1)e1.textContent=b;if(e2)e2.textContent=t;
  }

  window.cwStartWQ=function(){
    Object.assign(WQ,{active:true,start:Date.now(),found:0,added:0,pts:0,passedIds:new Set()});
    ['wq-found','wq-added','wq-pts'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='0';});
    const wt=document.getElementById('wq-time');if(wt)wt.textContent='0:00';
    const bar=document.getElementById('wq-bar');if(bar)bar.style.display='flex';
    const sb=document.getElementById('wq-start-btn');if(sb)sb.disabled=true;
    WQ.timer=setInterval(()=>{const s=Math.floor((Date.now()-WQ.start)/1000),m=Math.floor(s/60),ss=s%60;const el=document.getElementById('wq-time');if(el)el.textContent=`${m}:${ss<10?'0':''}${ss}`;},1000);
    if(window.innerWidth<=768&&window.setView)setView('map');
  };

  window.cwStopWQ=function(){
    clearInterval(WQ.timer);
    const bar=document.getElementById('wq-bar');if(bar)bar.style.display='none';
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
    if(window.innerWidth<=768)setTimeout(()=>{ if(window.cwMap)window.cwMap.resize(); },100);
  };

  window.cwClearFW=function(){
    if(window.S)window.S.fwPts=[];
    const src=window.cwMap&&window.cwMap.getSource('wfw');
    if(src)src.setData({type:'FeatureCollection',features:[]});
    const res=document.getElementById('fw-result'),clr=document.getElementById('fw-clear');
    if(res)res.textContent='';if(clr)clr.style.display='none';
  };

  // ─── INJECT WaterQuest card ───────────────────────────────────
  function injectWQ(){
    const sc=document.getElementById('sidebar-content');
    if(!sc||document.getElementById('wq-bar')) return;
    // Top bar
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
    // Sidebar card
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
    const settingsCard=Array.from(sc.querySelectorAll('.card')).find(c=>c.querySelector('#set-bod'));
    if(settingsCard)sc.insertBefore(card,settingsCard);else sc.appendChild(card);
    loadStats();
  }

  // ─── INIT ─────────────────────────────────────────────────────
  function init(){
    injectWQ();
    injectDensitySetting();
    enhanceSetView();
    initSwipe();
    patchRefreshLayers();
    patchInitSB();
    autoConnectSB();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
