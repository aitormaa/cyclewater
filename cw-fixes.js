// cw-fixes.js — CycleWater patch file (loaded after cw-extras.js)
// Handles: clustering, re-center, onboarding, first water, type breakdown, share, Water tab speed, profile

(function(){

  // ─── ONBOARDING (#8) — show once on first visit ───────────────
  function showOnboarding(){
    if(localStorage.getItem('cw_onboarded'))return;
    const ov=document.createElement('div');
    ov.id='cw-ob';
    ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(10,20,40,.88);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
    ov.innerHTML=`
      <div style="background:#0F172A;border:1px solid rgba(56,189,248,.25);border-radius:22px;padding:28px 24px;max-width:360px;width:100%;text-align:center">
        <div style="font-size:36px;margin-bottom:8px">💧</div>
        <div style="font-size:20px;font-weight:800;color:#EFF6FF;margin-bottom:4px">Welcome to CycleWater</div>
        <div style="font-size:13px;color:#7B91B0;margin-bottom:22px">Plan your ride water supply before heading out</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;text-align:left">
          ${[['📂','Upload your GPX route','From Komoot, Strava, Garmin or your GPS'],['💧','Water points load automatically','Sourced from OpenStreetMap — tap any dot for details'],['⚙️','Adjust settings if needed','Search radius, dry zone alerts, effort level'],['📥','Download enriched GPX','Transfer to your GPS device — waterpoints included']].map(([ic,t,s])=>`
          <div style="display:flex;gap:12px;align-items:flex-start;background:rgba(255,255,255,.04);border-radius:12px;padding:10px 12px">
            <span style="font-size:20px;flex-shrink:0">${ic}</span>
            <div><div style="font-size:13px;font-weight:600;color:#EFF6FF">${t}</div><div style="font-size:11px;color:#7B91B0;margin-top:2px">${s}</div></div>
          </div>`).join('')}
        </div>
        <button onclick="localStorage.setItem('cw_onboarded','1');document.getElementById('cw-ob').remove()"
          style="width:100%;padding:13px;background:linear-gradient(135deg,#0EA5E9,#38BDF8);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer">
          Let's ride 🚴
        </button>
      </div>`;
    document.body.appendChild(ov);
  }

  // ─── CLUSTER LAYERS + ROUTE ON TOP (#5) ──────────────────────
  function setupClusters(){
    const map=window.map||window.cwMap;if(!map)return;
    if(map.getLayer('wosm-cl'))return;
    try{
      // Filter existing wosm-l to non-clustered points only
      map.setFilter('wosm-l',['!',['has','point_count']]);
      // Cluster bubble
      map.addLayer({id:'wosm-cl',type:'circle',source:'wosm',filter:['has','point_count'],
        paint:{'circle-radius':['step',['get','point_count'],16,10,20,30,24],'circle-color':'#0EA5E9','circle-opacity':.92,'circle-stroke-width':2.5,'circle-stroke-color':'white'}},'wosm-l');
      // Count text
      map.addLayer({id:'wosm-ct',type:'symbol',source:'wosm',filter:['has','point_count'],
        layout:{'text-field':['get','point_count_abbreviated'],'text-size':11},
        paint:{'text-color':'white'}},'wosm-l');
      // Expand cluster on click
      map.on('click','wosm-cl',e=>{
        const f=map.queryRenderedFeatures(e.point,{layers:['wosm-cl']});
        if(!f.length)return;
        map.getSource('wosm').getClusterExpansionZoom(f[0].properties.cluster_id,(err,zoom)=>{
          if(!err)map.easeTo({center:f[0].geometry.coordinates,zoom:zoom+0.5});
        });
        e.preventDefault();
      });
      map.on('mouseenter','wosm-cl',()=>{map.getCanvas().style.cursor='pointer';});
      map.on('mouseleave','wosm-cl',()=>{map.getCanvas().style.cursor='';});
      // ─ Move route layers to TOP of stack so they're always visible above water circles
      map.moveLayer('route-h'); // halo goes to top
      map.moveLayer('route-l'); // main line goes above halo
      // ─ Direction arrows using a canvas-drawn image (no glyph dependency)
      try{
        const sz=28,c2=document.createElement('canvas');c2.width=sz;c2.height=sz;
        const ctx=c2.getContext('2d');
        ctx.clearRect(0,0,sz,sz);
        // Draw a right-pointing chevron arrow
        ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
        ctx.beginPath();ctx.moveTo(8,8);ctx.lineTo(20,14);ctx.lineTo(8,20);ctx.stroke();
        const imgData=ctx.getImageData(0,0,sz,sz);
        const raw=new Uint8Array(imgData.data.buffer);
        map.addImage('cw-arrow',{width:sz,height:sz,data:raw},{sdf:false});
        map.addLayer({id:'route-arrows',type:'symbol',source:'route',
          layout:{'symbol-placement':'line','symbol-spacing':90,'icon-image':'cw-arrow',
            'icon-size':0.7,'icon-allow-overlap':true,'icon-keep-upright':false,
            'icon-rotation-alignment':'map'}});
      }catch(e){}
    }catch(e){console.warn('Cluster setup:',e);}
  }

  // Expose helper so refreshLayers safety net can move layers if needed
  window._cwMoveRouteToTop=function(){
    const map=window.map||window.cwMap;if(!map)return;
    try{map.moveLayer('route-h');}catch(e){}
    try{map.moveLayer('route-l');}catch(e){}
  };

  // ─── RE-CENTER BUTTON (#7) ────────────────────────────────────
  function injectRecenterBtn(){
    const mc=document.getElementById('map-container')||document.getElementById('map');
    if(!mc||document.getElementById('cw-recenter'))return;
    const btn=document.createElement('button');
    btn.id='cw-recenter';
    btn.title='Re-centre on route';
    btn.innerHTML='⌖';
    btn.style.cssText='position:absolute;bottom:calc(180px + env(safe-area-inset-bottom));right:12px;z-index:10;width:40px;height:40px;border-radius:10px;background:#0F172A;border:2px solid rgba(255,255,255,.12);color:#EFF6FF;font-size:20px;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.4)';
    btn.onclick=()=>{
      const S=window.S,map=window.map||window.cwMap;if(!map)return;
      if(S?.routePts?.length){
        const c=S.routePts.map(p=>[p.lng,p.lat]);
        map.fitBounds(c.reduce((b,p)=>b.extend(p),new maplibregl.LngLatBounds(c[0],c[0])),{padding:50,duration:600});
      } else map.flyTo({center:[2.349,48.864],zoom:5,duration:600});
    };
    mc.style.position='relative';
    mc.appendChild(btn);
    // Show button when map pans away from route, hide when route is not loaded
    (window.map||window.cwMap)?.on('moveend',()=>{
      btn.style.display=window.S?.routePts?.length?'flex':'none';
    });
  }

  // ─── FIRST WATER STAT + TYPE BREAKDOWN (#1, #12) ──────────────
  function injectFirstWaterStat(){
    const so=document.getElementById('stats-overlay');if(!so||document.getElementById('so-fw'))return;
    const item=document.createElement('div');
    item.className='so-item';
    item.innerHTML='<span class="so-icon">🌊</span><div><div class="so-val" id="so-fw">—</div><div class="so-lbl">1st Water</div></div>';
    so.appendChild(item);
  }

  // Water type breakdown — inject once into stats-card
  function injectTypeBreakdown(){
    const sc=document.getElementById('stats-card');if(!sc||document.getElementById('cw-wtype'))return;
    const div=document.createElement('div');
    div.id='cw-wtype';
    div.style.cssText='font-size:11px;color:#7B91B0;margin-top:8px;line-height:1.6;display:none';
    sc.appendChild(div);
  }

  function updateFirstWaterAndBreakdown(){
    const S=window.S;if(!S?.routePts?.length)return;
    const act=(S.waterPts||[]).filter(w=>!window.REPORTED?.has(w.id));
    const all=[...act,...(S.commPts||[])];

    // ── first water km (#1)
    let firstKm=null;
    if(all.length&&window.nearestOnRoute){
      all.forEach(w=>{const nr=window.nearestOnRoute(w,S.routePts);if(firstKm===null||nr.km<firstKm)firstKm=nr.km;});
    }
    const fwEl=document.getElementById('so-fw');
    if(fwEl)fwEl.textContent=firstKm!==null?`km ${Math.round(firstKm*10)/10}`:'—';

    // ── type breakdown (#12)
    const typeEl=document.getElementById('cw-wtype');
    if(!typeEl)return;
    if(!all.length){typeEl.style.display='none';return;}
    const TE=window.TE||{};
    const counts={};
    all.forEach(w=>{const t=w.water_type||'other';counts[t]=(counts[t]||0)+1;});
    const parts=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([t,n])=>`${TE[t]||'💧'} ${n} ${(t).replace(/_/g,' ')}`);
    typeEl.textContent=parts.join(' · ');
    typeEl.style.display='';
  }

  // ─── SHARE ENRICHED GPX (#14) ─────────────────────────────────
  function injectShareBtn(){
    const dlRow=document.getElementById('dl-row');if(!dlRow||document.getElementById('cw-share-btn'))return;
    const btn=document.createElement('button');
    btn.id='cw-share-btn';
    btn.textContent='📤 Share GPX';
    btn.style.cssText='flex:1;padding:11px;border:1px solid rgba(56,189,248,.3);border-radius:12px;background:rgba(14,165,233,.1);color:#38BDF8;font-size:13px;font-weight:600;cursor:pointer';
    btn.onclick=async()=>{
      const S=window.S,REPORTED=window.REPORTED;
      if(!S?.origGPX){window.showToast?.('⚠️ Load a route first');return;}
      btn.textContent='⏳…';btn.disabled=true;
      try{
        // Build GPX blob (same logic as downloadGPX but return blob)
        const all=[...(S.waterPts||[]).filter(w=>!REPORTED?.has(w.id)),...(S.commPts||[])];
        let out=S.origGPX;
        // Just share what we have — let downloadGPX handle the full enrichment
        window.downloadGPX?.();
        // Also try native share
        if(navigator.share){
          try{
            await navigator.share({title:S.routeName||'CycleWater Route',text:`${Math.round(S.routeKm)}km route with ${all.length} water points — from CycleWater`});
          }catch(e){}
        }
      }finally{btn.textContent='📤 Share GPX';btn.disabled=false;}
    };
    dlRow.appendChild(btn);
  }

  // ─── WIRE EVERYTHING UP ───────────────────────────────────────
  const map=window.map||window.cwMap;

  function onMapReady(){
    setupClusters();
    injectRecenterBtn();
    injectFirstWaterStat();
    injectTypeBreakdown();
    injectShareBtn();
    showOnboarding();
  }

  if(map){if(map.loaded())onMapReady();else map.once('load',onMapReady);}

  // Patch updateStats — fix time overflow (3h 60m → 4h 0m) + first-water + breakdown
  const _origUS=window.updateStats;
  window.updateStats=function(){
    // Intercept BEFORE original runs: patch the time calculation directly
    const S=window.S;
    if(S?.routeKm){
      const sp=S.speed||25;
      const hrs=S.routeKm/sp;
      let h=Math.floor(hrs),m=Math.round((hrs-h)*60);
      if(m>=60){h+=Math.floor(m/60);m=m%60;}
      // Store corrected values so original function can use them
      // (original recomputes internally — we fix AFTER it runs)
    }
    _origUS?.();
    // Fix any overflow produced by the original (covers both stat elements)
    document.querySelectorAll('#so-time,[id^="s-time"]').forEach(el=>{
      const mt=el.textContent.match(/^(\d+)h\s*(\d+)m$/);
      if(mt){
        let h=parseInt(mt[1]),m=parseInt(mt[2]);
        if(m>=60){h+=Math.floor(m/60);m=m%60;}
        el.textContent=`${h}h ${m<10?'0'+m:m}m`;
      }
    });
    updateFirstWaterAndBreakdown();
  };

  // ─── LIVE MODE — full rewrite: fly to position + proper errors ──
  const _origTL=window.toggleLive;
  window.toggleLive=function(){
    _origTL?.(); // run original first (starts watchPosition, sets button state)
    const btn=document.getElementById('live-btn');
    const isOn=btn?.classList.contains('active');

    if(isOn){
      // ① Immediate feedback
      btn.textContent='📍 Locating…';
      window.showToast?.('📡 Getting your GPS position…');

      // ② Fast one-shot to fly map immediately (watchPosition is slow to first fix)
      navigator.geolocation.getCurrentPosition(
        pos=>{
          const la=pos.coords.latitude,lo=pos.coords.longitude;
          const map=window.map||window.cwMap;
          if(map)map.flyTo({center:[lo,la],zoom:15,duration:900});
          btn.textContent='🟢 Live ON';
          window.showToast?.(`✅ Live ON · ${la.toFixed(4)}, ${lo.toFixed(4)}`);
          window.onGPS?.(pos); // trigger alert check immediately
          // Inject "Add WP here" shortcut button if not already present
          _injectLiveAddBtn();
        },
        err=>{
          const msgs={1:'GPS permission denied — enable in browser settings',2:'GPS position unavailable',3:'GPS timed out'};
          window.showToast?.('⚠️ '+msgs[err.code]);
          _origTL?.(); // toggle back off
        },
        {enableHighAccuracy:true,timeout:12000,maximumAge:30000}
      );

      // ③ Replace the silent watchPosition error handler
      if(window.watchId!=null){
        navigator.geolocation.clearWatch(window.watchId);
        window.watchId=navigator.geolocation.watchPosition(
          pos=>{
            window.onGPS?.(pos);
            // Pan map gently if user moves far from centre
            const map=window.map||window.cwMap;
            if(map){
              const ctr=map.getCenter(),la=pos.coords.latitude,lo=pos.coords.longitude;
              if(Math.abs(ctr.lat-la)>0.02||Math.abs(ctr.lng-lo)>0.02)
                map.panTo([lo,la],{duration:600});
            }
          },
          err=>{
            const msgs={1:'GPS permission denied',2:'Position unavailable',3:'GPS timed out'};
            window.showToast?.('⚠️ Live Mode: '+msgs[err.code]);
          },
          {enableHighAccuracy:true,maximumAge:5000,timeout:20000}
        );
      }
    }else{
      // Turned off — remove shortcut button
      document.getElementById('cw-live-add')?.remove();
    }
  };

  // "Add WP at my location" shortcut button — appears only in Live Mode
  function _injectLiveAddBtn(){
    if(document.getElementById('cw-live-add'))return;
    const mc=document.getElementById('map-container')||document.getElementById('map');if(!mc)return;
    const b=document.createElement('button');
    b.id='cw-live-add';
    b.innerHTML='💧 Add WP here';
    b.style.cssText='position:absolute;bottom:calc(140px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:20;padding:10px 20px;background:linear-gradient(135deg,#0EA5E9,#38BDF8);border:none;border-radius:22px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(14,165,233,.4);white-space:nowrap';
    b.onclick=()=>{
      // Switch to panel/add mode and auto-fill GPS location
      window.setView?.('panel');
      setTimeout(()=>{
        if(!window.S?.addMode)window.toggleAdd?.();
        setTimeout(()=>window.useMyLocation?.(),300);
      },200);
    };
    mc.appendChild(b);
  }

  // ─── LOADING SPINNER on GPX upload ────────────────────────────
  (function(){
    const fi=document.getElementById('fi1');
    if(!fi)return;
    fi.addEventListener('change',function(){
      if(!fi.files?.length)return;
      const uz=document.getElementById('upload-zone');
      if(!uz)return;
      const nm=fi.files[0].name;
      uz.innerHTML=`<div style="padding:28px 16px;text-align:center">
        <div style="width:36px;height:36px;border:3px solid rgba(56,189,248,.25);border-top-color:#38BDF8;border-radius:50%;animation:cwspin .8s linear infinite;margin:0 auto 12px"></div>
        <div style="font-size:13px;color:#7B91B0">Loading ${nm.slice(0,40)}…</div>
      </div>`;
      if(!document.getElementById('cwspin-style')){
        const st=document.createElement('style');st.id='cwspin-style';
        st.textContent='@keyframes cwspin{to{transform:rotate(360deg)}}';
        document.head.appendChild(st);
      }
    },true); // capture — runs before existing handler to show spinner first
  })();

  // ─── SEARCH AUTOCOMPLETE for fw-loc ────────────────────────────
  function setupSearchAutocomplete(){
    const input=document.getElementById('fw-loc');
    if(!input||input.dataset.cwac)return;
    input.dataset.cwac='1';
    input.setAttribute('autocomplete','off');

    const wrap=input.closest('div')||input.parentElement;
    const prevPos=getComputedStyle(wrap).position;
    if(prevPos==='static'||!prevPos)wrap.style.position='relative';

    const drop=document.createElement('div');
    drop.id='fw-ac';
    drop.style.cssText='position:absolute;left:0;right:0;top:calc(100% + 2px);z-index:200;background:#1E293B;border:1px solid rgba(56,189,248,.25);border-radius:12px;overflow:hidden;display:none;box-shadow:0 8px 24px rgba(0,0,0,.4)';
    wrap.appendChild(drop);

    function pickItem(text){
      input.value=text;
      drop.style.display='none';
      input.focus();
    }

    let debTimer;
    input.addEventListener('input',()=>{
      clearTimeout(debTimer);
      const q=input.value.trim();
      if(q.length<2){drop.style.display='none';return;}
      debTimer=setTimeout(async()=>{
        try{
          const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0&q=${encodeURIComponent(q)}`,{headers:{'Accept-Language':'en'}});
          const items=await r.json();
          if(!items.length){drop.style.display='none';return;}
          drop.innerHTML=items.map((it,i)=>{
            const label=it.display_name.split(',').slice(0,3).join(', ');
            const type=it.type||it.class||'';
            const icon=type.includes('city')||type.includes('town')?'🏙️':type.includes('village')?'🏘️':type.includes('road')||type.includes('street')?'🛣️':'📍';
            return `<div data-idx="${i}" style="padding:10px 14px;font-size:13px;color:#EFF6FF;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.06);display:flex;gap:8px;align-items:center"
              onmousedown="event.preventDefault()"
              onclick="(function(el){const v=el.dataset.val;document.getElementById('fw-loc').value=v;document.getElementById('fw-ac').style.display='none';})(this)"
              data-val="${label.replace(/"/g,'&quot;')}"
              onmouseover="this.style.background='rgba(56,189,248,.1)'" onmouseout="this.style.background=''">
              <span style="flex-shrink:0">${icon}</span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
            </div>`;
          }).join('');
          drop.style.display='block';
        }catch(e){drop.style.display='none';}
      },320);
    });

    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){drop.style.display='none';}
      if(e.key==='Enter'){drop.style.display='none';}
    });

    document.addEventListener('click',e=>{
      if(!drop.contains(e.target)&&e.target!==input)drop.style.display='none';
    });
  }

  // Inject 📍 Near Me button next to the search field
  function injectNearMeBtn(){
    const btn=document.getElementById('fw-btn');
    if(!btn||document.getElementById('fw-nearme'))return;
    const nm=document.createElement('button');
    nm.id='fw-nearme';
    nm.title='Search near my current location';
    nm.innerHTML='📍';
    nm.style.cssText='flex-shrink:0;width:42px;height:42px;background:#0F172A;border:1.5px solid rgba(56,189,248,.35);border-radius:10px;color:#38BDF8;font-size:19px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center';
    nm.onclick=function(){
      if(!navigator.geolocation){window.showToast?.('⚠️ GPS not available');return;}
      nm.innerHTML='⏳';nm.disabled=true;
      navigator.geolocation.getCurrentPosition(
        pos=>{
          nm.innerHTML='📍';nm.disabled=false;
          const la=pos.coords.latitude,lo=pos.coords.longitude;
          const inp=document.getElementById('fw-loc');
          if(inp)inp.value=`${la.toFixed(5)}, ${lo.toFixed(5)}`;
          window.cwFindWater?.();
        },
        ()=>{nm.innerHTML='📍';nm.disabled=false;window.showToast?.('⚠️ GPS unavailable — check permissions');},
        {enableHighAccuracy:true,timeout:10000}
      );
    };
    btn.parentElement.insertBefore(nm,btn);
  }

  // Community points info banner (shown once in Water tab)
  function injectCommInfo(){
    const fw=document.getElementById('fw-result')?.parentElement||document.getElementById('fw-btn')?.closest('div[style]');
    if(!fw||document.getElementById('cw-comm-info'))return;
    const div=document.createElement('div');
    div.id='cw-comm-info';
    div.style.cssText='margin-top:10px;padding:10px 12px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.15);border-radius:10px;font-size:12px;color:#7B91B0;line-height:1.5';
    div.innerHTML='👥 <strong style="color:#EFF6FF">Water points added by others</strong> appear automatically when you load a route — look for the <strong style="color:#38BDF8">👥 Community</strong> badge in your water list. You can add new ones via the <strong style="color:#38BDF8">➕ Add Water</strong> button in the Panel tab.';
    fw.parentElement?.appendChild(div);
  }

  // Watch for fw-loc to appear (injected dynamically when Water tab opens)
  (function(){
    const setup=()=>{
      if(document.getElementById('fw-loc')){
        setupSearchAutocomplete();
        injectNearMeBtn();
        injectCommInfo();
      }
    };
    setup();
    const obs=new MutationObserver(setup);
    obs.observe(document.body,{childList:true,subtree:true});
  })();

  // ─── 1. PROFILE TAB SWIPE RE-ENFORCEMENT ──────────────────────
  // After any swipe, if we're on the Profile tab, re-apply profile content
  // (guards against any content drift during height transitions)
  const hdr=document.getElementById('sidebar-header');
  if(hdr){
    hdr.addEventListener('touchend',()=>{
      setTimeout(()=>window._cwProfileRefresh?.(),80);
    },{passive:true});
  }

  // ─── 2. WATER TAB SPEED — bbox Overpass query ─────────────────
  // Override cwFindWater to use faster bbox queries instead of around:radius
  window.cwFindWater=async function(){
    const loc=document.getElementById('fw-loc')?.value.trim();
    if(!loc){window.showToast?.('⚠️ Enter a city or coordinates');return;}

    const btn=document.getElementById('fw-btn');
    const res=document.getElementById('fw-result');
    const rm=(parseFloat(document.getElementById('fw-r')?.value)||5)*1000; // metres

    if(btn){btn.textContent='⏳…';btn.disabled=true;}
    if(res)res.textContent='Searching…';

    try{
      // ── Geocode ────────────────────────────────────────────────
      let lat,lng;
      const coord=loc.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
      if(coord){lat=parseFloat(coord[1]);lng=parseFloat(coord[2]);}
      else{
        const cacheKey='cw_geo_'+loc.toLowerCase().replace(/\s+/g,'_');
        const cached=sessionStorage.getItem(cacheKey);
        if(cached){const c=JSON.parse(cached);lat=c[0];lng=c[1];}
        else{
          const gr=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(loc)}`);
          const gd=await gr.json();
          if(!gd.length)throw new Error('Location not found');
          lat=parseFloat(gd[0].lat);lng=parseFloat(gd[0].lon);
          sessionStorage.setItem(cacheKey,JSON.stringify([lat,lng]));
        }
      }

      // ── Fly to location immediately ────────────────────────────
      const map=window.map||window.cwMap;
      if(map)map.flyTo({center:[lng,lat],zoom:13,duration:800});

      // ── Bbox query (much faster than around:) ──────────────────
      const latD=rm/111320;
      const lngD=rm/(111320*Math.cos(lat*Math.PI/180));
      const bbox=`${lat-latD},${lng-lngD},${lat+latD},${lng+lngD}`;
      const q=`[out:json][timeout:15];(node["amenity"="drinking_water"](${bbox});node["amenity"="fountain"]["drinking_water"!="no"](${bbox});node["natural"="spring"]["drinking_water"="yes"](${bbox});node["man_made"="water_tap"]["drinking_water"!="no"](${bbox}););out;`;

      // ── Try both Overpass mirrors in parallel ──────────────────
      const OVR=window.OVR||['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
      const ctrl=new AbortController();
      const timer=setTimeout(()=>ctrl.abort(),14000);
      let d;
      try{
        d=await Promise.any(OVR.map(url=>fetch(url,{method:'POST',body:q,signal:ctrl.signal}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();})));
      }finally{clearTimeout(timer);}

      // ── Post-filter by actual distance ─────────────────────────
      const distOk=e=>{
        const dlat=e.lat-lat,dlng=e.lon-lng;
        return Math.sqrt(dlat*dlat+(dlng*Math.cos(lat*Math.PI/180))**2)*111320<=rm;
      };
      const TE=window.TE||{};
      const pts=(d.elements||[]).filter(distOk).map(e=>({
        id:'fw_'+e.id,lat:e.lat,lng:e.lon,
        water_type:e.tags?.amenity||e.tags?.natural||e.tags?.man_made||'drinking_water',
        name:e.tags?.name||null
      }));

      // ── Push to map via wfw source ─────────────────────────────
      const S=window.S;
      if(S)S.fwPts=pts;
      const fc={type:'FeatureCollection',features:pts.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{...p}}))};
      try{map?.getSource('wfw')?.setData(fc);}catch(e){}

      // ── Results summary ────────────────────────────────────────
      if(res)res.innerHTML=pts.length
        ? `<span style="color:#22C55E;font-weight:600">✅ ${pts.length} water point${pts.length>1?'s':''} within ${rm/1000}km</span>`
        : `<span style="color:#F97316">⚠️ None found — try a larger radius</span>`;

      // Show clear button
      const clr=document.getElementById('fw-clear');
      if(clr)clr.style.display='';

    }catch(e){
      if(res)res.textContent='❌ '+(e.name==='AbortError'?'Timed out — retry':'Could not search: '+e.message);
    }finally{
      if(btn){btn.textContent='Search';btn.disabled=false;}
    }
  };

  // ─── 3. CLEAR FINDWATER ────────────────────────────────────────
  window.cwClearFW=function(){
    const S=window.S;if(S)S.fwPts=[];
    const EMPTY={type:'FeatureCollection',features:[]};
    try{(window.map||window.cwMap)?.getSource('wfw')?.setData(EMPTY);}catch(e){}
    const r=document.getElementById('fw-result');if(r)r.textContent='';
    const c=document.getElementById('fw-clear');if(c)c.style.display='none';
    const b=document.getElementById('fw-btn');if(b)b.textContent='Search';
  };

  // ─── 4. SAFETY NET — force route visible + on top after every refresh ─
  const _origRL2=window.refreshLayers;
  window.refreshLayers=function(){
    _origRL2?.();
    const tab=window._cwGetTab?.()||'panel';
    if(tab!=='profile'&&tab!=='water'){
      const map=window.map||window.cwMap;
      if(map){
        try{map.setLayoutProperty('route-l','visibility','visible');}catch(e){}
        try{map.setLayoutProperty('route-h','visibility','visible');}catch(e){}
        // Keep route on top of water layers after every data update
        window._cwMoveRouteToTop?.();
      }
    }
  };

  // ─── 5. GENERIC ROUTE IMPORT (Komoot, Strava, direct GPX) ─────
  window.importKomoot=async function(){
    const input=document.getElementById('komoot-url');
    const btn=document.getElementById('komoot-btn');
    const url=(input?.value||'').trim();
    if(!url){window.showToast?.('⚠️ Paste a route URL or direct GPX link');return;}

    if(btn){btn.textContent='⏳…';btn.disabled=true;}

    try{
      let pts=[],name='';

      // ── A: Komoot tour URL ─────────────────────────────────────
      const kmMatch=url.match(/komoot\.com\/(?:tour|highlight)\/(\d+)/i);
      if(kmMatch){
        const tourId=kmMatch[1];
        const apiUrl=`https://www.komoot.com/api/v007/tours/${tourId}?hl=en`;
        const r=await fetch(`https://corsproxy.io/?${encodeURIComponent(apiUrl)}`);
        if(!r.ok)throw new Error(`Komoot: HTTP ${r.status} — is the tour set to Public?`);
        const data=await r.json();
        const items=data?._embedded?.coordinates?.items||[];
        if(!items.length)throw new Error('No route data in this Komoot tour');
        pts=items.map(p=>({lat:p.lat,lng:p.lng,ele:p.alt||0}));
        name=data.name||`Komoot ${tourId}`;

      // ── B: Direct .gpx URL (any platform) ─────────────────────
      }else if(url.match(/\.gpx(\?.*)?$/i)||url.includes('/export_gpx')||url.includes('export=gpx')){
        // Try direct fetch first, then CORS proxy
        let text;
        try{
          const r=await fetch(url,{signal:AbortSignal.timeout?AbortSignal.timeout(10000):undefined});
          if(r.ok) text=await r.text();
        }catch(e){}
        if(!text){
          const r=await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
          if(!r.ok)throw new Error(`Could not download GPX (HTTP ${r.status})`);
          text=await r.text();
        }
        const parsed=window.parseGPX?.(text);
        if(!parsed||parsed.length<2)throw new Error('Could not parse the GPX file');
        pts=parsed;
        name=url.split('/').pop().replace(/\.gpx.*$/i,'').replace(/[_-]/g,' ').trim()||'Imported route';

      // ── C: Strava route URL ────────────────────────────────────
      }else if(url.includes('strava.com')){
        // Strava requires auth for GPX export — guide user
        throw new Error('Strava needs login to export. Open the route on Strava → Export GPX → upload that file here');

      // ── D: Unknown URL ─────────────────────────────────────────
      }else{
        throw new Error('Unknown URL format. Try a direct .gpx link or a public Komoot tour URL');
      }

      // ── Load route ─────────────────────────────────────────────
      const S=window.S;
      if(S){S.routeName=name;S.routePts=pts;}
      const uz=document.getElementById('upload-zone');
      if(uz&&window.routeBanner){uz.innerHTML=window.routeBanner(name);uz.onclick=null;}
      // Store pts so the recent-route card can reload without re-importing
      let ptsKey=null;
      try{ptsKey='cw_rpts_'+Date.now();localStorage.setItem(ptsKey,JSON.stringify(pts));}catch(e){ptsKey=null;}
      window.cwSaveRoute?.(name,pts.length,null,ptsKey);
      await window.loadRouteData(pts);
      if(input)input.value='';
      window.showToast?.(`✅ Loaded: ${name}`);

    }catch(e){
      window.showToast?.('⚠️ '+e.message);
    }finally{
      if(btn){btn.textContent='Import';btn.disabled=false;}
    }
  };

  // ─── 6. × BUTTON ONLY IN PANEL TAB ────────────────────────────
  // Guard cwHideWpt so it only works when on Panel tab
  const origHideWpt=window.cwHideWpt;
  window.cwHideWpt=function(id){
    if(window._cwGetTab&&window._cwGetTab()!=='panel'){
      window.showToast?.('Switch to Panel tab to remove route water points');
      return;
    }
    origHideWpt?.(id);
  };

})();
