import "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";

// Auswahl-Sets für die verschiedenen PLZ-Ebenen
const selectedPostalCodes = new Set();   // 5-stellig
const selectedPostalCodes3 = new Set();  // 3-stellig
const selectedPostalCodes2 = new Set();  // 2-stellig

// GeoJSON-Daten für die verschiedenen PLZ-Ebenen
let geojsonData = null;    // 5-stellig
let geojsonData3 = null;   // 3-stellig
let geojsonData2 = null;   // 2-stellig

let map = null; // Map-Instanz

// Benutzerzentrum bestimmen (mit Fallback auf Berlin)
async function getUserCenter() {
  const defaultCenter = [13.4090638258883, 52.51156577109141]; // Berlin
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('IP location fetch failed');
    const data = await response.json();
    if (data.longitude && data.latitude) {
      return [parseFloat(data.longitude), parseFloat(data.latitude)];
    }
  } catch (e) {
    console.warn('Konnte Benutzerstandort nicht ermitteln, Standardzentrum wird verwendet.');
  }
  return defaultCenter;
}

// Initialisierung der Karte
async function init() {
  const center = await getUserCenter();
  map = new maplibregl.Map({
    container: 'map',
    center: center,
    style: 'https://api.maptiler.com/maps/streets/style.json?key=4BNJO72dCI17waAmwZ2E',
    zoom: 10
  });

  map.on('load', () => {
    console.log('Karte erfolgreich geladen!');
    addPostalCodeLayers(map);
  });

  map.on('error', (e) => {
    console.error('Fehler in der Karte:', e.error);
  });
}

