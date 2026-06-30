// recent-routes.js — shows last 5 GPX routes analysed, with quick reload
(function(){
  const KEY='cw_recent_routes';
  const MAX=5;

  function getRoutes(){try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return[];}}
  function saveRoutes(arr){try{localStorage.setItem(KEY,JSON.stringify(arr));}catch(e){}}

  // Called from index.html after a route is loaded
  window.cwSaveRoute=function(name,pts,km){
    if(!name)return;
    const routes=getRoutes().filter(r=>r.name!==name);
    routes.unshift({name,pts,km:Math.round(km),date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'})});
    saveRoutes(routes.slice(0,MAX));
    renderRecent();
  };

  function renderRecent(){
    const slot=document.getElementById('recent-routes-slot');
    if(!slot)return;
    const routes=getRoutes();
    if(!routes.length){slot.innerHTML='';return;}
    slot.innerHTML=`
      <div style="margin-top:12px">
        <div style="font-size:11px;font-weight:600;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🕐 Recent Routes</div>
        ${routes.map((r,i)=>`
          <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--c1);border:1px solid var(--br);border-radius:8px;margin-bottom:6px;cursor:pointer" onclick="cwReloadRoute(${i})" title="Re-analyse ${r.name}">
            <span style="font-size:16px">🗺️</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:500;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
              <div style="font-size:10px;color:var(--tm)">${r.km}km · ${r.pts.toLocaleString()} pts · ${r.date}</div>
            </div>
            <span style="font-size:10px;color:var(--p);font-weight:600;white-space:nowrap">Re-run →</span>
          </div>`).join('')}
        <button onclick="cwClearRecent()" style="background:none;border:none;color:var(--tm);font-size:10px;cursor:pointer;padding:2px 0;width:100%;text-align:right">Clear history</button>
      </div>`;
  }

  // Re-run: open file picker pre-filled with the name (user must re-select the file)
  // We can't store the file blob due to security, but we show a prompt
  window.cwReloadRoute=function(i){
    const routes=getRoutes();
    const r=routes[i];
    if(!r)return;
    const ok=confirm(`Re-analyse "${r.name}"?\n\nYou'll need to select the file again from your device.`);
    if(ok)document.getElementById('fi1').click();
  };

  window.cwClearRecent=function(){
    if(confirm('Clear route history?')){saveRoutes([]);renderRecent();}
  };

  // Intercept file input to auto-save route name
  function hookFileInput(){
    const fi=document.getElementById('fi1');
    if(!fi)return;
    fi.addEventListener('change',function(e){
      const f=e.target.files[0];
      if(f&&f.name.toLowerCase().endsWith('.gpx')){
        // Save will be called from index.html cwSaveRoute after parsing
        // Store filename for cwSaveRoute to pick up
        window._pendingRouteName=f.name.replace('.gpx','').replace(/_/g,' ');
      }
    },true); // capture phase — runs before index.html handler
  }

  // Patch cwSaveRoute to use pending name if no name passed
  const _orig=window.cwSaveRoute;
  window.cwSaveRoute=function(name,pts,km){
    const n=name||window._pendingRouteName||'Route';
    window._pendingRouteName=null;
    const routes=getRoutes().filter(r=>r.name!==n);
    routes.unshift({name:n,pts,km:Math.round(km||0),date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'})});
    saveRoutes(routes.slice(0,MAX));
    renderRecent();
  };

  // Also hook into cwRefreshRecentRoutes called from cw-community.js
  window.cwRefreshRecentRoutes=renderRecent;

  // Init
  document.addEventListener('DOMContentLoaded',()=>{
    hookFileInput();
    renderRecent();
  });
  // Also try immediately in case DOM is already ready
  if(document.readyState!=='loading'){hookFileInput();renderRecent();}
})();
