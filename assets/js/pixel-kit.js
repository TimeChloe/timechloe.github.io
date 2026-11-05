// Shared pieces for the pixel games on the travel and mountains pages:
// a tiny bitmap font, sprites, saved progress, the in-game panels, and the "play / map" switch.
(function () {
  var PK = window.PK = {};

  // ---- small helpers -------------------------------------------------------------------
  PK.load = function (key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  };
  PK.save = function (key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: progress is not kept */ }
  };
  PK.esc = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  // "Arête" -> "Arete", for the bitmap font.
  PK.plain = function (s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  };
  PK.dark = function () { return document.documentElement.getAttribute('data-theme') === 'dark'; };
  PK.calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  PK.touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  PK.mod = function (a, n) { return ((a % n) + n) % n; };
  PK.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  PK.hash = function (x, y) {
    var h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  // Flag emoji from a two-letter country code ("FR" -> 🇫🇷).
  PK.flag = function (code) {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint.apply(null, code.toUpperCase().split('').map(function (ch) {
      return 0x1F1E6 + ch.charCodeAt(0) - 65;
    }));
  };
  PK.km = function (n) { return Math.round(n).toLocaleString('en-US') + ' km'; };

  // ---- bitmap font (5 px tall) ---------------------------------------------------------
  var GLYPHS = {
    A: '.#./#.#/###/#.#/#.#', B: '##./#.#/##./#.#/##.', C: '.##/#../#../#../.##', D: '##./#.#/#.#/#.#/##.',
    E: '###/#../##./#../###', F: '###/#../##./#../#..', G: '.##/#../#.#/#.#/.##', H: '#.#/#.#/###/#.#/#.#',
    I: '###/.#./.#./.#./###', J: '..#/..#/..#/#.#/.#.', K: '#.#/#.#/##./#.#/#.#', L: '#../#../#../#../###',
    M: '#...#/##.##/#.#.#/#...#/#...#', N: '#..#/##.#/#.##/#..#/#..#', O: '.#./#.#/#.#/#.#/.#.',
    P: '##./#.#/##./#../#..', Q: '.#./#.#/#.#/##./.##', R: '##./#.#/##./#.#/#.#', S: '.##/#../.#./..#/##.',
    T: '###/.#./.#./.#./.#.', U: '#.#/#.#/#.#/#.#/###', V: '#.#/#.#/#.#/#.#/.#.', W: '#...#/#...#/#.#.#/##.##/#...#',
    X: '#.#/#.#/.#./#.#/#.#', Y: '#.#/#.#/.#./.#./.#.', Z: '###/..#/.#./#../###',
    0: '###/#.#/#.#/#.#/###', 1: '.#./##./.#./.#./###', 2: '##./..#/.#./#../###', 3: '##./..#/.#./..#/##.',
    4: '#.#/#.#/###/..#/..#', 5: '###/#../##./..#/##.', 6: '.##/#../###/#.#/###', 7: '###/..#/.#./.#./.#.',
    8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/##.',
    ' ': '../../../../..', '.': './././././#', ',': '../../../.#/#.', ':': './#/./#/.', "'": '#/#/./././.',
    '-': '.../.../###/.../...', '/': '..#/..#/.#./#../#..', '?': '##./..#/.#./.../.#.', '!': '#/#/#/./#',
    '+': '.../.#./###/.#./...', '(': '.#/#./#./#./.#', ')': '#./.#/.#/.#/#.', '*': '.../#.#/.#./#.#/...',
    '>': '#../.#./..#/.#./#..', '<': '..#/.#./#../.#./..#', '#': '#.#/###/#.#/###/#.#', '%': '#.#/..#/.#./#../#.#'
  };
  var glyphs = {};
  Object.keys(GLYPHS).forEach(function (k) { glyphs[k] = GLYPHS[k].split('/'); });
  function glyph(ch) { return glyphs[ch] || glyphs[ch.toUpperCase()] || glyphs['?']; }

  PK.textWidth = function (str) {
    var w = 0;
    PK.plain(str).split('').forEach(function (ch, i) { w += glyph(ch)[0].length + (i ? 1 : 0); });
    return w;
  };
  var textCache = {};
  // Draws text with its top-left corner at (x, y); `outline` adds a 1 px border for maps.
  PK.text = function (ctx, str, x, y, color, outline) {
    str = PK.plain(str);
    var key = str + '|' + color + '|' + (outline || '');
    var c = textCache[key];
    if (!c) {
      var w = PK.textWidth(str), pad = outline ? 1 : 0;
      c = document.createElement('canvas');
      c.width = w + pad * 2; c.height = 5 + pad * 2;
      var g = c.getContext('2d');
      var paint = function (dx, dy, col) {
        g.fillStyle = col;
        var cx = pad + dx;
        str.split('').forEach(function (ch) {
          var rows = glyph(ch);
          rows.forEach(function (row, ry) {
            for (var rx = 0; rx < row.length; rx++) if (row[rx] === '#') g.fillRect(cx + rx, pad + dy + ry, 1, 1);
          });
          cx += rows[0].length + 1;
        });
      };
      if (outline) [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]].forEach(function (o) { paint(o[0], o[1], outline); });
      paint(0, 0, color);
      textCache[key] = c;
    }
    ctx.drawImage(c, Math.round(x) - (outline ? 1 : 0), Math.round(y) - (outline ? 1 : 0));
    return c.width;
  };

  // ---- sprites -------------------------------------------------------------------------
  // rows: strings of palette keys, "." is transparent.
  PK.sprite = function (rows, pal) {
    var c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    var g = c.getContext('2d');
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var col = pal[row[x]];
        if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      }
    });
    return c;
  };
  PK.draw = function (ctx, sprite, x, y, flip) {
    x = Math.round(x); y = Math.round(y);
    if (!flip) { ctx.drawImage(sprite, x, y); return; }
    ctx.save(); ctx.translate(x + sprite.width, y); ctx.scale(-1, 1); ctx.drawImage(sprite, 0, 0); ctx.restore();
  };

  // ---- canvas sizing: whole-number pixel scale so the pixels stay crisp ----------------
  PK.fit = function (host, canvas, cssPerPixel) {
    var w = host.clientWidth, h = host.clientHeight;
    var scale = Math.max(2, Math.round(w / cssPerPixel));
    var W = Math.ceil(w / scale), H = Math.ceil(h / scale);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    canvas.style.width = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { W: W, H: H, scale: scale, ctx: ctx };
  };

  // ---- panels, toasts and buttons inside a game ----------------------------------------
  // Opens a card over the game. Returns a function that closes it.
  PK.panel = function (host, html, opts) {
    opts = opts || {};
    var old = host.querySelector('.pg-panel');
    if (old && old._close) old._close(true);
    var panel = document.createElement('div');
    panel.className = 'pg-panel' + (opts.className ? ' ' + opts.className : '');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.innerHTML = '<div class="pg-card" tabindex="-1">' +
      (opts.noClose ? '' : '<button type="button" class="pg-x" data-close aria-label="Close">&times;</button>') +
      html + '</div>';
    host.appendChild(panel);
    var closed = false;
    function close(silent) {
      if (closed) return;
      closed = true;
      panel.remove();
      if (!silent && opts.onClose) opts.onClose();
    }
    panel._close = close;
    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-close]');
      if (btn) { e.preventDefault(); close(); return; }
      if (e.target === panel && !opts.noClose) close();
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !opts.noClose) { e.stopPropagation(); close(); }
      e.stopPropagation();
    });
    // Move the focus into the card, except for the start screen, so loading the page does not grab the keyboard.
    var focusEl = panel.querySelector('[data-autofocus]') || panel.querySelector('.pg-card');
    if (!opts.noFocus) setTimeout(function () { try { focusEl.focus({ preventScroll: true }); } catch (e) { focusEl.focus(); } }, 30);
    return close;
  };
  PK.panelOpen = function (host) { return !!host.querySelector('.pg-panel'); };

  PK.toast = function (host, html, ms) {
    var box = host.querySelector('.pg-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'pg-toasts'; box.setAttribute('aria-live', 'polite'); host.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'pg-toast';
    t.innerHTML = html;
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(function () { t.classList.add('out'); }, ms || 2600);
    setTimeout(function () { t.remove(); }, (ms || 2600) + 400);
  };

  PK.progress = function (done, total) {
    var pct = total ? Math.round((done / total) * 100) : 0;
    return '<span class="pg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + total +
      '" aria-valuenow="' + done + '"><span style="width:' + pct + '%"></span></span>';
  };

  // Badges: [{id, icon, name, desc}] with the earned ones in `earned` (id -> true).
  PK.badgeGrid = function (badges, earned) {
    return '<ul class="pg-badges">' + badges.map(function (b) {
      var got = !!earned[b.id];
      return '<li class="pg-badge' + (got ? ' got' : '') + '"><span class="pg-badge-icon" aria-hidden="true">' + (got ? b.icon : '🔒') +
        '</span><span><strong>' + PK.esc(b.name) + '</strong><small>' + PK.esc(b.desc) + '</small></span></li>';
    }).join('') + '</ul>';
  };

  // Small game loop that only runs while the game is on screen.
  PK.loop = function (host, frame) {
    var visible = true, running = false, last = 0;
    function tick(t) {
      if (!visible || document.hidden || !host.offsetParent) { running = false; return; }
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      frame(dt, t / 1000);
      requestAnimationFrame(tick);
    }
    function start() {
      if (running || !visible || document.hidden || !host.offsetParent) return;
      running = true; last = 0;
      requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        start();
      }).observe(host);
    }
    document.addEventListener('visibilitychange', start);
    document.addEventListener('viewchange', start);
    start();
    return start;
  };

  // ---- "play / map" switch ------------------------------------------------------------
  // <div data-view-switch="travel"><button data-view="game">..</button><button data-view="map">..</button></div>
  // and panels with data-view-panel="game" / "map". The choice is remembered per page.
  document.querySelectorAll('[data-view-switch]').forEach(function (sw) {
    var key = 'view-' + sw.getAttribute('data-view-switch');
    var buttons = sw.querySelectorAll('[data-view]');
    function show(view, remember) {
      document.querySelectorAll('[data-view-panel]').forEach(function (p) {
        p.hidden = p.getAttribute('data-view-panel') !== view;
      });
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === view)); });
      if (remember) PK.save(key, view);
      document.dispatchEvent(new CustomEvent('viewchange', { detail: { view: view } }));
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-view'), true); });
    });
    var start = location.hash === '#map' ? 'map' : location.hash === '#play' ? 'game' : (PK.load(key) || 'game');
    show(start === 'map' ? 'map' : 'game', false);
  });
})();
