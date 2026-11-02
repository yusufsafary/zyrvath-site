// Zyrvath claim section: ledger, status, check a work.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => n.toLocaleString('en');
  const fmtTok = (wei) => fmt(Number(BigInt(wei) / 1000000000000000000n));
  if (!$('#claim')) return;

  function paint(c) {
    const cc = $('#cClaimed'); if (cc) cc.textContent = fmt(c.claimed);
    const cf = $('#cFill'); if (cf) cf.style.width = (c.claimed / c.max * 100).toFixed(2) + '%';
    const st = $('#cStatus');
    if (st) st.textContent = c.open ? 'Claims open' : 'Opening soon';
  }
  function poll() {
    if (!window.ZyrvathChain) return;
    window.ZyrvathChain.claim().then(paint).catch(function () {});
  }
  poll();
  setInterval(poll, 30000);

  const btn = $('#workBtn'), out = $('#workOut'), inp = $('#work');
  if (btn) btn.addEventListener('click', function () {
    const id = parseInt((inp.value || '').replace(/[^0-9]/g, ''), 10);
    if (!id || id < 1 || id > 7777) { out.textContent = 'Enter a work number from 1 to 7,777.'; return; }
    out.textContent = 'Reading contracts…';
    window.ZyrvathChain.stats().then(function (s) {
      if (id > s.minted) { out.textContent = 'Transmission #' + id + ' has not been received yet.'; return null; }
      return window.ZyrvathChain.claim(id).then(function (c) {
        if (c.claimedForId) { out.textContent = 'Transmission #' + id + ': $ZYR already claimed.'; return; }
        const clsName = c.signalClass === 2 ? 'whole word' : (c.signalClass === 1 ? 'partial fragment' : 'no fragment');
        const word = c.signalClass === 2 && window.ZyrvathArt ? ' Word: ' + window.ZyrvathArt.WORDS[c.wordIndex] + '.' : '';
        out.textContent = 'Transmission #' + id + ': unclaimed. Carries a ' + clsName + ', worth ' + fmtTok(c.amountWei) + ' $ZYR.' + word + ' Owner ' + (c.owner ? c.owner.slice(0, 6) + '…' + c.owner.slice(-4) : 'unknown') + ' can claim it.';
      });
    }).catch(function () { out.textContent = 'Could not reach BNB Chain. Try again.'; });
  });
})();
