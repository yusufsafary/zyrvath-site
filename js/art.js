// Zyrvath art engine: one intercepted transmission per work.
// Deterministic from (seed, id). Runs in the browser (window.ZyrvathArt)
// and in Node (module.exports) with identical output.
//
// Signal class and word index are NOT artistic choices: they repeat the
// exact rule stored by the NFT contract at mint (BigInt arithmetic on the
// seed), so the artwork always agrees with signalClassOf / wordIndexOf
// on-chain:
//   r = seed % 1000 -> class 0 (<700), 1 (<970), 2 (>=970)
//   wordIndex = (seed / 1000) % 12
(function () {
  'use strict';

  var WORDS = ['WE', 'ARE', 'STILL', 'HERE', 'UNDER', 'THE', 'STATIC', 'WAITING', 'FOR', 'A', 'HUMAN', 'VOICE'];
  var BANDS = ['41.2', '57.8', '73.4', '88.9', '104.6', '121.3'];
  var PALETTES = [
    { name: 'Phosphor', bg: '#0A0908', sig: '#FFB000', dim: '#77590F', txt: '#EDE6D6', faint: '#3A2F16' },
    { name: 'Bone', bg: '#0C0C0A', sig: '#EDE6D6', dim: '#6E6A5E', txt: '#EDE6D6', faint: '#2C2C28' },
    { name: 'Oxide', bg: '#0C0705', sig: '#E4572E', dim: '#74341E', txt: '#EDE6D6', faint: '#33180E' },
    { name: 'Marine', bg: '#05090C', sig: '#7FD4C1', dim: '#33655A', txt: '#E6F0EA', faint: '#122B26' }
  ];

  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFrom(seedStr) {
    return mulberry32(xmur3(seedStr)());
  }

  function signalClass(seedBig) {
    var r = seedBig % 1000n;
    return r < 700n ? 0 : (r < 970n ? 1 : 2);
  }
  function wordIndex(seedBig) {
    return Number((seedBig / 1000n) % 12n);
  }

  function render(seedInput, id) {
    var seedStr = String(seedInput);
    var seedBig;
    try { seedBig = BigInt(seedStr); } catch (e) { seedBig = 0n; }
    var cls = signalClass(seedBig);
    var wIdx = wordIndex(seedBig);
    var word = WORDS[wIdx];
    var rnd = rngFrom('zyrvath:' + seedStr);

    var pal = PALETTES[Math.floor(rnd() * PALETTES.length)];
    var band = BANDS[Math.floor(rnd() * BANDS.length)];
    var interference = (function () { var x = rnd(); return x < 0.34 ? 'Clear' : (x < 0.75 ? 'Static' : 'Broken'); })();

    var W = 1000, M = 46; // frame inset
    var parts = [];
    parts.push('<rect width="1000" height="1000" fill="' + pal.bg + '"/>');
    // frame + corner registration
    parts.push('<rect x="' + M + '" y="' + M + '" width="' + (W - 2 * M) + '" height="' + (W - 2 * M) + '" fill="none" stroke="' + pal.dim + '" stroke-width="2"/>');
    var c = 26;
    [[M, M, 1, 1], [W - M, M, -1, 1], [M, W - M, 1, -1], [W - M, W - M, -1, -1]].forEach(function (q) {
      parts.push('<path d="M' + (q[0] + c * q[2]) + ' ' + q[1] + ' H' + q[0] + ' V' + (q[1] + c * q[3]) + '" fill="none" stroke="' + pal.sig + '" stroke-width="4"/>');
    });
    // header strip
    parts.push('<text x="' + (M + 24) + '" y="' + (M + 44) + '" font-family="monospace" font-size="25" letter-spacing="6" fill="' + pal.txt + '">ZYRVATH</text>');
    var bandTxt = 'BAND ' + band + ' MHZ';
    parts.push('<text x="' + (W - M - 24) + '" y="' + (M + 44) + '" font-family="monospace" font-size="25" letter-spacing="4" text-anchor="end" fill="' + pal.dim + '">' + bandTxt + '</text>');
    parts.push('<line x1="' + (M + 24) + '" y1="' + (M + 66) + '" x2="' + (W - M - 24) + '" y2="' + (M + 66) + '" stroke="' + pal.faint + '" stroke-width="2"/>');

    // ---- waveform ----
    var x0 = M + 24, x1 = W - M - 24, midY = 428, amp = 118;
    var f1 = 2 + Math.floor(rnd() * 3), f2 = 5 + Math.floor(rnd() * 6), f3 = 11 + Math.floor(rnd() * 10);
    var p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28;
    var a2 = 0.25 + rnd() * 0.35, a3 = 0.08 + rnd() * 0.2;
    var env = 0.65 + rnd() * 0.35;
    // dropout gaps for Broken
    var gaps = [];
    if (interference === 'Broken') {
      var ng = 2 + Math.floor(rnd() * 3);
      for (var g = 0; g < ng; g++) gaps.push([0.08 + rnd() * 0.8, 0.05 + rnd() * 0.13]);
    }
    function inGap(t) { for (var i = 0; i < gaps.length; i++) if (t > gaps[i][0] && t < gaps[i][0] + gaps[i][1]) return true; return false; }
    // centre line + side rails
    parts.push('<line x1="' + x0 + '" y1="' + midY + '" x2="' + x1 + '" y2="' + midY + '" stroke="' + pal.faint + '" stroke-width="2"/>');
    parts.push('<line x1="' + x0 + '" y1="' + (midY - amp - 30) + '" x2="' + x1 + '" y2="' + (midY - amp - 30) + '" stroke="' + pal.faint + '" stroke-width="1"/>');
    parts.push('<line x1="' + x0 + '" y1="' + (midY + amp + 30) + '" x2="' + x1 + '" y2="' + (midY + amp + 30) + '" stroke="' + pal.faint + '" stroke-width="1"/>');
    var N = 220, pts = [], cur = [];
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      if (inGap(t)) { if (cur.length > 1) pts.push(cur); cur = []; continue; }
      var ph = t * 6.2831;
      var y = Math.sin(ph * f1 + p1) + a2 * Math.sin(ph * f2 + p2) + a3 * Math.sin(ph * f3 + p3);
      var e = env + (1 - env) * Math.sin(t * 3.14159);
      var yy = midY - y * amp * 0.42 * e;
      if (interference === 'Static') yy += (rnd() - 0.5) * 13;
      cur.push((x0 + (x1 - x0) * t).toFixed(1) + ',' + yy.toFixed(1));
    }
    if (cur.length > 1) pts.push(cur);
    pts.forEach(function (seg) {
      parts.push('<polyline points="' + seg.join(' ') + '" fill="none" stroke="' + pal.sig + '" stroke-width="3.5" stroke-linejoin="round"/>');
    });
    // interference speckle
    var speck = interference === 'Clear' ? 60 : (interference === 'Static' ? 300 : 190);
    var sp = '';
    for (var s2 = 0; s2 < speck; s2++) {
      var sx = x0 + rnd() * (x1 - x0), sy = midY - amp - 44 + rnd() * (2 * amp + 88);
      sp += '<rect x="' + sx.toFixed(0) + '" y="' + sy.toFixed(0) + '" width="4" height="4" fill="' + (rnd() < 0.6 ? pal.faint : pal.dim) + '"/>';
    }
    parts.push(sp);
    if (interference === 'Broken') {
      var gl = '';
      for (var v = 0; v < 5; v++) {
        var gx = x0 + rnd() * (x1 - x0);
        gl += '<rect x="' + gx.toFixed(0) + '" y="' + (midY - amp - 30) + '" width="3" height="' + (2 * amp + 60) + '" fill="' + pal.faint + '"/>';
      }
      parts.push(gl);
    }

    // ---- fragment zone ----
    var tickY = 640, tickBase = 690;
    parts.push('<line x1="' + x0 + '" y1="' + tickBase + '" x2="' + x1 + '" y2="' + tickBase + '" stroke="' + pal.faint + '" stroke-width="2"/>');
    if (cls === 0) {
      // calibration ruler: uniform ticks, no message
      var rt = '';
      for (var k = 0; k <= 48; k++) {
        var tx = x0 + (x1 - x0) * (k / 48);
        rt += '<line x1="' + tx.toFixed(1) + '" y1="' + tickBase + '" x2="' + tx.toFixed(1) + '" y2="' + (tickBase - (k % 6 === 0 ? 30 : 15)) + '" stroke="' + pal.dim + '" stroke-width="2.5"/>';
      }
      parts.push(rt);
      parts.push('<text x="' + x0 + '" y="' + (tickBase + 62) + '" font-family="monospace" font-size="24" letter-spacing="5" fill="' + pal.dim + '">NO MESSAGE CARRIED</text>');
    } else {
      var letters = word.split('');
      var cut = cls === 2 ? letters.length : 1 + Math.floor(rnd() * Math.max(1, Math.min(3, letters.length - 1)));
      var groupW = 54, tickGap = 8.6;
      var totalW = letters.length * groupW;
      var startX = 500 - totalW / 2;
      var ticks = '';
      letters.forEach(function (ch, li) {
        var code = ch.charCodeAt(0) - 64; // A=1..Z=26
        var ghost = li >= cut;
        for (var b = 0; b < 5; b++) {
          var bit = (code >> (4 - b)) & 1;
          var tx2 = startX + li * groupW + b * tickGap + 6;
          var th = bit ? 40 : 20;
          ticks += '<line x1="' + tx2.toFixed(1) + '" y1="' + tickBase + '" x2="' + tx2.toFixed(1) + '" y2="' + (tickBase - th) + '" stroke="' + (ghost ? pal.faint : pal.sig) + '" stroke-width="4"/>';
        }
      });
      parts.push(ticks);
      var wordSpaced = letters.join(' ');
      var fs = word.length > 6 ? 64 : 84;
      var mainPart = letters.slice(0, cut).join(' ');
      var ghostPart = letters.slice(cut).join(' ');
      var fullW = letters.length;
      // draw received letters bright, unreceived ghosted, centered as one line
      var approxCharW = fs * 0.62 * 2; // letter + space
      var lineW = fullW * approxCharW - fs * 0.62;
      var lx = 500 - lineW / 2;
      parts.push('<text x="' + lx.toFixed(0) + '" y="' + (tickBase + 140) + '" font-family="monospace" font-size="' + fs + '" letter-spacing="10" fill="' + pal.sig + '">' + mainPart + '</text>');
      if (ghostPart) {
        var gx2 = lx + cut * approxCharW;
        parts.push('<text x="' + gx2.toFixed(0) + '" y="' + (tickBase + 140) + '" font-family="monospace" font-size="' + fs + '" letter-spacing="10" fill="' + pal.faint + '">' + ghostPart + '</text>');
      }
      parts.push('<text x="' + x0 + '" y="' + (tickBase + 56) + '" font-family="monospace" font-size="24" letter-spacing="5" fill="' + pal.dim + '">' + (cls === 2 ? 'MESSAGE COMPLETE' : 'MESSAGE PARTIAL') + '</text>');
    }

    // footer strip
    var seedShort = seedStr.length > 14 ? seedStr.slice(0, 14) : seedStr;
    parts.push('<line x1="' + (M + 24) + '" y1="' + (W - M - 66) + '" x2="' + (W - M - 24) + '" y2="' + (W - M - 66) + '" stroke="' + pal.faint + '" stroke-width="2"/>');
    parts.push('<text x="' + (M + 24) + '" y="' + (W - M - 26) + '" font-family="monospace" font-size="22" letter-spacing="3" fill="' + pal.dim + '">SEED ' + seedShort + '</text>');
    parts.push('<text x="' + (W - M - 24) + '" y="' + (W - M - 26) + '" font-family="monospace" font-size="22" letter-spacing="3" text-anchor="end" fill="' + pal.dim + '">' + (id > 0 ? 'NO. ' + id + ' / 7777' : 'DEMONSTRATION') + '</text>');

    var traits = [
      { trait_type: 'Band', value: band + ' MHz' },
      { trait_type: 'Interference', value: interference },
      { trait_type: 'Fragment', value: cls === 0 ? 'None' : (cls === 1 ? 'Partial' : word) },
      { trait_type: 'Palette', value: pal.name },
      { trait_type: 'Seed', value: seedStr }
    ];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">' + parts.join('') + '</svg>';
    return { id: id, seed: seedStr, traits: traits, svg: svg, stats: { cls: cls, word: cls === 2 ? word : null, band: band, interference: interference, palette: pal.name } };
  }

  var api = { render: render, WORDS: WORDS, BANDS: BANDS, PALETTES: PALETTES, signalClass: signalClass, wordIndex: wordIndex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZyrvathArt = api;
})();
