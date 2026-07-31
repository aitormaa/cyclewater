// CycleWater Community Features — leaderboard + username
(function(){
  // Inject leaderboard overlay into body
  const lb=document.createElement('div');
  lb.id='lb-ovl';
  lb.style.cssText='display:none;position:fixed;inset:0;background:rgba(15,23,42,.97);z-index:300;overflow-y:auto;padding:24px 16px;font-family:-apple-system,sans-serif';
  lb.innerHTML=`<div style="max-width:380px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="font-size:18px;color:#0EA5E9">🏆 Community Leaderboard</h2>
      <button onclick="document.getElementById('lb-ovl').style.display='none'" style="background:none;border:none;color:#94A3B8;font-size:22px;cursor:pointer">✕</button>
    </div>
    <p style="font-size:11px;color:#94A3B8;margin-bottom:14px">Ranked by water points added to the map</p>
    <div id="lb-rows"></div>
  </div>`;
  document.body.appendChild(lb);

  // Add .lbr style
  const s=document.createElement('style');
  s.textContent='.lbr{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #334155;font-size:13px}';
  document.head.appendChild(s);

  window.openUsr=function(){
    const cur=localStorage.getItem('cw_nickname')||'';
    const n=prompt('Your name on the leaderboard:',cur);
    if(n!==null){
      const v=n.trim();
      localStorage.setItem('cw_nickname',v);
      document.getElementById('bar-user').textContent=v?`👤 ${v}`:'👤 Anonymous';
      const el=document.getElementById('contributor-name');
      if(el)el.value=v;
      // Refresh recent routes panel for the new profile
      window.cwRefreshRecentRoutes?.();
    }
  };

  window.openLB=async function(){
    document.getElementById('lb-ovl').style.display='block';
    const el=document.getElementById('lb-rows');
    const sb=window._cwSb;
    if(!sb){
      el.innerHTML='<p style="color:#94A3B8;font-size:13px;text-align:center;padding:20px">Connect to Community DB first to see the leaderboard.</p>';
      return;
    }
    el.innerHTML='<p style="color:#94A3B8;text-align:center;padding:20px">Loading…</p>';
    try{
      const{data,error}=await sb.from('community_water_points').select('contributor_name').not('contributor_name','is',null);
      if(error)throw error;
      const counts={};
      (data||[]).forEach(r=>{if(r.contributor_name)counts[r.contributor_name]=(counts[r.contributor_name]||0)+1;});
      const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,20);
      const medals=['🥇','🥈','🥉'];
      el.innerHTML=sorted.length
        ? sorted.map(([name,n],i)=>`<div class="lbr"><span style="width:28px;text-align:center;font-size:16px">${medals[i]||i+1}</span><span style="flex:1;color:#F1F5F9;font-weight:500">${name}</span><span style="color:#0EA5E9;font-weight:700">${n} 💧</span></div>`).join('')
        : '<p style="color:#94A3B8;text-align:center;padding:20px">No contributors yet — be the first! 💧</p>';
    }catch(e){
      el.innerHTML=`<p style="color:#EF4444;padding:10px;font-size:12px">${e.message}</p>`;
    }
  };
})();

