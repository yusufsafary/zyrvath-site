// Browser chain reads for zyrvath.com (GitHub Pages).
// Direct BSC RPC reads from the visitor's browser. Read-only.
(function () {
  'use strict';
  var NFT = '0x2279b94B42BCD80F366F37566cCC1a734a817688';
  var CLAIM = '0x9DeeF5EDE4836c4154ef37Ea4a8b66AD89878631';
  var TOKEN = '0x2991C8EF279368aB378eF1b86F8CE1AB1721A212';
  var ZERO = '0x0000000000000000000000000000000000000000';
  var RPCS = [
    'https://bsc-rpc.publicnode.com',
    'https://bsc-dataseed.bnbchain.org',
    'https://bsc-dataseed1.binance.org',
    'https://bsc-mainnet.public.blastapi.io'
  ];
  var SEL = {
    totalSupply: '0x18160ddd',
    seedOf: '0x82829f74',
    ownerOf: '0x6352211e',
    stats: '0x8bcdcbf3',
    holdsAgentId: '0x11213086',
    mintedBy: '0x3cef28d2',
    signalClassOf: '0x09f4fc4e',
    wordIndexOf: '0xfda071a3',
    totalClaimed: '0xd54ad2a1',
    claimsRemaining: '0x754c463f',
    claimOpen: '0x4b8bcb58',
    claimedById: '0x4c80ee12',
    claimAmount: '0x23b221a0',
    poolBalance: '0x96365d44'
  };

  function encUint(n) { return BigInt(n).toString(16).padStart(64, '0'); }
  function encAddr(a) { return String(a).toLowerCase().replace(/^0x/, '').padStart(64, '0'); }
  function wordAt(hex, i) { return BigInt('0x' + hex.slice(2 + i * 64, 2 + (i + 1) * 64)); }
  function addrAt(hex, i) { return '0x' + hex.slice(2 + i * 64 + 24, 2 + (i + 1) * 64); }

  function post(url, payload) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }
  function viaRpc(fn) {
    var p = Promise.reject(new Error('no rpc'));
    RPCS.forEach(function (u) { p = p.catch(function () { return fn(u); }); });
    return p;
  }
  function ethCall(to, data) {
    return viaRpc(function (u) {
      return post(u, { jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: to, data: data }, 'latest'] })
        .then(function (j) {
          if (j.error || typeof j.result !== 'string') throw new Error('rpc error');
          return j.result;
        });
    });
  }
  // Multicall3 aggregate3: many contract reads inside ONE eth_call.
  var MC3 = '0xcA11bde05977b3631167028862bE2a173976CA11';
  var AGG_SEL = '0x82ad56cb';
  function encBytes(hex) {
    var body = hex.replace(/^0x/, '');
    var padded = body.padEnd(Math.ceil(body.length / 64) * 64, '0');
    return encUint(body.length / 2) + padded;
  }
  function aggregate3(calls) {
    var tuples = calls.map(function (c) {
      return encAddr(c.to) + encUint(1) + encUint(96) + encBytes(c.data);
    });
    var head = '', tail = '', off = tuples.length * 32;
    tuples.forEach(function (t) {
      head += encUint(off);
      tail += t;
      off += t.length / 2;
    });
    var data = AGG_SEL + encUint(32) + encUint(calls.length) + head + tail;
    return ethCall(MC3, data).then(function (hex) {
      var base = 2 + Number(wordAt(hex, 0)) * 2;
      var len = Number(wordAt(hex, (base - 2) / 64));
      var out = [];
      for (var i = 0; i < len; i++) {
        var rel = Number(wordAt(hex, (base - 2) / 64 + 1 + i));
        var t = (base - 2) / 64 + 1 + rel / 32;
        var ok = wordAt(hex, t) !== 0n;
        var bOff = Number(wordAt(hex, t + 1));
        var bLen = Number(wordAt(hex, t + bOff / 32));
        var bytes = '0x' + hex.slice((t + bOff / 32 + 1) * 64 + 2, (t + bOff / 32 + 1) * 64 + 2 + bLen * 2);
        out.push({ ok: ok, result: bytes });
      }
      return out;
    });
  }
  function aggregate3Chunked(calls, size) {
    var chunks = [];
    for (var i = 0; i < calls.length; i += size) chunks.push(calls.slice(i, i + size));
    var out = new Array(chunks.length);
    var next = 0;
    function worker() {
      var idx = next++;
      if (idx >= chunks.length) return Promise.resolve();
      return aggregate3(chunks[idx]).then(function (r) {
        out[idx] = r;
        return worker();
      });
    }
    var pool = [];
    for (var w = 0; w < Math.min(4, chunks.length); w++) pool.push(worker());
    return Promise.all(pool).then(function () {
      var flat = [];
      out.forEach(function (r) { flat = flat.concat(r); });
      return flat;
    });
  }

  // Mint ledger. The Zyrvath stats() is safe for the zero address, so the
  // public ledger reads stats(0) directly.
  function stats(wallet) {
    var hasWallet = /^0x[0-9a-fA-F]{40}$/.test(wallet || '') && wallet.toLowerCase() !== ZERO.toLowerCase();
    var addr = hasWallet ? wallet : ZERO;
    return aggregate3([{ to: NFT, data: SEL.stats + encAddr(addr) }]).then(function (r) {
      if (!r[0].ok) throw new Error('stats read failed');
      var hex = r[0].result;
      return {
        minted: Number(wordAt(hex, 0)),
        max: Number(wordAt(hex, 1)),
        priceWei: wordAt(hex, 2).toString(),
        open: wordAt(hex, 3) !== 0n,
        hasAgentId: wordAt(hex, 4) !== 0n,
        hasMinted: wordAt(hex, 5) !== 0n,
        contract: NFT
      };
    });
  }

  function walletInfo(wallet) {
    return aggregate3([
      { to: NFT, data: SEL.holdsAgentId + encAddr(wallet) },
      { to: NFT, data: SEL.mintedBy + encAddr(wallet) }
    ]).then(function (r) {
      return {
        hasAgentId: r[0].ok ? wordAt(r[0].result, 0) !== 0n : false,
        minted: r[1].ok ? Number(wordAt(r[1].result, 0)) : 0
      };
    });
  }

  // Most recent minted works, with seeds.
  function recent() {
    return ethCall(NFT, SEL.totalSupply).then(function (hex) {
      var n = Number(wordAt(hex, 0));
      var ids = [];
      for (var i = n; i > Math.max(0, n - 12); i--) ids.push(i);
      if (!ids.length) return { minted: n, items: [] };
      var calls = ids.map(function (id) { return { to: NFT, data: SEL.seedOf + encUint(id) }; });
      return aggregate3(calls).then(function (results) {
        var items = [];
        ids.forEach(function (id, k) {
          var r = results[k];
          if (!r || !r.ok) return;
          var v = wordAt(r.result, 0);
          if (v === 0n) return;
          items.push({ id: id, seed: '0x' + v.toString(16).padStart(64, '0') });
        });
        return { minted: n, items: items };
      });
    });
  }

  // Claim ledger; with an id, also that work's claim state and amount.
  function claim(id) {
    var calls = [
      { to: CLAIM, data: SEL.totalClaimed },
      { to: CLAIM, data: SEL.claimsRemaining },
      { to: CLAIM, data: SEL.claimOpen },
      { to: CLAIM, data: SEL.poolBalance }
    ];
    if (id !== undefined) {
      calls.push({ to: CLAIM, data: SEL.claimedById + encUint(id) });
      calls.push({ to: CLAIM, data: SEL.claimAmount + encUint(id) });
      calls.push({ to: NFT, data: SEL.ownerOf + encUint(id) });
      calls.push({ to: NFT, data: SEL.signalClassOf + encUint(id) });
      calls.push({ to: NFT, data: SEL.wordIndexOf + encUint(id) });
    }
    return aggregate3(calls).then(function (r) {
      if (!r[0].ok) throw new Error('claim read failed');
      var out = {
        claimed: Number(wordAt(r[0].result, 0)),
        max: 7777,
        remaining: Number(wordAt(r[1].result, 0)),
        open: wordAt(r[2].result, 0) !== 0n,
        poolWei: wordAt(r[3].result, 0).toString(),
        claimContract: CLAIM,
        tokenContract: TOKEN
      };
      if (id !== undefined) {
        out.id = id;
        out.claimedForId = r[4].ok ? wordAt(r[4].result, 0) !== 0n : false;
        out.amountWei = r[5].ok ? wordAt(r[5].result, 0).toString() : '0';
        out.owner = r[6].ok ? addrAt(r[6].result, 0) : null;
        out.signalClass = r[7].ok ? Number(wordAt(r[7].result, 0)) : 0;
        out.wordIndex = r[8].ok ? Number(wordAt(r[8].result, 0)) : 0;
      }
      return out;
    });
  }

  // Every minted work with owner and traits (rendered in-browser).
  function market() {
    return ethCall(NFT, SEL.totalSupply).then(function (hex) {
      var n = Number(wordAt(hex, 0));
      if (!n) return { contract: NFT, chain: 'bsc', minted: 0, owners: 0, items: [] };
      var calls = [];
      for (var i = 1; i <= n; i++) {
        calls.push({ to: NFT, data: SEL.ownerOf + encUint(i) });
        calls.push({ to: NFT, data: SEL.seedOf + encUint(i) });
      }
      return aggregate3Chunked(calls, 300).then(function (res) {
        var items = [];
        var ownerSet = {};
        for (var id = 1; id <= n; id++) {
          var o = res[(id - 1) * 2], s = res[(id - 1) * 2 + 1];
          if (!o || !o.ok || !s || !s.ok) continue;
          var owner = addrAt(o.result, 0);
          var v = wordAt(s.result, 0);
          if (v === 0n || !window.ZyrvathArt) continue;
          var seed = '0x' + v.toString(16).padStart(64, '0');
          try {
            var st = window.ZyrvathArt.render(seed, id).stats;
            ownerSet[owner.toLowerCase()] = 1;
            items.push({
              id: id, owner: owner, seed: seed,
              band: st.band, interference: st.interference, palette: st.palette,
              cls: st.cls, fragment: st.cls === 2 ? st.word : (st.cls === 1 ? 'Partial' : 'None'),
              img: '/art/' + id + '.svg',
              element: 'https://element.market/assets/bsc/' + NFT + '/' + id
            });
          } catch (e) {}
        }
        return { contract: NFT, chain: 'bsc', minted: n, owners: Object.keys(ownerSet).length, items: items };
      });
    });
  }

  window.ZyrvathChain = { stats: stats, walletInfo: walletInfo, recent: recent, claim: claim, market: market };
})();
