// Mountains page mini-game, "Summit Quest": every climb in _data/mountains.yml is one camp on a
// pixel mountain, easiest at the bottom. Hit the green zone to climb; reaching a camp unlocks its
// logbook entry and a badge. Climbs are ordered by `grade` (F, PD, AD, D, WI4, 6a, 5.10a ...);
// without a grade, by the kind of activity and the elevation. Nothing to edit here.
(function () {
  var PK = window.PK;
  var host = document.getElementById('climb-game');
  var dataEl = document.getElementById('climb-game-data');
  if (!PK || !host || !dataEl) return;
  var trips = JSON.parse(dataEl.textContent || '[]');
  var canvas = host.querySelector('canvas');
  host.classList.add('is-ready');

  // ---- levels: one per route (or per area without routes) ------------------------------
  function gradeScore(g) {
    if (!g) return null;
    g = String(g).trim().toUpperCase().replace(/\s+/g, '');
    var mod = /\+$/.test(g) ? 0.33 : /-$/.test(g) ? -0.33 : 0, b = g.replace(/[+-]$/, ''), m;
    var alpine = { F: 1, PD: 2, AD: 3, D: 4, TD: 5, ED: 6, ED1: 6, ED2: 6.5, ED3: 7, ED4: 7.5 };
    if (alpine[b] != null) return alpine[b] + mod;
    if ((m = /^(?:WI|AI|M)(\d+)/.exec(b))) return 1.2 + +m[1] * 0.65 + mod;
    if ((m = /^5\.(\d+)([A-D])?/.exec(b))) return Math.max(1, (+m[1] - 4) * 0.55 + 'ABCD'.indexOf(m[2] || 'A') * 0.12) + mod;
    if ((m = /^([3-9])([A-C])?/.exec(b))) return Math.max(1, +m[1] - 3 + 'ABC'.indexOf(m[2] || 'A') * 0.33) + mod;
    var roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].indexOf(b);
    if (roman >= 0) return 0.8 + roman * 0.55 + mod;
    return null;
  }
  function activityScore(text) {
    text = String(text || '').toLowerCase();
    if (/trek|hik|walk/.test(text)) return 0.6;
    if (/glacier/.test(text)) return 1.3;
    if (/ice/.test(text)) return 3.6;
    if (/trad/.test(text)) return 3.3;
    if (/multi|alpine climb|rock/.test(text)) return 2.9;
    if (/climb/.test(text)) return 2.8;
    if (/mountaineer|alpin/.test(text)) return 1.8;
    return 1.5;
  }
  function activityTag(text) {
    text = String(text || '').toLowerCase();
    var tags = [['trek', 'trek'], ['hik', 'hike'], ['glacier', 'glacier'], ['ice', 'ice'], ['trad', 'trad'], ['multi', 'multipitch'], ['alpine climb', 'alpine'], ['climb', 'climb'], ['mountaineer', 'alpine']];
    for (var i = 0; i < tags.length; i++) if (text.indexOf(tags[i][0]) >= 0) return tags[i][1];
    return '';
  }
  function meters(e) { var m = /([\d.,]+)/.exec(String(e || '')); return m ? +m[1].replace(/[.,]/g, '') : 0; }
  var levels = [];
  trips.forEach(function (t) {
    if ((t.status || 'visited') === 'planned') return;
    var items = t.routes && t.routes.length ? t.routes : [null];
    items.forEach(function (r) {
      var item = r || t, elev = meters(item.elevation), grade = item.grade || '';
      var text = (t.activity || '') + ' ' + item.name;
      var score = gradeScore(grade);
      if (score === null) score = activityScore(text) + (elev ? ((elev - 3000) / 3000) * 0.6 : 0);
      levels.push({
        key: item.name + '|' + t.name, name: item.name, trip: t, route: r, grade: grade, elev: elev,
        area: r ? (r.area || t.name) : t.area, emoji: t.emoji || '⛰️', score: score,
        tag: grade || activityTag(text),
        date: (r && r.date) || (t.status === 'regular' ? 'regularly' : t.date)
      });
    });
  });
  levels.sort(function (a, b) { return a.score - b.score || a.elev - b.elev || (a.name < b.name ? -1 : 1); });
  var K = levels.length;
  if (!K) return;
  var topAlt = Math.max(4000, Math.max.apply(null, levels.map(function (l) { return l.elev; })) + 300);

  // ---- saved progress -----------------------------------------------------------------
  var KEY = 'climb-game-v1';
  var state = PK.load(KEY) || {};
  state.done = state.done || {};
  state.badges = state.badges || {};
  state.rocks = state.rocks || 0;
  function save() { PK.save(KEY, state); }
  function reached() { var n = 0; while (n < K && state.done[levels[n].key]) n++; return n; }
  function doneCount() { return levels.filter(function (l) { return state.done[l.key]; }).length; }

  // ---- sprites -------------------------------------------------------------------------
  var SP = { k: '#1d1f2b', r: '#d1495b', s: '#f3c9a1', e: '#1d1f2b', j: '#2e86ab', p: '#3d405b', b: '#e07a2f', g: '#c9ced6', w: '#ffffff' };
  var climber = [
    PK.sprite(['...kkk...', '..krrrk..', '.krrrrrk.', '.kkkkkkk.', '..kssek..', '..ksssk..', '.bkjjjk..', 'bbkjjjskg', 'bbkjjjk.g', '.kkpppk..', '..kpkpk..', '..kk.kk..'], SP),
    PK.sprite(['...kkk...', '..krrrk..', '.krrrrrk.', '.kkkkkkk.', '..kssek..', '..ksssk..', '.bkjjjk..', 'bbkjjjskg', 'bbkjjjk.g', '.kkpppk..', '..kpkkpk.', '..kk..kk.'], SP)
  ];
  var tents = ['#e07a2f', '#d1495b', '#2e86ab', '#3d9a50', '#8e5bb5', '#f2b134'].map(function (col) {
    return PK.sprite(['.....k.....', '....kyk....', '...kyyyk...', '..kyyyyyk..', '.kyyykyyyk.', 'kyyykkkyyyk', 'kkkkkkkkkkk'], { k: '#1d1f2b', y: col });
  });
  var summitFlag = PK.sprite(['krrrr.', 'krrrrr', 'krrrr.', 'k.....', 'k.....', 'k.....', 'k.....', 'kk....'], { k: '#1d1f2b', r: '#d1495b' });
  var heart = PK.sprite(['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#e84a5f' });
  var heartOff = PK.sprite(['.kk.kk.', 'k..k..k', 'k.....k', '.k...k.', '..k.k..', '...k...'], { k: 'rgba(255,255,255,0.6)' });
  var rockSprite = PK.sprite(['.kkk.', 'kgggk', 'kgwgk', 'kgggk', '.kkk.'], { k: '#2a2c36', g: '#8a8f9c', w: '#b8bcc6' });
  var pine = [PK.sprite(['..k..', '.kgk.', '.kgk.', 'kgggk', '.kgk.', 'kgggk', 'kgggk', '..b..'], { k: '#1f4d2b', g: '#2f7a3a', b: '#6b4229' }),
    PK.sprite(['..k..', '.kgk.', '.kgk.', 'kgggk', '.kgk.', 'kgggk', 'kgggk', '..b..'], { k: '#10261a', g: '#1d4a2c', b: '#3a2617' })];

  // ---- scene ---------------------------------------------------------------------------
  var view = { W: 300, H: 200, scale: 3, ctx: null };
  var scene = null, sum = null, corners = [], path = [], segStart = [];
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function noise1(x) {
    var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return PK.hash(i, 17) * (1 - u) + PK.hash(i + 1, 17) * u;
  }
  function buildScene() {
    var W = view.W, H = view.H, dark = PK.dark();
    scene = document.createElement('canvas'); scene.width = W; scene.height = H;
    var g = scene.getContext('2d');
    var C = dark
      ? { sky: ['#0a0f26', '#10183a', '#18224d', '#212c60'], far: ['#1d2a52', '#26345f'], rock: ['#4b5068', '#383c52', '#2d3044'], snow: ['#d2dcec', '#8f9cb8'], meadow: ['#24492f', '#1d3d27'] }
      : { sky: ['#6fb8e6', '#8ccaee', '#acd9f3', '#cfe9f8'], far: ['#b6cfe4', '#9dbbd6'], rock: ['#8d91a0', '#6c7080', '#5a5e6d'], snow: ['#ffffff', '#cddbec'], meadow: ['#7bbf5a', '#64a94a'] };
    // Sky in dithered bands.
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var t = (y / H) * (C.sky.length - 1) + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.5;
        g.fillStyle = C.sky[PK.clamp(Math.round(t), 0, C.sky.length - 1)];
        g.fillRect(x, y, 1, 1);
      }
    }
    if (dark) {
      for (var s = 0; s < W * H / 180; s++) {
        g.fillStyle = PK.hash(s, 5) > 0.8 ? '#ffffff' : 'rgba(255,255,255,0.55)';
        g.fillRect(Math.floor(PK.hash(s, 1) * W), Math.floor(PK.hash(s, 2) * H * 0.7), 1, 1);
      }
      g.fillStyle = '#f4f1d8'; g.beginPath(); g.arc(W * 0.16, H * 0.17, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.sky[0]; g.beginPath(); g.arc(W * 0.16 + 3, H * 0.17 - 2, 6, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = '#fff3b0'; g.fillRect(Math.round(W * 0.15) - 6, Math.round(H * 0.15) - 6, 12, 12);
      g.fillStyle = '#ffe066'; g.fillRect(Math.round(W * 0.15) - 5, Math.round(H * 0.15) - 5, 10, 10);
    }
    // Far ranges.
    [[0.42, 0.5, 13], [0.55, 0.62, 7]].forEach(function (r, i) {
      g.fillStyle = C.far[i];
      for (var x = 0; x < W; x++) {
        var top = H * r[0] + Math.abs(Math.sin(x / (r[2] * 3.1) + i)) * -H * 0.12 + (noise1(x / r[2] + i * 40) - 0.5) * H * 0.14;
        g.fillRect(x, Math.round(top), 1, H);
      }
    });
    // The mountain.
    var sx = Math.round(W * 0.56), sy = Math.round(H * 0.11);
    sum = { x: sx, y: sy };
    var ridge = new Float32Array(W);
    for (var x2 = 0; x2 < W; x2++) {
      var d = x2 - sx;
      var slope = d < 0 ? (H * 0.98 - sy) / (sx + W * 0.06) : (H * 0.98 - sy) / (W - sx + W * 0.02);
      var jag = Math.min(1, Math.abs(d) / 16);
      ridge[x2] = sy + Math.abs(d) * slope + ((noise1(x2 / 9) - 0.5) * 9 + (noise1(x2 / 2.5 + 50) - 0.5) * 3) * jag;
    }
    view.ridge = ridge;
    var snowline = sy + (H - sy) * 0.36;
    for (var x3 = 0; x3 < W; x3++) {
      for (var y3 = Math.max(0, Math.floor(ridge[x3])); y3 < H; y3++) {
        var crest = sx + (y3 - sy) * 0.22 + (noise1(y3 / 7 + 9) - 0.5) * 8;
        var lit = x3 < crest;
        var isSnow = y3 < snowline + (noise1(x3 / 5 + 3) - 0.5) * 14 + (lit ? 0 : 6);
        var col = isSnow ? C.snow[lit ? 0 : 1] : C.rock[lit ? 0 : 1];
        var h = PK.hash(x3, y3);
        if (!isSnow && h > 0.93) col = C.rock[2];
        if (isSnow && h > 0.96) col = C.snow[1];
        g.fillStyle = col;
        g.fillRect(x3, y3, 1, 1);
      }
      // Outline on the ridge.
      g.fillStyle = dark ? '#1a1d2b' : '#4a4e5c';
      g.fillRect(x3, Math.floor(ridge[x3]), 1, 1);
    }
    // Meadow and trees at the foot.
    var meadow = Math.round(H * 0.9);
    for (var x4 = 0; x4 < W; x4++) {
      var top4 = meadow + Math.round((noise1(x4 / 7 + 70) - 0.5) * 5);
      g.fillStyle = C.meadow[0]; g.fillRect(x4, top4, 1, H - top4);
      if (PK.hash(x4, 99) > 0.7) { g.fillStyle = C.meadow[1]; g.fillRect(x4, top4 + 2 + Math.floor(PK.hash(x4, 3) * 4), 1, 1); }
    }
    for (var tr = 0; tr < W / 7; tr++) {
      var tx = Math.floor(PK.hash(tr, 41) * W), ty = meadow - 6 + Math.floor(PK.hash(tr, 42) * (H - meadow));
      PK.draw(g, pine[dark ? 1 : 0], tx, ty);
    }
    buildPath();
  }
  function buildPath() {
    var W = view.W, H = view.H, ridge = view.ridge;
    var y0 = H - Math.max(34, Math.ceil(84 / view.scale)), y1 = sum.y + 3;
    corners = [];
    for (var k = 0; k <= K; k++) {
      var y = Math.round(y0 + (y1 - y0) * (k / K));
      var xl = 0, xr = W - 1;
      while (xl < W - 1 && ridge[xl] > y - 2) xl++;
      while (xr > 0 && ridge[xr] > y - 2) xr--;
      var x = k === K ? sum.x : k % 2 === 0 ? xl + (xr - xl) * 0.28 : xl + (xr - xl) * 0.72;
      corners.push({ x: Math.round(PK.clamp(x, 10, W - 10)), y: k === K ? sum.y + 1 : y });
    }
    path = []; segStart = [];
    for (var s = 0; s < K; s++) {
      segStart.push(path.length);
      var a = corners[s], b = corners[s + 1], n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      for (var i = 0; i < n; i++) path.push({ x: Math.round(a.x + ((b.x - a.x) * i) / n), y: Math.round(a.y + ((b.y - a.y) * i) / n), seg: s });
    }
    segStart.push(path.length);
    path.push({ x: corners[K].x, y: corners[K].y, seg: K });
  }
  // Point on the trail: segment s, fraction f.
  function trailAt(s, f) {
    if (s >= K) return corners[K];
    var a = corners[s], b = corners[s + 1];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  // ---- climbing ------------------------------------------------------------------------
  var started = false, climb = null, pos = { s: reached(), f: 0, tf: 0 }, msgs = [], particles = [], shake = 0, hover = -1;
  var rocks = [];
  function params(l) {
    var d = PK.clamp(l.score, 0.4, 6);
    return {
      steps: 3 + Math.ceil(d), speed: 0.5 + d * 0.2, width: PK.clamp(0.36 - d * 0.045, 0.12, 0.36),
      rockChance: d >= 1.5 ? 0.12 + d * 0.04 : 0
    };
  }
  function newZone(c) {
    var w = c.p.width;
    c.zone = { c: w / 2 + 0.06 + Math.random() * (1 - w - 0.12), w: w };
  }
  function startLevel() {
    var idx = reached();
    if (idx >= K) return;
    var l = levels[idx];
    climb = { idx: idx, l: l, p: params(l), step: 0, hearts: 3, cursor: 0, dir: 1, cool: 0.35, rock: null, slips: 0, streak: 0 };
    newZone(climb);
    pos.s = idx; pos.f = 0; pos.tf = 0;
    canvas.style.touchAction = 'none';
    say('LEVEL ' + (idx + 1), '#ffffff');
    updateHud();
  }
  function say(text, color) { msgs = [{ text: text, color: color, t: 0 }]; }
  function press() {
    if (!started || PK.panelOpen(host)) return;
    if (!climb) { startLevel(); return; }
    var c = climb;
    if (c.cool > 0) return;
    c.cool = 0.22;
    if (c.rock) {
      c.hearts--; shake = 0.35; say('OUCH!', '#ff8080');
      c.streak = 0;
      return afterHit();
    }
    var off = Math.abs(c.cursor - c.zone.c);
    if (off <= c.zone.w / 2) {
      c.step++;
      var perfect = off <= c.zone.w * 0.17;
      if (perfect) { c.streak++; say(c.streak >= 3 ? 'PERFECT X' + c.streak : 'PERFECT!', '#ffe066'); } else { c.streak = 0; say('NICE', '#c8f7c5'); }
      if (c.streak >= 5) earn('streak');
      var at = trailAt(pos.s, pos.tf);
      dust(at.x, at.y, perfect ? 10 : 5);
      pos.tf = c.step / c.p.steps;
      if (c.step >= c.p.steps) { reachCamp(); return; }
      newZone(c);
      if (Math.random() < c.p.rockChance) c.rock = { t: 1.0 + Math.random() * 0.6 };
    } else {
      c.hearts--; c.slips++; c.streak = 0; shake = 0.3;
      c.step = Math.max(0, c.step - 1);
      pos.tf = c.step / c.p.steps;
      say('SLIP!', '#ff8080');
      afterHit();
    }
    updateHud();
  }
  function afterHit() {
    updateHud();
    if (climb.hearts > 0) return;
    say('BACK TO CAMP', '#ffffff');
    PK.toast(host, '⛈️ Too many slips! Back to camp ' + climb.idx + '. Try again.', 3000);
    climb = null; pos.tf = 0;
    canvas.style.touchAction = '';
    updateHud();
  }
  function reachCamp() {
    var c = climb, l = c.l;
    state.done[l.key] = { t: Date.now(), clean: c.slips === 0 };
    climb = null;
    canvas.style.touchAction = '';
    var at = corners[c.idx + 1];
    confetti(at.x, at.y - 6, 50);
    save();
    earn('camp1');
    if (c.slips === 0) earn('clean');
    if (doneCount() * 2 >= K) earn('half');
    if (doneCount() === K) earn('summit');
    updateHud();
    setTimeout(function () { openLog(c.idx, true); }, 650);
  }
  function dust(x, y, n) {
    for (var i = 0; i < n; i++) particles.push({ x: x, y: y + 2, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 20, life: 0.5 + Math.random() * 0.3, col: PK.dark() ? '#9aa3bd' : '#e8e2d4', g: 30 });
  }
  function confetti(x, y, n) {
    if (PK.calm) n = 12;
    var cols = ['#ffe066', '#e84a5f', '#2e86ab', '#3d9a50', '#ffffff', '#e07a2f'];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = 30 + Math.random() * 60;
      particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 + Math.random(), col: cols[i % cols.length], g: 70 });
    }
  }

  // ---- badges --------------------------------------------------------------------------
  var BADGES = [
    { id: 'camp1', icon: '⛺', name: 'First camp', desc: 'Reach your first camp' },
    { id: 'clean', icon: '🎯', name: 'Clean ascent', desc: 'Reach a camp without slipping' },
    { id: 'streak', icon: '🔥', name: 'In the zone', desc: '5 perfect moves in a row' },
    { id: 'rocks', icon: '🪨', name: 'Rockfall dodger', desc: 'Wait out 3 rockfalls' },
    { id: 'half', icon: '🌗', name: 'Halfway up', desc: 'Reach half of the camps' },
    { id: 'summit', icon: '🏔️', name: 'Summit', desc: 'Reach every camp' }
  ];
  function earn(id) {
    if (state.badges[id]) return;
    var b = BADGES.filter(function (x) { return x.id === id; })[0];
    state.badges[id] = Date.now();
    save();
    PK.toast(host, '<span class="pg-toast-icon">' + b.icon + '</span> Badge: <b>' + PK.esc(b.name) + '</b>', 3200);
  }

  // ---- cards ---------------------------------------------------------------------------
  function patchHtml(l, i) {
    var got = !!state.done[l.key];
    return '<button type="button" class="pg-patch' + (got ? '' : ' locked') + '" data-log="' + i + '"' + (got ? '' : ' disabled') + '>' +
      '<span class="pg-patch-icon">' + (got ? l.emoji : '🔒') + '</span>' +
      '<span class="pg-patch-name">' + (got ? PK.esc(l.name) : 'Camp ' + (i + 1)) + '</span>' +
      '<span class="pg-patch-grade">' + PK.esc(got ? (l.tag || '') : '???') + '</span></button>';
  }
  function openLog(i, fresh) {
    var l = levels[i], t = l.trip, item = l.route || t;
    var sub = [l.area, item.elevation, l.grade].filter(Boolean).map(PK.esc).join(' · ');
    var html = '<div class="pg-card-head"><span class="pg-patch big' + (fresh ? ' fresh' : '') + '"><span class="pg-patch-icon">' + l.emoji + '</span><span class="pg-patch-grade">' + PK.esc(l.tag || 'camp ' + (i + 1)) + '</span></span><div>' +
      '<p class="pg-kicker">' + (fresh ? '⛺ Camp ' + (i + 1) + ' reached · logbook unlocked' : 'Logbook · camp ' + (i + 1) + ' of ' + K) + '</p>' +
      '<h3>' + PK.esc(l.name) + '</h3>' + (sub ? '<p class="pg-sub">' + sub + '</p>' : '') + '</div></div>';
    html += '<dl class="pg-log">' +
      (l.date ? '<dt>date</dt><dd>' + PK.esc(l.date) + '</dd>' : '') +
      (t.activity ? '<dt>type</dt><dd>' + PK.esc(t.activity) + '</dd>' : '') +
      (l.route ? '<dt>trip</dt><dd>' + (t.emoji ? t.emoji + ' ' : '') + PK.esc(t.name) + (t.area ? ', ' + PK.esc(t.area) : '') + '</dd>' : '') +
      '</dl>';
    var insight = item.insight || (l.route ? '' : t.insight), photos = item.photos || (l.route ? null : t.photos);
    if (insight) html += '<p>' + PK.esc(insight) + '</p>';
    if (photos && photos.length) {
      html += '<span class="pg-photos">' + photos.map(function (src) {
        return '<a href="' + PK.esc(src) + '" target="_blank" rel="noopener"><img src="' + PK.esc(src) + '" alt="" loading="lazy"></a>';
      }).join('') + '</span>';
    }
    if (t.log) html += '<a class="pg-link" href="' + PK.esc(t.log) + '">Read the trip report &rarr;</a>';
    if (!insight && !(photos && photos.length) && !t.log) html += '<p class="pg-soon">📸 Photos and the story of this climb are coming soon.</p>';
    var next = reached();
    html += '<div class="pg-actions"><button type="button" class="pg-btn" data-close data-autofocus>' +
      (next >= K ? '🏔️ Enjoy the view' : fresh ? 'Keep climbing ▶' : 'Back to the mountain') + '</button></div>';
    PK.panel(host, html, { onClose: refocus });
  }
  function openBadges() {
    var got = doneCount();
    var html = '<p class="pg-kicker">Badge case</p><h3>🏅 Summit badges</h3>' +
      '<p class="pg-sub">' + PK.progress(got, K) + ' <b>' + got + ' / ' + K + '</b> camps · each badge opens its logbook entry</p>' +
      '<div class="pg-patches">' + levels.map(patchHtml).join('') + '</div>' +
      '<h4>Achievements</h4>' + PK.badgeGrid(BADGES, state.badges) +
      '<div class="pg-actions"><button type="button" class="pg-btn" data-close data-autofocus>Back to the mountain</button>' +
      '<button type="button" class="pg-btn ghost" data-reset>Start over</button></div>';
    var close = PK.panel(host, html, { onClose: refocus, className: 'wide' });
    host.querySelector('.pg-panel').addEventListener('click', function (e) {
      var log = e.target.closest('[data-log]');
      if (log && !log.disabled) { close(true); openLog(+log.getAttribute('data-log'), false); return; }
      var rs = e.target.closest('[data-reset]');
      if (rs) {
        if (!rs.dataset.sure) { rs.dataset.sure = '1'; rs.textContent = 'Sure? Click again'; return; }
        try { localStorage.removeItem(KEY); } catch (err) {}
        state = { done: {}, badges: {}, rocks: 0 };
        pos = { s: 0, f: 0, tf: 0 }; climb = null; started = false;
        close(true); intro(true); updateHud();
      }
    });
  }
  function refocus() { try { host.focus({ preventScroll: true }); } catch (e) { host.focus(); } }

  function intro(focus) {
    var got = doneCount();
    var html = '<p class="pg-kicker">A tiny climbing game</p><h3>⛰️ Summit Quest</h3>' +
      '<p>Every camp on this mountain is one of Yue\'s climbs, from easy treks at the bottom to the hardest routes near the top. Climb camp by camp to unlock each logbook entry and its badge.</p>' +
      '<ul class="pg-keys"><li>' + (PK.touch ? '👆 tap the game' : '⌨️ press <b>Space</b> (or click)') + ' when the marker is in the green zone</li>' +
      '<li>💥 miss and you slip; three slips and it\'s back to camp</li><li>🪨 when rocks fall, wait!</li></ul>' +
      '<div class="pg-actions"><button type="button" class="pg-btn" data-start data-autofocus>▶ ' + (got ? 'Continue (' + got + '/' + K + ' camps)' : 'Start climbing') + '</button></div>';
    PK.panel(host, html, { noClose: true, noFocus: !focus, className: 'intro' });
    host.querySelector('[data-start]').addEventListener('click', function () {
      host.querySelector('.pg-panel')._close(true);
      started = true;
      refocus();
      updateHud();
    });
  }

  // ---- HUD -----------------------------------------------------------------------------
  host.insertAdjacentHTML('beforeend',
    '<div class="pg-hud pg-tl"><span class="pg-alt" aria-live="polite"></span></div>' +
    '<button type="button" class="pg-hud pg-tr pg-pass" title="Badges (B)"></button>' +
    '<div class="pg-hud pg-next" hidden></div>');
  var altEl = host.querySelector('.pg-alt'), passBtn = host.querySelector('.pg-pass');
  var nextEl = host.querySelector('.pg-next');
  passBtn.addEventListener('click', openBadges);
  nextEl.addEventListener('click', function (e) { if (e.target.closest('[data-go]')) { startLevel(); refocus(); } });
  function altitude() {
    if (!corners.length) return 1000;
    var p = trailAt(pos.s, pos.f), base = corners[0].y, top = corners[K].y;
    return Math.round((1000 + ((base - p.y) / (base - top)) * (topAlt - 1000)) / 10) * 10;
  }
  function updateHud() {
    var n = reached(), got = doneCount();
    passBtn.innerHTML = '🏅 <b>' + got + '/' + K + '</b>' + PK.progress(got, K);
    if (climb) altEl.innerHTML = '⛏️ Level ' + (climb.idx + 1) + '/' + K + ' · ' + PK.esc(climb.l.name);
    else altEl.innerHTML = (n >= K ? '🏔️ Summit · ' : n ? '⛺ Camp ' + n + '/' + K + ' · ' : '🥾 Trailhead · ') + altitude().toLocaleString('en-US') + ' m';
    nextEl.hidden = !started || !!climb;
    if (n < K) {
      var l = levels[n];
      nextEl.innerHTML = '<span><small>next · camp ' + (n + 1) + '</small> ' + (l.emoji ? l.emoji + ' ' : '') + '<b>' + PK.esc(l.name) + '</b>' +
        (l.tag || l.elev ? ' <small>' + [l.elev ? l.elev.toLocaleString('en-US') + ' m' : '', l.tag].filter(Boolean).map(PK.esc).join(' · ') + '</small>' : '') + '</span>' +
        '<button type="button" class="pg-btn" data-go>▶ climb' + (PK.touch ? '' : ' <small>space</small>') + '</button>';
    } else {
      nextEl.innerHTML = '<span>🏆 <b>You reached the summit!</b> <small>click a camp or open the badges to read the logbook</small></span>';
    }
  }

  // ---- input ---------------------------------------------------------------------------
  host.addEventListener('keydown', function (e) {
    if (!started || PK.panelOpen(host)) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); if (!e.repeat) press(); }
    else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); openBadges(); }
  });
  function campAt(e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) / view.scale, y = (e.clientY - rect.top) / view.scale;
    for (var i = 1; i <= K; i++) if (Math.abs(corners[i].x - x) <= 7 && Math.abs(corners[i].y - 3 - y) <= 7) return i - 1;
    return -1;
  }
  canvas.addEventListener('pointerdown', function (e) {
    refocus();
    if (!started || PK.panelOpen(host)) return;
    if (climb) { if (e.pointerType !== 'touch' || canvas.style.touchAction === 'none') { e.preventDefault(); press(); } return; }
    var i = campAt(e);
    if (i < 0) return;
    if (state.done[levels[i].key]) openLog(i, false);
    else PK.toast(host, i === reached() ? '⛺ Camp ' + (i + 1) + ' is next: press climb!' : '🔒 Reach camp ' + reached() + ' first', 2000);
  });
  canvas.addEventListener('pointermove', function (e) { hover = e.pointerType === 'mouse' ? campAt(e) : -1; });
  canvas.addEventListener('pointerleave', function () { hover = -1; });

  // ---- drawing -------------------------------------------------------------------------
  function resize() {
    if (!host.clientWidth) return; // hidden behind the map view
    var v = PK.fit(host, canvas, 300);
    var changed = v.W !== view.W || v.H !== view.H || !scene;
    view.W = v.W; view.H = v.H; view.scale = v.scale; view.ctx = v.ctx;
    if (changed) buildScene();
  }
  function frame(dt, time) {
    var ctx = view.ctx, W = view.W, H = view.H;
    if (!ctx || !scene) return;
    // Meter and rockfall.
    var c = climb;
    if (c) {
      c.cool = Math.max(0, c.cool - dt);
      if (c.rock) {
        c.rock.t -= dt;
        if (Math.random() < dt * 14) {
          var p0 = trailAt(pos.s, pos.f);
          rocks.push({ x: p0.x + (Math.random() - 0.5) * 30, y: -6, vy: 60 + Math.random() * 50, vx: (Math.random() - 0.5) * 12 });
        }
        if (c.rock.t <= 0) {
          c.rock = null; state.rocks++; say('PHEW!', '#c8f7c5');
          if (state.rocks >= 3) earn('rocks');
          save();
        }
      } else {
        c.cursor += c.dir * dt * c.p.speed * 2;
        if (c.cursor > 1) { c.cursor = 2 - c.cursor; c.dir = -1; }
        if (c.cursor < 0) { c.cursor = -c.cursor; c.dir = 1; }
      }
    }
    // Climber glides along the trail.
    pos.f += (pos.tf - pos.f) * Math.min(1, dt * 8);
    if (!climb) {
      var n = reached();
      if (pos.s < n && pos.f > 0.98) { pos.s = n; pos.f = 0; pos.tf = 0; }
      else if (pos.s < n) pos.tf = 1;
    }

    var ox = 0, oy = 0;
    if (shake > 0) { shake -= dt; ox = Math.round((Math.random() - 0.5) * 3); oy = Math.round((Math.random() - 0.5) * 2); }
    ctx.drawImage(scene, ox, oy);

    // Trail: the part already climbed in gold.
    var doneUpTo = segStart[reached()];
    var light = PK.dark() ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)';
    for (var i = 0; i < path.length; i += 2) {
      var pt = path[i];
      ctx.fillStyle = 'rgba(29,31,43,0.45)';
      ctx.fillRect(pt.x + ox, pt.y + 1 + oy, 1, 1);
      ctx.fillStyle = i < doneUpTo ? '#ffcf3f' : light;
      ctx.fillRect(pt.x + ox, pt.y + oy, 1, 1);
    }
    // Camps.
    var next = reached();
    for (var k = 1; k <= K; k++) {
      var cp = corners[k], l = levels[k - 1], got = !!state.done[l.key];
      if (k === K) {
        PK.draw(ctx, summitFlag, cp.x - 1 + ox, cp.y - 9 + oy);
        if (got) PK.draw(ctx, tents[(k - 1) % tents.length], cp.x - 12 + ox, cp.y - 6 + oy);
      } else if (got) {
        PK.draw(ctx, tents[(k - 1) % tents.length], cp.x - 5 + ox, cp.y - 6 + oy);
      } else {
        var blink = k - 1 === next && Math.floor(time * 2) % 2 === 0;
        ctx.fillStyle = '#1d1f2b';
        ctx.fillRect(cp.x + ox, cp.y - 6 + oy, 1, 6);
        ctx.fillStyle = blink ? '#ffcf3f' : '#ffffff';
        ctx.fillRect(cp.x + 1 + ox, cp.y - 6 + oy, 3, 2);
      }
      var label = String(k), lw = PK.textWidth(label);
      PK.text(ctx, label, cp.x + (k % 2 ? 6 : -6 - lw) + ox, cp.y - 5 + oy, got ? '#ffe066' : '#ffffff', '#1d1f2b');
    }
    PK.text(ctx, 'START', corners[0].x - 9, corners[0].y + 2, '#ffffff', '#1d1f2b');

    // Rocks.
    rocks = rocks.filter(function (r) {
      r.y += r.vy * dt; r.x += r.vx * dt;
      PK.draw(ctx, rockSprite, r.x - 2, r.y - 2);
      return r.y < H + 6;
    });

    // Climber.
    var cpos = trailAt(pos.s, pos.f);
    var moving = Math.abs(pos.tf - pos.f) > 0.01;
    var seg = corners[Math.min(K, pos.s + 1)], from = corners[Math.min(K, pos.s)];
    PK.draw(ctx, climber[moving && Math.floor(time * 10) % 2 ? 1 : 0], cpos.x - 4 + ox, cpos.y - 11 + oy, seg.x < from.x);

    // Floating messages.
    msgs = msgs.filter(function (m) {
      m.t += dt;
      if (m.t > 1.1) return false;
      var w = PK.textWidth(m.text);
      PK.text(ctx, m.text, PK.clamp(cpos.x - w / 2, 2, W - w - 2), cpos.y - 20 - m.t * 12, m.color, '#1d1f2b');
      return true;
    });

    // Particles.
    particles = particles.filter(function (p) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      if (p.life <= 0) return false;
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      return true;
    });
    // Light snow, heavier higher up.
    if (!PK.calm) {
      var flakes = 14 + reached() * 3;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (var f = 0; f < flakes; f++) {
        var fx = PK.mod(PK.hash(f, 1) * W + time * (6 + PK.hash(f, 2) * 6) + Math.sin(time + f) * 4, W);
        var fy = PK.mod(PK.hash(f, 3) * H + time * (12 + PK.hash(f, 4) * 14), H);
        ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
      }
    }

    // Name of the camp under the mouse.
    if (hover >= 0 && !climb) {
      var hl = levels[hover], name = state.done[hl.key] || hover === next ? hl.name.toUpperCase() : 'CAMP ' + (hover + 1) + ' ???';
      var hw = PK.textWidth(name), hp = corners[hover + 1];
      PK.text(ctx, name, PK.clamp(hp.x - hw / 2, 2, W - hw - 2), Math.max(2, hp.y - 16), '#ffffff', '#1d1f2b');
    }

    // The timing meter.
    if (c) {
      var bw = Math.round(Math.min(W * 0.62, 180)), bx = Math.round((W - bw) / 2), by = H - 19;
      ctx.fillStyle = '#1d1f2b'; ctx.fillRect(bx - 2, by - 2, bw + 4, 11);
      ctx.fillStyle = c.rock ? (Math.floor(time * 8) % 2 ? '#7a1f2b' : '#4a1520') : '#3a3f55';
      ctx.fillRect(bx, by, bw, 7);
      if (!c.rock) {
        var zx = Math.round(bx + (c.zone.c - c.zone.w / 2) * bw), zw = Math.round(c.zone.w * bw);
        ctx.fillStyle = '#3d9a50'; ctx.fillRect(zx, by, zw, 7);
        var pw = Math.max(2, Math.round(zw * 0.34));
        ctx.fillStyle = '#8be07a'; ctx.fillRect(Math.round(bx + c.zone.c * bw - pw / 2), by, pw, 7);
      }
      var cx = Math.round(bx + c.cursor * bw);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx, by - 1, 1, 9);
      ctx.fillRect(cx - 1, by - 3, 3, 1); ctx.fillRect(cx, by - 2, 1, 1);
      for (var hh = 0; hh < 3; hh++) PK.draw(ctx, hh < c.hearts ? heart : heartOff, bx + hh * 8, by - 11);
      for (var st = 0; st < c.p.steps; st++) {
        ctx.fillStyle = st < c.step ? '#ffcf3f' : 'rgba(255,255,255,0.45)';
        ctx.fillRect(bx + bw - (c.p.steps - st) * 5, by - 8, 4, 3);
      }
      var prompt = c.rock ? 'ROCKFALL! WAIT...' : PK.touch ? 'TAP WHEN IN THE GREEN' : 'SPACE WHEN IN THE GREEN';
      var pw2 = PK.textWidth(prompt);
      PK.text(ctx, prompt, Math.round((W - pw2) / 2), by + 9, c.rock ? '#ff9a9a' : '#ffffff', '#1d1f2b');
    }
  }

  // ---- start ---------------------------------------------------------------------------
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
  else window.addEventListener('resize', resize);
  document.addEventListener('themechange', buildScene);
  updateHud();
  intro();
  PK.loop(host, frame);
})();
