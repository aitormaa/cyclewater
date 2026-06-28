// CycleWater — Recent Routes (per-profile, localStorage Option A)
// No changes to index.html required — uses FileReader intercept + MutationObserver

(function () {
  const MAX = 5; // max saved routes per profile

  // ── Storage helpers ──────────────────────────────────────────────────────

  function profileKey() {
    return 'cw_routes_' + (localStorage.getItem('cw_nickname') || 'default');
  }

  function getRoutes() {
    try { return JSON.parse(localStorage.getItem(profileKey()) || '[]'); }
    catch (e) { return []; }
  }

  function saveRouteData(name, gpx, km, wpts) {
    const routes = getRoutes();
    // Remove duplicate name (update in place)
    const i = routes.findIndex(r => r.name === name);
    if (i > -1) routes.splice(i, 1);
    routes.unshift({ name, km: Math.round(km * 10) / 10, wpts, date: today(), gpx });
    if (routes.length > MAX) routes.length = MAX;
    try {
      localStorage.setItem(profileKey(), JSON.stringify(routes));
    } catch (e) {
      // localStorage full — save without GPX content and retry
      const slim = routes.map(r => ({ ...r, gpx: null }));
      try { localStorage.setItem(profileKey(), JSON.stringify(slim)); } catch (_) {}
    }
    render();
  }

  function deleteRoute(name) {
    const routes = getRoutes().filter(r => r.name !== name);
    localStorage.setItem(profileKey(), JSON.stringify(routes));
    render();
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  // ── Intercept FileReader to capture GPX content ──────────────────────────
  // This runs before the main app reads the file, so we can save it ourselves
  // without needing any changes to index.html.

  let _pendingGPX = null; // { name, content }

  const _origReadAsText = FileReader.prototype.readAsText;
  FileReader.prototype.readAsText = function (file, encoding) {
    if (file && file.name && file.name.toLowerCase().endsWith('.gpx')) {
      this.addEventListener('load', () => {
        _pendingGPX = { name: file.name, content: this.result };
      }, { once: true });
    }
    return _origReadAsText.apply(this, arguments);
  };

  // ── MutationObserver: detect when a route finishes loading ───────────────
  // When finishLoad() runs, it shows #dl-row. We watch for that.

  function observeRouteLoad() {
    const dlRow = document.getElementById('dl-row');
    if (!dlRow) return;

    const obs = new MutationObserver(() => {
      if (dlRow.style.display !== 'none' && _pendingGPX) {
        const km = parseFloat(document.getElementById('s-dist')?.textContent) || 0;
        const wpts = parseInt(document.getElementById('s-wpt')?.textContent) || 0;
        saveRouteData(_pendingGPX.name, _pendingGPX.content, km, wpts);
        _pendingGPX = null;
      }
    });
    obs.observe(dlRow, { attributes: true, attributeFilter: ['style'] });
  }

  // ── Reload a saved route ─────────────────────────────────────────────────

  window.cwLoadRecentRoute = function (encodedName) {
    const name = decodeURIComponent(encodedName);
    const route = getRoutes().find(r => r.name === name);
    if (!route) return;

    if (!route.gpx) {
      // GPX wasn't saved (storage was full) — open file picker instead
      alert(`GPX for "${name}" was not saved (storage was full). Please re-upload the file.`);
      document.getElementById('fi1')?.click();
      return;
    }

    // Simulate a file load by creating a Blob and triggering the same path
    const blob = new Blob([route.gpx], { type: 'application/gpx+xml' });
    const fakeFile = new File([blob], route.name, { type: 'application/gpx+xml' });
    const dt = new DataTransfer();
    dt.items.add(fakeFile);
    const fi = document.getElementById('fi1');
    if (fi) {
      fi.files = dt.files;
      fi.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  window.cwDeleteRecentRoute = function (encodedName) {
    if (confirm('Remove this route from history?')) {
      deleteRoute(decodeURIComponent(encodedName));
    }
  };

  // Re-render when the user changes their profile name
  window.cwRefreshRecentRoutes = render;

  // ── UI rendering ─────────────────────────────────────────────────────────

  function injectCard() {
    // Find the sidebar-content div and inject our card before the Community DB card
    const content = document.getElementById('sidebar-content');
    if (!content || document.getElementById('recent-routes-card')) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'recent-routes-card';
    card.innerHTML = `
      <div class="stog col" onclick="(()=>{const b=document.getElementById('rr-bod');b.classList.toggle('hid');this.classList.toggle('col')})()">
        <span class="ct" style="margin:0">🕐 Recent Routes</span>
        <span class="arr">▼</span>
      </div>
      <div class="sbod hid" id="rr-bod">
        <div style="font-size:11px;color:var(--tm);margin-bottom:8px">
          Saved for: <strong id="rr-profile" style="color:var(--p)">Anonymous</strong>
        </div>
        <div id="recent-routes-list"></div>
      </div>
    `;

    // Insert before the Community DB card (last card before dl-row)
    const dlRow = document.getElementById('dl-row');
    if (dlRow) content.insertBefore(card, dlRow);
    else content.appendChild(card);

    render();
  }

  function render() {
    const el = document.getElementById('recent-routes-list');
    if (!el) return;

    const profileEl = document.getElementById('rr-profile');
    const name = localStorage.getItem('cw_nickname') || 'Anonymous';
    if (profileEl) profileEl.textContent = name;

    const routes = getRoutes();
    if (!routes.length) {
      el.innerHTML = '<p style="font-size:12px;color:var(--tm);text-align:center;padding:8px 0">No routes saved yet.</p>';
      return;
    }

    el.innerHTML = routes.map(r => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--br)">
        <div style="flex:1;cursor:pointer;min-width:0" onclick="cwLoadRecentRoute('${encodeURIComponent(r.name)}')">
          <div style="color:var(--tx);font-weight:500;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🗺️ ${r.name}</div>
          <div style="color:var(--tm);font-size:10px;margin-top:2px">${r.date} · ${r.km} km · ${r.wpts} water pts${r.gpx ? '' : ' · ⚠️ re-upload needed'}</div>
        </div>
        <button onclick="cwDeleteRecentRoute('${encodeURIComponent(r.name)}')" title="Remove from history"
          style="background:none;border:none;color:var(--tm);cursor:pointer;font-size:15px;flex-shrink:0;padding:4px">🗑</button>
      </div>
    `).join('');
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    injectCard();
    observeRouteLoad();

    // Re-render when profile name changes in the username prompt
    // (openUsr in cw-community.js sets the bar-user text — we piggyback on storage events
    // and also expose cwRefreshRecentRoutes for cw-community.js to call directly)
    window.addEventListener('storage', e => {
      if (e.key === 'cw_nickname') render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
