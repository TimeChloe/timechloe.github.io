// Builds assets/js/world-grid.js, the pixel world map used by the travel game.
// Run once (only needed again to change the map resolution):
//   npm install world-atlas@2 topojson-client@3 i18n-iso-countries@7
//   node _tools/make-world-grid.js
// Each cell of the grid is 1 degree; a cell is land when at least 3 of its 3x3 sample points
// fall inside a country (Natural Earth 1:50m, the same country names as the travel map).
const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');
const iso = require('i18n-iso-countries');

const TOP = 84, BOTTOM = -60, LEFT = -180, COLS = 360, ROWS = TOP - BOTTOM, SS = 3;
const topo = require('world-atlas/countries-50m.json');
const features = topojson.feature(topo, topo.objects.countries).features
  .filter((f) => f.properties && f.properties.name && f.properties.name !== 'Antarctica');

const SW = COLS * SS, SH = ROWS * SS;
const samples = new Uint16Array(SW * SH); // country index + 1 per sample point

features.forEach((f, fi) => {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  polys.forEach((rings) => {
    const edges = [];
    let minLat = 90, maxLat = -90;
    rings.forEach((raw) => {
      // Unwrap longitudes so rings across the date line (Russia, Fiji) do not jump by 360 degrees.
      const ring = [];
      raw.forEach(([x, y], i) => {
        if (i) { const px = ring[i - 1][0]; while (x - px > 180) x -= 360; while (px - x > 180) x += 360; }
        ring.push([x, y]);
      });
      for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
        if (y1 === y2) continue;
        edges.push([x1, y1, x2, y2]);
        minLat = Math.min(minLat, y1, y2); maxLat = Math.max(maxLat, y1, y2);
      }
    });
    const syStart = Math.max(0, Math.floor((TOP - maxLat) * SS - 0.5));
    const syEnd = Math.min(SH - 1, Math.ceil((TOP - minLat) * SS));
    for (let sy = syStart; sy <= syEnd; sy++) {
      const lat = TOP - (sy + 0.5) / SS;
      const xs = [];
      for (const [x1, y1, x2, y2] of edges) {
        if ((y1 <= lat && y2 > lat) || (y2 <= lat && y1 > lat)) {
          xs.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.ceil((xs[k] - LEFT) * SS - 0.5), b = Math.floor((xs[k + 1] - LEFT) * SS - 0.5);
        for (let sx = a; sx <= Math.min(b, a + SW - 1); sx++) {
          samples[sy * SW + (((sx % SW) + SW) % SW)] = fi + 1; // holes (e.g. Lesotho) come from the even-odd pairs
        }
      }
    }
  });
});

// Cells: the country with most samples, if at least 3 of 9 are land.
const grid = new Uint16Array(COLS * ROWS);
const best = {}; // country -> [count, cellIndex] for countries too small to win a cell
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const count = {};
    let land = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) {
      const v = samples[(r * SS + dy) * SW + c * SS + dx];
      if (v) { land++; count[v] = (count[v] || 0) + 1; }
    }
    let top = 0, topN = 0;
    for (const k in count) {
      if (count[k] > topN) { top = +k; topN = count[k]; }
      if (!best[k] || count[k] > best[k][0]) best[k] = [count[k], r * COLS + c];
    }
    if (land >= 3) grid[r * COLS + c] = top;
  }
}
const cellsOf = () => { const n = {}; grid.forEach((v) => { if (v) n[v] = (n[v] || 0) + 1; }); return n; };
let have = cellsOf();
// Countries too small to win a cell get their best cell only if it is sea (Malta, Singapore...);
// land-locked ones (Vatican, Liechtenstein...) are found by the trips' coordinates in the game instead.
features.forEach((f, fi) => {
  const id = fi + 1;
  if (have[id]) return;
  if (best[id]) { if (!grid[best[id][1]]) grid[best[id][1]] = id; return; }
  // Tiny countries with no sample point: use the middle of their bounding box.
  let minX = 999, maxX = -999, minY = 999, maxY = -999;
  JSON.stringify(f.geometry.coordinates).replace(/\[(-?[\d.]+),(-?[\d.]+)\]/g, (m, x, y) => {
    minX = Math.min(minX, +x); maxX = Math.max(maxX, +x); minY = Math.min(minY, +y); maxY = Math.max(maxY, +y);
  });
  const r = Math.floor(TOP - (minY + maxY) / 2), c = Math.floor((minX + maxX) / 2 - LEFT);
  if (r >= 0 && r < ROWS && !grid[r * COLS + c]) grid[r * COLS + c] = id;
});
have = cellsOf();