// Hauptfunktion zum Hinzufügen aller PLZ-Layer
async function addPostalCodeLayers(mapInstance) {
  try {
    // --- PLZ-5stellig Layer ---
    geojsonData = await (await fetch('./GeoJson/plz-5stellig.geojson')).json();
    map.addSource('postal-codes-germany', { type: 'geojson', data: geojsonData });
    map.addLayer({
      id: 'PLZ-fill',
      type: 'fill',
      source: 'postal-codes-germany',
      paint: {
        'fill-color': [
          'case',
          ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes)]],
          '#ff0000',
          'rgba(0,0,0,0)'
        ],
        'fill-opacity': [
          'case',
          ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes)]],
          0.4,
          0
        ]
      },
      minzoom: 9.5
    });

    map.addLayer({
      id: 'PLZ-borders',
      type: 'line',
      source: 'postal-codes-germany',
      paint: {
        'line-color': '#990000',
        'line-width': 1.5
      },
      minzoom: 9.5
    });

    map.addLayer({
      id: 'PLZ-labels',
      type: 'symbol',
      source: 'postal-codes-germany',
      layout: {
        'text-field': ['get', 'plz'],
        'text-size': 12
      },
      paint: {
        'text-color': 'red',
        'text-halo-color': 'white',
        'text-halo-width': 2
      },
      minzoom: 9.5
    });

    // --- PLZ-3stellig Layer ---
    geojsonData3 = await (await fetch('./GeoJson/plz-3stellig.geojson')).json();
    map.addSource('postal-codes-germany-3', { type: 'geojson', data: geojsonData3 });
    map.addLayer({
      id: 'PLZ3-fill',
      type: 'fill',
      source: 'postal-codes-germany-3',
      paint: {
        'fill-color': [
          'case',
          ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes3)]],
          '#0074D9',
          'rgba(0,0,0,0)'
        ],
        'fill-opacity': [
          'case',
          ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes3)]],
          0.4,
          0.3
        ]
      },
      minzoom: 8,
      maxzoom: 9.5
    });

    map.addLayer({
      id: 'PLZ3-borders',
      type: 'line',
      source: 'postal-codes-germany-3',
      paint: {
        'line-color': '#0074D9',
        'line-width': 1.5
      },
      minzoom: 8,
      maxzoom: 9.5
    });

    map.addLayer({
      id: 'PLZ3-labels',
      type: 'symbol',
      source: 'postal-codes-germany-3',
      layout: {
        'text-field': ['get', 'plz'],
        'text-size': 14
      },
      paint: {
        'text-color': 'blue',
        'text-halo-color': 'white',
        'text-halo-width': 2
      },
      minzoom: 8,
      maxzoom: 9.5
    });

    // --- PLZ-2stellig Layer ---
    geojsonData2 = await (await fetch('./GeoJson/plz-2stellig.geojson')).json();
    map.addSource('postal-codes-germany-2', { type: 'geojson', data: geojsonData2 });
    map.addLayer({
      id: 'PLZ2-fill',
      type: 'fill',
      source: 'postal-codes-germany-2',
      paint: {
        'fill-color': [
          'case',
          ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes2)]],
          '#2ECC40',
          'rgba(0,0,0,0)'
        ],
        'fill-opacity': [
          'case',
          ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes2)]],
          0.4,
          0.3
        ]
      },
      minzoom: 0,
      maxzoom: 8
    });

    map.addLayer({
      id: 'PLZ2-borders',
      type: 'line',
      source: 'postal-codes-germany-2',
      paint: {
        'line-color': 'green',
        'line-width': 1.5
      },
      minzoom: 0,
      maxzoom: 8
    });

    map.addLayer({
      id: 'PLZ2-labels',
      type: 'symbol',
      source: 'postal-codes-germany-2',
      layout: {
        'text-field': ['get', 'plz'],
        'text-size': 16
      },
      paint: {
        'text-color': '#ff7001',
        'text-halo-color': 'white',
        'text-halo-width': 2
      },
      minzoom: 0,
      maxzoom: 8
    });

    // --- Selektions-Layer für alle Zoomstufen ---
    map.addSource('plz-selected', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    map.addLayer({
      id: 'PLZ-selected',
      type: 'fill',
      source: 'plz-selected',
      paint: {
        'fill-color': '#FFD700', // Goldgelb
        'fill-opacity': 0.6
      },
      minzoom: 0,
      maxzoom: 24,
      layout: { visibility: 'none' } // <-- Startet unsichtbar
    });

    // Klick-Events für die Layer
    map.on('click', 'PLZ-fill', onPlzFillClick);
    map.on('click', 'PLZ3-fill', onPlz3FillClick);
    map.on('click', 'PLZ2-fill', onPlz2FillClick);

    // Zoom-Event für Layer-Umschaltung
    map.on('zoom', () => {
      refreshSelectedFills();
      if (checkform && checkform.checked) updateSelectedPlzLayer();
      updateEinwohnerSumTotal();
    });

    // Initiales Styling und Einwohner-Summe
    refreshSelectedFills();
    updateEinwohnerSumTotal();

    // Checkbox-Listener für Sichtbarkeit des Selektions-Layers
    const checkform = document.getElementById('checkDefault');
    if (checkform) {
      checkform.addEventListener('change', function(e) {
        const visible = e.target.checked ? 'visible' : 'none';
        map.setLayoutProperty('PLZ-selected', 'visibility', visible);
        if (e.target.checked) {
          updateSelectedPlzLayer();
        }
      });
      // Initialzustand: Layer bleibt unsichtbar
      map.setLayoutProperty('PLZ-selected', 'visibility', 'none');
    }

  } catch (error) {
    console.error('Fehler beim Hinzufügen der PLZ-Layer:', error);
  }
}

// Klick-Handler für PLZ-5stellig
function onPlzFillClick(e) {
  const postalCode = e.features[0].properties.plz;
  if (selectedPostalCodes.has(postalCode)) {
    selectedPostalCodes.delete(postalCode);
  } else {
    selectedPostalCodes.add(postalCode);
  }
  refreshSelectedFills();
  updateSelectedPlzLayer();
  updateEinwohnerSumTotal();
}

