// CycleWater — Map Search Bar (Nominatim / OpenStreetMap, no API key needed)
(function () {

  const style = document.createElement('style');
  style.textContent = `
    #cw-search{position:absolute;top:14px;left:14px;z-index:15;width:240px;max-width:calc(100vw - 100px)}
    #cw-search-box{display:flex;align-items:center;gap:6px;background:#1E293B;border:1px solid #334155;border-radius:10px;padding:8px 11px;box-shadow:0 2px 12px rgba(0,0,0,.5);transition:border-color .15s}
    #cw-search-box:focus-within{border-color:#0EA5E9;box-shadow:0 2px 12px rgba(14,165,233,.2)}
    #cw-search-input{background:none;border:none;color:#F1F5F9;font-size:13px;outline:none;flex:1;min-width:0;font-family:inherit}
    #cw-search-input::placeholder{color:#64748B}
    #cw-search-clear{background:none;border:none;color:#64748B;cursor:pointer;font-size:15px;line-height:1;padding:0;display:none}
    #cw-search-results{display:none;background:#1E293B;border:1px solid #334155;border-radius:8px;margin-top:4px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.5);max-height:280px;overflow-y:auto}
    .cw-sr-item{padding:9px 12px;cursor:pointer;border-bottom:1px solid #0F172A;transition:background .1s}
    .cw-sr-item:last-child{border-bottom:none}
    .cw-sr-item:hover,.cw-sr-item.active{background:#334155}
    .cw-sr-name{font-size:12px;font-weight:500;color:#F1F5F9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cw-sr-sub{font-size:10px;color:#64748B;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cw-sr-empty{padding:12px;font-size:12px;color:#64748B;text-align:center}
    /* Mobile: search bar sits ABOVE the map, in its own row — always visible */
    @media(max-width:768px){
      #cw-search{
        position:static;width:100%;max-width:100%;
        border-bottom:1px solid #334155;
        background:#1E293B;
      }
      #cw-search-box{
        border-radius:0;border:none;border-bottom:1px solid #334155;
        padding:10px 14px;box-shadow:none;
      }
      #cw-search-results{
        position:absolute;left:0;right:0;z-index:20;
        border-radius:0;margin-top:0;
        border-left:none;border-right:none;border-top:none;
      }
      #cw-search-mobile-wrap{
        position:relative;flex-shrink:0;
        display:flex;flex-direction:column;
      }
    }
  `;
  document.head.appendChild(style);

  function injectUI() {
    if (document.getElementById('cw-search')) return;

    const isMob = window.innerWidth <= 768;

    if (isMob) {
      // On mobile: inject between view-bar and map-container
      const viewBar = document.getElementById('view-bar');
      const mapContainer = document.getElementById('map-container');
      if (!viewBar || !mapContainer) { setTimeout(injectUI, 200); return; }

      const wrap = document.createElement('div');
      wrap.id = 'cw-search-mobile-wrap';
      wrap.innerHTML = `
        <div id="cw-search">
          <div id="cw-search-box">
            <span style="font-size:14px;color:#64748B;flex-shrink:0">🔍</span>
            <input id="cw-search-input" type="text" placeholder="Search city or town…"
              autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
            <button id="cw-search-clear" onclick="cwSearchClear()" title="Clear">✕</button>
          </div>
          <div id="cw-search-results"></div>
        </div>`;
      // Insert between view-bar and map-container
      viewBar.parentNode.insertBefore(wrap, mapContainer);

    } else {
      // On desktop: inject inside map-container (top-left overlay)
      const container = document.getElementById('map-container');
      if (!container) { setTimeout(injectUI, 200); return; }

      const wrap = document.createElement('div');
      wrap.id = 'cw-search';
      wrap.innerHTML = `
        <div id="cw-search-box">
          <span style="font-size:14px;color:#64748B;flex-shrink:0">🔍</span>
          <input id="cw-search-input" type="text" placeholder="Search city or town…"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          <button id="cw-search-clear" onclick="cwSearchClear()" title="Clear">✕</button>
        </div>
        <div id="cw-search-results"></div>`;
      container.appendChild(wrap);
    }

    document.getElementById('cw-search-input').addEventListener('input', onInput);
    document.getElementById('cw-search-input').addEventListener('keydown', onKeydown);
    document.addEventListener('click', e => {
      const wrap = document.getElementById('cw-search') || document.getElementById('cw-search-mobile-wrap');
      if (wrap && !wrap.contains(e.target)) closeResults();
    });

    // Resize: re-inject if layout changes (e.g. rotation)
    window.addEventListener('resize', () => {
      const existing = document.getElementById('cw-search');
      const wasMob = existing && existing.style.position === 'static';
      const nowMob = window.innerWidth <= 768;
      if (wasMob !== nowMob) {
        const mw = document.getElementById('cw-search-mobile-wrap');
        if (mw) mw.remove(); else if (existing) existing.remove();
        injectUI();
      }
    });
  }

  let debounceTimer = null;
  let searchMarker = null;
  let results = [];
  let selectedIdx = -1;

  function onInput(e) {
    const q = e.target.value.trim();
    document.getElementById('cw-search-clear').style.display = q ? 'block' : 'none';
    clearTimeout(debounceTimer);
    if (!q) { closeResults(); return; }
    if (q.length < 2) return;
    debounceTimer = setTimeout(() => search(q), 400);
  }

  function onKeydown(e) {
    const items = document.querySelectorAll('.cw-sr-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, items.length - 1); highlight(items); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); highlight(items); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[selectedIdx]) selectResult(results[selectedIdx]); else if (results[0]) selectResult(results[0]); }
    else if (e.key === 'Escape') cwSearchClear();
  }

  function highlight(items) {
    items.forEach((el, i) => el.classList.toggle('active', i === selectedIdx));
  }

  async function search(q) {
    const el = document.getElementById('cw-search-results');
    el.innerHTML = '<div class="cw-sr-empty">Searching…</div>';
    el.style.display = 'block';
    selectedIdx = -1;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': navigator.language || 'en', 'User-Agent': 'CycleWater/1.0' } });
      if (!res.ok) throw new Error('error');
      results = await res.json();
      renderResults(results);
    } catch (e) {
      el.innerHTML = '<div class="cw-sr-empty">Could not connect to search.</div>';
    }
  }

  function renderResults(data) {
    const el = document.getElementById('cw-search-results');
    if (!data.length) { el.innerHTML = '<div class="cw-sr-empty">No results found.</div>'; el.style.display = 'block'; return; }
    const icons = {city:'🏙️',town:'🏘️',village:'🏡',hamlet:'🏡',suburb:'🏘️',county:'🗺️',state:'🗺️',country:'🌍',road:'🛣️',peak:'⛰️',mountain:'⛰️',water:'💧',river:'🌊',park:'🌳',forest:'🌲'};
    el.innerHTML = data.map((r, i) => {
      const parts = r.display_name.split(',');
      const primary = parts[0].trim();
      const secondary = parts.slice(1, 3).map(s => s.trim()).filter(Boolean).join(', ');
      const icon = icons[r.type || r.class] || '📍';
      return `<div class="cw-sr-item" onclick="cwSearchSelect(${i})">
        <div class="cw-sr-name">${icon} ${primary}</div>
        ${secondary ? `<div class="cw-sr-sub">${secondary}</div>` : ''}
      </div>`;
    }).join('');
    el.style.display = 'block';
  }

  window.cwSearchSelect = function (idx) { if (results[idx]) selectResult(results[idx]); };

  function selectResult(r) {
    const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
    const name = r.display_name.split(',').slice(0, 2).join(',').trim();
    const map = window.map;
    if (map) {
      if (r.boundingbox) {
        const bb = r.boundingbox.map(Number);
        map.fitBounds([[bb[2], bb[0]], [bb[3], bb[1]]], { padding: 60, maxZoom: 15, speed: 1.4 });
      } else {
        const zoom = (['country','continent'].includes(r.type)?5:['state'].includes(r.type)?7:['county'].includes(r.type)?9:['city'].includes(r.type)?11:['town','suburb'].includes(r.type)?13:14);
        map.flyTo({ center: [lon, lat], zoom, speed: 1.4 });
      }
      if (searchMarker) searchMarker.remove();
      searchMarker = new maplibregl.Marker({ color: '#F97316' })
        .setLngLat([lon, lat])
        .setPopup(new maplibregl.Popup({ offset: 28, closeButton: false }).setHTML(`<div style="font-family:-apple-system,sans-serif;font-size:12px;font-weight:500">${name}</div>`))
        .addTo(map);
      searchMarker.togglePopup();
    }
    document.getElementById('cw-search-input').value = r.display_name.split(',')[0].trim();
    document.getElementById('cw-search-clear').style.display = 'block';
    closeResults();
    // On mobile, show the map after selecting
    if (window.innerWidth <= 768 && window.setView) setView('map');
  }

  window.cwSearchClear = function () {
    const inp = document.getElementById('cw-search-input');
    if (inp) inp.value = '';
    const clr = document.getElementById('cw-search-clear');
    if (clr) clr.style.display = 'none';
    closeResults();
    if (searchMarker) { searchMarker.remove(); searchMarker = null; }
    results = []; selectedIdx = -1;
  };

  function closeResults() {
    const el = document.getElementById('cw-search-results');
    if (el) el.style.display = 'none';
  }

  function init() {
    if (document.getElementById('view-bar') || document.getElementById('map-container')) {
      injectUI();
    } else {
      setTimeout(init, 200);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
