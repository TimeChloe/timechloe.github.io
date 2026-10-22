// World map on the personal interests page.
// The pins come from _data/trips.yml, which the page embeds as JSON in #trip-data.
(function () {
  var el = document.getElementById('travel-map');
  var data = document.getElementById('trip-data');
  if (!el || !data || !window.L) return;

  var trips = JSON.parse(data.textContent || '[]');
  var root = document.documentElement;
  var css = function (name) { return getComputedStyle(root).getPropertyValue(name).trim(); };

  var map = L.map(el, { worldCopyJump: true, minZoom: 1, scrollWheelZoom: false }).setView([38, 0], 2);
  // Only zoom with the scroll wheel after a click, so the page itself still scrolls.
  map.on('click focus', function () { map.scrollWheelZoom.enable(); });
  map.on('mouseout blur', function () { map.scrollWheelZoom.disable(); });

  // OpenStreetMap tiles. Their colours are toned down (and inverted in dark mode) in main.css.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function popupHtml(trip) {
    var html = '<div class="trip-popup"><strong>' + escapeHtml(trip.name) + '</strong>';
    var meta = [trip.activity, trip.date || (trip.status === 'regular' ? 'regularly' : '')]
      .filter(Boolean).map(escapeHtml).join(' · ');
    if (meta) html += '<div class="trip-meta">' + meta + '</div>';
    if (trip.insight) html += '<p>' + escapeHtml(trip.insight) + '</p>';
    if (trip.photos && trip.photos.length) {
      html += '<div class="trip-photos">' + trip.photos.map(function (src) {
        var url = escapeHtml(src);
        return '<a href="' + url + '" target="_blank" rel="noopener"><img src="' + url + '" alt="" loading="lazy"></a>';
      }).join('') + '</div>';
    }
    if (trip.log) html += '<p><a href="' + escapeHtml(trip.log) + '">Read the travel log &rarr;</a></p>';
    return html + '</div>';
  }

  // Trips at the same coordinates share one pin.
  var groups = {};
  trips.forEach(function (trip) {
    if (typeof trip.lat !== 'number' || typeof trip.lng !== 'number') return;
    var key = trip.lat + ',' + trip.lng;
    (groups[key] = groups[key] || []).push(trip);
  });

  var markers = [];
  function pinStyle(status) {
    var theme = css('--theme');
    if (status === 'planned') {
      return { radius: 7, color: theme, weight: 2, dashArray: '3 3', fillColor: css('--bg'), fillOpacity: 1 };
    }
    var fill = status === 'regular' ? css('--regular') : theme;
    return { radius: 7, color: '#ffffff', weight: 2, fillColor: fill, fillOpacity: 0.95 };
  }

  Object.keys(groups).forEach(function (key) {
    var group = groups[key];
    var statuses = group.map(function (t) { return t.status || 'visited'; });
    var status = statuses.indexOf('regular') >= 0 ? 'regular'
      : statuses.indexOf('visited') >= 0 ? 'visited' : 'planned';
    var marker = L.circleMarker([group[0].lat, group[0].lng], pinStyle(status)).addTo(map);
    marker.status = status;
    marker.bindTooltip(group.map(function (t) { return escapeHtml(t.name); }).join('<br>'), { direction: 'top', offset: [0, -6] });
    marker.bindPopup(group.map(popupHtml).join(''), { maxWidth: 280 });
    marker.on('popupopen', function () { marker.closeTooltip(); });
    markers.push(marker);
  });

  // Start zoomed to fit all pins.
  if (markers.length > 1) {
    map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40], maxZoom: 4 });
  } else if (markers.length === 1) {
    map.setView(markers[0].getLatLng(), 4);
  }

  document.addEventListener('themechange', function () {
    markers.forEach(function (m) { m.setStyle(pinStyle(m.status)); });
  });
})();