// Klick-Handler für PLZ-3stellig
function onPlz3FillClick(e) {
  const postalCode3 = e.features[0].properties.plz;
  if (selectedPostalCodes3.has(postalCode3)) {
    selectedPostalCodes3.delete(postalCode3);
  } else {
    selectedPostalCodes3.add(postalCode3);
  }
  refreshSelectedFills();
  updateSelectedPlzLayer();
  updateEinwohnerSumTotal();
}

// Klick-Handler für PLZ-2stellig
function onPlz2FillClick(e) {
  const postalCode2 = e.features[0].properties.plz;
  if (selectedPostalCodes2.has(postalCode2)) {
    selectedPostalCodes2.delete(postalCode2);
  } else {
    selectedPostalCodes2.add(postalCode2);
  }
  refreshSelectedFills();
  updateSelectedPlzLayer();
  updateEinwohnerSumTotal();
}

// Aktualisiert die Farben/Opazität der Layer je nach Auswahl
function refreshSelectedFills() {
  map.setPaintProperty('PLZ-fill', 'fill-color', [
    'case',
    ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes)]],
    '#ff0000',
    'rgba(0,0,0,0)'
  ]);
  map.setPaintProperty('PLZ-fill', 'fill-opacity', [
    'case',
    ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes)]],
    0.4,
    0
  ]);
  map.setPaintProperty('PLZ3-fill', 'fill-color', [
    'case',
    ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes3)]],
    '#0074D9',
    'rgba(0,0,0,0)'
  ]);
  map.setPaintProperty('PLZ3-fill', 'fill-opacity', [
    'case',
    ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes3)]],
    0.4,
    0.3
  ]);
  map.setPaintProperty('PLZ2-fill', 'fill-color', [
    'case',
    ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes2)]],
    '#2ECC40',
    'rgba(0,0,0,0)'
  ]);
  map.setPaintProperty('PLZ2-fill', 'fill-opacity', [
    'case',
    ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes2)]],
    0.4,
    0.3
  ]);
}

// Aktualisiert den Layer für immer sichtbare Selektion
function updateSelectedPlzLayer() {
  const selectedFeatures = [];
  if (geojsonData) {
    geojsonData.features.forEach(f => {
      if (selectedPostalCodes.has(f.properties.plz)) selectedFeatures.push(f);
    });
  }
  if (geojsonData3) {
    geojsonData3.features.forEach(f => {
      if (selectedPostalCodes3.has(f.properties.plz)) selectedFeatures.push(f);
    });
  }
  if (geojsonData2) {
    geojsonData2.features.forEach(f => {
      if (selectedPostalCodes2.has(f.properties.plz)) selectedFeatures.push(f);
    });
  }
  map.getSource('plz-selected').setData({
    type: 'FeatureCollection',
    features: selectedFeatures
  });
}

// Summiert die Einwohner aus allen Layern und zeigt sie im Input an
function updateEinwohnerSumTotal() {
  let einwohnerSum = 0;
  if (geojsonData) {
    geojsonData.features.forEach(feature => {
      if (selectedPostalCodes.has(feature.properties.plz)) {
        einwohnerSum += Number(feature.properties.einwohner) || 0;
      }
    });
  }
  if (geojsonData3) {
    geojsonData3.features.forEach(feature => {
      if (selectedPostalCodes3.has(feature.properties.plz)) {
        einwohnerSum += Number(feature.properties.einwohner) || 0;
      }
    });
  }
  if (geojsonData2) {
    geojsonData2.features.forEach(feature => {
      if (selectedPostalCodes2.has(feature.properties.plz)) {
        einwohnerSum += Number(feature.properties.einwohner) || 0;
      }
    });
  }
  const einwohnerInput = document.getElementById('Einwohner');
  if (einwohnerInput) einwohnerInput.value = einwohnerSum;
}

// Karte initialisieren
init();

document.body.style.userSelect = 'none'; // Verhindert Textauswahl