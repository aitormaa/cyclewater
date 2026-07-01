// CycleWater — Identity & Auto-fill
// One-time setup: name + email stored in localStorage.
// Auto-fills contributor field everywhere. Never asks again.
(function () {

  const KEY = 'cw_identity';

  function getIdentity() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function saveIdentity(id) {
    localStorage.setItem(KEY, JSON.stringify(id));
    // Also keep legacy cw_nickname in sync
    if (id.name) localStorage.setItem('cw_nickname', id.name);
  }

  // Auto-fill any contributor-name input whenever it appears
  function autofill() {
    const id = getIdentity();
    if (!id) return;
    const el = document.getElementById('contributor-name');
    if (el && !el.value) el.value = id.name || '';
  }

  // ── Identity bar injected into sidebar header ──────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cw-id-bar{display:flex;align-items:center;gap:8px;padding:8px 20px;background:rgba(14,165,233,.07);border-bottom:1px solid #334155;font-size:11px;flex-shrink:0}
    #cw-id-bar .cw-id-name{color:#F1F5F9;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #cw-id-bar .cw-id-email{color:#64748B;font-size:10px}
    #cw-id-bar button{background:none;border:1px solid #334155;color:#94A3B8;border-radius:5px;padding:3px 7px;font-size:10px;cursor:pointer;flex-shrink:0}
    #cw-id-bar button:hover{color:#F1F5F9;border-color:#94A3B8}
    #cw-id-modal{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
    #cw-id-modal-box{background:#1E293B;border:1px solid #334155;border-radius:14px;padding:20px;width:100%;max-width:340px;box-shadow:0 10px 40px rgba(0,0,0,.6)}
    #cw-id-modal h2{font-size:16px;font-weight:700;color:#F1F5F9;margin-bottom:4px}
    #cw-id-modal p{font-size:12px;color:#94A3B8;margin-bottom:14px;line-height:1.5}
    #cw-id-modal label{font-size:11px;color:#94A3B8;display:block;margin-bottom:4px}
    #cw-id-modal input{background:#0F172A;border:1px solid #334155;color:#F1F5F9;border-radius:7px;padding:8px 10px;font-size:13px;width:100%;font-family:inherit;margin-bottom:10px}
    #cw-id-modal input:focus{outline:none;border-color:#0EA5E9}
    #cw-id-modal .note{font-size:10px;color:#475569;margin-bottom:14px;line-height:1.5}
    #cw-id-modal .row{display:flex;gap:8px}
    #cw-id-modal .btn-p{flex:1;background:#0EA5E9;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer}
    #cw-id-modal .btn-o{background:none;border:1px solid #334155;color:#94A3B8;border-radius:8px;padding:10px;font-size:13px;cursor:pointer}
  `;
  document.head.appendChild(style);

  function renderBar() {
    // Remove existing bar if any
    const old = document.getElementById('cw-id-bar');
    if (old) old.remove();

    const id = getIdentity();
    const header = document.getElementById('sidebar-header');
    if (!header) return;

    const bar = document.createElement('div');
    bar.id = 'cw-id-bar';

    if (id && id.name) {
      bar.innerHTML = `
        <span style="font-size:14px">👤</span>
        <div style="flex:1;min-width:0">
          <div class="cw-id-name">${id.name}</div>
          ${id.email ? `<div class="cw-id-email">${id.email}</div>` : '<div class="cw-id-email">No email — points not synced</div>'}
        </div>
        <button onclick="cwIdentityEdit()">Edit</button>`;
    } else {
      bar.innerHTML = `
        <span style="font-size:14px">👤</span>
        <div style="flex:1;color:#94A3B8">Not set up — <span style="color:#0EA5E9;cursor:pointer;font-weight:600" onclick="cwIdentityEdit()">Set your name</span></div>`;
    }

    // Insert after sidebar-header
    header.insertAdjacentElement('afterend', bar);
  }

  function openModal(prefill) {
    if (document.getElementById('cw-id-modal')) return;
    const id = prefill || getIdentity() || {};

    const modal = document.createElement('div');
    modal.id = 'cw-id-modal';
    modal.innerHTML = `
      <div id="cw-id-modal-box">
        <h2>👤 Your Identity</h2>
        <p>Set your name once — it will appear on every water point you add, forever. No account needed.</p>
        <label>Display name *</label>
        <input id="cw-id-name-inp" type="text" placeholder="e.g. Aitor" maxlength="30" value="${id.name||''}">
        <label>Email (optional)</label>
        <input id="cw-id-email-inp" type="email" placeholder="e.g. aitor@email.com" value="${id.email||''}">
        <p class="note">📧 Your email is stored only on this device (localStorage). It helps identify your contributions if you ever connect to the community database. It is never sent anywhere without your consent.</p>
        <div class="row">
          <button class="btn-o" onclick="cwIdentityClose()">Cancel</button>
          <button class="btn-p" onclick="cwIdentitySave()">Save & Remember me</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('cw-id-name-inp').focus();

    // Close on backdrop click
    modal.addEventListener('click', e => { if (e.target === modal) cwIdentityClose(); });
  }

  window.cwIdentityEdit = function () { openModal(); };
  window.cwIdentityClose = function () {
    const m = document.getElementById('cw-id-modal');
    if (m) m.remove();
  };
  window.cwIdentitySave = function () {
    const name = (document.getElementById('cw-id-name-inp').value || '').trim();
    const email = (document.getElementById('cw-id-email-inp').value || '').trim();
    if (!name) { document.getElementById('cw-id-name-inp').style.borderColor = '#EF4444'; return; }
    saveIdentity({ name, email, setup: true });
    cwIdentityClose();
    renderBar();
    autofill();
    // Update top bar
    const bu = document.getElementById('bar-user');
    if (bu) bu.textContent = `👤 ${name}`;
  };

  // ── Auto-fill on accordion open ────────────────────────────────────────────
  // Observe contributor-name field becoming visible
  const observer = new MutationObserver(() => autofill());
  document.addEventListener('DOMContentLoaded', () => {
    const target = document.getElementById('addpt-bod');
    if (target) observer.observe(target, { attributes: true, attributeFilter: ['class'] });
    autofill();
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const header = document.getElementById('sidebar-header');
    if (!header) { setTimeout(init, 200); return; }

    renderBar();

    // If no identity set yet, show modal after 1.5s (first time only)
    const id = getIdentity();
    if (!id || !id.setup) {
      setTimeout(() => openModal(), 1500);
    } else {
      autofill();
      const bu = document.getElementById('bar-user');
      if (bu && id.name) bu.textContent = `👤 ${id.name}`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
