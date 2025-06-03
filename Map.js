import "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";

const selectedPostalCodes = new Set();
const selectedPostalCodes3 = new Set(); // Für 3-stellige PLZ
let geojsonData = null; // GeoJson-Daten global für Zugriff in onPlzFillClick
let geojsonData3 = null; // GeoJson für 3-stellige PLZ
let map = null;         // Map global für Zugriff in onPlzFillClick

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

async function addPostalCodeLayers(mapInstance) {
  try {
    // --- PLZ-5stellig Layer ---
    const response = await fetch('./GeoJson/plz-5stellig.geojson');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden des GeoJSON: ${response.status} ${response.statusText}`);
    }
    geojsonData = await response.json();

    console.log('GeoJSON-Daten:', geojsonData);

    if (!geojsonData.features || geojsonData.features.length === 0) {
      throw new Error('Das GeoJSON enthält keine Features.');
    }
    const hasPostalCode = geojsonData.features.some(feature => feature.properties && feature.properties.plz);
    if (!hasPostalCode) {
      throw new Error('Die Features des GeoJSON enthalten nicht die Eigenschaft "plz".');
    }

    map.addSource('postal-codes-germany', {
      type: 'geojson',
      data: geojsonData
    });

    map.addLayer({
      id: 'PLZ-borders',
      type: 'line',
      source: 'postal-codes-germany',
      paint: {
        'line-color': 'red',
        'line-width': 2
      },
      minzoom: 9 
    });

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
      }
    });
   
    const uniquePlzCodes = new Set();
    const uniqueLabelFeatures = geojsonData.features.filter(f => {
      if (!uniquePlzCodes.has(f.properties.plz)) {
        uniquePlzCodes.add(f.properties.plz);
        return true;
      }
      return false;
    });

    map.addSource('postal-codes-germany-labels', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: uniqueLabelFeatures
      }
    });

    map.addLayer({
      id: 'PLZ-labels',
      type: 'symbol',
      source: 'postal-codes-germany-labels',
      layout: {
        'text-field': ['get', 'plz'],
        'text-size': 12
      },
      paint: {
        'text-color': 'red',
        'text-halo-color': 'white',
        'text-halo-width': 2
      },
      minzoom: 9
    });

    // ---  PLZ-3stellig Layer ---
    const response3 = await fetch('./GeoJson/plz-3stellig.geojson');
    if (!response3.ok) {
      throw new Error(`Fehler beim Laden des GeoJSON 3stellig: ${response3.status} ${response3.statusText}`);
    }
    geojsonData3 = await response3.json();

    map.addSource('postal-codes-germany-3', {
      type: 'geojson',
      data: geojsonData3
    });

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
      maxzoom: 9 // nur sichtbar bis Zoom 8
    });

    map.addLayer({
      id: 'PLZ3-borders',
      type: 'line',
      source: 'postal-codes-germany-3',
      paint: {
        'line-color': 'blue',
        'line-width': 2
      },
      maxzoom: 9 // nur sichtbar bis Zoom 8
    });

    // --- Labels für PLZ-3stellig ---
    // Nur ein Label pro PLZ3 anzeigen
    const uniquePlz3Codes = new Set();
    const uniqueLabelFeatures3 = geojsonData3.features.filter(f => {
      if (!uniquePlz3Codes.has(f.properties.plz)) {
        uniquePlz3Codes.add(f.properties.plz);
        return true;
      }
      return false;
    });

    map.addSource('postal-codes-germany-3-labels', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: uniqueLabelFeatures3
      }
    });

    map.addLayer({
      id: 'PLZ3-labels',
      type: 'symbol',
      source: 'postal-codes-germany-3-labels',
      layout: {
        'text-field': ['get', 'plz'],
        'text-size': 14
      },
      paint: {
        'text-color': 'blue',
        'text-halo-color': 'white',
        'text-halo-width': 2
      },
      maxzoom: 9 // Nur sichtbar wenn PLZ3 sichtbar ist
    });

    // Klick-Event für PLZ-3stellig Layer
    function onPlz3FillClick(e) {
      const postalCode3 = e.features[0].properties.plz;
      if (selectedPostalCodes3.has(postalCode3)) {
        selectedPostalCodes3.delete(postalCode3);
      } else {
        selectedPostalCodes3.add(postalCode3);
      }

      // Aktualisiert die Farbe und Opazität für PLZ3
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

      // Aktualisiert die Summe der Einwohner für PLZ3
      updateEinwohnerSumTotal();
    }

    // Klick-Event für PLZ-5stellig Layer
    if (map.getZoom() >= 9) {
      map.on('click', 'PLZ-fill', onPlzFillClick);
    }
    if (map.getZoom() < 9) {
      map.on('click', 'PLZ3-fill', onPlz3FillClick);
    }

    // Zoom-Event für beide Layer
    map.on('zoom', () => {
      if (map.getZoom() >= 9) {
        map.off('click', 'PLZ-fill', onPlzFillClick);
        map.on('click', 'PLZ-fill', onPlzFillClick);
        map.off('click', 'PLZ3-fill', onPlz3FillClick);
      } else {
        map.off('click', 'PLZ-fill', onPlzFillClick);
        map.off('click', 'PLZ3-fill', onPlz3FillClick);
        map.on('click', 'PLZ3-fill', onPlz3FillClick);
      }
      // Aktualisiert die visuelle Auswahl beider Layer
      refreshSelectedFills();
      updateEinwohnerSumTotal();
    });

    // Initialisiert die Summe beim Laden
    refreshSelectedFills();
    updateEinwohnerSumTotal();

  } catch (error) {
    console.error('Fehler beim Hinzufügen der PLZ-Layer:', error);
  }
}

// Summiert die Einwohner aus beiden Layern und zeigt sie im Input an
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
  const einwohnerInput = document.getElementById('Einwohner');
  if (einwohnerInput) einwohnerInput.value = einwohnerSum;
}

// Klick-Event für PLZ-5stellig Layer
function onPlzFillClick(e) {
  const postalCode = e.features[0].properties.plz;
  if (selectedPostalCodes.has(postalCode)) {
    selectedPostalCodes.delete(postalCode);
  } else {
    selectedPostalCodes.add(postalCode);
  }
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
  updateEinwohnerSumTotal();
}

// Aktualisiert die visuelle Auswahl beider Layer
function refreshSelectedFills() {
  // Aktualisiert PLZ-5stellig
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
  // Aktualisiert PLZ-3stellig
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
}

// Initialisiert die Karte
init();

document.body.style.userSelect = 'none'; /* Gültiger Wert */