// Label point: the cell nearest the middle of each country's biggest connected piece.
function labelCell(id) {
  const seen = new Uint8Array(COLS * ROWS);
  let bestComp = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== id || seen[i]) continue;
    const comp = [], stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop(); comp.push(j);
      const r = Math.floor(j / COLS), c = j % COLS;
      [[r, c - 1], [r, c + 1], [r - 1, c], [r + 1, c]].forEach(([rr, cc]) => {
        if (rr < 0 || rr >= ROWS) return;
        const k = rr * COLS + ((cc + COLS) % COLS);
        if (!seen[k] && grid[k] === id) { seen[k] = 1; stack.push(k); }
      });
    }
    if (comp.length > bestComp.length) bestComp = comp;
  }
  if (!bestComp.length) return null;
  // Circular mean for the column, so pieces across the date line work.
  let sx = 0, sy = 0, sr = 0;
  bestComp.forEach((j) => { const a = ((j % COLS) / COLS) * 2 * Math.PI; sx += Math.cos(a); sy += Math.sin(a); sr += Math.floor(j / COLS); });
  const mc = ((Math.atan2(sy, sx) / (2 * Math.PI)) * COLS + COLS) % COLS, mr = sr / bestComp.length;
  let pick = bestComp[0], d0 = Infinity;
  bestComp.forEach((j) => {
    const r = Math.floor(j / COLS), c = j % COLS;
    let dc = Math.abs(c - mc); dc = Math.min(dc, COLS - dc);
    const d = dc * dc + (r - mr) * (r - mr);
    if (d < d0) { d0 = d; pick = j; }
  });
  return pick;
}

const extraCodes = { Kosovo: 'XK' };
const countries = features.map((f, fi) => {
  const name = f.properties.name;
  const code = extraCodes[name] || (f.id && iso.numericToAlpha2(f.id)) || '';
  const cell = have[fi + 1] ? labelCell(fi + 1) : null;
  const lat = cell === null ? null : TOP - Math.floor(cell / COLS) - 0.5;
  const lng = cell === null ? null : LEFT + (cell % COLS) + 0.5;
  return [name, code, lat, lng];
});

const rows = [];
for (let r = 0; r < ROWS; r++) {
  let out = '', run = 0, prev = -1;
  for (let c = 0; c <= COLS; c++) {
    const v = c < COLS ? grid[r * COLS + c] : -2;
    if (v === prev) { run++; continue; }
    if (prev >= 0) out += prev.toString(36) + (run > 1 ? '*' + run.toString(36) : '') + ' ';
    prev = v; run = 1;
  }
  rows.push(out.trim());
}

const header = '// Pixel world map for the travel game: 1-degree cells from ' + TOP + 'N to ' + (-BOTTOM) + 'S.\n' +
  '// Generated by _tools/make-world-grid.js from Natural Earth (via world-atlas); do not edit by hand.\n' +
  '// rows: one string per row of cells, west to east; "id*count" runs in base 36 (0 = sea, n = countries[n - 1]).\n' +
  '// countries: [name, ISO code, label lat, label lng].\n';
const js = header + 'window.WORLD_GRID = {\n' +
  '"top": ' + TOP + ', "left": ' + LEFT + ', "rows": ' + ROWS + ', "cols": ' + COLS + ',\n' +
  '"countries": [\n' + countries.map((c) => JSON.stringify(c)).join(',\n') + '\n],\n' +
  '"grid": [\n' + rows.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n};\n';
const out = path.join(__dirname, '..', 'assets', 'js', 'world-grid.js');
fs.writeFileSync(out, js);
console.log('wrote', out, (js.length / 1024).toFixed(1) + ' KB,', countries.length, 'countries,',
  countries.filter((c) => c[2] === null).length, 'without cells');