// ── Water point gap distances, reliable on desktop and mobile ──
(function(){
  const R=6371;
  function hv(a,b){const dA=(b.lat-a.lat)*Math.PI/180,dO=(b.lng-a.lng)*Math.PI/180,x=Math.sin(dA/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dO/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
  function project(pt,pts){
    let best={km:0,dist:Infinity};let acc=0;
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i],seg=hv(a,b);if(!seg){continue;}
      const mid=(a.lat+b.lat)*Math.PI/360,scale=Math.cos(mid);
      const ax=a.lng*scale,ay=a.lat,bx=b.lng*scale,by=b.lat,px=pt.lng*scale,py=pt.lat;
      const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));
      const q={lat:ay+t*dy,lng:(ax+t*dx)/scale},off=hv(pt,q);
      if(off<best.dist)best={km:acc+seg*t,dist:off};
      acc+=seg;
    }
    return best;
  }
  function activeWater(pts){
    const S=window.S||{},reported=window.REPORTED||new Set(),out=[];
    [...(S.waterPts||[]),...(S.commPts||[])].forEach(p=>{
      if(!p||reported.has(p.id)||!isFinite(+p.lat)||!isFinite(+p.lng))return;
      const q=project({lat:+p.lat,lng:+p.lng},pts);
      if(q.dist<=1.5&&!out.some(x=>x.id===p.id))out.push({...p,km:q.km});
    });
    return out.sort((a,b)=>a.km-b.km);
  }
  let done=false,lastTap=0;
  function handleGapTap(e){
    if(e.defaultPrevented||window.S?.addMode||window._cwGetTab?.()!=='panel')return;
    const map=window.map||window.cwMap,pts=window.S?.routePts;
    if(!map||!pts?.length||pts.length<2)return;
    const layers=['route-l','route-h','route-arrows-l'].filter(id=>map.getLayer?.(id));
    if(!layers.length)return;
    const p=e.point||map.project(e.lngLat),pad=14;
    let hits=[];try{hits=map.queryRenderedFeatures([[p.x-pad,p.y-pad],[p.x+pad,p.y+pad]],{layers});}catch(err){return;}
    if(!hits.length)return;
    const now=Date.now();if(now-lastTap<350)return;lastTap=now;
    const click=project({lat:e.lngLat.lat,lng:e.lngLat.lng},pts),water=activeWater(pts);
    if(!water.length)return;
    const prev=water.filter(w=>w.km<=click.km+0.02).pop(),next=water.find(w=>w.km>click.km+0.02);
    if(!prev&&!next)return;
    let html;
    if(next){
      const until=Math.max(0,next.km-click.km);
      html=`Next 💧 in <b>${until.toFixed(1)} km</b>`;
      if(prev)html+=`<br><span style="font-size:11px;opacity:.75">Water-point gap: ${(next.km-prev.km).toFixed(1)} km</span>`;
    }else html=`Last 💧 was <b>${Math.max(0,click.km-prev.km).toFixed(1)} km</b> ago`;
    const ML=window.maplibregl||window.mapboxgl;
    if(ML)new ML.Popup({closeButton:true,closeOnClick:true}).setLngLat(e.lngLat).setHTML(`<div style="font-size:13px;padding:2px 6px;font-family:inherit">${html}</div>`).addTo(map);
    else window.showToast?.(html.replace(/<[^>]+>/g,''));
  }
  function setupGapClick(){
    if(done)return;
    const map=window.map||window.cwMap;if(!map){setTimeout(setupGapClick,300);return;}
    done=true;
    map.on('click',handleGapTap);
    ['route-l','route-h'].forEach(id=>{if(map.getLayer?.(id)){map.on('mouseenter',id,()=>{map.getCanvas().style.cursor='crosshair';});map.on('mouseleave',id,()=>{map.getCanvas().style.cursor='';});}});
  }
  setupGapClick();
})();

// Komoot GPX download helper — called when API import fails
window.showKomootGpxHelper=function(id){
  const e=document.getElementById('cw-kh');if(e)e.remove();
  const u=`https://www.komoot.com/tour/${id}`;
  const d=document.createElement('div');
  d.id='cw-kh';
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML=`<div style="background:var(--bg,#0f172a);border:1px solid var(--bd,#1e293b);border-radius:16px;padding:24px;max-width:320px;width:100%;color:var(--tx,#f1f5f9);font-family:inherit;">
    <div style="font-size:26px;text-align:center;margin-bottom:10px">🗺️</div>
    <div style="font-weight:700;font-size:15px;margin-bottom:8px;text-align:center">Download GPX from Komoot</div>
    <div style="font-size:12px;color:var(--tm,#94a3b8);margin-bottom:14px;line-height:1.6">
      Komoot blocks direct API access (even for public tours).<br>Download the GPX in 3 taps:<br><br>
      1️⃣ Open your tour on Komoot<br>
      2️⃣ Tap <b style="color:var(--tx,#f1f5f9)">Share → Download GPX</b><br>
      3️⃣ Come back &amp; upload the .gpx file ⬆️
    </div>
    <a href="${u}" target="_blank" rel="noopener" style="display:block;text-align:center;background:var(--p,#0ea5e9);color:#fff;padding:10px;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;margin-bottom:8px">Open tour on Komoot →</a>
    <button onclick="document.getElementById('cw-kh').remove()" style="width:100%;padding:9px;border:1px solid var(--bd,#1e293b);background:transparent;color:var(--tm,#94a3b8);border-radius:10px;cursor:pointer;font-size:12px">Close</button>
  </div>`;
  document.body.appendChild(d);
  d.addEventListener('click',e=>{if(e.target===d)d.remove();});
};
