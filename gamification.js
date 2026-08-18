// CycleWater Gamification — username, points, leaderboard, photo preview, submit
(function () {
  const LKEY = 'cw_username_v1', PKEY = 'cw_points_v1', IDKEY = 'cw_uid_v1', CKEY = 'cw_contributions_v1';

  function getUID() { let u = localStorage.getItem(IDKEY); if (!u) { u = 'u_' + Math.random().toString(36).substr(2, 9); localStorage.setItem(IDKEY, u); } return u; }
  function getUsername() { return localStorage.getItem(LKEY) || ''; }
  function getLocalPts() { return parseInt(localStorage.getItem(PKEY) || '0'); }
  function addLocalPts(n) { const p = getLocalPts() + n; localStorage.setItem(PKEY, p); return p; }
  function getContributions() { return parseInt(localStorage.getItem(CKEY) || '0'); }
  function addContribution() { const c = getContributions() + 1; localStorage.setItem(CKEY, c); return c; }

  // CSS
  const st = document.createElement('style');
  st.textContent = `@keyframes cwFloat{0%{opacity:0;transform:translateY(0)}15%{opacity:1}80%{opacity:1;transform:translateY(-50px)}100%{opacity:0;transform:translateY(-70px)}}
#cw-pts-badge{font-size:11px;color:#0EA5E9;font-weight:600;margin-left:32px;cursor:pointer;margin-top:2px;display:flex;align-items:center;gap:6px}
#cw-pts-badge:hover{opacity:.8}
.cw-lb-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #334155;font-size:12px}
.cw-lb-row:last-child{border-bottom:none}
.cw-lb-me{background:rgba(14,165,233,.08);border-radius:6px;padding:5px 8px;margin:2px -8px}
.cw-lb-name{flex:1;color:#F1F5F9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cw-lb-pts{color:#0EA5E9;font-weight:700;flex-shrink:0}`;
  document.head.appendChild(st);

  // Username modal
  function showUsernameModal(cb) {
    if (getUsername()) { cb(getUsername()); return; }
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.88);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `<div style="background:#1E293B;border:1px solid #334155;border-radius:16px;padding:24px;max-width:300px;width:100%">
      <div style="text-align:center;margin-bottom:16px"><div style="font-size:36px;margin-bottom:8px">🏆</div>
      <div style="font-size:16px;font-weight:700;color:#F1F5F9;margin-bottom:4px">Join the community!</div>
      <div style="font-size:12px;color:#94A3B8;line-height:1.5">Pick a name to track your contributions and appear on the leaderboard.</div></div>
      <input id="cwni" type="text" maxlength="20" placeholder="Your name or nickname…" style="background:#334155;border:1px solid #475569;color:#F1F5F9;border-radius:8px;padding:10px 12px;font-size:14px;width:100%;margin-bottom:12px;outline:none;text-align:center;box-sizing:border-box">
      <div style="display:flex;gap:8px">
        <button id="cwnskip" style="flex:1;background:none;border:1px solid #334155;color:#94A3B8;border-radius:8px;padding:10px;font-size:12px;cursor:pointer">Skip</button>
        <button id="cwnsave" style="flex:2;background:#0EA5E9;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer">Save & continue →</button>
      </div></div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#cwni'), save = () => { const n = input.value.trim().slice(0, 20); if (n) localStorage.setItem(LKEY, n); overlay.remove(); updateBadge(); cb(n || 'Anonymous'); };
    overlay.querySelector('#cwnsave').addEventListener('click', save);
    overlay.querySelector('#cwnskip').addEventListener('click', () => { overlay.remove(); cb('Anonymous'); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    input.focus();
  }

  // Points float animation
  function floatPoints(pts, hasPhoto, hasNotes) {
    [{ t: `+${pts} pts 💧`, big: true }, hasPhoto && { t: '+5 📷 bonus', big: false }, hasNotes && { t: '+3 📝 bonus', big: false }].filter(Boolean).forEach((x, i) => {
      const el = document.createElement('div');
      el.textContent = x.t;
      el.style.cssText = `position:fixed;bottom:${110 + i * 36}px;right:20px;background:${x.big ? '#0EA5E9' : '#1E293B'};border:1px solid #334155;color:#fff;padding:8px 14px;border-radius:20px;font-size:${x.big ? 14 : 11}px;font-weight:700;z-index:150;pointer-events:none;animation:cwFloat ${1.8 + i * 0.3}s forwards`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), (1800 + i * 300) + 200);
    });
  }

  // Badge
  function updateBadge() {
    let el = document.getElementById('cw-pts-badge');
    if (!el) { el = document.createElement('div'); el.id = 'cw-pts-badge'; el.onclick = () => toggleLeaderboard(); const sub = document.querySelector('.logo-sub'); if (sub) sub.parentNode.insertBefore(el, sub.nextSibling); }
    el.innerHTML = `<span>💧 <strong>${getLocalPts()}</strong> pts</span><span style="color:#334155">|</span><span>${getUsername() || 'Anonymous'}</span><span style="color:#334155">|</span><span style="color:#94A3B8">${getContributions()} added</span><span style="color:#0EA5E9;font-size:10px">🏆 Leaderboard</span>`;
  }

  // Leaderboard
  let lbVisible = false;
  function toggleLeaderboard() { lbVisible = !lbVisible; const c = document.getElementById('cw-lb-card'); if (c) { c.style.display = lbVisible ? 'block' : 'none'; if (lbVisible) renderLeaderboard(); } }

  async function renderLeaderboard() {
    const card = document.getElementById('cw-lb-card'); if (!card) return;
    card.innerHTML = '<div class="ct">🏆 Leaderboard</div><div style="font-size:12px;color:#94A3B8;text-align:center;padding:10px">Loading…</div>';
    const sb = (typeof S !== 'undefined') ? S.sb : null;
    let rows = [];
    if (sb) { try { const { data } = await sb.from('community_water_points').select('contributor_name,points').not('contributor_name', 'is', null); if (data) { const agg = {}; data.forEach(r => { if (!r.contributor_name) return; agg[r.contributor_name] = (agg[r.contributor_name] || 0) + (r.points || 10); }); rows = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 10); } } catch (e) { } }
    const myName = getUsername(), myPts = getLocalPts();
    if (myName && myPts && !rows.find(r => r[0] === myName)) { rows.push([myName, myPts]); rows.sort((a, b) => b[1] - a[1]); }
    if (!rows.length) { card.innerHTML = `<div class="ct">🏆 Leaderboard</div><div style="text-align:center;padding:14px 0;color:#94A3B8;font-size:12px"><div style="font-size:28px;margin-bottom:6px">🏅</div>Be the first contributor!<br>Add a water point to appear here.</div>`; return; }
    const medals = ['🥇', '🥈', '🥉'], myRank = rows.findIndex(r => r[0] === myName);
    card.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><span class="ct" style="margin:0">🏆 Leaderboard</span><button onclick="toggleLeaderboard()" style="background:none;border:none;color:#94A3B8;cursor:pointer;font-size:18px">✕</button></div>${rows.map(([name, pts], i) => { const m = name === myName; return `<div class="cw-lb-row${m ? ' cw-lb-me' : ''}"><span style="font-size:15px;width:22px;text-align:center;flex-shrink:0">${medals[i] || (i + 1)}</span><span class="cw-lb-name"${m ? ' style="color:#0EA5E9;font-weight:700"' : ''}>${name.replace(/</g, '&lt;')}${m ? ' ★' : ''}</span><span class="cw-lb-pts">${pts}</span></div>`; }).join('')}${myName && myRank >= 0 ? `<div style="font-size:11px;color:#94A3B8;text-align:center;margin-top:8px">Your rank: #${myRank + 1} · ${myPts} pts · ${getContributions()} contributions</div>` : ''}${!sb ? '<div style="font-size:10px;color:#475569;text-align:center;margin-top:8px">Connect Community DB for global leaderboard</div>' : ''}`;
  }

  function injectLeaderboardCard() {
    if (document.getElementById('cw-lb-card')) return;
    const card = document.createElement('div'); card.className = 'card'; card.id = 'cw-lb-card'; card.style.display = 'none';
    const dl = document.getElementById('dl-row'); if (dl) dl.parentNode.insertBefore(card, dl); else document.getElementById('sidebar-content')?.appendChild(card);
  }

  // Photo preview
  window.cwPreviewPhoto = function (input) {
    const f = input.files[0]; if (!f) return;
    const prev = document.getElementById('photo-preview'); if (!prev) return;
    const reader = new FileReader();
    reader.onload = e => { prev.innerHTML = `<img src="${e.target.result}" style="width:100%;border-radius:8px;max-height:140px;object-fit:cover;margin-top:6px"><div style="font-size:10px;color:#94A3B8;text-align:center;margin-top:3px">📷 ${f.name} · ${(f.size / 1024).toFixed(0)}KB</div>`; prev.style.display = 'block'; };
    reader.readAsDataURL(f);
  };

  // Full submit (with username modal + gamification)
  window.cwSubmitPt = function () {
    const app = window.cwApp; if (!app) return;
    if (!S.pendPt) return;
    const doSave = async () => {
      const btn = document.getElementById('save-pt-btn'); btn.disabled = true; btn.textContent = '⏳ Saving…';
      const pf = document.getElementById('pt-photo-cam')?.files[0] || document.getElementById('pt-photo-gal')?.files[0] || null;
      const notesVal = document.getElementById('pt-notes').value.trim();
      let photoUrl = null; if (pf && S.sb) photoUrl = await app.uploadPhoto(pf);
      const pts_earned = 10 + (pf ? 5 : 0) + (notesVal ? 3 : 0);
      const contributor = window.CW_CONTRIBUTOR || { name: 'Anonymous', id: 'anon' };
      const ok = await app.saveCommPt({ lat: S.pendPt.lat, lng: S.pendPt.lng, water_type: S.selType, notes: notesVal || null, photo_url: photoUrl, contributor_name: contributor.name || 'Anonymous', contributor_id: contributor.id, points: pts_earned });
      if (ok) {
        ['pt-notes', 'pt-photo-cam', 'pt-photo-gal'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const pv = document.getElementById('photo-preview'); if (pv) { pv.innerHTML = ''; pv.style.display = 'none'; }
        document.getElementById('pt-coords-g').style.display = 'none'; S.pendPt = null; if (S.pendMkr) { S.pendMkr.remove(); S.pendMkr = null; }
        btn.textContent = '✅ Saved!'; setTimeout(() => { btn.textContent = '💧 Save Water Point (+10 pts)'; btn.disabled = true; }, 2500);
        addLocalPts(pts_earned); addContribution(); floatPoints(pts_earned, !!pf, !!notesVal); updateBadge(); if (lbVisible) renderLeaderboard();
        app.refreshLayers();
        if (S.routePts.length) { S.dryZones = app.calcDryZones(S.routePts, [...S.waterPts, ...S.commPts], parseInt(document.getElementById('thr').value) || 30, S.routeKm); app.updateStats(); app.updateAlerts(); app.updateList(); }
        else if (getContributions() === 1) { lbVisible = true; const c = document.getElementById('cw-lb-card'); if (c) { c.style.display = 'block'; renderLeaderboard(); } }
      } else { btn.disabled = false; btn.textContent = '💧 Save Water Point (+10 pts)'; }
    };
    showUsernameModal(doSave);
  };

  window.CW_CONTRIBUTOR = { get name() { return getUsername(); }, get id() { return getUID(); } };
  window.cwShowUsernameModal = showUsernameModal;
  window.toggleLeaderboard = toggleLeaderboard;

  function boot() { injectLeaderboardCard(); updateBadge(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
