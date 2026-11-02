// Zyrvath launch clock. Reception opened 2 Nov 2026 at 09.49 UTC (16.49 WIB), ahead of schedule on the owner order.
var LAUNCH_AT = Date.UTC(2026, 10, 2, 9, 49, 0);
function fmtCd(ms) {
  var s = Math.max(0, Math.floor(ms / 1000));
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  function p(n) { return String(n).padStart(2, '0'); }
  return 'T-' + p(h) + ':' + p(m) + ':' + p(ss);
}
function applyLaunch() {
  var left = LAUNCH_AT - Date.now();
  document.querySelectorAll('[data-cd]').forEach(function (el) {
    el.textContent = left > 0 ? fmtCd(left) : '';
  });
}
setInterval(applyLaunch, 1000);
