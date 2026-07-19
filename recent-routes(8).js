// recent-routes.js — last 5 routes with GPX storage + one-tap reload
(function(){
  const KEY='cw_recent_routes';
  const MAX=5;

  // ── Mini SVG thumbnail from route points ────────────────────────
  function makeMiniSVG(pts){
    if(!pts||pts.length<2)return'';
    const W=56,H=36,pad=3;
    const lats=pts.map(p=>p.lat),lngs=pts.map(p=>p.lng);
    const minLat=Math.min(...lats),maxLat=Math.max(...lats);
    const minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
    const latR=maxLat-minLat||.001,lngR=maxLng-minLng||.001;
    const step=Math.max(1,Math.floor(pts.length/60));
    const sample=pts.filter((_,i)=>i%step===0);
    if(sample[sample.length-1]!==pts[pts.length-1])sample.push(pts[pts.length-1]);
    const x=lng=>pad+(lng-minLng)/lngR*(W-2*pad);
    const y=lat=>H-pad-(lat-minLat)/latR*(H-2*pad);
    const d=sample.map((p,i)=>`${i?'L':'M'}${x(p.lng).toFixed(1)},${y(p.lat).toFixed(1)}`).join('');
    return`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="flex-shrink:0;border-radius:6px;background:rgba(14,165,233,.08)"><path d="${d}" fill="none" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function getRoutes(){try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return[];}}
  function saveRoutes(arr){try{localStorage.setItem(KEY,JSON.stringify(arr));}catch(e){}}

  // API: cwSaveRoute(name, km, gpx, ptsKey)
  // - gpx: raw GPX string (optional) — stored for instant reload
  // - ptsKey: localStorage key for parsed pts (Komoot/URL imports)
  window.cwSaveRoute=function(name,km,gpx,ptsKey){
    if(!name)name=window._pendingRouteName||'Route';
    window._pendingRouteName=null;
    const routes=getRoutes();
    const old=routes.find(r=>r.name===name);
    if(old&&old.gpxKey)localStorage.removeItem(old.gpxKey);
    const filtered=routes.filter(r=>r.name!==name);
    let gpxKey=null,thumb='';
    if(gpx){
      gpxKey='cw_gpx_'+Date.now();
      try{localStorage.setItem(gpxKey,gpx);}catch(e){gpxKey=null;}
      const tpts=window.parseGPX?.(gpx);
      if(tpts)thumb=makeMiniSVG(tpts);
    }
    filtered.unshift({
      name,
      km:Math.round(km||0),
      date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),
      gpxKey,
      ptsKey:ptsKey||null,
      thumb
    });
    const removed=filtered.slice(MAX);
    removed.forEach(r=>{
      if(r.gpxKey)localStorage.removeItem(r.gpxKey);
      if(r.ptsKey)localStorage.removeItem(r.ptsKey);
    });
    saveRoutes(filtered.slice(0,MAX));
    renderRecent();
  };

  window.cwUpdateRouteKm=function(name,km){
    const routes=getRoutes();
    const r=routes.find(r=>r.name===name);
    if(r){r.km=Math.round(km);saveRoutes(routes);renderRecent();}
  };

  window.cwDeleteRoute=function(i){
    const routes=getRoutes();
    if(routes[i]){
      if(routes[i].gpxKey)localStorage.removeItem(routes[i].gpxKey);
      if(routes[i].ptsKey)localStorage.removeItem(routes[i].ptsKey);
    }
    routes.splice(i,1);
    saveRoutes(routes);
    renderRecent();
  };

  window.cwReloadRoute=function(i){
    const routes=getRoutes();
    if(!routes[i])return;
    const r=routes[i];

    // Option 1: stored GPX — fastest, full fidelity
    if(r.gpxKey){
      const gpx=localStorage.getItem(r.gpxKey);
      if(gpx&&window.cwLoadGPXContent){window.cwLoadGPXContent(gpx,r.name);return;}
    }

    // Option 2: stored parsed points (Komoot / URL imports)
    if(r.ptsKey){
      try{
        const pts=JSON.parse(localStorage.getItem(r.ptsKey)||'null');
        if(pts&&pts.length>=2){
          const S=window.S;
          if(S){S.routeName=r.name;S.routePts=pts;}
          const uz=document.getElementById('upload-zone');
          if(uz&&window.routeBanner)uz.innerHTML=window.routeBanner(r.name);
          window.loadRouteData?.(pts);
          return;
        }
      }catch(e){}
    }

    // Fallback: ask user to re-upload
    window.showToast?.('⚠️ File not cached — please re-upload the GPX');
    window._pendingRouteName=r.name;
    document.getElementById('fi1')?.click();
  };

  function renderRecent(){
    const slot=document.getElementById('recent-routes-slot');
    if(!slot)return;
    const routes=getRoutes();
    if(!routes.length){slot.innerHTML='';return;}
    slot.innerHTML=`
      <div style="margin-top:4px">
        <div style="font-size:11px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;display:flex;align-items:center;gap:6px"><span>🕐</span> Recent Routes</div>
        ${routes.map((r,i)=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--c1);border:1px solid var(--br);border-radius:12px;margin-bottom:7px;cursor:pointer" onclick="cwReloadRoute(${i})">
            ${r.thumb||`<span style="font-size:18px;flex-shrink:0">${r.gpxKey?'🗺️':'📂'}</span>`}
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
              <div style="font-size:10px;color:var(--tm);margin-top:2px">${r.km?r.km+'km · ':''}${r.date}${(r.gpxKey||r.ptsKey)?' · ⚡ instant':' · 📁 re-upload'}</div>
            </div>
            <button onclick="event.stopPropagation();cwDeleteRoute(${i})" title="Remove"
              style="background:none;border:none;color:var(--tm);cursor:pointer;font-size:17px;padding:4px;flex-shrink:0;line-height:1;border-radius:6px"
              onmouseover="this.style.color='var(--rd)'" onmouseout="this.style.color='var(--tm)'">✕</button>
          </div>`).join('')}
      </div>`;
  }

  function hookFileInput(){
    const fi=document.getElementById('fi1');
    if(!fi)return;
    fi.addEventListener('change',function(e){
      const f=e.target.files[0];
      if(f&&f.name.toLowerCase().endsWith('.gpx'))
        window._pendingRouteName=f.name.replace(/\.gpx$/i,'').replace(/[_-]/g,' ').trim();
    },true);
  }

  window.cwRefreshRecentRoutes=renderRecent;

  function init(){hookFileInput();renderRecent();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
