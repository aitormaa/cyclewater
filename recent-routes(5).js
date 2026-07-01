// recent-routes.js — last 5 routes with GPX storage + one-tap reload
(function(){
  const KEY='cw_recent_routes';
  const MAX=5;

  function getRoutes(){try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return[];}}
  function saveRoutes(arr){try{localStorage.setItem(KEY,JSON.stringify(arr));}catch(e){}}

  // Called from index.html: cwSaveRoute(name, pts, km, gpxContent)
  window.cwSaveRoute=function(name,pts,km,gpx){
    if(!name)name=window._pendingRouteName||'Route';
    window._pendingRouteName=null;
    const routes=getRoutes();
    // Remove existing entry with same name
    const old=routes.find(r=>r.name===name);
    if(old&&old.gpxKey)localStorage.removeItem(old.gpxKey);
    const filtered=routes.filter(r=>r.name!==name);
    // Store GPX content separately
    let gpxKey=null;
    if(gpx){
      gpxKey='cw_gpx_'+Date.now();
      try{localStorage.setItem(gpxKey,gpx);}catch(e){gpxKey=null;}// quota exceeded — skip
    }
    filtered.unshift({name,pts,km:Math.round(km||0),date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),gpxKey});
    // Clean up GPX of routes that fall off the list
    const removed=filtered.slice(MAX);
    removed.forEach(r=>{if(r.gpxKey)localStorage.removeItem(r.gpxKey);});
    saveRoutes(filtered.slice(0,MAX));
    renderRecent();
  };

  // Update km after Overpass completes (second call from loadRouteData)
  window.cwUpdateRouteKm=function(name,km){
    const routes=getRoutes();
    const r=routes.find(r=>r.name===name);
    if(r){r.km=Math.round(km);saveRoutes(routes);renderRecent();}
  };

  window.cwDeleteRoute=function(i){
    const routes=getRoutes();
    if(routes[i]&&routes[i].gpxKey)localStorage.removeItem(routes[i].gpxKey);
    routes.splice(i,1);
    saveRoutes(routes);
    renderRecent();
  };

  window.cwReloadRoute=function(i){
    const routes=getRoutes();
    if(!routes[i])return;
    const r=routes[i];
    // Try to reload directly from stored GPX
    if(r.gpxKey){
      const gpx=localStorage.getItem(r.gpxKey);
      if(gpx&&window.cwLoadGPXContent){
        window.cwLoadGPXContent(gpx,r.name);
        return;
      }
    }
    // Fallback: open file picker (no dialog)
    window._pendingRouteName=r.name;
    document.getElementById('fi1').click();
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
            <span style="font-size:18px;flex-shrink:0">${r.gpxKey?'🗺️':'📂'}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
              <div style="font-size:10px;color:var(--tm);margin-top:2px">${r.km?r.km+'km · ':''}${r.pts.toLocaleString()} pts · ${r.date}${r.gpxKey?' · ⚡ instant':' · 📁 reupload'}</div>
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
