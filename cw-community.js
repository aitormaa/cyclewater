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
