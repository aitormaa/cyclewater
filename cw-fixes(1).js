// cw-fixes.js — CycleWater patch file (loaded after cw-extras.js)
// Handles: Water tab speed, × button guard, Profile tab independence

(function(){
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

  // ─── 4. ROUTE DIRECTION ARROWS ────────────────────────────────
  // Add directional arrows along the loaded route (like Komoot)
  function addArrowLayer(){
    const map=window.map||window.cwMap;if(!map)return;
    if(map.getLayer('route-arrows'))return; // already added
    try{
      map.addLayer({
        id:'route-arrows',
        type:'symbol',
        source:'route',
        layout:{
          'symbol-placement':'line',
          'symbol-spacing':80,
          'text-field':'▶',
          'text-size':11,
          'text-keep-upright':false,
          'text-rotation-alignment':'map',
          'text-pitch-alignment':'viewport',
          'text-allow-overlap':true,
          'text-ignore-placement':true
        },
        paint:{
          'text-color':'#38BDF8',
          'text-opacity':0.85,
          'text-halo-color':'rgba(14,30,60,0.5)',
          'text-halo-width':1
        }
      },'route-h'); // insert above halo, below main line
    }catch(e){}
  }

  const _mapForArrows=window.map||window.cwMap;
  if(_mapForArrows){
    if(_mapForArrows.loaded())addArrowLayer();
    else _mapForArrows.once('load',addArrowLayer);
  }

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
      window.cwSaveRoute?.(name,pts.length);
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
