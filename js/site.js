// Zyrvath homepage: sample transmissions, sentence slots, mint ledger,
// wallet check, gallery of recent works, copy buttons.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => n.toLocaleString('en');
  const fragLabel = (st) => st.cls === 2 ? 'Word: ' + st.word : (st.cls === 1 ? 'Partial fragment' : 'No fragment');

  // ---------- sample transmissions (02 Transmissions) ----------
  const SAMPLES = [
    '0x0000000000000000000000000000000000000000000000000000000000000003',
    '0x00000000000000000000000000000000000000000000000000000000000002c6',
    '0x00000000000000000000000000000000000000000000000000000000000003cb',
    '0x0000000000000000000000000000000000000000000000000000000000000010'
  ];
  (function samples() {
    const grid = $('#formGrid');
    if (!grid || !window.ZyrvathArt) return;
    grid.innerHTML = '';
    SAMPLES.forEach(function (seed) {
      const r = window.ZyrvathArt.render(seed, 0);
      const d = document.createElement('figure');
      d.className = 'form';
      d.innerHTML = r.svg + '<figcaption><b>' + fragLabel(r.stats) + '</b><span>' + r.stats.band + ' MHz · ' + r.stats.interference + ' · ' + r.stats.palette + '</span></figcaption>';
      grid.appendChild(d);
    });
    const pals = $('#pals');
    if (pals) {
      pals.innerHTML = window.ZyrvathArt.PALETTES.map(function (p) {
        return '<span class="pal">' + p.name + '</span>';
      }).join('');
    }
  })();

  // ---------- sentence slots (01 Frequency) ----------
  (function slots() {
    const box = $('#slots');
    if (!box || !window.ZyrvathArt) return;
    box.innerHTML = window.ZyrvathArt.WORDS.map(function (w, i) {
      return '<div class="slot" data-slot="' + i + '"><div class="no">WORD ' + String(i + 1).padStart(2, '0') + ' / 12</div><div class="w">·····</div></div>';
    }).join('');
    if (!window.ZyrvathChain) return;
    window.ZyrvathChain.market().then(function (j) {
      (j.items || []).forEach(function (it) {
        if (it.cls !== 2) return;
        const idx = window.ZyrvathArt.WORDS.indexOf(it.fragment);
        if (idx < 0) return;
        const el = box.querySelector('[data-slot="' + idx + '"]');
        if (el) { el.classList.add('found'); el.querySelector('.w').textContent = it.fragment; }
      });
    }).catch(function () {});
  })();

  // ---------- mint ledger ----------
  function paintStats(s) {
    const bc = $('#barCount'); if (bc) bc.textContent = fmt(s.minted);
    const mm = $('#mMinted'); if (mm) mm.textContent = fmt(s.minted);
    const ml = $('#mLeft'); if (ml) ml.textContent = fmt(s.max - s.minted);
    const mf = $('#mFill'); if (mf) mf.style.width = (s.minted / s.max * 100).toFixed(2) + '%';
    const st = $('#mStatus');
    if (st) {
      if (s.minted >= s.max) st.textContent = 'Sold out';
      else if (s.open) st.textContent = 'Receiving live';
      else if (typeof LAUNCH_AT !== 'undefined' && Date.now() < LAUNCH_AT) st.innerHTML = 'Opens 2 Nov 2026 · 12.00 UTC · <span data-cd></span>';
      else st.textContent = 'Reception opens soon';
      if (typeof applyLaunch === 'function') applyLaunch();
    }
  }
  function poll() {
    if (!window.ZyrvathChain) return;
    window.ZyrvathChain.stats().then(paintStats).catch(function () {});
  }
  poll();
  setInterval(poll, 15000);

  // ---------- gallery: recent works ----------
  (function gallery() {
    const box = $('#gallery');
    if (!box || !window.ZyrvathChain || !window.ZyrvathArt) return;
    window.ZyrvathChain.recent().then(function (j) {
      if (!j.items.length) return;
      box.innerHTML = '';
      j.items.forEach(function (it) {
        const r = window.ZyrvathArt.render(it.seed, it.id);
        const d = document.createElement('a');
        d.href = '/market';
        d.innerHTML = r.svg + '<span class="mono" style="display:block;padding:10px 12px">#' + it.id + ' · ' + fragLabel(r.stats) + '</span>';
        box.appendChild(d);
      });
    }).catch(function () {});
  })();

  // ---------- check a wallet ----------
  (function check() {
    const btn = $('#whoBtn'), out = $('#whoOut'), inp = $('#who');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const a = (inp.value || '').trim();
      if (!/^0x[0-9a-fA-F]{40}$/.test(a)) { out.textContent = 'That does not look like a wallet address.'; return; }
      out.textContent = 'Reading contract…';
      window.ZyrvathChain.walletInfo(a).then(function (w) {
        if (!w.hasAgentId) out.textContent = 'No Agent ID. This wallet cannot receive.';
        else if (w.minted >= 20) out.textContent = 'Agent ID held. 20 transmissions received. Wallet limit reached.';
        else out.textContent = 'Agent ID held. ' + w.minted + ' of 20 transmissions received. Ready.';
      }).catch(function () { out.textContent = 'Could not reach BNB Chain. Try again.'; });
    });
  })();

  // ---------- copy buttons ----------
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      const el = document.getElementById(b.getAttribute('data-copy'));
      if (!el) return;
      if (navigator.clipboard) navigator.clipboard.writeText(el.innerText);
      b.textContent = 'Copied';
      setTimeout(function () { b.textContent = 'Copy'; }, 1600);
    });
  });
})();
