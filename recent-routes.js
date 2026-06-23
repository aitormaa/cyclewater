// CycleWater Recent Routes
// Saves uploaded GPX routes locally in this browser/device.
(function () {
  const KEY = 'cyclewater_recent_routes_v1';
  const MAX = 10;

  function getRoutes() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }

  function setRoutes(routes) {
    localStorage.setItem(KEY, JSON.stringify(routes.slice(0, MAX)));
  }

  function makeId(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = Math.imul(31, h) + text.charCodeAt(i) | 0;
    return 'r_' + Math.abs(h);
  }

  function routeTitle() {
    const strong = document.querySelector('#upload-zone strong');
    return strong ? strong.textContent.trim() : 'Uploaded route';
  }

  function saveCurrentRoute() {
    if (typeof S === 'undefined' || !S.origGPX || !S.routePts || S.routePts.length < 2) return;

    const routes = getRoutes();
    const id = makeId(S.origGPX);
    const existing = routes.findIndex(r => r.id === id);

    const route = {
      id,
      name: routeTitle(),
      gpx: S.origGPX,
      date: new Date().toISOString(),
      km: Math.round((S.routeKm || 0) * 10) / 10,
      water: (S.waterPts || []).filter(w => !(typeof REPORTED !== 'undefined' && REPORTED.has(w.id))).length + ((S.commPts || []).length || 0),
      dry: (S.dryZones || []).length
    };

    if (existing >= 0) routes.splice(existing, 1);
    routes.unshift(route);
    setRoutes(routes);
    renderRecentRoutes();
  }

  window.cwLoadRecentRoute = function (id) {
    const route = getRoutes().find(r => r.id === id);
    if (!route) return alert('Route not found.');
    if (typeof parseGPX !== 'function' || typeof loadRouteData !== 'function') {
      return alert('App is still loading. Try again in a second.');
    }

    const pts = parseGPX(route.gpx);
    if (!pts || pts.length < 2) return alert('Could not reload this GPX.');

    S.origGPX = route.gpx;
    S.routePts = pts;
    document.getElementById('upload-zone').innerHTML =
      `<div class="ui">✅</div><p><strong>${route.name}</strong><br>${pts.length.toLocaleString()} track points</p>`;
    loadRouteData(pts);
  };

  window.cwDeleteRecentRoute = function (id, event) {
    if (event) event.stopPropagation();
    const routes = getRoutes().filter(r => r.id !== id);
    setRoutes(routes);
    renderRecentRoutes();
  };

  window.cwClearRecentRoutes = function () {
    if (!confirm('Clear all saved recent routes from this device?')) return;
    setRoutes([]);
    renderRecentRoutes();
  };

  function renderRecentRoutes() {
    const box = document.getElementById('recent-routes-box');
    if (!box) return;

    const routes = getRoutes();
    if (!routes.length) {
      box.innerHTML = '<div style="font-size:12px;color:var(--tm);text-align:center;padding:8px 0">No saved routes yet. Upload a GPX and it will appear here.</div>';
      return;
    }

    box.innerHTML = routes.map(r => {
      const d = new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const safeName = (r.name || 'Route').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<div class="wi" onclick="cwLoadRecentRoute('${r.id}')">
        <div class="wd osm"></div>
        <div class="wif">
          <div class="wn">${safeName}</div>
          <div class="wm">${d} · ${r.km}km · ${r.water} water · ${r.dry} dry zones</div>
        </div>
        <button onclick="cwDeleteRecentRoute('${r.id}', event)" style="background:none;border:none;color:var(--rd);cursor:pointer;font-size:14px;padding:2px" title="Delete">✕</button>
      </div>`;
    }).join('') +
      '<button class="btn btn-o" style="margin-top:8px;font-size:11px;padding:6px" onclick="cwClearRecentRoutes()">Clear recent routes</button>';
  }

  function installUI() {
    if (document.getElementById('recent-routes-card')) return;
    const sec = document.getElementById('sec-a');
    if (!sec) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'recent-routes-card';
    card.innerHTML = `
      <div class="stog" onclick="toggleSec('recent-routes-box',this)">
        <span class="ct" style="margin:0">📂 Recent Routes</span><span class="arr">▼</span>
      </div>
      <div class="sbod" id="recent-routes-box"></div>`;

    sec.appendChild(card);
    renderRecentRoutes();
  }

  function patchFinishLoad() {
    if (typeof finishLoad !== 'function' || window.__cwRecentPatched) return;
    window.__cwRecentPatched = true;
    const original = finishLoad;
    window.finishLoad = function (pts) {
      const result = original.apply(this, arguments);
      setTimeout(saveCurrentRoute, 100);
      return result;
    };
  }

  function boot() {
    installUI();
    patchFinishLoad();
    renderRecentRoutes();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
