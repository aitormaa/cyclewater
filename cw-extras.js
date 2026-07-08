// cw-extras.js — Mobile UX, FindWater, Profile, WaterQuest
(function(){
  const OVR=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];

  function getMap(){ return window.map||null; }
  function getIdent(){ try{return JSON.parse(localStorage.getItem('cw_identity')||'null');}catch(e){return null;} }

  // ─── PARALLEL OVERPASS FETCH ──────────────────────────────────
  async function fastOverpass(q){
    const ctrl=new AbortController();
    try{
      const d=await Promise.any(OVR.map(ep=>
        fetch(ep,{method:'POST',body:new URLSearchParams({data:q}),signal:ctrl.signal})
        .then(r=>{if(!r.ok)throw new Error('bad');return r.json();})
      ));
      ctrl.abort();return d;
    }catch(e){throw new Error('Overpass unreachable');}
  }

  // ─── FINDWATER CACHE (24h) ─────────────────────────────────────
  function fwKey(loc,r){return`cw_fw_${(loc||'').toLowerCase().trim()}_${r}`;}
  function fwGet(loc,r){try{const c=JSON.parse(localStorage.getItem(fwKey(loc,r)));if(c&&Date.now()-c.ts<86400000)return c.pts;}catch(e){}return null;}
  function fwSet(loc,r,pts){try{localStorage.setItem(fwKey(loc,r),JSON.stringify({pts,ts:Date.now()}));}catch(e){}}

  // ─── PRE-GEOCODE ON INPUT (debounced) ─────────────────────────
  function initPreGeocode(){
    let timer;
    function attach(){
      const inp=document.getElementById('fw-loc');if(!inp||inp._cwPre)return;
      inp._cwPre=true;
      inp.addEventListener('input',()=>{
        clearTimeout(timer);const v=inp.value.trim();
        const coord=v.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if(coord){window._cwGeo={loc:v,lat:parseFloat(coord[1]),lng:parseFloat(coord[2])};return;}
        if(v.length<3)return;
        timer=setTimeout(async()=>{
          try{
            const d=await(await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&limit=1`)).json();
            if(d[0]&&v===document.getElementById('fw-loc')?.value.trim())
              window._cwGeo={loc:v,lat:parseFloat(d[0].lat),lng:parseFloat(d[0].lon)};
          }catch(e){}
        },500);
      });
    }
    attach();
    document.getElementById('bnav-water')?.addEventListener('click',()=>setTimeout(attach,150));
  }

  // ─── PATCH qOverpass — bbox query (3-5× faster) + 12h cache ──
  function ptNearRoute(pt,rpts,buf){
    const degBuf=buf/111000;
    const step=Math.max(1,Math.floor(rpts.length/150));
    for(let i=0;i<rpts.length;i+=step){
      const dlat=pt.lat-rpts[i].lat;
      const dlng=(pt.lng-rpts[i].lng)*Math.cos(rpts[i].lat*Math.PI/180);
      if(Math.sqrt(dlat*dlat+dlng*dlng)<degBuf)return true;
    }
    return false;
  }

  function patchQOverpass(){
    if(!window.qOverpass)return;
    window.qOverpass=async function(rpts,buf){
      const f=rpts[0],l=rpts[rpts.length-1],n=rpts.length;
      const ckey=`cw_rt_${f.lat.toFixed(3)}_${f.lng.toFixed(3)}_${l.lat.toFixed(3)}_${l.lng.toFixed(3)}_${n}_${buf}`;
      try{const c=JSON.parse(localStorage.getItem(ckey));if(c&&Date.now()-c.ts<43200000)return c.pts;}catch(e){}
      // Bounding box — much faster than around-poly for Overpass
      const lats=rpts.map(p=>p.lat),lngs=rpts.map(p=>p.lng),pad=buf/111000*1.3;
      const bb=`${Math.min(...lats)-pad},${Math.min(...lngs)-pad},${Math.max(...lats)+pad},${Math.max(...lngs)+pad}`;
      const q=`[out:json][timeout:25];(node["amenity"="drinking_water"](${bb});node["man_made"="water_tap"]["drinking_water"!="no"](${bb});node["natural"="spring"]["drinking_water"="yes"](${bb});node["amenity"="fountain"]["drinking_water"="yes"](${bb});node["amenity"="grave_yard"](${bb});way["amenity"="grave_yard"](${bb});node["landuse"="cemetery"](${bb});way["landuse"="cemetery"](${bb}););out center;`;
      let d;try{d=await fastOverpass(q);}catch(e){throw new Error('Overpass unreachable');}
      const seen=new Set();
      const raw=d.elements.filter(e=>{if(seen.has(e.id))return false;seen.add(e.id);return true;}).map(e=>{const lat=e.center?e.center.lat:e.lat,lng=e.center?e.center.lon:e.lon;return{id:`osm_${e.id}`,lat,lng,water_type:e.tags?.amenity||e.tags?.man_made||e.tags?.natural||e.tags?.landuse||'drinking_water',name:e.tags?.name||null,seasonal:e.tags?.seasonal==='yes',source:'osm'};});
      // Post-filter: only keep points within buf metres of the route
      const pts=raw.filter(p=>ptNearRoute(p,rpts,buf));
      try{localStorage.setItem(ckey,JSON.stringify({pts,ts:Date.now()}));}catch(e){}
      return pts;
    };
  }

  // ─── PROFILE SECTION ─────────────────────────────────────────
  function injectProfile(){
    const sc=document.getElementById('sidebar-content');
    if(!sc||document.getElementById('profile-section')) return;
    const div=document.createElement('div');
    div.id='profile-section';
    div.style.cssText='display:none;padding:4px 0';
    div.innerHTML=`
<div class="card" style="background:linear-gradient(135deg,rgba(14,165,233,.1),rgba(56,189,248,.05));border-color:rgba(14,165,233,.2)">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
    <div id="pf-avatar" style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0EA5E9,#38BDF8);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;color:#fff;font-weight:800">?</div>
    <div style="flex:1;min-width:0">
      <div id="pf-name" style="font-size:18px;font-weight:700;color:#EFF6FF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Anonymous</div>
      <div id="pf-email" style="font-size:11px;color:#7B91B0;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
    </div>
    <button onclick="cwIdentityEdit&&cwIdentityEdit()" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#EFF6FF;border-radius:10px;padding:7px 12px;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0">Edit</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
    <div class="pf-stat"><div id="pf-routes" class="pf-val">—</div><div class="pf-lbl">Routes</div></div>
    <div class="pf-stat"><div id="pf-wpts" class="pf-val">—</div><div class="pf-lbl">Water pts</div></div>
    <div class="pf-stat"><div id="pf-score" class="pf-val">—</div><div class="pf-lbl">WQ Score</div></div>
  </div>
  <button onclick="openLB&&openLB()" style="width:100%;padding:11px;border:none;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#EAB308);color:#1C1917;font-size:14px;font-weight:700;cursor:pointer">🏆 Leaderboard</button>
</div>`;
    sc.appendChild(div);
    // Style stat cells
    div.querySelectorAll('.pf-stat').forEach(el=>el.style.cssText='background:rgba(255,255,255,.05);border-radius:12px;padding:10px 6px;text-align:center;border:1px solid rgba(255,255,255,.07)');
    div.querySelectorAll('.pf-val').forEach(el=>el.style.cssText='font-size:20px;font-weight:800;color:#38BDF8;line-height:1.2');
    div.querySelectorAll('.pf-lbl').forEach(el=>el.style.cssText='font-size:9px;color:#7B91B0;text-transform:uppercase;letter-spacing:.5px;margin-top:3px');
    updateProfileUI();
  }

  function updateProfileUI(){
    const id=getIdent();
    const nm=id?.name||'Anonymous';
    const em=id?.email||'';
    const el1=document.getElementById('pf-name'),el2=document.getElementById('pf-email'),av=document.getElementById('pf-avatar');
    if(el1)el1.textContent=nm;
    if(el2)el2.textContent=em||'No email · contributions not synced';
    if(av)av.textContent=(nm[0]||'?').toUpperCase();
    const r=localStorage.getItem('cw_total_routes')||'0';
    const w=localStorage.getItem('cw_total_wpts')||'0';
    const s=localStorage.getItem('wq_best')||'0';
    const er=document.getElementById('pf-routes'),ew=document.getElementById('pf-wpts'),es=document.getElementById('pf-score');
    if(er)er.textContent=r;if(ew)ew.textContent=w;if(es)es.textContent=s;
  }

  // ─── PANEL / PROFILE CONTENT SWITCHING ───────────────────────
  // Cards that only appear when a route is loaded
  const ROUTE_ONLY=new Set(['stats-card','alerts-card','wlist-card','dl-row']);

  function showPanelContent(){
    const sc=document.getElementById('sidebar-content');if(!sc)return;
    const hasRoute=!!(window.S?.routePts?.length);
    Array.from(sc.children).forEach(el=>{
      if(el.id==='profile-section') el.classList.remove('pf-active');
      else if(ROUTE_ONLY.has(el.id)) el.style.display=hasRoute?'':'none';
      else if(el.id==='lb-card') el.style.display=window._cwSb?'':'none';
      else if(el.id==='cw-lb-card') el.style.display='none'; // managed by gamification toggle
      else if(el.tagName==='INPUT'&&el.type==='file') el.style.display='none'; // file inputs always hidden
      else el.style.display='';
    });
  }
  function showProfileContent(){
    const sc=document.getElementById('sidebar-content');if(!sc)return;
    Array.from(sc.children).forEach(el=>{
      if(el.id==='profile-section'){el.classList.add('pf-active');}
      else{el.style.display='none';}
    });
    updateProfileUI();
  }

  // ─── INTERNAL TAB TRACKER (curView in index.html is local, not window) ──
  let _cwTab='panel';

  // ─── MAP LAYER ISOLATION per tab ─────────────────────────────
  const TRACK_LAYERS=['route-l','route-h','wosm-l','wrep-l','wcomm-l'];
  const FW_LAYERS=['wfw-l'];
  function setLayerVis(ids,vis){
    const map=getMap();if(!map)return;
    ids.forEach(id=>{try{map.setLayoutProperty(id,'visibility',vis);}catch(e){}});
  }

  // ─── ENHANCED setView ─────────────────────────────────────────
  function enhanceSetView(){
    const _base=window.setView;
    window.setView=function(v){
      if(v==='split')v='panel';
      _cwTab=v;
      _base(v);
      // Hide route stats overlay on Water/Profile, restore on Panel if route loaded
      const so=document.getElementById('stats-overlay');
      if(so) so.style.display=(v==='panel'&&window.S?.routePts?.length)?'flex':'none';
      applyTabLayers();
      if(window.innerWidth<=768){
        if(v==='panel') showPanelContent();
        else if(v==='profile') showProfileContent();
      }
    };
  }

  // ─── CLEAR ROUTE BUTTON ───────────────────────────────────────
  window.cwClearRoute=function(){
    window.resetRoute?.();
    document.getElementById('cw-clear-btn')?.remove();
  };

  // X button on route banner — clears display, keeps in Recent Routes
  window.cwClearDisplay=function(e){
    if(e)e.stopPropagation();
    window.resetRoute?.(e);
    applyTabLayers();
  };

  // ─── PATCH updateStats — hide stats-overlay when not on Panel ─
  function patchUpdateStats(){
    const orig=window.updateStats;if(!orig)return;
    window.updateStats=function(){
      orig();
      if(_cwTab!=='panel'){
        const so=document.getElementById('stats-overlay');
        if(so)so.style.display='none';
      }
    };
  }

  function patchRouteBanner(){
    window.routeBanner=function(nm){
      const safe=(nm||'').replace(/</g,'&lt;');
      return`<div style="display:flex;align-items:center;gap:10px;text-align:left;padding:4px 0"><span style="font-size:24px">✅</span><div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--tx);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safe}</div></div><button onclick="resetRoute(event)" style="background:none;border:1px solid var(--br);color:var(--tm);border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;flex-shrink:0">Change</button><button onclick="cwClearDisplay(event)" title="Remove track from map" style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.28);color:#F87171;border-radius:8px;width:32px;height:32px;font-size:18px;line-height:1;cursor:pointer;flex-shrink:0;padding:0">×</button></div>`;
    };
  }

  function injectClearBtn(){
    if(document.getElementById('cw-clear-btn'))return;
    const hdr=document.getElementById('sidebar-header');if(!hdr)return;
    const btn=document.createElement('button');
    btn.id='cw-clear-btn';
    btn.innerHTML='🗑 Clear route';
    btn.style.cssText='background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.28);color:#F87171;border-radius:10px;padding:5px 11px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;margin-left:auto';
    btn.onclick=window.cwClearRoute;
    // Make the header flexbox to align
    hdr.style.display='flex';hdr.style.alignItems='center';hdr.style.gap='10px';
    hdr.appendChild(btn);
  }

  function patchFinishLoad(){
    const orig=window.finishLoad;if(!orig)return;
    window.finishLoad=function(pts){
      orig(pts);
      // finishLoad calls setView('split') — our override handles it
      injectClearBtn();
    };
  }

  function patchResetRoute(){
    const orig=window.resetRoute;if(!orig)return;
    window.resetRoute=function(e){
      orig(e);
      // Hide stats overlay and route-only cards
      const so=document.getElementById('stats-overlay');if(so)so.style.display='none';
      ROUTE_ONLY.forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
      document.getElementById('cw-clear-btn')?.remove();
      applyTabLayers();
    };
  }

  // ─── SWIPE — 4 panel states: closed / peek / half / open ─────
  const STATES=['','peek','half','open'];
  function getSheetState(sb){
    for(const s of ['open','half','peek'])if(sb.classList.contains(s))return s;
    return '';
  }
  function setSheetState(sb,state){
    sb.classList.remove('open','half','peek');
    if(state)sb.classList.add(state);
    if(state==='peek'||state==='half'||state==='open'){
      showPanelContent();
      ['panel','water','profile'].forEach(t=>document.getElementById('bnav-'+t)?.classList.remove('vactive'));
      document.getElementById('bnav-panel')?.classList.add('vactive');
    }
    setTimeout(()=>getMap()?.resize(),360);
  }

  function initSwipe(){
    const hdr=document.getElementById('sidebar-header');if(!hdr)return;
    let sy=0;
    hdr.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;},{passive:true});
    hdr.addEventListener('touchend',e=>{
      if(window.innerWidth>768)return;
      const dy=e.changedTouches[0].clientY-sy;
      if(Math.abs(dy)<20)return;
      const sb=document.getElementById('sidebar');
      const cur=getSheetState(sb);
      const idx=STATES.indexOf(cur);
      // swipe down — minimum is 'peek' (index 1), never fully close via swipe
      if(dy>0&&idx>1) setSheetState(sb,STATES[idx-1]);
      // swipe up — go to next bigger state
      else if(dy<0&&idx<STATES.length-1) setSheetState(sb,STATES[idx+1]);
    },{passive:true});
  }

  // ─── DELETE WATER POINT FROM TRACK (session only) ────────────
  window.cwHideWpt=function(id){
    const S=window.S;if(!S)return;
    S.waterPts=(S.waterPts||[]).filter(w=>w.id!==id);
    S.commPts=(S.commPts||[]).filter(w=>w.id!==id);
    window.refreshLayers?.();
    window.updateList?.();
    window.updateStats?.();
  };

  function patchUpdateList(){
    const orig=window.updateList;if(!orig)return;
    window.updateList=function(){
      orig(); // render original list
      // Append × remove button to every row
      const el=document.getElementById('wlist-cnt');if(!el)return;
      el.querySelectorAll('.wi:not([data-cw-del])').forEach(row=>{
        row.setAttribute('data-cw-del','1');
        const wif=row.querySelector('.wif');
        const onclick=wif?.getAttribute('onclick')||'';
        // Extract id from data-wid or from the onclick flyTo args — store id in row
        // We rebuild with id from onclick: flyTo(lng,lat) — we need id separately
        // So patch: add data-wid to row by matching against S.waterPts
        // Simpler: find all rows without a wdel and re-render completely
      });
      // Full re-render with ids
      const S=window.S,REPORTED=window.REPORTED||new Set(),TE=window.TE||{};
      if(!S)return;
      const act=(S.waterPts||[]).filter(w=>!REPORTED.has(w.id)).map(p=>({...p,_s:'osm'}));
      const rep=(S.waterPts||[]).filter(w=>REPORTED.has(w.id)).map(p=>({...p,_s:'reported'}));
      const all=[...act,...(S.commPts||[]).map(p=>({...p,_s:'community'})),...rep];
      if(!all.length){el.innerHTML='<div style="text-align:center;padding:16px 0;color:var(--tm);font-size:13px">No water points found on this route</div>';return;}
      el.innerHTML=all.slice(0,80).map(w=>{
        const em=TE[w.water_type]||'💧',tp=(w.water_type||'water').replace(/_/g,' ');
        const nm=w.name||(tp[0].toUpperCase()+tp.slice(1));
        const isCem=w.water_type==='grave_yard'||w.water_type==='cemetery';
        const bg=w._s==='community'?'👥':w._s==='reported'?'⚠️':isCem?'⛼':'🌍';
        const src=w._s==='community'?'Community':w._s==='reported'?'Reported':isCem?'Cemetery':'OSM';
        const esc=w.id.replace(/'/g,"\\'");
        return`<div class="wi" data-cw-del="1"><div class="wd ${w._s}"></div><div class="wif" onclick="flyTo(${w.lng},${w.lat})" style="flex:1;min-width:0"><div class="wn">${em} ${nm}</div><div class="wm">${bg} ${src}</div></div><button class="wdel" onclick="cwHideWpt('${esc}')" title="Remove from this ride">×</button></div>`;
      }).join('');
      if(all.length>80)el.innerHTML+=`<div style="text-align:center;color:var(--tm);font-size:11px;padding:8px">+${all.length-80} more visible on map</div>`;
    };
  }

  // ─── MAP DENSITY FILTER ───────────────────────────────────────
  function injectDensitySetting(){
    const gpxRow=document.querySelector('#gpx-int')?.closest('.sr');if(!gpxRow)return;
    if(document.getElementById('map-int'))return; // already injected
    const div=document.createElement('div');div.className='sr';
    div.innerHTML=`<div><div class="sl">Map water density</div><div class="ss">0 = show all dots on map</div></div><div class="si"><input type="number" id="map-int" value="0" min="0" max="50" step="5" oninput="window.refreshLayers&&refreshLayers()"><span class="unit">km</span></div>`;
    gpxRow.parentNode.insertBefore(div,gpxRow);
  }

  function applyTabLayers(){
    const map=getMap(),S=window.S;if(!map)return;
    const v=_cwTab;
    const EMPTY={type:'FeatureCollection',features:[]};
    const REPORTED=window.REPORTED||new Set();
    const fc=arr=>({type:'FeatureCollection',features:(arr||[]).map(w=>({type:'Feature',geometry:{type:'Point',coordinates:[w.lng,w.lat]},properties:{...w}}))});
    ['route-l','route-h'].forEach(id=>{try{map.setLayoutProperty(id,'visibility',v==='water'?'none':'visible');}catch(e){}});
    if(v==='water'){
      map.getSource('wosm')?.setData(EMPTY);
      map.getSource('wrep')?.setData(EMPTY);
      map.getSource('wcomm')?.setData(EMPTY);
      map.getSource('wfw')?.setData(fc(S?.fwPts||[]));
    } else {
      map.getSource('wfw')?.setData(EMPTY);
      if(S){
        const act=(S.waterPts||[]).filter(w=>!REPORTED.has(w.id));
        const rep=(S.waterPts||[]).filter(w=>REPORTED.has(w.id));
        map.getSource('wosm')?.setData(fc(act));
        map.getSource('wrep')?.setData(fc(rep));
        map.getSource('wcomm')?.setData(fc(S.commPts||[]));
      }
    }
  }

  function patchRefreshLayers(){
    const orig=window.refreshLayers;if(!orig)return;
    window.refreshLayers=function(){
      const S=window.S,map=getMap();if(!S||!map)return orig?.();
      const interval=parseFloat(document.getElementById('map-int')?.value)||0;
      const REPORTED=window.REPORTED||new Set();
      let act=S.waterPts.filter(w=>!REPORTED.has(w.id));
      if(interval>0&&S.routePts?.length&&window.nearestOnRoute){
        const bk={};
        act.forEach(w=>{const nr=nearestOnRoute(w,S.routePts);const b=Math.floor(nr.km/interval);if(!bk[b]||nr.dist<bk[b].dist)bk[b]={w,dist:nr.dist};});
        act=Object.values(bk).map(b=>b.w);
      }
      const rep=(S.waterPts||[]).filter(w=>REPORTED.has(w.id));
      const fc=arr=>({type:'FeatureCollection',features:(arr||[]).map(w=>({type:'Feature',geometry:{type:'Point',coordinates:[w.lng,w.lat]},properties:{...w}}))});
      map.getSource('wosm')?.setData(fc(act));
      map.getSource('wrep')?.setData(fc(rep));
      map.getSource('wcomm')?.setData(fc(S.commPts||[]));
      map.getSource('wfw')?.setData(fc(S.fwPts||[]));
      // Re-enforce tab visibility after every data refresh
      applyTabLayers();
    };
  }

  // ─── AUTO-CONNECT SUPABASE ─────────────────────────────────────
  function patchInitSB(){
    const orig=window.initSB;if(!orig)return;
    window.initSB=function(){
      const u=document.getElementById('sb-url')?.value.trim().replace(/\/+$/,'');
      const k=document.getElementById('sb-key')?.value.trim();
      if(u&&k){localStorage.setItem('cw_sb_url',u);localStorage.setItem('cw_sb_key',k);}
      orig();
      // Load leaderboard after connecting
      setTimeout(()=>window.cwLoadLeaderboard?.(),800);
    };
  }
  function autoConnectSB(){
    const u=localStorage.getItem('cw_sb_url'),k=localStorage.getItem('cw_sb_key');
    if(!u||!k)return;
    const eu=document.getElementById('sb-url'),ek=document.getElementById('sb-key');
    if(eu)eu.value=u;if(ek)ek.value=k;
    setTimeout(()=>window.initSB?.(),900);
  }

  // ─── FINDWATER ────────────────────────────────────────────────
  window.cwFindWaterGPS=function(){
    if(!navigator.geolocation){alert('GPS not available.');return;}
    const btn=document.getElementById('fw-btn'),res=document.getElementById('fw-result');
    if(btn){btn.textContent='📍…';btn.disabled=true;}
    if(res){res.textContent='Getting location…';res.style.color='#7B91B0';}
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude,lng=pos.coords.longitude;
      const coordStr=`${lat.toFixed(5)},${lng.toFixed(5)}`;
      const locEl=document.getElementById('fw-loc');if(locEl)locEl.value=coordStr;
      // Cache coords so flyTo works even on cache hit
      window._cwGeo={loc:coordStr,lat,lng};
      // Fly to current location IMMEDIATELY
      getMap()?.flyTo({center:[lng,lat],zoom:14,speed:2,essential:true});
      if(btn){btn.textContent='Search';btn.disabled=false;}
      if(res){res.textContent='';}
      window.cwFindWater();
    },()=>{
      if(btn){btn.textContent='Search';btn.disabled=false;}
      if(res){res.textContent='❌ Location unavailable';res.style.color='#F97316';}
    },{enableHighAccuracy:false,timeout:8000,maximumAge:30000});
  };

  window.cwFindWater=async function(){
    const locEl=document.getElementById('fw-loc'),rEl=document.getElementById('fw-r');
    const loc=(locEl?.value||'').trim(),r=parseInt(rEl?.value)||5;
    if(!loc){alert('Enter a city or town name first.');return;}
    const btn=document.getElementById('fw-btn'),res=document.getElementById('fw-result');
    if(btn){btn.textContent='⏳…';btn.disabled=true;}
    if(res){res.textContent='Searching…';res.style.color='#7B91B0';}
    // Check cache first
    const cached=fwGet(loc,r);
    let lat,lng,pts;
    if(cached){
      pts=cached;
      // Still need coordinates to fly to — use pre-geocoded if available
      const pre=window._cwGeo;
      if(pre&&pre.loc.toLowerCase()===loc.toLowerCase()){lat=pre.lat;lng=pre.lng;}
      else{
        const coord=loc.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if(coord){lat=parseFloat(coord[1]);lng=parseFloat(coord[2]);}
        else try{const gd=await(await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1`)).json();if(gd[0]){lat=parseFloat(gd[0].lat);lng=parseFloat(gd[0].lon);}}catch(e){}
      }
    } else {
      // Resolve coords: use pre-geocoded if fresh, else geocode now
      const pre=window._cwGeo;
      const coord=loc.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if(coord){lat=parseFloat(coord[1]);lng=parseFloat(coord[2]);}
      else if(pre&&pre.loc.toLowerCase()===loc.toLowerCase()){lat=pre.lat;lng=pre.lng;}
      else{
        try{
          const gd=await(await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1`)).json();
          if(!gd.length){if(res){res.textContent='❌ Location not found.';res.style.color='#F97316';}if(btn){btn.textContent='Search';btn.disabled=false;}return;}
          lat=parseFloat(gd[0].lat);lng=parseFloat(gd[0].lon);
        }catch(e){if(res){res.textContent='❌ Network error.';res.style.color='#F97316';}if(btn){btn.textContent='Search';btn.disabled=false;}return;}
      }
      // Fly to location NOW — before slow Overpass query
      getMap()?.flyTo({center:[lng,lat],zoom:r<=1?14:r<=3?12:r<=5?11:r<=15?10:9,speed:2,essential:true});
      const rm=r*1000;
      const q=`[out:json][timeout:25];(node["amenity"="drinking_water"](around:${rm},${lat},${lng});node["amenity"="fountain"]["drinking_water"="yes"](around:${rm},${lat},${lng});node["natural"="spring"]["drinking_water"="yes"](around:${rm},${lat},${lng});node["man_made"="water_tap"]["drinking_water"!="no"](around:${rm},${lat},${lng}););out;`;
      try{
        const d=await fastOverpass(q);
        pts=d.elements.map(e=>({id:`osm_${e.id}`,lat:e.lat,lng:e.lon,water_type:e.tags?.amenity||e.tags?.man_made||'drinking_water',name:e.tags?.name||null,source:'fw'}));
        fwSet(loc,r,pts);
      }catch(e){pts=[];}
    }
    // Store and display on map
    if(window.S)window.S.fwPts=pts;
    const map=getMap();
    if(map){
      const fc={type:'FeatureCollection',features:pts.map(w=>({type:'Feature',geometry:{type:'Point',coordinates:[w.lng,w.lat]},properties:{...w}}))};
      map.getSource('wfw')?.setData(fc);
      // flyTo already called before query for fresh searches; fly again for cache hits
      if(cached&&lat&&lng) map.flyTo({center:[lng,lat],zoom:r<=1?14:r<=3?12:r<=5?11:r<=15?10:9,speed:2,essential:true});
    }
    if(res){
      res.textContent=pts.length?`✅ ${pts.length} water point${pts.length>1?'s':''} within ${r}km`:`⚠️ None found — try increasing the radius`;
      res.style.color=pts.length?'#4ADE80':'#F97316';
    }
    const clr=document.getElementById('fw-clear');if(clr)clr.style.display=pts.length?'block':'none';
    if(btn){btn.textContent='Search';btn.disabled=false;}
  };

  window.cwClearFW=function(){
    if(window.S)window.S.fwPts=[];
    getMap()?.getSource('wfw')?.setData({type:'FeatureCollection',features:[]});
    const res=document.getElementById('fw-result'),clr=document.getElementById('fw-clear');
    if(res)res.textContent='';if(clr)clr.style.display='none';
  };

  // ─── WATER TAB — ADD WATER POINT ─────────────────────────────
  window.cwWaterTabAdd=function(){
    let form=document.getElementById('wt-add-form');
    if(!form){
      form=document.createElement('div');form.id='wt-add-form';
      form.style.cssText='position:absolute;bottom:calc(90px + env(safe-area-inset-bottom));left:12px;right:12px;z-index:31;background:rgba(13,20,38,.96);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:16px;backdrop-filter:blur(14px);box-shadow:0 8px 32px rgba(0,0,0,.5)';
      form.innerHTML=`<div style="font-size:14px;font-weight:700;color:#EFF6FF;margin-bottom:10px">➕ Add Water Point</div>
<p style="font-size:11px;color:#7B91B0;margin-bottom:10px;line-height:1.5">Tap the map to place, or use GPS for your current location.</p>
<div style="display:flex;gap:8px;margin-bottom:10px">
  <button onclick="cwWaterTabAddGPS()" style="flex:1;padding:9px;border:none;border-radius:10px;background:rgba(56,189,248,.15);color:#38BDF8;font-size:12px;font-weight:600;cursor:pointer;border:1px solid rgba(56,189,248,.25)">📍 GPS</button>
  <button onclick="cwWaterTabTapMap()" style="flex:1;padding:9px;border:none;border-radius:10px;background:rgba(74,222,128,.15);color:#4ADE80;font-size:12px;font-weight:600;cursor:pointer;border:1px solid rgba(74,222,128,.25)">🗺️ Tap map</button>
</div>
<select id="wt-type" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 12px;color:#EFF6FF;font-size:13px;margin-bottom:8px">
  <option value="drinking_water">🚰 Drinking water tap</option>
  <option value="fountain">⛲ Fountain</option>
  <option value="spring">🌿 Natural spring</option>
  <option value="water_tap">🚿 Water tap</option>
</select>
<input id="wt-note" type="text" placeholder="Notes (optional)…" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 12px;color:#EFF6FF;font-size:13px;margin-bottom:10px;outline:none">
<div id="wt-coords" style="font-size:10px;color:#7B91B0;text-align:center;margin-bottom:8px;min-height:14px"></div>
<div style="display:flex;gap:8px">
  <button onclick="document.getElementById('wt-add-form').remove()" style="flex:1;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:none;color:#7B91B0;font-size:12px;cursor:pointer">Cancel</button>
  <button id="wt-save-btn" onclick="cwWaterTabSave()" style="flex:2;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#4ADE80,#22C55E);color:#fff;font-size:13px;font-weight:700;cursor:pointer" disabled>Save</button>
</div>`;
      document.getElementById('map-container').appendChild(form);
    } else { form.style.display=form.style.display==='none'?'':form.remove()&&''; }
    if(form.parentNode){form._lat=null;form._lng=null;const s=document.getElementById('wt-save-btn');if(s)s.disabled=true;}
  };

  window.cwWaterTabAddGPS=function(){
    if(!navigator.geolocation){alert('GPS not available.');return;}
    navigator.geolocation.getCurrentPosition(pos=>{
      const f=document.getElementById('wt-add-form');if(!f)return;
      f._lat=pos.coords.latitude;f._lng=pos.coords.longitude;
      const c=document.getElementById('wt-coords');if(c)c.textContent=`📍 ${f._lat.toFixed(5)}, ${f._lng.toFixed(5)}`;
      const s=document.getElementById('wt-save-btn');if(s)s.disabled=false;
    },()=>alert('GPS unavailable.'),{enableHighAccuracy:true,timeout:8000});
  };

  window.cwWaterTabTapMap=function(){
    const f=document.getElementById('wt-add-form');if(f)f.style.display='none';
    const map=getMap();if(!map)return;
    map.getCanvas().style.cursor='crosshair';
    const handler=e=>{
      map.getCanvas().style.cursor='';map.off('click',handler);
      if(f){f.style.display='';f._lat=e.lngLat.lat;f._lng=e.lngLat.lng;const c=document.getElementById('wt-coords');if(c)c.textContent=`📍 ${f._lat.toFixed(5)}, ${f._lng.toFixed(5)}`;const s=document.getElementById('wt-save-btn');if(s)s.disabled=false;}
    };
    map.on('click',handler);
  };

  window.cwWaterTabSave=function(){
    const f=document.getElementById('wt-add-form');if(!f||f._lat==null)return;
    const type=document.getElementById('wt-type')?.value||'drinking_water';
    const note=document.getElementById('wt-note')?.value||'';
    if(window.addCommPt){addCommPt({lat:f._lat,lng:f._lng,water_type:type,notes:note});}
    else if(window.S){const id='local_'+Date.now();window.S.commPts=window.S.commPts||[];window.S.commPts.push({id,lat:f._lat,lng:f._lng,water_type:type,notes:note,source:'community'});window.refreshLayers?.();}
    const tot=parseInt(localStorage.getItem('cw_total_wpts')||'0')+1;localStorage.setItem('cw_total_wpts',String(tot));
    f.remove();window.cwWQAddedWater?.();
  };

  // ─── WATERQUEST ───────────────────────────────────────────────
  const WQ={active:false,start:0,found:0,added:0,pts:0,timer:null,passedIds:new Set()};
  window.cwStartWQ=function(){
    Object.assign(WQ,{active:true,start:Date.now(),found:0,added:0,pts:0,passedIds:new Set()});
    ['wq-found','wq-added','wq-pts','wq-time'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=id==='wq-time'?'0:00':'0';});
    document.getElementById('wq-bar')?.style.setProperty('display','flex');
    const sb=document.getElementById('wq-start-btn');if(sb)sb.disabled=true;
    WQ.timer=setInterval(()=>{const s=Math.floor((Date.now()-WQ.start)/1000),m=Math.floor(s/60),ss=s%60;const el=document.getElementById('wq-time');if(el)el.textContent=`${m}:${ss<10?'0':''}${ss}`;},1000);
    window.setView?.('water');
  };
  window.cwStopWQ=function(){
    clearInterval(WQ.timer);document.getElementById('wq-bar')?.style.setProperty('display','none');
    const sb=document.getElementById('wq-start-btn');if(sb)sb.disabled=false;
    WQ.active=false;
    if(WQ.pts>parseInt(localStorage.getItem('wq_best')||'0'))localStorage.setItem('wq_best',String(WQ.pts));
    if(WQ.pts>0)alert(`WaterQuest done!\n🎮 ${WQ.pts} pts  💧 ${WQ.found} found  ➕ ${WQ.added} added`);
  };
  window.cwWQPassedWater=function(w){if(!WQ.active||WQ.passedIds.has(w.id))return;WQ.passedIds.add(w.id);WQ.found++;WQ.pts+=10;const f=document.getElementById('wq-found'),p=document.getElementById('wq-pts');if(f)f.textContent=WQ.found;if(p)p.textContent=WQ.pts;};
  window.cwWQAddedWater=function(){if(!WQ.active)return;WQ.added++;WQ.pts+=25;const a=document.getElementById('wq-added'),p=document.getElementById('wq-pts');if(a)a.textContent=WQ.added;if(p)p.textContent=WQ.pts;};

  function injectWQBar(){
    if(document.getElementById('wq-bar'))return;
    const bar=document.createElement('div');bar.id='wq-bar';
    bar.style.cssText='position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;padding:10px 16px;padding-top:calc(10px + env(safe-area-inset-top));display:none;align-items:center;gap:12px;z-index:200;font-size:13px';
    bar.innerHTML=`<div style="display:flex;gap:16px;flex:1"><div style="text-align:center"><div id="wq-time" style="font-size:20px;font-weight:800">0:00</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Riding</div></div><div style="text-align:center"><div id="wq-found" style="font-size:20px;font-weight:800">0</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Found</div></div><div style="text-align:center"><div id="wq-added" style="font-size:20px;font-weight:800">0</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Added</div></div><div style="text-align:center"><div id="wq-pts" style="font-size:20px;font-weight:800">0</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Pts</div></div></div><button onclick="cwStopWQ&&cwStopWQ()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer">Stop</button>`;
    document.body.prepend(bar);
  }

  // ─── COMMUNITY LEADERBOARD ────────────────────────────────────
  function injectLeaderboard(){
    const sc=document.getElementById('sidebar-content');if(!sc||document.getElementById('lb-card'))return;
    const card=document.createElement('div');card.id='lb-card';card.className='card';card.style.display='none';
    card.innerHTML=`<div class="stog col" onclick="toggleSec('lb-bod',this)"><span class="ct" style="margin:0">🏆 Community Routes</span><span class="arr">▼</span></div><div class="sbod hid" id="lb-bod"><div id="lb-list" style="margin-top:8px"><div style="color:var(--tm);font-size:12px;text-align:center;padding:12px">Connect Supabase to see community routes</div></div><button onclick="window.cwLoadLeaderboard&&cwLoadLeaderboard()" style="background:none;border:1px solid var(--br);color:var(--tm);border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer;margin-top:6px;width:100%">↻ Refresh</button></div>`;
    const dl=document.getElementById('dl-row');if(dl)sc.insertBefore(card,dl);else sc.appendChild(card);
  }

  window.cwLoadLeaderboard=async function(){
    const sb=window._cwSb;if(!sb)return;
    const card=document.getElementById('lb-card');if(card)card.style.display='';
    const list=document.getElementById('lb-list');if(!list)return;
    list.innerHTML='<div style="color:var(--tm);font-size:12px;text-align:center;padding:12px">Loading…</div>';
    try{
      const{data,error}=await sb.from('community_water_points').select('contributor_name,points');
      if(error)throw error;
      if(!data||!data.length){list.innerHTML='<div style="color:var(--tm);font-size:12px;text-align:center;padding:12px">No contributions yet — add a water point to be first! 💧</div>';return;}
      // Aggregate by contributor
      const agg={};
      data.forEach(r=>{
        const n=r.contributor_name||'Anonymous';
        if(!agg[n])agg[n]={name:n,count:0,pts:0};
        agg[n].count++;agg[n].pts+=(r.points||10);
      });
      const sorted=Object.values(agg).sort((a,b)=>b.pts-a.pts).slice(0,15);
      const medals=['🥇','🥈','🥉'];
      list.innerHTML=sorted.map((u,i)=>`<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--c1);border:1px solid var(--br);border-radius:12px;margin-bottom:7px"><span style="font-size:20px;flex-shrink:0">${medals[i]||'💧'}</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--tx)">${u.name}</div><div style="font-size:10px;color:var(--tm);margin-top:2px">${u.count} point${u.count>1?'s':''} added · ${u.pts} pts</div></div>${i<3?`<div style="font-size:11px;font-weight:700;color:#38BDF8">${u.pts}pts</div>`:''}</div>`).join('');
    }catch(e){list.innerHTML=`<div style="color:var(--tm);font-size:11px;padding:8px;text-align:center">❌ ${e.message}</div>`;}
  };



  // ─── INIT ─────────────────────────────────────────────────────
  function init(){
    injectProfile();
    injectWQBar();
    enhanceSetView();
    initSwipe();
    injectDensitySetting();
    patchRefreshLayers();
    patchUpdateList();
    patchFinishLoad();
    patchResetRoute();
    patchRouteBanner();
    patchQOverpass();
    patchUpdateStats();
    initPreGeocode();
    patchInitSB();
    injectLeaderboard();
    autoConnectSB();
    // Start on Panel tab with half-sheet
    if(window.innerWidth<=768) setTimeout(()=>window.setView?.('panel'),300);
    // Set initial layer state once map is loaded
    const _mapReady=()=>applyTabLayers();
    const m=getMap();if(m){if(m.loaded())_mapReady();else m.once('load',_mapReady);}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
