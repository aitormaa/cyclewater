// recent-routes.js — shows last 5 GPX routes analysed, with quick reload + delete
(function(){
  const KEY='cw_recent_routes';
  const MAX=5;

  function getRoutes(){try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return[];}}
  function saveRoutes(arr){try{localStorage.setItem(KEY,JSON.stringify(arr));}catch(e){}}

  window.cwSaveRoute=function(name,pts,km){
    if(!name)name=window._pendingRouteName||'Route';
    window._pendingRouteName=null;
    const routes=getRoutes().filter(r=>r.name!==name);
    routes.unshift({name,pts,km:Math.round(km||0),date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'})});
    saveRoutes(routes.slice(0,MAX));
    renderRecent();
  };

  window.cwDeleteRoute=function(i){
    const routes=getRoutes();
    routes.splice(i,1);
    saveRoutes(routes);
    renderRecent();
  };

  window.cwReloadRoute=function(i){
    const routes=getRoutes();
    if(!routes[i])return;
    const ok=confirm(`Re-analyse "${routes[i].name}"?\n\nYou'll need to select the file again.`);
    if(ok)document.getElementById('fi1').click();
  };

  window.cwClearRecent=function(){
    if(confirm('Clear route history?')){saveRoutes([]);renderRecent();}
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
          <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--c1);border:1px solid var(--br);border-radius:8px;margin-bottom:6px">
            <span style="font-size:15px;flex-shrink:0">🗺️</span>
            <div style="flex:1;min-width:0;cursor:pointer" onclick="cwReloadRoute(${i})" title="Re-analyse">
              <div style="font-size:12px;font-weight:500;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
              <div style="font-size:10px;color:var(--tm)">${r.km}km · ${r.pts.toLocaleString()} pts · ${r.date}</div>
            </div>
            <button onclick="cwDeleteRoute(${i})" title="Remove" style="background:none;border:none;color:var(--tm);cursor:pointer;font-size:16px;padding:0 2px;flex-shrink:0;line-height:1" onmouseover="this.style.color='var(--rd)'" onmouseout="this.style.color='var(--tm)'">✕</button>
          </div>`).join('')}
      </div>`;
  }

  function hookFileInput(){
    const fi=document.getElementById('fi1');
    if(!fi)return;
    fi.addEventListener('change',function(e){
      const f=e.target.files[0];
      if(f&&f.name.toLowerCase().endsWith('.gpx'))
        window._pendingRouteName=f.name.replace(/\.gpx$/i,'').replace(/_/g,' ');
    },true);
  }

  window.cwRefreshRecentRoutes=renderRecent;

  function init(){
    hookFileInput();
    renderRecent();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
