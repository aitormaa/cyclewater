// cw-extras.js — Mobile UX, FindWater, Profile, WaterQuest
(function(){
  const OVR=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];

  // ─── PROFILE SECTION (injected into sidebar) ─────────────────
  function injectProfile(){
    const sc=document.getElementById('sidebar-content');
    if(!sc||document.getElementById('profile-section')) return;
    const div=document.createElement('div');
    div.id='profile-section';
    div.style.cssText='display:none;padding:4px 0';
    div.innerHTML=`
      <div class="card" style="background:linear-gradient(135deg,rgba(14,165,233,.1),rgba(56,189,248,.05));border-color:rgba(14,165,233,.2)">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div id="pf-avatar" style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0EA5E9,#38BDF8);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">👤</div>
          <div style="flex:1;min-width:0">
            <div id="pf-name" style="font-size:17px;font-weight:700;color:#EFF6FF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Anonymous</div>
            <div id="pf-email" style="font-size:11px;color:#7B91B0;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
          </div>
          <button onclick="cwIdentityEdit&&cwIdentityEdit()" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#EFF6FF;border-radius:10px;padding:7px 12px;font-size:11px;cursor:pointer;white-space:nowrap">Edit</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
          <div class="pf-stat"><div id="pf-routes" class="pf-val">0</div><div class="pf-lbl">Routes</div></div>
          <div class="pf-stat"><div id="pf-wpts" class="pf-val">0</div><div class="pf-lbl">Water pts</div></div>
          <div class="pf-stat"><div id="pf-score" class="pf-val">0</div><div class="pf-lbl">WQ Score</div></div>
        </div>
        <button onclick="openLB&&openLB()" style="width:100%;padding:10px;border:none;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#EAB308);color:#1C1917;font-size:13px;font-weight:700;cursor:pointer">🏆 Leaderboard</button>
      </div>
      <div class="card">
        <div class="stog" onclick="this.nextElementSibling.classList.toggle('hid');this.classList.toggle('col')"><span class="ct" style="margin:0">⚙️ Settings</span><span class="arr">▼</span></div>
        <div id="pf-settings-body" class="sbod"></div>
      </div>`;
    sc.appendChild(div);
    // Move settings card content into profile section
    const settingsCard=Array.from(sc.querySelectorAll('.card')).find(c=>c.querySelector('#set-bod'));
    const pfsb=document.getElementById('pf-settings-body');
    if(settingsCard&&pfsb){const sbod=settingsCard.querySelector('#set-bod');if(sbod){pfsb.appendChild(sbod.cloneNode(true));}}
    updateProfileUI();
    // Style stats
    document.querySelectorAll('.pf-stat').forEach(el=>{el.style.cssText='background:rgba(255,255,255,.05);border-radius:12px;padding:10px 6px;text-align:center;border:1px solid rgba(255,255,255,.07)';});
    document.querySelectorAll('.pf-val').forEach(el=>{el.style.cssText='font-size:20px;font-weight:800;color:#38BDF8;line-height:1.2';});
    document.querySelectorAll('.pf-lbl').forEach(el=>{el.style.cssText='font-size:9px;color:#7B91B0;text-transform:uppercase;letter-spacing:.5px;margin-top:3px';});
  }

  function updateProfileUI(){
    const nm=localStorage.getItem('cw_user_name')||'Anonymous';
    const em=localStorage.getItem('cw_user_email')||'';
    const el1=document.getElementById('pf-name'),el2=document.getElementById('pf-email');
    if(el1)el1.textContent=nm;if(el2)el2.textContent=em;
    const r=localStorage.getItem('cw_total_routes')||'0';
    const w=localStorage.getItem('cw_total_wpts')||'0';
    const s=localStorage.getItem('wq_best')||'0';
    const er=document.getElementById('pf-routes'),ew=document.getElementById('pf-wpts'),es=document.getElementById('pf-score');
    if(er)er.textContent=r;if(ew)ew.textContent=w;if(es)es.textContent=s;
    const av=document.getElementById('pf-avatar');if(av)av.textContent=nm[0]?.toUpperCase()||'👤';
  }

  // ─── PANEL / PROFILE CONTENT SWITCHING (mobile) ─────────────
  function showPanelContent(){
    const sc=document.getElementById('sidebar-content');if(!sc)return;
    Array.from(sc.children).forEach(el=>{el.style.display=el.id==='profile-section'?'none':'';});
  }
  function showProfileContent(){
    const sc=document.getElementById('sidebar-content');if(!sc)return;
    Array.from(sc.children).forEach(el=>{el.style.display=el.id==='profile-section'?'':'none';});
    updateProfileUI();
  }

  // ─── ENHANCED setView ─────────────────────────────────────────
  function enhanceSetView(){
    const _base=window.setView;
    window.setView=function(v){
      _base(v);
      if(window.innerWidth<=768){
        if(v==='panel') showPanelContent();
        else if(v==='profile') showProfileContent();
      }
    };
  }

  // ─── SWIPE GESTURES on sheet handle ──────────────────────────
  function initSwipe(){
    const hdr=document.getElementById('sidebar-header');if(!hdr)return;
    let sy=0;
    hdr.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;},{passive:true});
    hdr.addEventListener('touchend',e=>{
      if(window.innerWidth>768)return;
      const dy=e.changedTouches[0].clientY-sy;
      const sb=document.getElementById('sidebar');
      if(dy>55){
        if(sb.classList.contains('open')){sb.classList.remove('open');sb.classList.add('half');}
        else if(sb.classList.contains('half')){window.setView('water');}// close → water/map
      }else if(dy<-55){
        if(sb.classList.contains('half')){sb.classList.remove('half');sb.classList.add('open');}
      }
      setTimeout(()=>window.map?.resize(),360);
    },{passive:true});
  }

  // ─── MAP DENSITY FILTER ───────────────────────────────────────
  function injectDensitySetting(){
    const gpxRow=document.querySelector('#gpx-int')?.closest('.sr');if(!gpxRow)return;
    const div=document.createElement('div');div.className='sr';
    div.innerHTML=`<div><div class="sl">Map water density</div><div class="ss">0 = show all dots</div></div><div class="si"><input type="number" id="map-int" value="0" min="0" max="50" step="5" oninput="window.refreshLayers&&refreshLayers()"><span class="unit">km</span></div>`;
    gpxRow.parentNode.insertBefore(div,gpxRow);
  }

  function patchRefreshLayers(){
    const orig=window.refreshLayers;if(!orig)return;
    window.refreshLayers=function(){
      const S=window.S,map=window.map;if(!S||!map)return orig?.();
      const interval=parseFloat(document.getElementById('map-int')?.value)||0;
      const REPORTED=window.REPORTED||new Set();
      let act=S.waterPts.filter(w=>!REPORTED.has(w.id));
      if(interval>0&&S.routePts.length&&window.nearestOnRoute){
        const bk={};
        act.forEach(w=>{const nr=nearestOnRoute(w,S.routePts);const b=Math.floor(nr.km/interval);if(!bk[b]||nr.dist<bk[b].dist)bk[b]={w,dist:nr.dist};});
        act=Object.values(bk).map(b=>b.w);
      }
      const rep=S.waterPts.filter(w=>REPORTED.has(w.id));
      const EMPTY={type:'FeatureCollection',features:[]};
      const fc=arr=>({type:'FeatureCollection',features:arr.map(w=>({type:'Feature',geometry:{type:'Point',coordinates:[w.lng,w.lat]},properties:{...w}}))});
      map.getSource('wosm')?.setData(fc(act));
      map.getSource('wrep')?.setData(fc(rep));
      map.getSource('wcomm')?.setData(fc(S.commPts||[]));
      map.getSource('wfw')?.setData(fc(S.fwPts||[]));
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
    };
  }
  function autoConnectSB(){
    const u=localStorage.getItem('cw_sb_url'),k=localStorage.getItem('cw_sb_key');
    if(!u||!k)return;
    const eu=document.getElementById('sb-url'),ek=document.getElementById('sb-key');
    if(eu)eu.value=u;if(ek)ek.value=k;
    setTimeout(()=>window.initSB?.(),900);
  }

  // ─── FINDWATER LOGIC ─────────────────────────────────────────
  window.cwFindWaterGPS=function(){
    if(!navigator.geolocation){alert('GPS not available.');return;}
    const btn=document.getElementById('fw-btn');if(btn){btn.textContent='⏳…';btn.disabled=true;}
    navigator.geolocation.getCurrentPosition(pos=>{
      if(btn){btn.textContent='Search';btn.disabled=false;}
      const loc=document.getElementById('fw-loc');
      if(loc)loc.value=`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
      window.cwFindWater();
    },()=>{if(btn){btn.textContent='Search';btn.disabled=false;}alert('Could not get GPS.');},{enableHighAccuracy:true,timeout:10000});
  };

  window.cwFindWater=async function(){
    const locEl=document.getElementById('fw-loc'),rEl=document.getElementById('fw-r');
    const loc=locEl?.value.trim(),r=parseInt(rEl?.value)||10;
    if(!loc){alert('Enter a city or town name first.');return;}
    const btn=document.getElementById('fw-btn'),res=document.getElementById('fw-result');
    if(btn){btn.textContent='⏳…';btn.disabled=true;}if(res)res.textContent='Searching…';
    let lat,lng;
    const coord=loc.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if(coord){lat=parseFloat(coord[1]);lng=parseFloat(coord[2]);}
    else{
      try{
        const gd=await(await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1`)).json();
        if(!gd.length){if(res)res.textContent='❌ Location not found.';if(btn){btn.textContent='Search';btn.disabled=false;}return;}
        lat=parseFloat(gd[0].lat);lng=parseFloat(gd[0].lon);
      }catch(e){if(res)res.textContent='❌ Geocoding failed.';if(btn){btn.textContent='Search';btn.disabled=false;}return;}
    }
    const rm=r*1000,q=`[out:json][timeout:25];(node["amenity"="drinking_water"](around:${rm},${lat},${lng});node["amenity"="fountain"]["drinking_water"="yes"](around:${rm},${lat},${lng});node["natural"="spring"]["drinking_water"="yes"](around:${rm},${lat},${lng});node["man_made"="water_tap"]["drinking_water"!="no"](around:${rm},${lat},${lng}););out;`;
    let pts=[];
    for(const ep of OVR){
      try{const d=await(await fetch(ep,{method:'POST',body:new URLSearchParams({data:q})})).json();pts=d.elements.map(e=>({id:`osm_${e.id}`,lat:e.lat,lng:e.lon,water_type:e.tags?.amenity||e.tags?.man_made||'drinking_water',name:e.tags?.name||null,source:'fw'}));break;}
      catch(e){continue;}
    }
    if(window.S)window.S.fwPts=pts;
    window.map?.getSource('wfw')?.setData({type:'FeatureCollection',features:pts.map(w=>({type:'Feature',geometry:{type:'Point',coordinates:[w.lng,w.lat]},properties:{...w}}))});
    window.map?.flyTo({center:[lng,lat],zoom:r<=5?14:r<=15?12:10,speed:1.4});
    if(res){res.textContent=pts.length?`✅ ${pts.length} water points within ${r}km`:'⚠️ None found — try a larger radius';res.style.color=pts.length?'#4ADE80':'#F97316';}
    const clr=document.getElementById('fw-clear');if(clr)clr.style.display=pts.length?'block':'none';
    if(btn){btn.textContent='Search';btn.disabled=false;}
  };

  window.cwClearFW=function(){
    if(window.S)window.S.fwPts=[];
    window.map?.getSource('wfw')?.setData({type:'FeatureCollection',features:[]});
    const res=document.getElementById('fw-result'),clr=document.getElementById('fw-clear');
    if(res)res.textContent='';if(clr)clr.style.display='none';
  };

  // ─── WATER TAB — ADD WATER POINT ─────────────────────────────
  window.cwWaterTabAdd=function(){
    // Show a floating mini-form
    let form=document.getElementById('wt-add-form');
    if(!form){
      form=document.createElement('div');form.id='wt-add-form';
      form.style.cssText='position:absolute;bottom:calc(80px + env(safe-area-inset-bottom));left:12px;right:12px;z-index:31;background:rgba(13,20,38,.95);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:16px;backdrop-filter:blur(14px);box-shadow:0 8px 32px rgba(0,0,0,.5)';
      form.innerHTML=`<div style="font-size:14px;font-weight:700;color:#EFF6FF;margin-bottom:12px">➕ Add Water Point</div>
        <p style="font-size:11px;color:#7B91B0;margin-bottom:12px;line-height:1.5">Tap the map to place the point, or use GPS to use your current location.</p>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <button onclick="cwWaterTabAddGPS()" style="flex:1;padding:9px;border:none;border-radius:10px;background:rgba(56,189,248,.15);color:#38BDF8;font-size:12px;font-weight:600;cursor:pointer;border:1px solid rgba(56,189,248,.25)">📍 Use GPS</button>
          <button onclick="cwWaterTabTapMap()" style="flex:1;padding:9px;border:none;border-radius:10px;background:rgba(74,222,128,.15);color:#4ADE80;font-size:12px;font-weight:600;cursor:pointer;border:1px solid rgba(74,222,128,.25)">🗺️ Tap Map</button>
        </div>
        <select id="wt-type" style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 12px;color:#EFF6FF;font-size:13px;margin-bottom:8px">
          <option value="drinking_water">🚰 Drinking water tap</option>
          <option value="fountain">⛲ Fountain</option>
          <option value="spring">🌿 Natural spring</option>
          <option value="water_tap">🚿 Water tap</option>
          <option value="cemetery">⛪ Cemetery (seasonal)</option>
        </select>
        <input id="wt-note" type="text" placeholder="Notes (optional)…" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 12px;color:#EFF6FF;font-size:13px;margin-bottom:10px">
        <div id="wt-coords" style="font-size:10px;color:#7B91B0;text-align:center;min-height:14px;margin-bottom:8px"></div>
        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('wt-add-form').remove()" style="flex:1;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:none;color:#7B91B0;font-size:12px;cursor:pointer">Cancel</button>
          <button id="wt-save-btn" onclick="cwWaterTabSave()" style="flex:2;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#4ADE80,#22C55E);color:#fff;font-size:13px;font-weight:700;cursor:pointer" disabled>Save</button>
        </div>`;
      document.getElementById('map-container').appendChild(form);
    }
    form.style.display='';
    form._lat=null;form._lng=null;
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
    const map=window.map;if(!map)return;
    map.getCanvas().style.cursor='crosshair';
    const handler=e=>{
      map.getCanvas().style.cursor='';
      map.off('click',handler);
      if(f){f.style.display='';f._lat=e.lngLat.lat;f._lng=e.lngLat.lng;const c=document.getElementById('wt-coords');if(c)c.textContent=`📍 ${f._lat.toFixed(5)}, ${f._lng.toFixed(5)}`;const s=document.getElementById('wt-save-btn');if(s)s.disabled=false;}
    };
    map.on('click',handler);
  };

  window.cwWaterTabSave=function(){
    const f=document.getElementById('wt-add-form');if(!f||f._lat==null)return;
    const type=document.getElementById('wt-type')?.value||'drinking_water';
    const note=document.getElementById('wt-note')?.value||'';
    // Use existing addCommPt if available
    if(window.addCommPt){
      addCommPt({lat:f._lat,lng:f._lng,water_type:type,notes:note});
    } else {
      // Fallback: add to local commPts
      const S=window.S;if(S){
        const id='local_'+Date.now();
        S.commPts.push({id,lat:f._lat,lng:f._lng,water_type:type,notes:note,source:'community'});
        window.refreshLayers?.();
      }
    }
    // Increment stats
    const tot=parseInt(localStorage.getItem('cw_total_wpts')||'0')+1;
    localStorage.setItem('cw_total_wpts',String(tot));
    f.remove();
    window.cwWQAddedWater?.();
  };

  // ─── WATERQUEST ───────────────────────────────────────────────
  const WQ={active:false,start:0,found:0,added:0,pts:0,timer:null,passedIds:new Set()};

  window.cwStartWQ=function(){
    Object.assign(WQ,{active:true,start:Date.now(),found:0,added:0,pts:0,passedIds:new Set()});
    ['wq-found','wq-added','wq-pts'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='0';});
    const wt=document.getElementById('wq-time');if(wt)wt.textContent='0:00';
    const bar=document.getElementById('wq-bar');if(bar)bar.style.display='flex';
    const sb=document.getElementById('wq-start-btn');if(sb)sb.disabled=true;
    WQ.timer=setInterval(()=>{const s=Math.floor((Date.now()-WQ.start)/1000),m=Math.floor(s/60),ss=s%60;const el=document.getElementById('wq-time');if(el)el.textContent=`${m}:${ss<10?'0':''}${ss}`;},1000);
    window.setView?.('water');
  };

  window.cwStopWQ=function(){
    clearInterval(WQ.timer);
    document.getElementById('wq-bar')?.style.setProperty('display','none');
    document.getElementById('wq-start-btn') && (document.getElementById('wq-start-btn').disabled=false);
    WQ.active=false;
    const best=parseInt(localStorage.getItem('wq_best')||'0');
    if(WQ.pts>best){localStorage.setItem('wq_best',String(WQ.pts));}
    if(WQ.pts>0)alert(`WaterQuest done!\n🎮 ${WQ.pts} pts  💧 ${WQ.found} found  ➕ ${WQ.added} added`);
  };

  window.cwWQPassedWater=function(w){if(!WQ.active||WQ.passedIds.has(w.id))return;WQ.passedIds.add(w.id);WQ.found++;WQ.pts+=10;document.getElementById('wq-found') && (document.getElementById('wq-found').textContent=WQ.found);document.getElementById('wq-pts') && (document.getElementById('wq-pts').textContent=WQ.pts);};
  window.cwWQAddedWater=function(){if(!WQ.active)return;WQ.added++;WQ.pts+=25;document.getElementById('wq-added') && (document.getElementById('wq-added').textContent=WQ.added);document.getElementById('wq-pts') && (document.getElementById('wq-pts').textContent=WQ.pts);};

  function injectWQBar(){
    if(document.getElementById('wq-bar'))return;
    const bar=document.createElement('div');bar.id='wq-bar';
    bar.style.cssText='position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;padding:10px 16px;padding-top:calc(10px + env(safe-area-inset-top));display:none;align-items:center;gap:12px;z-index:200;font-size:13px';
    bar.innerHTML=`<div style="display:flex;gap:16px;flex:1"><div style="text-align:center"><div id="wq-time" style="font-size:20px;font-weight:800">0:00</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Riding</div></div><div style="text-align:center"><div id="wq-found" style="font-size:20px;font-weight:800">0</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Found</div></div><div style="text-align:center"><div id="wq-added" style="font-size:20px;font-weight:800">0</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Added</div></div><div style="text-align:center"><div id="wq-pts" style="font-size:20px;font-weight:800">0</div><div style="font-size:9px;opacity:.8;text-transform:uppercase">Pts</div></div></div><button onclick="cwStopWQ&&cwStopWQ()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer">Stop</button>`;
    document.body.prepend(bar);
  }

  // ─── INIT ─────────────────────────────────────────────────────
  function init(){
    injectProfile();
    injectDensitySetting();
    injectWQBar();
    enhanceSetView();
    initSwipe();
    setTimeout(patchRefreshLayers,100);
    patchInitSB();
    autoConnectSB();
    // Start on Panel tab
    if(window.innerWidth<=768) setTimeout(()=>window.setView?.('panel'),200);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
