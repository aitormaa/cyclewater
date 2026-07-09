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

  // ─── 4. × BUTTON ONLY IN PANEL TAB ────────────────────────────
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
