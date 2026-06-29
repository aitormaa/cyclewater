// CycleWater — Map Search Bar (Nominatim / OpenStreetMap, no API key)
// Self-contained: injects its own HTML and CSS, uses the global `map` variable.

(function () {

  // ── Inject styles ──────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cw-search{position:absolute;top:14px;left:14px;z-index:10;width:230px;max-width:calc(100vw - 28px)}
    #cw-search-box{display:flex;align-items:center;gap:6px;background:#1E293B;border:1px solid #334155;border-radius:10px;padding:7px 10px;box-shadow:0 2px 10px rgba(0,0,0,.4);transition:border-color .15s}
    #cw-search-box:focus-within{border-color:#0EA5E9}
    #cw-search-input{background:none;border:none;color:#F1F5F9;font-size:13px;outline:none;flex:1;min-width:0;font-family:inherit}
    #cw-search-input::placeholder{color:#64748B}
    #cw-search-clear{background:none;border:none;color:#64748B;cursor:pointer;font-size:15px;line-height:1;padding:0;display:none}
    #cw-search-clear:hover{color:#94A3B8}
    #cw-search-results{display:none;background:#1E293B;border:1px solid #334155;border-radius:8px;margin-top:4px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.5);max-height:280px;overflow-y:auto}
    .cw-sr-item{padding:9px 12px;cursor:pointer;border-bottom:1px solid #1E293B;transition:background .1s}
    .cw-sr-item:last-child{border-bottom:none}
    .cw-sr-item:hover{background:#334155}
    .cw-sr-name{font-size:12px;font-weight:500;color:#F1F5F9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cw-sr-sub{font-size:10px;color:#64748B;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cw-sr-empty{padding:12px;font-size:12px;color:#64748B;text-align:center}
    @media(max-width:768px){#cw-search{top:10px;left:10px;width:200px}}
  `;
  document.head.appendChild(style);

  // ── Inject HTML into map container ─────────────────────────────────────────
  function injectUI() {
    const container = document.getElementById('map-container');
    if (!container || document.getElementById('cw-search')) return;

    const wrap = document.createElement('div');
    wrap.id = 'cw-search';
    wrap.innerHTML = `
      <div id="cw-search-box">
        <span style="font-size:14px;color:#64748B;flex-shrink:0">🔍</span>
        <input id="cw-search-input" type="text" placeholder="Search city, town…"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        <button id="cw-search-clear" onclick="cwSearchClear()" title="Clear">✕</button>
      </div>
      <div id="cw-search-results"></div>
    `;
    container.appendChild(wrap);

    document.getElementById('cw-search-input').addEventListener('input', onInput);
    document.getElementById('cw-search-input').addEventListener('keydown', onKeydown);

    // Close results when clicking outside
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) closeResults();
    });
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let debounceTimer = null;
  let searchMarker = null;
  let results = [];
  let selectedIdx = -1;

  // ── Input handler (debounced 400ms to respect Nominatim's 1 req/s policy) ─
  function onInput(e) {
    const q = e.target.value.trim();
    document.getElementById('cw-search-clear').style.display = q ? 'block' : 'none';
    clearTimeout(debounceTimer);
    if (!q) { closeResults(); return; }
    if (q.length < 2) return;
    debounceTimer = setTimeout(() => search(q), 400);
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────
  function onKeydown(e) {
    const items = document.querySelectorAll('.cw-sr-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
      highlightItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, 0);
      highlightItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && results[selectedIdx]) {
        selectResult(results[selectedIdx]);
      } else if (results[0]) {
        selectResult(results[0]);
      }
    } else if (e.key === 'Escape') {
      cwSearchClear();
    }
  }

  function highlightItem(items) {
    items.forEach((el, i) => {
      el.style.background = i === selectedIdx ? '#334155' : '';
    });
  }

  // ── Geocode via Nominatim ──────────────────────────────────────────────────
  async function search(q) {
    const el = document.getElementById('cw-search-results');
    el.innerHTML = '<div class="cw-sr-empty">Searching…</div>';
    el.style.display = 'block';
    selectedIdx = -1;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': navigator.language || 'en',
          'User-Agent': 'CycleWater/1.0 (cyclewater app)'
        }
      });
      if (!res.ok) throw new Error('Network error');
      results = await res.json();
      renderResults(results);
    } catch (err) {
      el.innerHTML = '<div class="cw-sr-empty">Could not connect to search.</div>';
    }
  }

  // ── Render dropdown ────────────────────────────────────────────────────────
  function renderResults(data) {
    const el = document.getElementById('cw-search-results');
    if (!data.length) {
      el.innerHTML = '<div class="cw-sr-empty">No results found.</div>';
      el.style.display = 'block';
      return;
    }

    el.innerHTML = data.map((r, i) => {
      const parts = r.display_name.split(',');
      const primary = parts[0].trim();
      const secondary = parts.slice(1, 3).map(s => s.trim()).filter(Boolean).join(', ');
      const icon = iconFor(r.type || r.class);
      return `<div class="cw-sr-item" onclick="cwSearchSelect(${i})" data-idx="${i}">
        <div class="cw-sr-name">${icon} ${primary}</div>
        ${secondary ? `<div class="cw-sr-sub">${secondary}</div>` : ''}
      </div>`;
    }).join('');

    el.style.display = 'block';
  }

  function iconFor(type) {
    const icons = {
      city: '🏙️', town: '🏘️', village: '🏡', hamlet: '🏡',
      suburb: '🏘️', county: '🗺️', state: '🗺️', country: '🌍',
      road: '🛣️', motorway: '🛣️', residential: '🏘️',
      peak: '⛰️', mountain: '⛰️', water: '💧', river: '🌊',
      park: '🌳', forest: '🌲', camp_site: '⛺'
    };
    return icons[type] || '📍';
  }

  // ── Select a result ────────────────────────────────────────────────────────
  window.cwSearchSelect = function (idx) {
    const r = results[idx];
    if (!r) return;
    selectResult(r);
  };

  function selectResult(r) {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    const name = r.display_name.split(',').slice(0, 2).join(',').trim();

    // Fly to location
    const zoom = zoomFor(r.type || r.class, r.importance);
    if (window.map) {
      // Fit to bounding box if available, otherwise fly
      if (r.boundingbox) {
        const bb = r.boundingbox.map(Number);
        window.map.fitBounds([[bb[2], bb[0]], [bb[3], bb[1]]], { padding: 60, maxZoom: 15, speed: 1.4 });
      } else {
        window.map.flyTo({ center: [lon, lat], zoom, speed: 1.4 });
      }

      // Drop an orange marker
      if (searchMarker) searchMarker.remove();
      searchMarker = new maplibregl.Marker({ color: '#F97316' })
        .setLngLat([lon, lat])
        .setPopup(
          new maplibregl.Popup({ offset: 28, closeButton: false })
            .setHTML(`<div style="font-family:-apple-system,sans-serif;font-size:12px;font-weight:500">${name}</div>`)
        )
        .addTo(window.map);
      searchMarker.togglePopup();
    }

    // Update input and close dropdown
    document.getElementById('cw-search-input').value = r.display_name.split(',')[0].trim();
    document.getElementById('cw-search-clear').style.display = 'block';
    closeResults();
  }

  function zoomFor(type, importance) {
    if (['country', 'continent'].includes(type)) return 5;
    if (['state', 'region'].includes(type)) return 7;
    if (['county', 'district'].includes(type)) return 9;
    if (['city'].includes(type)) return 11;
    if (['town', 'suburb'].includes(type)) return 13;
    if (['village', 'hamlet'].includes(type)) return 14;
    return importance > 0.5 ? 11 : 14;
  }

  // ── Clear search ───────────────────────────────────────────────────────────
  window.cwSearchClear = function () {
    document.getElementById('cw-search-input').value = '';
    document.getElementById('cw-search-clear').style.display = 'none';
    closeResults();
    if (searchMarker) { searchMarker.remove(); searchMarker = null; }
    results = [];
    selectedIdx = -1;
  };

  function closeResults() {
    const el = document.getElementById('cw-search-results');
    if (el) el.style.display = 'none';
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  // Wait for the map container to exist
  function init() {
    if (document.getElementById('map-container')) {
      injectUI();
    } else {
      setTimeout(init, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
