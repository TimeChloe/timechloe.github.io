// Maps on the mountains and travel pages.
// Pins come from the JSON in #trip-data (a copy of _data/mountains.yml or _data/travel.yml).
// On the travel page (#trip-map has data-shade-countries) the countries in #country-data are shaded too.
(function () {
  var el = document.getElementById('trip-map');
  var data = document.getElementById('trip-data');
  if (!el || !data || !window.L) return;

  var trips = JSON.parse(data.textContent || '[]');
  var root = document.documentElement;
  var css = function (name) { return getComputedStyle(root).getPropertyValue(name).trim(); };

  var map = L.map(el, {
    worldCopyJump: true,
    minZoom: 1,
    scrollWheelZoom: false,
    fadeAnimation: false,
    // Keep the view between the poles, so no empty band shows above or below the map.
    maxBounds: [[-85, -540], [85, 540]],
    maxBoundsViscosity: 1
  }).setView([35, 20], 2);
  // Only zoom with the scroll wheel after a click, so the page itself still scrolls.
  map.on('click focus', function () { map.scrollWheelZoom.enable(); });
  map.on('mouseout blur', function () { map.scrollWheelZoom.disable(); });

  // OpenStreetMap tiles. Their colours are toned down (and dimmed in dark mode) in main.css.
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
    var title = trip.name + (trip.area ? ', ' + trip.area : '');
    var html = '<div class="trip-popup"><strong>' + escapeHtml(title) + '</strong>';
    var meta = [trip.activity, trip.elevation, trip.grade, trip.date].filter(Boolean).map(escapeHtml).join(' · ');
    if (meta) html += '<div class="trip-meta">' + meta + '</div>';
    if (trip.insight) html += '<p>' + escapeHtml(trip.insight) + '</p>';
    if (trip.photos && trip.photos.length) {
      html += '<div class="trip-photos">' + trip.photos.map(function (src) {
        var url = escapeHtml(src);
        return '<a href="' + url + '" target="_blank" rel="noopener"><img src="' + url + '" alt="" loading="lazy"></a>';
      }).join('') + '</div>';
    }
    if (trip.log) html += '<p><a href="' + escapeHtml(trip.log) + '">Read the trip report &rarr;</a></p>';
    return html + '</div>';
  }

  // Pins: trips at the same coordinates share one pin.
  var groups = {};
  trips.forEach(function (trip) {
    if (typeof trip.lat !== 'number' || typeof trip.lng !== 'number') return;
    var key = trip.lat + ',' + trip.lng;
    (groups[key] = groups[key] || []).push(trip);
  });

  function pinStyle(status) {
    var theme = css('--theme');
    if (status === 'planned') {
      return { radius: 7, color: theme, weight: 2, dashArray: '3 3', fillColor: css('--bg'), fillOpacity: 1 };
    }
    var fill = status === 'regular' ? css('--regular') : theme;
    return { radius: 7, color: '#ffffff', weight: 2, fillColor: fill, fillOpacity: 0.95 };
  }

  var markers = [];
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

  var shade = el.hasAttribute('data-shade-countries');
  if (!shade) {
    // Mountains page: start zoomed to fit all pins.
    if (markers.length > 1) {
      map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40], maxZoom: 5, animate: false });
    } else if (markers.length === 1) {
      map.setView(markers[0].getLatLng(), 5);
    }
  }

  // Travel page: shade the countries I have lived in and visited.
  var countryLayer = null;
  var lived = {};
  var visited = {};
  function countryStyle(feature) {
    var isLived = lived[feature.properties.name];
    return {
      color: css('--theme'), weight: 0.8, opacity: 0.7,
      fillColor: css('--theme'), fillOpacity: isLived ? 0.45 : 0.2
    };
  }
  if (shade && window.topojson) {
    var info = JSON.parse((document.getElementById('country-data') || {}).textContent || '{}');
    (info.lived || []).forEach(function (c) { lived[c] = true; });
    (info.trips || []).forEach(function (t) {
      if ((t.status || 'visited') === 'planned') return;
      [].concat(t.country || []).forEach(function (c) { visited[c] = true; });
    });
    var all = Object.keys(Object.assign({}, visited, lived));
    var stats = document.getElementById('travel-stats');
    if (stats) stats.textContent = all.length + ' countries and regions so far';

    map.createPane('countries');
    map.getPane('countries').style.zIndex = 350; // below the pins
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(function (response) { return response.json(); })
      .then(function (topology) {
        countryLayer = L.geoJSON(topojson.feature(topology, topology.objects.countries), {
          pane: 'countries',
          interactive: false,
          filter: function (f) { return lived[f.properties.name] || visited[f.properties.name]; },
          style: countryStyle
        }).addTo(map);
        var bounds = countryLayer.getBounds();
        if (markers.length) bounds.extend(L.featureGroup(markers).getBounds());
        if (bounds.isValid()) {
          // Ignore the far north and south (e.g. the top of Greenland) so the map is not zoomed out too far.
          var fit = L.latLngBounds(
            [Math.max(bounds.getSouth(), -50), bounds.getWest()],
            [Math.min(bounds.getNorth(), 72), bounds.getEast()]
          );
          map.fitBounds(fit, { padding: [20, 20], maxZoom: 4, animate: false });
        }
      })
      .catch(function () { /* the pins still work without the shading */ });
  }

  document.addEventListener('themechange', function () {
    markers.forEach(function (m) { m.setStyle(pinStyle(m.status)); });
    if (countryLayer) countryLayer.setStyle(countryStyle);
  });
})();
