// Travel page mini-game, "Passport Quest": walk a pixel world map, light up the countries
// Yue has been to and collect a passport stamp for each one.
// Countries and stories come from _data/travel.yml, _data/mountains.yml and _data/countries.yml
// (via #travel-game-data); the map itself is assets/js/world-grid.js. Nothing to edit here.
(function () {
  var PK = window.PK, G = window.WORLD_GRID;
  var host = document.getElementById('world-game');
  var dataEl = document.getElementById('travel-game-data');
  if (!PK || !G || !host || !dataEl) return;
  var data = JSON.parse(dataEl.textContent || '{}');
  var canvas = host.querySelector('canvas');
  host.classList.add('is-ready');

  // ---- the map grid -------------------------------------------------------------------
  var COLS = G.cols, ROWS = G.rows, CELL = 4, WW = COLS * CELL, WH = ROWS * CELL, N = COLS * ROWS;
  var grid = new Uint16Array(N);
  G.grid.forEach(function (row, r) {
    var c = 0;
    row.split(' ').forEach(function (run) {
      var p = run.split('*'), v = parseInt(p[0], 36), n = p[1] ? parseInt(p[1], 36) : 1;
      for (var i = 0; i < n; i++) grid[r * COLS + c++] = v;
    });
  });
  var idByName = {}, cellLists = {};
  G.countries.forEach(function (c, i) { idByName[c[0]] = i + 1; });
  function at(c, r) { return r < 0 || r >= ROWS ? 0 : grid[r * COLS + PK.mod(c, COLS)]; }
  function cellOf(lat, lng) {
    return { c: PK.mod(Math.floor(lng - G.left), COLS), r: PK.clamp(Math.floor(G.top - lat), 0, ROWS - 1) };
  }
  function latOf(r) { return G.top - r - 0.5; }
  function lngOf(c) { return G.left + PK.mod(c, COLS) + 0.5; }
  function wrapDx(dc) { dc = PK.mod(dc, COLS); return dc > COLS / 2 ? dc - COLS : dc; }
  function hasPos(t) { return t && typeof t.lat === 'number' && typeof t.lng === 'number'; }

  // Distance from land for the sea colours, and a rough climate for the land colours.
  var coast = new Uint8Array(N);
  (function () {
    var queue = [];
    for (var i = 0; i < N; i++) { if (grid[i]) { coast[i] = 0; queue.push(i); } else coast[i] = 9; }
    for (var q = 0; q < queue.length; q++) {
      var j = queue[q], r = Math.floor(j / COLS), c = j % COLS, d = coast[j] + 1;
      if (d > 4) continue;
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        var rr = r + dr;
        if (rr < 0 || rr >= ROWS) continue;
        var k = rr * COLS + PK.mod(c + dc, COLS);
        if (coast[k] > d) { coast[k] = d; queue.push(k); }
      }
    }
  })();
  function noise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = PK.hash(xi, yi), b = PK.hash(xi + 1, yi), c = PK.hash(xi, yi + 1), d = PK.hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  var DESERTS = [[16, 31, -17, 34], [15, 31, 34, 58], [25, 34, 55, 70], [24, 29, 69, 75], [37, 46, 76, 112],
    [-28, -17, 12, 25], [-32, -19, 116, 142], [-28, -17, -72, -68], [26, 37, -117, -103]];
  var BIOMES = ['grass', 'jungle', 'taiga', 'tundra', 'snow', 'desert'];
  var biome = new Uint8Array(N);
  for (var bi = 0; bi < N; bi++) {
    var br = Math.floor(bi / COLS), bc = bi % COLS;
    var lat = latOf(br), lng = lngOf(bc), b = 0;
    // A little noise so the climate zones do not look like straight stripes.
    var a = Math.abs(lat) + (noise(bc / 5, br / 5) - 0.5) * 7;
    if (a >= 66 || (lat > 59 && lng > -75 && lng < -11)) b = 4;
    else if (a >= 60) b = 3;
    else if (a >= 50) b = 2;
    else if (a < 12) b = 1;
    var j = (noise(bc / 4 + 20, br / 4 + 20) - 0.5) * 6, jl = lat + j, jg = lng - j;
    DESERTS.forEach(function (d) { if (jl >= d[0] && jl <= d[1] && jg >= d[2] && jg <= d[3]) b = 5; });
    biome[bi] = b;
  }

  // ---- stamps: one per country Yue has visited or lived in ----------------------------
  var trips = [];
  (data.travel || []).forEach(function (t) { trips.push(t); });
  (data.mountains || []).forEach(function (t) { trips.push(Object.assign({ mountain: true }, t)); });
  var stamps = [], byName = {}, byId = {};
  function stampFor(name) {
    if (byName[name]) return byName[name];
    var id = idByName[name] || 0, info = id ? G.countries[id - 1] : [name, '', null, null];
    var s = { name: name, id: id, code: info[1], trips: [], upcoming: [], lived: false, planned: true,
      label: info[2] != null ? cellOf(info[2], info[3]) : null, cells: id ? cellsOf(id).length : 0 };
    byName[name] = s;
    if (id) byId[id] = s;
    stamps.push(s);
    return s;
  }
  (data.lived || []).forEach(function (name) { var s = stampFor(name); s.lived = true; s.planned = false; });
  trips.forEach(function (t) {
    var planned = (t.status || 'visited') === 'planned';
    [].concat(t.country || []).forEach(function (name) {
      var s = stampFor(name);
      if (planned) s.upcoming.push(t); else { s.trips.push(t); s.planned = false; }
    });
  });
  var home = data.home && hasPos(data.home) ? data.home : null;
  stamps.forEach(function (s) {
    var spot = null;
    if (home && s.id && at(cellOf(home.lat, home.lng).c, cellOf(home.lat, home.lng).r) === s.id) spot = cellOf(home.lat, home.lng);
    s.trips.concat(s.upcoming).forEach(function (t) {
      if (spot || !hasPos(t)) return;
      var p = cellOf(t.lat, t.lng);
      if (!s.cells || at(p.c, p.r) === s.id) spot = p;
    });
    if (!spot && s.label) spot = s.label;
    if (!spot) s.trips.concat(s.upcoming).some(function (t) { if (hasPos(t)) { spot = cellOf(t.lat, t.lng); return true; } return false; });
    s.anchor = spot;
    s.color = Math.floor(PK.hash(s.name.length, s.name.charCodeAt(0) + s.name.charCodeAt(s.name.length - 1)) * 6);
    s.rot = Math.round((PK.hash(s.name.charCodeAt(1) || 3, s.name.length * 7) - 0.5) * 18);
  });
  var collect = stamps.filter(function (s) { return !s.planned && s.anchor; });
  var plannedSpots = stamps.filter(function (s) { return s.planned && s.anchor; });
  collect.forEach(function (s, i) { s.index = i; s.color = i % 6; });
  var labelOrder = collect.slice().sort(function (a, b) {
    return (b.id ? cellsOf(b.id).length : 0) - (a.id ? cellsOf(a.id).length : 0);
  });

  // Pins for trips with coordinates: flags for travels, peaks for mountains.
  var pins = [];
  trips.forEach(function (t) {
    var add = function (p, mountain) {
      if (!hasPos(p)) return;
      var cell = cellOf(p.lat, p.lng), country = byId[at(cell.c, cell.r)] || byName[[].concat(t.country || [])[0]];
      if (!country || pins.some(function (q) { return q.c === cell.c && q.r === cell.r; })) return;
      pins.push({ c: cell.c, r: cell.r, name: p.name, stamp: country, mountain: mountain, planned: (t.status || 'visited') === 'planned' });
    };
    add(t, !!t.mountain);
    (t.routes || []).forEach(function (r) { add(r, true); });
  });

  // ---- saved progress -----------------------------------------------------------------
  var KEY = 'travel-game-v1';
  var state = PK.load(KEY) || {};
  state.found = state.found || {};
  state.badges = state.badges || {};
  state.peeked = state.peeked || {};
  state.km = state.km || 0;
  state.sea = state.sea || 0;
  var explored = new Uint8Array(N);
  if (state.fog) {
    var pos = 0;
    state.fog.split(' ').forEach(function (run) {
      var p = run.split('*'), v = +p[0], n = parseInt(p[1] || '1', 36);
      for (var i = 0; i < n && pos < N; i++) explored[pos++] = v;
    });
  }
  function save() {
    var out = [], prev = explored[0], n = 0;
    for (var i = 0; i <= N; i++) {
      var v = i < N ? explored[i] : -1;
      if (v === prev) { n++; continue; }
      out.push(prev + (n > 1 ? '*' + n.toString(36) : ''));
      prev = v; n = 1;
    }
    state.fog = out.join(' ');
    state.pos = { c: player.c, r: player.r };
    PK.save(KEY, state);
  }
  function foundCount() { return collect.filter(function (s) { return state.found[s.name]; }).length; }

  // ---- colours -------------------------------------------------------------------------
  var PALETTES = {
    light: {
      sea: ['#3e7cb8', '#4688c4', '#58a0d6'], foam: '#d4ecf9', wave: '#79b9e6',
      dim: [['#a9b69b', '#a2af94'], ['#94aa8c', '#8ca284'], ['#97a893', '#8fa08b'], ['#b8bfad', '#b0b7a5'], ['#dfe3e8', '#d5dae0'], ['#d0c5a5', '#c8bd9d']],
      lit: [['#7bc25a', '#70b752'], ['#48a04b', '#3f9442'], ['#4f9a5a', '#468e51'], ['#a6c486', '#9cba7c'], ['#f8fbfd', '#e7eff6'], ['#f0d48a', '#e6c87c']],
      tree: ['#829279', '#2f7a3a'], border: 'rgba(40,52,40,0.28)', glow: '#ffcf3f',
      fog: [228, 234, 242], fogA: [0.42, 0.52, 0.62, 0.72], ink: '#ffffff', outline: '#22303f', mini: '#22303f'
    },
    dark: {
      sea: ['#11264a', '#152d55', '#1d3a68'], foam: '#56789f', wave: '#2a4f84',
      dim: [['#3e4a3d', '#3a4639'], ['#35473a', '#314236'], ['#384639', '#344135'], ['#4a5148', '#454c43'], ['#7b8592', '#727c89'], ['#5e5845', '#575141']],
      lit: [['#56a34d', '#4c9645'], ['#2f8a40', '#2a7d39'], ['#3f8a4d', '#387f46'], ['#83a56d', '#799b64'], ['#e1e9f2', '#cfdae6'], ['#d1ae62', '#c5a259']],
      tree: ['#2f382e', '#1f5a2a'], border: 'rgba(0,0,0,0.35)', glow: '#ffcf3f',
      fog: [12, 18, 34], fogA: [0.5, 0.6, 0.7, 0.8], ink: '#ffffff', outline: '#0b1020', mini: '#0b1020'
    }
  };
  var P = PALETTES[PK.dark() ? 'dark' : 'light'];
  var STAMP_COLORS = ['#d1495b', '#2e86ab', '#3d9a50', '#8e5bb5', '#e07a2f', '#1d7874'];

  // ---- sprites -------------------------------------------------------------------------
  var SP = { k: '#1d1f2b', h: '#e0703a', H: '#b5532a', s: '#f3c9a1', e: '#1d1f2b', c: '#2a9d8f', p: '#3d405b', b: '#8d5a3b', B: '#6b4229', w: '#ffffff', W: '#dfe6ee' };
  var HERO = {
    down: [
      ['...kkk...', '..khhhk..', '.khhhhhk.', 'kkkkkkkkk', '.ksesesk.', '.ksssssk.', '.kccccck.', 'kscccccsk', 'kskcccksk', '.kppkppk.', '.kpk.kpk.', '.kk...kk.'],
      ['...kkk...', '..khhhk..', '.khhhhhk.', 'kkkkkkkkk', '.ksesesk.', '.ksssssk.', '.kccccck.', 'kscccccsk', 'kskcccksk', '.kppkppk.', '.kpk.kk..', '.kk......']
    ],
    up: [
      ['...kkk...', '..khhhk..', '.khhhhhk.', 'kkkkkkkkk', '.kHHHHHk.', '.ksssssk.', '.kbbbbbk.', 'ksbBBBbsk', 'kskbbbksk', '.kppkppk.', '.kpk.kpk.', '.kk...kk.'],
      ['...kkk...', '..khhhk..', '.khhhhhk.', 'kkkkkkkkk', '.kHHHHHk.', '.ksssssk.', '.kbbbbbk.', 'ksbBBBbsk', 'kskbbbksk', '.kppkppk.', '..kk.kpk.', '......kk.']
    ],
    side: [
      ['...kkk...', '..khhhk..', '.khhhhhk.', '.kkkkkkkk', '..ksssek.', '..ksssssk', '.bkccck..', 'bBkcsck..', 'bBkccck..', '.bkppk...', '..kpkpk..', '..kk.kk..'],
      ['...kkk...', '..khhhk..', '.khhhhhk.', '.kkkkkkkk', '..ksssek.', '..ksssssk', '.bkccck..', 'bBkcsck..', 'bBkccck..', '.bkppk...', '..kpkk...', '..kkk....']
    ]
  };
  var hero = {};
  Object.keys(HERO).forEach(function (k) { hero[k] = HERO[k].map(function (rows) { return PK.sprite(rows, SP); }); });
  var boat = PK.sprite(['.....k.....', '.....kw....', '.....kww...', '..k..kwWw..', '.khk.kwwWw.', '.ksk.k.....', 'kkkkkkkkkkk', '.kbbbbbbbk.', '..kkkkkkk..'], SP);
  var flags = STAMP_COLORS.map(function (col) {
    return PK.sprite(['kff..', 'kfff.', 'kffff', 'kff..', 'k....', 'k....', 'kk...'], { k: '#1d1f2b', f: col });
  });
  var peak = PK.sprite(['...k...', '..kwk..', '.kwwgk.', '.kgggk.', 'kgggggk', 'kkkkkkk'], { k: '#1d1f2b', w: '#ffffff', g: '#8a90a0' });
  var arrow = PK.sprite(['..k..', '..kk.', 'kkkkk', '..kk.', '..k..'].map(function (r) { return r.replace(/k/g, 'y'); }), { y: '#ffcf3f' });
  var cloudSprite = PK.sprite(['....wwww......', '..wwwwwwww.ww.', '.wwwwwwwwwwwww', 'wwwwwwwwwwwwww', '.wwwwwwwwwwww.'], { w: 'rgba(255,255,255,0.55)' });

  // ---- offscreen layers: land and sea, fog, minimap -----------------------------------
  var base = document.createElement('canvas'); base.width = WW; base.height = WH;
  var bctx = base.getContext('2d');
  var fog = document.createElement('canvas'); fog.width = WW; fog.height = WH;
  var fctx = fog.getContext('2d');
  var mini = document.createElement('canvas'); mini.width = COLS; mini.height = ROWS;
  var mctx = mini.getContext('2d');

  function isLit(id) { var s = byId[id]; return !!(s && state.found[s.name]); }
  function paintCell(c, r) {
    var i = r * COLS + c, id = grid[i], x = c * CELL, y = r * CELL, h = PK.hash(c, r), g = bctx;
    if (!id) {
      var d = coast[i];
      g.fillStyle = d <= 1 ? P.sea[2] : d === 2 ? P.sea[1] : P.sea[0];
      g.fillRect(x, y, CELL, CELL);
      if (d <= 1) {
        g.fillStyle = P.foam;
        if (at(c - 1, r)) g.fillRect(x, y + 1 + (h > 0.5 ? 1 : 0), 1, 2);
        if (at(c + 1, r)) g.fillRect(x + 3, y + (h > 0.5 ? 0 : 1), 1, 2);
        if (at(c, r - 1)) g.fillRect(x + 1 + (h > 0.5 ? 1 : 0), y, 2, 1);
        if (at(c, r + 1)) g.fillRect(x + (h > 0.5 ? 0 : 1), y + 3, 2, 1);
      }
      mctx.fillStyle = d <= 1 ? P.sea[2] : P.sea[0];
      mctx.fillRect(c, r, 1, 1);
      return;
    }
    var lit = isLit(id), bm = biome[i], cols = (lit ? P.lit : P.dim)[bm];
    g.fillStyle = cols[h < 0.5 ? 0 : 1];
    g.fillRect(x, y, CELL, CELL);
    var h2 = PK.hash(r + 7, c + 3);
    if ((bm === 1 || bm === 2) && h2 > 0.55) {
      g.fillStyle = P.tree[lit ? 1 : 0];
      g.fillRect(x + 1, y + 1, 2, 1); g.fillRect(x + 1, y + 2, 2, 1);
    } else if (h2 > 0.7) {
      g.fillStyle = cols[h < 0.5 ? 1 : 0];
      g.fillRect(x + Math.floor(h2 * 10) % 3, y + Math.floor(h * 10) % 3, 2, 1);
    }
    g.fillStyle = P.border;
    var right = at(c + 1, r), down = at(c, r + 1);
    if (right && right !== id) g.fillRect(x + CELL - 1, y, 1, CELL);
    if (down && down !== id) g.fillRect(x, y + CELL - 1, CELL, 1);
    if (lit) {
      g.fillStyle = P.glow;
      if (at(c - 1, r) !== id && !isLit(at(c - 1, r))) g.fillRect(x, y, 1, CELL);
      if (at(c + 1, r) !== id && !isLit(at(c + 1, r))) g.fillRect(x + CELL - 1, y, 1, CELL);
      if (at(c, r - 1) !== id && !isLit(at(c, r - 1))) g.fillRect(x, y, CELL, 1);
      if (at(c, r + 1) !== id && !isLit(at(c, r + 1))) g.fillRect(x, y + CELL - 1, CELL, 1);
    }
    mctx.fillStyle = lit ? P.lit[bm][0] : P.dim[bm][1];
    mctx.fillRect(c, r, 1, 1);
  }
  function cellsOf(id) {
    if (!cellLists[id]) {
      var list = [];
      for (var i = 0; i < N; i++) if (grid[i] === id) list.push(i);
      cellLists[id] = list;
    }
    return cellLists[id];
  }
  function paintCountry(id) {
    cellsOf(id).forEach(function (i) {
      var r = Math.floor(i / COLS), c = i % COLS;
      paintCell(c, r);
      [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].forEach(function (n) {
        if (n[1] >= 0 && n[1] < ROWS && at(n[0], n[1]) && at(n[0], n[1]) !== id) paintCell(PK.mod(n[0], COLS), n[1]);
      });
    });
  }

  // Fog: soft cloudy noise in a few alpha steps, cleared where the explorer has been.
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function paintFog() {
    var img = fctx.createImageData(WW, WH), px = img.data, fc = P.fog, A = P.fogA;
    for (var y = 0; y < WH; y++) {
      for (var x = 0; x < WW; x++) {
        var n = 0.7 * noise(x / 52, y / 40) + 0.3 * noise(x / 17 + 40, y / 13 + 9);
        n = PK.clamp((n - 0.25) * 2, 0, 0.999) * (A.length - 1) + BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
        var a = A[PK.clamp(Math.round(n), 0, A.length - 1)];
        var o = (y * WW + x) * 4;
        px[o] = fc[0]; px[o + 1] = fc[1]; px[o + 2] = fc[2]; px[o + 3] = Math.round(a * 255);
      }
    }
    fctx.putImageData(img, 0, 0);
    for (var i = 0; i < N; i++) if (explored[i]) clearFogCell(i, explored[i]);
  }
  function clearFogCell(i, level) {
    var x = (i % COLS) * CELL, y = Math.floor(i / COLS) * CELL;
    if (level >= 2) { fctx.clearRect(x, y, CELL, CELL); return; }
    fctx.save();
    fctx.globalCompositeOperation = 'destination-out';
    fctx.fillStyle = 'rgba(0,0,0,0.55)';
    fctx.fillRect(x, y, CELL, CELL);
    fctx.restore();
  }
  function reveal(c, r, radius) {
    var R = Math.ceil(radius + 1.5);
    for (var dr = -R; dr <= R; dr++) {
      var rr = r + dr;
      if (rr < 0 || rr >= ROWS) continue;
      for (var dc = -R; dc <= R; dc++) {
        var d = Math.sqrt(dr * dr + dc * dc), level = d <= radius ? 2 : d <= radius + 1.5 ? 1 : 0;
        var i = rr * COLS + PK.mod(c + dc, COLS);
        if (level > explored[i]) { explored[i] = level; clearFogCell(i, level); }
      }
    }
  }
  function paintAll() {
    P = PALETTES[PK.dark() ? 'dark' : 'light'];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) paintCell(c, r);
    paintFog();
  }

  // ---- the explorer ---------------------------------------------------------------------
  var startCell = home ? cellOf(home.lat, home.lng) : collect.length ? collect[0].anchor : { c: 190, r: 36 };
  var saved = state.pos && state.pos.r >= 0 && state.pos.r < ROWS ? state.pos : null;
  var player = { c: (saved || startCell).c, r: (saved || startCell).r, fx: 0, fy: 0, face: 'down', flip: false,
    from: null, to: null, t: 0, dur: 0.1, walk: 0 };
  player.fx = player.c; player.fy = player.r;
  var cam = { x: player.fx * CELL + 2, y: player.fy * CELL + 2 };
  var keys = {}, target = null, started = false, steps = 0;
  var particles = [], flash = null, flyFade = 0, clouds = [];
  for (var ci = 0; ci < 9; ci++) clouds.push({ x: PK.hash(ci, 3) * WW, y: 20 + PK.hash(ci, 9) * (WH - 60) });

  function stepTime(dx, dy) {
    var t = keys.shift ? 0.045 : 0.085;
    if (target && Math.abs(wrapDx(target.c - player.c)) + Math.abs(target.r - player.r) > 24) t *= 0.6;
    return dx && dy ? t * 1.35 : t;
  }
  function step(dx, dy) {
    var nr = PK.clamp(player.r + dy, 0, ROWS - 1);
    if (nr === player.r) dy = 0;
    if (!dx && !dy) { target = null; return; }
    player.from = { x: player.fx, y: player.fy };
    player.to = { x: player.fx + dx, y: player.fy + dy };
    player.t = 0;
    player.dur = stepTime(dx, dy);
    if (dx) { player.face = 'side'; player.flip = dx < 0; } else player.face = dy < 0 ? 'up' : 'down';
  }
  function arrive() {
    var mdx = player.to.x - player.from.x, mdy = player.to.y - player.from.y;
    player.fx = player.to.x; player.fy = player.to.y;
    player.c = PK.mod(Math.round(player.fx), COLS); player.r = Math.round(player.fy);
    player.from = player.to = null;
    var kmX = 111 * Math.cos((latOf(player.r) * Math.PI) / 180) * mdx, kmY = 111 * mdy;
    state.km += Math.sqrt(kmX * kmX + kmY * kmY);
    if (!at(player.c, player.r)) state.sea++;
    enterCell(true);
    if (++steps % 15 === 0) save();
    if (steps === 12) hintEl.classList.add('faded');
  }

  function enterCell(walking) {
    reveal(player.c, player.r, 4.5);
    var id = at(player.c, player.r), s = id ? byId[id] : null;
    if (!s) {
      collect.concat(plannedSpots).some(function (x) {
        if (x.cells || !x.anchor) return false;
        if (Math.abs(wrapDx(x.anchor.c - player.c)) <= 1 && Math.abs(x.anchor.r - player.r) <= 1) { s = x; return true; }
        return false;
      });
    }
    if (s && !s.planned && !state.found[s.name]) discover(s, walking);
    else if (s && s.planned && !state.peeked[s.name] && walking) {
      state.peeked[s.name] = Date.now();
      openCountry(s, false);
    }
    checkBadges();
    updateHud();
  }

  // ---- discovering a country ------------------------------------------------------------
  function discover(s, show) {
    state.found[s.name] = Date.now();
    if (s.cells) {
      cellsOf(s.id).forEach(function (i) { if (explored[i] < 2) { explored[i] = 2; clearFogCell(i, 2); } });
      paintCountry(s.id);
      flash = { id: s.id, t: 0 };
    }
    burst(player.fx * CELL + 2, player.fy * CELL - 4, 46);
    save();
    if (show) { target = null; keys = {}; setTimeout(function () { openCountry(s, true); }, 380); }
  }
  function burst(x, y, n) {
    if (PK.calm) n = Math.min(n, 10);
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 50;
      particles.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30, life: 0.8 + Math.random() * 0.6,
        col: i % 3 ? P.glow : '#ffffff' });
    }
  }

  // ---- cards: country stories, passport, intro -------------------------------------------
  function dateOf(t) { return t.status === 'regular' ? 'regularly' : t.date; }
  function stampHtml(s, opts) {
    opts = opts || {};
    var got = !!state.found[s.name];
    var cls = 'pg-stamp c' + s.color + (got ? '' : ' locked') + (opts.big ? ' big' : '') + (opts.fresh ? ' fresh' : '');
    var first = s.trips.length ? s.trips[s.trips.length - 1] : null;
    var when = s.lived ? 'home' : first ? (first.year || first.date || '') : '';
    var inner = got
      ? '<span class="pg-stamp-flag">' + (PK.flag(s.code) || '★') + '</span><span class="pg-stamp-name">' + PK.esc(s.name) + '</span><span class="pg-stamp-date">' + PK.esc(when) + '</span>'
      : '<span class="pg-stamp-flag">?</span><span class="pg-stamp-name">' + PK.esc(opts.hint || '???') + '</span>';
    return '<span class="' + cls + '" style="--rot:' + s.rot + 'deg">' + inner + '</span>';
  }
  function tripHtml(t) {
    var html = '<li><strong>' + (t.emoji ? t.emoji + ' ' : '') + PK.esc(t.name) + '</strong>';
    var meta = [t.area, t.activity, t.elevation, t.grade, dateOf(t)].filter(Boolean).map(PK.esc).join(' · ');
    if (meta) html += '<span class="pg-meta">' + meta + '</span>';
    if (t.routes && t.routes.length) {
      html += '<span class="pg-meta">Routes: ' + t.routes.map(function (r) { return PK.esc(r.name) + (r.grade ? ' (' + PK.esc(r.grade) + ')' : ''); }).join(' · ') + '</span>';
    }
    if (t.insight) html += '<p>' + PK.esc(t.insight) + '</p>';
    if (t.photos && t.photos.length) {
      html += '<span class="pg-photos">' + t.photos.map(function (src) {
        return '<a href="' + PK.esc(src) + '" target="_blank" rel="noopener"><img src="' + PK.esc(src) + '" alt="" loading="lazy"></a>';
      }).join('') + '</span>';
    }
    if (t.log) html += '<a class="pg-link" href="' + PK.esc(t.log) + '">Read the trip report &rarr;</a>';
    return html + '</li>';
  }
  function openCountry(s, fresh) {
    keys = {};
    var flag = PK.flag(s.code);
    var head = s.planned
      ? '<p class="pg-kicker">Coming soon</p><h3>' + (flag ? flag + ' ' : '') + PK.esc(s.name) + '</h3><p class="pg-sub">No stamp yet: this trip is still ahead. Come back after it to collect the stamp!</p>'
      : '<p class="pg-kicker">' + (fresh ? '✨ New stamp! ' : 'Passport stamp ') + (foundCount()) + ' / ' + collect.length + '</p>' +
        '<h3>' + (flag ? flag + ' ' : '') + PK.esc(s.name) + '</h3>' + (s.lived ? '<p class="pg-sub">🏠 Yue has lived here.</p>' : '');
    var html = '<div class="pg-card-head">' + (s.planned ? '<span class="pg-stamp planned" style="--rot:-6deg"><span class="pg-stamp-flag">' + (flag || '✈') + '</span><span class="pg-stamp-name">soon</span></span>' : stampHtml(s, { big: true, fresh: fresh })) + '<div>' + head + '</div></div>';
    var list = s.trips.concat(s.upcoming);
    if (list.length) html += '<ul class="pg-trips">' + list.map(tripHtml).join('') + '</ul>';
    var stories = list.some(function (t) { return t.insight || (t.photos && t.photos.length) || t.log; });
    if (!stories && !s.planned) html += '<p class="pg-soon">📸 Photos and stories from here are coming soon.</p>';
    html += '<div class="pg-actions"><button type="button" class="pg-btn" data-close data-autofocus>Keep exploring ▶</button></div>';
    PK.panel(host, html, { onClose: refocus });
  }
  function refocus() { try { host.focus({ preventScroll: true }); } catch (e) { host.focus(); } }

  function bearing(s) {
    var dc = wrapDx(s.anchor.c - player.c), dr = s.anchor.r - player.r;
    var arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
    var a = Math.atan2(dr, dc * Math.cos((latOf(player.r) * Math.PI) / 180));
    var lat1 = (latOf(player.r) * Math.PI) / 180, lat2 = (latOf(s.anchor.r) * Math.PI) / 180;
    var dl = ((lngOf(s.anchor.c) - lngOf(player.c)) * Math.PI) / 180;
    var km = 6371 * Math.acos(PK.clamp(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dl), -1, 1));
    return arrows[PK.mod(Math.round(a / (Math.PI / 4)), 8)] + ' ' + PK.km(Math.round(km / 100) * 100);
  }
  function openPassport() {
    var got = foundCount();
    var html = '<p class="pg-kicker">Passport</p><h3>🛂 Yue\'s passport</h3>' +
      '<p class="pg-sub">' + PK.progress(got, collect.length) + ' <b>' + got + ' / ' + collect.length + '</b> stamps · ' + PK.km(state.km) + ' travelled</p>' +
      '<div class="pg-stamps">' + collect.map(function (s) {
        var done = !!state.found[s.name];
        return '<button type="button" class="pg-stamp-btn" data-fly="' + PK.esc(s.name) + '" ' + (done ? 'title="Fly to ' + PK.esc(s.name) + '"' : 'title="Not found yet"') + '>' +
          stampHtml(s, { hint: bearing(s) }) + (done ? '<span class="pg-fly">✈ fly here</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<h4>Badges</h4>' + PK.badgeGrid(badges(), state.badges) +
      '<div class="pg-actions"><button type="button" class="pg-btn" data-close data-autofocus>Back to the map</button>' +
      '<button type="button" class="pg-btn ghost" data-reset>Start over</button></div>';
    var close = PK.panel(host, html, { onClose: refocus, className: 'wide' });
    var panel = host.querySelector('.pg-panel');
    panel.addEventListener('click', function (e) {
      var fly = e.target.closest('[data-fly]');
      if (fly) {
        var s = byName[fly.getAttribute('data-fly')];
        if (s && state.found[s.name]) { close(); flyTo(s); }
        return;
      }
      if (e.target.closest('[data-reset]')) {
        if (e.target.closest('[data-reset]').dataset.sure) { reset(); return; }
        e.target.closest('[data-reset]').dataset.sure = '1';
        e.target.closest('[data-reset]').textContent = 'Sure? Click again';
      }
    });
  }
  function flyTo(s) {
    flyFade = 1;
    player.from = player.to = null; target = null;
    player.c = s.anchor.c; player.r = s.anchor.r; player.fx = player.c; player.fy = player.r;
    cam.x = player.fx * CELL + 2; cam.y = player.fy * CELL + 2;
    enterCell(false);
    PK.toast(host, '✈ Landed in <b>' + PK.esc(s.name) + '</b>');
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    state = { found: {}, badges: {}, peeked: {}, km: 0, sea: 0 };
    explored = new Uint8Array(N);
    player.c = startCell.c; player.r = startCell.r; player.fx = player.c; player.fy = player.r; player.from = player.to = null;
    cam.x = player.fx * CELL + 2; cam.y = player.fy * CELL + 2;
    started = false;
    paintAll();
    intro(true);
  }

  // ---- badges ---------------------------------------------------------------------------
  function badges() {
    var list = [
      { id: 'home', icon: '🏠', name: 'Home base', desc: 'Start the journey' },
      { id: 'first', icon: '🧭', name: 'First stamp', desc: 'Find a country away from home' },
      { id: 'sea', icon: '⛵', name: 'Sea legs', desc: 'Sail 40 squares of ocean' },
      { id: 'arctic', icon: '🧊', name: 'Arctic Circle', desc: 'Go north of 66.5° N' },
      { id: 'half', icon: '🌗', name: 'Halfway', desc: 'Collect half of the stamps' },
      { id: 'far', icon: '👣', name: '10,000 km', desc: 'Travel 10,000 km' },
      { id: 'all', icon: '🌍', name: 'Globetrotter', desc: 'Collect every stamp' }
    ];
    if (plannedSpots.length) list.splice(4, 0, { id: 'peek', icon: '🔭', name: 'Sneak peek', desc: 'Find an upcoming trip' });
    return list;
  }
  function checkBadges() {
    var got = foundCount(), list = badges();
    var away = collect.some(function (s) { return state.found[s.name] && !s.lived; });
    var earned = {
      home: started, first: away, sea: state.sea >= 40, arctic: latOf(player.r) > 66.5 || state.badges.arctic,
      peek: Object.keys(state.peeked).length > 0, half: got * 2 >= collect.length && got > 0,
      far: state.km >= 10000, all: got === collect.length && got > 0
    };
    list.forEach(function (b) {
      if (earned[b.id] && !state.badges[b.id]) {
        state.badges[b.id] = Date.now();
        PK.toast(host, '<span class="pg-toast-icon">' + b.icon + '</span> Badge: <b>' + PK.esc(b.name) + '</b>', 3200);
        save();
      }
    });
  }

  // ---- HUD ------------------------------------------------------------------------------
  host.insertAdjacentHTML('beforeend',
    '<div class="pg-hud pg-tl"><span class="pg-where" aria-live="polite"></span></div>' +
    '<button type="button" class="pg-hud pg-tr pg-pass" title="Passport (P)"></button>' +
    '<div class="pg-hud pg-bl pg-hint"></div>' +
    '<button type="button" class="pg-hud pg-tl2 pg-read" hidden></button>');
  var whereEl = host.querySelector('.pg-where'), passBtn = host.querySelector('.pg-pass');
  var hintEl = host.querySelector('.pg-hint'), readBtn = host.querySelector('.pg-read');
  hintEl.textContent = PK.touch ? 'tap to travel' : '←↑↓→ / WASD walk · shift run · click to travel · P passport';
  passBtn.addEventListener('click', function () { openPassport(); });
  readBtn.addEventListener('click', function () { openHere(); });
  function hereStamp() {
    var s = byId[at(player.c, player.r)];
    if (!s) collect.concat(plannedSpots).some(function (x) {
      if (!x.cells && x.anchor && Math.abs(wrapDx(x.anchor.c - player.c)) <= 1 && Math.abs(x.anchor.r - player.r) <= 1) { s = x; return true; }
      return false;
    });
    return s && (state.found[s.name] || s.planned) ? s : null;
  }
  function openHere() { var s = hereStamp(); if (s) openCountry(s, false); }
  function updateHud() {
    var id = at(player.c, player.r), lat = latOf(player.r), lng = lngOf(player.c);
    var where = id ? G.countries[id - 1][0] : 'open sea';
    whereEl.innerHTML = (id ? '📍 ' : '⛵ ') + PK.esc(where) + ' <small>' + Math.abs(Math.round(lat)) + '°' + (lat >= 0 ? 'N' : 'S') + ' ' + Math.abs(Math.round(lng)) + '°' + (lng >= 0 ? 'E' : 'W') + '</small>';
    var got = foundCount();
    passBtn.innerHTML = '🛂 <b>' + got + '/' + collect.length + '</b>' + PK.progress(got, collect.length);
    var s = hereStamp();
    readBtn.hidden = !s || !started;
    if (s) readBtn.innerHTML = '📖 ' + PK.esc(s.name) + (PK.touch ? '' : ' <small>space</small>');
  }

  function intro(focus) {
    var got = foundCount(), resume = got > 0 && state.badges.home;
    var html = '<p class="pg-kicker">A tiny exploration game</p><h3>🌍 Passport Quest</h3>' +
      '<p>Walk around a pixel world to find the places Yue has been. Every country you reach lights up, tells its story and stamps your passport. The rest of the world is still in the fog.</p>' +
      '<ul class="pg-keys">' +
      (PK.touch ? '<li>👆 tap anywhere to travel there</li>' : '<li>⌨️ arrow keys or WASD to walk, Shift to run</li><li>🖱️ or click anywhere to travel there</li>') +
      '<li>✨ follow the golden beacons</li><li>🛂 open the passport to see stamps and badges, and fly back to any stamp</li></ul>' +
      '<div class="pg-actions"><button type="button" class="pg-btn" data-start data-autofocus>▶ ' + (resume ? 'Continue (' + got + '/' + collect.length + ' stamps)' : 'Start exploring') + '</button></div>';
    PK.panel(host, html, { noClose: true, noFocus: !focus, className: 'intro' });
    host.querySelector('[data-start]').addEventListener('click', function () {
      host.querySelector('.pg-panel')._close(true);
      started = true;
      refocus();
      enterCell(false);
      if (!resume) {
        var s = byId[at(player.c, player.r)];
        PK.toast(host, '🏠 Home base' + (home && home.name ? ': <b>' + PK.esc(home.name) + '</b>' : '') + (s && state.found[s.name] ? ' · stamp collected' : ''), 3200);
      }
      updateHud();
    });
  }

  // ---- input ----------------------------------------------------------------------------
  var KEYS = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', a: 'l', d: 'r', w: 'u', s: 'd', A: 'l', D: 'r', W: 'u', S: 'd' };
  host.addEventListener('keydown', function (e) {
    if (!started || PK.panelOpen(host)) return;
    var k = KEYS[e.key];
    if (k) { keys[k] = true; target = null; e.preventDefault(); return; }
    if (e.key === 'Shift') keys.shift = true;
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); openHere(); }
    else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); openPassport(); }
    else if (e.key === 'm' || e.key === 'M') showMini = !showMini;
  });
  host.addEventListener('keyup', function (e) {
    var k = KEYS[e.key];
    if (k) keys[k] = false;
    if (e.key === 'Shift') keys.shift = false;
  });
  host.addEventListener('blur', function () { keys = {}; });
  var tapMark = null;
  canvas.addEventListener('click', function (e) {
    refocus();
    if (!started || PK.panelOpen(host)) return;
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) / view.scale, y = (e.clientY - rect.top) / view.scale;
    var m = miniRect();
    if (showMini && x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h) {
      target = { c: Math.floor(((x - m.x) / m.w) * COLS), r: PK.clamp(Math.floor(((y - m.y) / m.h) * ROWS), 0, ROWS - 1) };
    } else {
      var wx = view.left + x, wy = view.top + y;
      target = { c: PK.mod(Math.floor(wx / CELL), COLS), r: PK.clamp(Math.floor(wy / CELL), 0, ROWS - 1) };
    }
    tapMark = { c: target.c, r: target.r, t: 0 };
  });

  // ---- drawing --------------------------------------------------------------------------
  var view = { W: 300, H: 170, scale: 3, ctx: null, left: 0, top: 0 };
  var showMini = true;
  function resize() {
    if (!host.clientWidth) return; // hidden behind the map view
    var v = PK.fit(host, canvas, 300);
    view.W = v.W; view.H = v.H; view.scale = v.scale; view.ctx = v.ctx;
  }
  function miniRect() {
    var w = view.W >= 280 ? 90 : 60, h = Math.round((w * ROWS) / COLS);
    return { x: view.W - w - 4, y: view.H - h - 4, w: w, h: h };
  }
  function sx(wx) { return PK.mod(wx - view.left + 48, WW) - 48; }
  function drawWrapped(ctx, img) {
    var left = PK.mod(Math.round(view.left), WW), top = Math.round(view.top);
    var w1 = Math.min(view.W, WW - left);
    ctx.drawImage(img, left, Math.max(0, top), w1, Math.min(view.H, WH), 0, Math.max(0, -top), w1, Math.min(view.H, WH));
    if (w1 < view.W) ctx.drawImage(img, 0, Math.max(0, top), view.W - w1, Math.min(view.H, WH), w1, Math.max(0, -top), view.W - w1, Math.min(view.H, WH));
  }

  function frame(dt, time) {
    var ctx = view.ctx;
    if (!ctx) return;
    // Move.
    if (player.to) {
      player.t += dt / player.dur;
      player.walk += dt;
      if (player.t >= 1) arrive();
    }
    if (!player.to && started && !PK.panelOpen(host)) {
      var dx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), dy = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
      if (!dx && !dy && target) {
        var tx = wrapDx(target.c - player.c), ty = target.r - player.r, ax = Math.abs(tx), ay = Math.abs(ty);
        dx = ax * 2 >= ay ? Math.sign(tx) : 0;
        dy = ay * 2 >= ax ? Math.sign(ty) : 0;
        if (!dx && !dy) target = null;
      }
      if (dx || dy) step(dx, dy);
    }
    var px = player.to ? player.from.x + (player.to.x - player.from.x) * player.t : player.fx;
    var py = player.to ? player.from.y + (player.to.y - player.from.y) * player.t : player.fy;
    var wx = px * CELL + CELL / 2, wy = py * CELL + CELL / 2;
    if (!started && !PK.calm) cam.x += dt * 6;
    else {
      var k = Math.min(1, dt * 6);
      cam.x += (wx - cam.x) * k;
      cam.y += (wy - cam.y) * k;
    }
    view.left = cam.x - view.W / 2;
    view.top = WH <= view.H ? -(view.H - WH) / 2 : PK.clamp(cam.y - view.H / 2, 0, WH - view.H);

    // Background, land and sea.
    ctx.fillStyle = P.sea[0];
    ctx.fillRect(0, 0, view.W, view.H);
    drawWrapped(ctx, base);

    // Waves on open water.
    var c0 = Math.floor(view.left / CELL), r0 = Math.max(0, Math.floor(view.top / CELL));
    var cw = Math.ceil(view.W / CELL) + 1, rh = Math.ceil(view.H / CELL) + 1;
    ctx.fillStyle = P.wave;
    for (var r = r0; r < Math.min(ROWS, r0 + rh); r++) {
      for (var c = c0; c < c0 + cw; c++) {
        var cc = PK.mod(c, COLS), i = r * COLS + cc;
        if (grid[i] || coast[i] < 2) continue;
        var h = PK.hash(cc * 3 + 1, r * 5 + 2);
        if (h > 0.07) continue;
        if (Math.floor(time * 1.2 + h * 40) % 3 === 0) continue;
        ctx.fillRect(Math.round(c * CELL - view.left), Math.round(r * CELL - view.top + 1), 3, 1);
      }
    }

    // Flash on a newly lit country.
    if (flash) {
      flash.t += dt;
      var alpha = Math.max(0, 0.75 - flash.t * 0.6);
      if (alpha <= 0) flash = null;
      else {
        ctx.fillStyle = 'rgba(255,240,180,' + alpha.toFixed(2) + ')';
        cellsOf(flash.id).forEach(function (i) {
          var x = sx((i % COLS) * CELL), y = Math.floor(i / COLS) * CELL - view.top;
          if (x > -CELL && x < view.W && y > -CELL && y < view.H) ctx.fillRect(Math.round(x), Math.round(y), CELL, CELL);
        });
      }
    }

    // Pins in countries already found.
    pins.forEach(function (p) {
      if (!state.found[p.stamp.name] || p.planned) return;
      var x = sx(p.c * CELL + 2), y = p.r * CELL + 2 - view.top;
      if (x < -10 || x > view.W + 10 || y < -10 || y > view.H + 10) return;
      if (p.mountain) PK.draw(ctx, peak, x - 3, y - 5);
      else PK.draw(ctx, flags[p.stamp.color], x, y - 6);
    });

    drawWrapped(ctx, fog);

    // Drifting clouds.
    if (!PK.calm) {
      clouds.forEach(function (cl) {
        cl.x += dt * 4;
        var x = sx(cl.x), y = cl.y - view.top;
        if (x > -20 && x < view.W + 4 && y > -10 && y < view.H) PK.draw(ctx, cloudSprite, x, y);
      });
    }

    // Beacons for stamps not found yet, and for upcoming trips.
    var offscreen = [];
    collect.concat(plannedSpots).forEach(function (s) {
      if (!s.planned && state.found[s.name]) return;
      var x = sx(s.anchor.c * CELL + 2), y = s.anchor.r * CELL + 2 - view.top;
      if (x < -4 || x > view.W + 4 || y < -4 || y > view.H + 30) {
        if (!s.planned) offscreen.push({ s: s, d: Math.abs(wrapDx(s.anchor.c - player.c)) + Math.abs(s.anchor.r - player.r) });
        return;
      }
      drawBeacon(ctx, x, y, time, s.planned);
    });

    // Tap target.
    if (tapMark) {
      tapMark.t += dt;
      if (tapMark.t > 0.6 || !target) tapMark = null;
      else {
        var mx = sx(tapMark.c * CELL + 2), my = tapMark.r * CELL + 2 - view.top, rad = 2 + tapMark.t * 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(mx - rad), Math.round(my), 2, 1); ctx.fillRect(Math.round(mx + rad - 1), Math.round(my), 2, 1);
        ctx.fillRect(Math.round(mx), Math.round(my - rad), 1, 2); ctx.fillRect(Math.round(mx), Math.round(my + rad - 1), 1, 2);
      }
    }

    // The explorer (a little boat at sea).
    var hx = sx(wx), hy = wy - view.top;
    var onSea = !at(player.to ? PK.mod(Math.round(px), COLS) : player.c, Math.round(py));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    if (onSea) {
      var bob = Math.round(Math.sin(time * 4) * 0.8);
      PK.draw(ctx, boat, hx - 5, hy - 7 + bob, player.flip);
    } else {
      ctx.fillRect(Math.round(hx - 3), Math.round(hy + 1), 7, 2);
      var frameNo = player.to ? Math.floor(player.walk * 8) % 2 : 0;
      PK.draw(ctx, hero[player.face][frameNo], hx - 4, hy - 10, player.face === 'side' && player.flip);
    }

    // Names of the countries found (the one you stand in first; skip names that would overlap), and of a pin close by.
    var here = byId[at(player.c, player.r)], boxes = [], drawnHere = 0;
    [here].concat(labelOrder).forEach(function (s) {
      if (!s || !state.found[s.name] || !s.label || (s === here && drawnHere++)) return;
      var name = s.name.toUpperCase(), w = PK.textWidth(name);
      var x = Math.round(sx(s.label.c * CELL + 2) - w / 2), y = Math.round(s.label.r * CELL - view.top + 6);
      if (x < -w || x > view.W || y < -6 || y > view.H) return;
      var box = { x: x - 2, y: y - 2, w: w + 4, h: 9 };
      if (boxes.some(function (b) { return b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h; })) return;
      boxes.push(box);
      PK.text(ctx, name, x, y, P.ink, P.outline);
    });
    var near = null, nd = 3;
    pins.forEach(function (p) {
      if (!state.found[p.stamp.name] || p.planned) return;
      var d = Math.abs(wrapDx(p.c - player.c)) + Math.abs(p.r - player.r);
      if (d < nd) { nd = d; near = p; }
    });
    if (near) {
      var label = near.name.toUpperCase(), lw = PK.textWidth(label);
      PK.text(ctx, label, PK.clamp(hx - lw / 2, 3, view.W - lw - 3), Math.max(3, hy - 20), '#ffe9a8', P.outline);
    }

    // Sparkles.
    particles = particles.filter(function (p) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
      if (p.life <= 0) return false;
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(sx(p.x)), Math.round(p.y - view.top), p.life > 0.5 ? 2 : 1, p.life > 0.5 ? 2 : 1);
      return true;
    });

    // Arrows at the edge pointing to the nearest stamps still to find.
    if (started) {
      offscreen.sort(function (a, b) { return a.d - b.d; }).slice(0, 3).forEach(function (o) {
        var dxs = sx(o.s.anchor.c * CELL + 2) - view.W / 2;
        if (dxs > WW / 2) dxs -= WW;
        var dys = o.s.anchor.r * CELL + 2 - view.top - view.H / 2;
        var ang = Math.atan2(dys, dxs), m = 9;
        var ex = view.W / 2 + Math.cos(ang) * (view.W / 2 - m), ey = view.H / 2 + Math.sin(ang) * (view.H / 2 - m);
        ex = PK.clamp(ex, m, view.W - m); ey = PK.clamp(ey, m, view.H - m - (showMini ? 0 : 0));
        if (Math.floor(time * 2.5) % 2 === 0 && !PK.calm) return;
        ctx.save();
        ctx.translate(Math.round(ex), Math.round(ey));
        ctx.rotate(Math.round(ang / (Math.PI / 4)) * (Math.PI / 4));
        ctx.drawImage(arrow, -2, -2);
        ctx.restore();
      });
    }

    // Minimap.
    if (showMini) {
      var mr = miniRect();
      ctx.fillStyle = P.mini;
      ctx.fillRect(mr.x - 1, mr.y - 1, mr.w + 2, mr.h + 2);
      ctx.drawImage(mini, 0, 0, COLS, ROWS, mr.x, mr.y, mr.w, mr.h);
      var k2 = mr.w / COLS;
      if (Math.floor(time * 3) % 2 === 0) {
        collect.forEach(function (s) {
          if (state.found[s.name]) return;
          ctx.fillStyle = P.glow;
          ctx.fillRect(Math.round(mr.x + s.anchor.c * k2), Math.round(mr.y + s.anchor.r * k2), 1, 1);
        });
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(mr.x + PK.mod(px, COLS) * k2) - 1, Math.round(mr.y + py * k2) - 1, 2, 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      var vx = PK.mod(view.left / CELL, COLS) * k2, vw = (view.W / CELL) * k2;
      ctx.strokeRect(Math.round(mr.x + vx) + 0.5, Math.round(mr.y + Math.max(0, view.top / CELL) * k2) + 0.5, Math.round(Math.min(vw, mr.w - vx)), Math.round(Math.min(view.H / CELL, ROWS) * k2));
    }

    if (flyFade > 0) {
      flyFade = Math.max(0, flyFade - dt * 1.6);
      ctx.fillStyle = 'rgba(255,255,255,' + flyFade.toFixed(2) + ')';
      ctx.fillRect(0, 0, view.W, view.H);
    }
  }
  function drawBeacon(ctx, x, y, time, planned) {
    var pulse = (Math.sin(time * 3 + x) + 1) / 2;
    x = Math.round(x); y = Math.round(y);
    if (planned) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + pulse * 0.3).toFixed(2) + ')';
      for (var j = 0; j < 16; j += 4) ctx.fillRect(x, y - 2 - j, 1, 2);
      ctx.fillRect(x - 1, y - 20, 3, 3);
      return;
    }
    var hgt = 22;
    ctx.fillStyle = 'rgba(255,214,90,' + (0.18 + pulse * 0.2).toFixed(2) + ')';
    ctx.fillRect(x - 2, y - hgt, 5, hgt);
    ctx.fillStyle = 'rgba(255,230,140,' + (0.55 + pulse * 0.35).toFixed(2) + ')';
    ctx.fillRect(x, y - hgt, 1, hgt);
    var sp = Math.floor(time * 4) % 2;
    ctx.fillStyle = '#fff6c9';
    ctx.fillRect(x - 1 - sp, y - hgt - 2, 3 + sp * 2, 1);
    ctx.fillRect(x, y - hgt - 3 - sp, 1, 3 + sp * 2);
    ctx.fillStyle = P.glow;
    ctx.fillRect(x - 1, y - 1, 3, 2);
  }

  // ---- start ----------------------------------------------------------------------------
  // The home country (and wherever the explorer stands) counts from the start.
  var startStamp = byId[at(startCell.c, startCell.r)];
  if (startStamp && !startStamp.planned && !state.found[startStamp.name]) state.found[startStamp.name] = Date.now();
  reveal(player.c, player.r, 4.5);
  collect.forEach(function (s) {
    if (state.found[s.name] && s.id) cellsOf(s.id).forEach(function (i) { explored[i] = 2; });
  });
  paintAll();
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
  else window.addEventListener('resize', resize);
  document.addEventListener('themechange', paintAll);
  window.addEventListener('pagehide', save);
  updateHud();
  intro();
  PK.loop(host, frame);
})();
