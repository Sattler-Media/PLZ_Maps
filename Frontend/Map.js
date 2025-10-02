
// Auswahl-Sets für die verschiedenen PLZ-Ebenen
const selectedPostalCodes = new Set();   // 5-stellig
const selectedPostalCodes3 = new Set();  // 3-stellig
const selectedPostalCodes2 = new Set();  // 2-stellig

// GeoJSON-Daten für die verschiedenen PLZ-Ebenen
let geojsonData = null;    // 5-stellig
let geojsonData3 = null;   // 3-stellig
let geojsonData2 = null;   // 2-stellig
let geojsonStates = null;  // Bundesländer
let geojsonLandkreise = null; // Landkreise
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
  addStatesLayer(map);
  addLandkreiseLayer(map);
});

  map.on('error', (e) => {
    console.error('Fehler in der Karte:', e.error);
  });
}
// TURF.js Funktion um alle PLZ-5stellig innerhalb eines Bundeslandes zu selektieren
function selectPlz5InsideState(stateFeature) {
  if (!geojsonData || !stateFeature) return;
  const newSelected = [];

  geojsonData.features.forEach(plzFeature => {
    const intersection = turf.intersect(plzFeature, stateFeature);
    if (intersection) {
      const intersectionArea = turf.area(intersection);
      const plzArea = turf.area(plzFeature);
      const overlapRatio = intersectionArea / plzArea;

      // Selektiere PLZ, wenn mindestens 20% der Fläche überlappt
      if (overlapRatio >= 0.2) {
        newSelected.push(plzFeature.properties.plz);
      }
    }
  });

  
  newSelected.forEach(plz => selectedPostalCodes.add(plz));

  refreshSelectedFills();
  updateSelectedPlzLayer();
  updateEinwohnerSumTotal();
}
// TURF.js Funktion um alle PLZ-5stellig innerhalb eines Landkreises zu selektieren
function selectPlz5InsideLandkreis(landkreisFeature) {
  if (!geojsonData || !landkreisFeature) return;

  const newSelected = [];

  geojsonData.features.forEach(plzFeature => {
    const intersection = turf.intersect(plzFeature, landkreisFeature);
    if (intersection) {
      const intersectionArea = turf.area(intersection);
      const plzArea = turf.area(plzFeature);
      const overlapRatio = intersectionArea / plzArea;

      if (overlapRatio >= 0.2) {
        newSelected.push(plzFeature.properties.plz);
      }
    }
  });

  newSelected.forEach(plz => selectedPostalCodes.add(plz));

  refreshSelectedFills();
  updateSelectedPlzLayer();
  updateEinwohnerSumTotal();
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
      layout: { visibility: 'visible' } // <-- Startet sichtbar
    });

    // Klick-Events für die Layer
    map.on('click', 'PLZ-fill', onPlzFillClick);   
    map.on('click', 'PLZ2-fill', onPlz2FillClick);
    map.on('click', 'PLZ3-fill', onPlz3FillClick);

    // Zoom-Event für Layer-Umschaltung
   
    map.on('zoom', () => {
      refreshSelectedFills();
      updateEinwohnerSumTotal();
    });


    // Initiales Styling und Einwohner-Summe
    refreshSelectedFills();
    updateEinwohnerSumTotal();
   
  } catch (error) {
    console.error('Fehler beim Hinzufügen der PLZ-Layer:', error);
  }
}
// Hauptfunktion zum Bundesländer Hinzufügen 
async function addStatesLayer(mapInstance) {
  geojsonStates = await (await fetch('./GeoJson/states.geojson')).json();
  mapInstance.addSource('states-germany', { type: 'geojson', data: geojsonStates });
  mapInstance.addLayer({
    id: 'States-fill',
    type: 'fill',
    source: 'states-germany',
    paint: {
      'fill-color': '#FFD700',
      'fill-opacity': 0.6
    },
    layout: { visibility: 'none' }
  });
  mapInstance.addLayer({
    id: 'States-borders',
    type: 'line',
    source: 'states-germany',
    paint: {
      'line-color': '#FFD700',
      'line-width': 2
    },
    layout: { visibility: 'none' }
  });
}
// Hauptfunktion zum Landkreise Hinzufügen
async function addLandkreiseLayer(mapInstance) {
  geojsonLandkreise = await (await fetch('./GeoJson/landkreise.geojson')).json();

  mapInstance.addSource('landkreise-germany', {
    type: 'geojson',
    data: geojsonLandkreise
  });

  mapInstance.addLayer({
    id: 'Landkreis-fill',
    type: 'fill',
    source: 'landkreise-germany',
    paint: {
      'fill-color': '#FFDC00',
      'fill-opacity': 0.4
    },
    layout: { visibility: 'none' }
  });

  mapInstance.addLayer({
    id: 'Landkreis-borders',
    type: 'line',
    source: 'landkreise-germany',
    paint: {
      'line-color': '#FF851B',
      'line-width': 2
    },
    layout: { visibility: 'none' }
  });
}

// Suchleiste Funktionalität
document.getElementById('search-bar').addEventListener('input', function(e) {
  const query = e.target.value.toLowerCase();
  const resultsList = document.getElementById('search-results');

  // Leeren Suchbegriff
  if (query.trim() === '') {
    resultsList.innerHTML = '';
    return;
  }

  let results = [];
  // Landkreise durchsuchen
 if (geojsonLandkreise) {
  const landkreiseResults = geojsonLandkreise.features.filter(f =>
    Array.isArray(f.properties.krs_name) &&
    f.properties.krs_name[0].toLowerCase().includes(query)
  ).map(f => ({
    type: 'landkreis',
    name: f.properties.krs_name[0],
    feature: f
  }));
  results = results.concat(landkreiseResults);
}
  // Bundesländer durchsuchen
  if (geojsonStates) {
    const stateResults = geojsonStates.features.filter(f =>
      f.properties.name && f.properties.name.toLowerCase().includes(query)
    ).map(f => ({
      type: 'state',
      name: f.properties.name,
      id: f.properties.id,
      feature: f
    }));
    results = results.concat(stateResults);
  }

  // PLZ-3stellig durchsuchen
  if (geojsonData3) {
    const plz3Results = geojsonData3.features.filter(f =>
      f.properties.plz && f.properties.plz.includes(query)
    ).map(f => ({
      type: 'plz3',
      name: f.properties.plz,
      plz: f.properties.plz,
      feature: f
    }));
    results = results.concat(plz3Results);
  }

  // PLZ-5stellig durchsuchen
  if (geojsonData) {
    const plz5Results = geojsonData.features.filter(f =>
      f.properties.plz && f.properties.plz.includes(query)
    ).map(f => ({
      type: 'plz5',
      name: f.properties.plz,
      plz: f.properties.plz,
      feature: f
    }));
    results = results.concat(plz5Results);
  }

  showSearchResults(results.slice(0, 10));
});

// suchergebnisse anzeigen
function showSearchResults(results) {
  const resultsList = document.getElementById('search-results');
  resultsList.innerHTML = '';

  const grouped = {
    landkreis: [],
    state: [],
    plz3: [],
    plz5: []
  };

  // gruppieren der Ergebnisse
  results.forEach(result => {
    if (grouped[result.type]) {
      grouped[result.type].push(result);
    }
  });

  // extrahieren und hinzufügen der gruppen
  function addGroupToList(title, items) {
    if (items.length === 0) return;

    const header = document.createElement('li');
    header.textContent = title;
    header.style.fontWeight = 'bold';
    header.style.marginTop = '10px';
    resultsList.appendChild(header);

    items.forEach(result => {
      const li = document.createElement('li');
      li.textContent = result.name;
      li.style.cursor = 'pointer';
      li.onclick = () => handleResultClick(result, resultsList);
      resultsList.appendChild(li);
    });
  }

  // gewünschte Reihenfolge der Gruppen
  addGroupToList('Landkreise', grouped.landkreis);
  addGroupToList('Bundesland', grouped.state);
  addGroupToList('3-Stellig PLZ', grouped.plz3);
  addGroupToList('5-Stellig PLZ', grouped.plz5);
}

// Enter-Taste Funktionalität
document.getElementById('search-bar').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const resultsList = document.getElementById('search-results');
    const items = resultsList.querySelectorAll('li');
    for (let item of items) {
      if (item.style.cursor === 'pointer') {
        item.click();
        break;
      }
    }
  }
});
// Klick-Handler für Suchergebnisse
function handleResultClick(result, resultsList) {
  if (result.type === 'plz5') {
    select5DigitPlzByPrefix(result.plz);
    centerMapOnFeature(result.feature);
  } else if (result.type === 'plz3') {
    select5DigitPlzByPrefix(result.plz); 
    centerMapOnFeature(result.feature);
  } else if (result.type === 'state') {
  selectPlz5InsideState(result.feature); 
  centerMapOnFeature(result.feature);
  } else if (result.type === 'landkreis') {
  selectPlz5InsideLandkreis(result.feature);
  centerMapOnFeature(result.feature);
  }  
  resultsList.innerHTML = '';
  document.getElementById('search-bar').value = '';
}
// Zentriert die Karte auf das ausgewählte Feature
function centerMapOnFeature(feature) {
  if (feature && feature.geometry && feature.geometry.coordinates) {
    let coords = feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates[0][0];
    const bounds = coords.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );
    map.fitBounds(bounds, { padding: 40 });
  }
}
// Bundesland auswählen und alle PLZ-5stellig darin selektieren
function selectState(stateId) {
  const selectedFeature = geojsonStates.features.find(f => f.properties.id === stateId);
  if (selectedFeature) {
    map.getSource('states-germany').setData({
      type: 'FeatureCollection',
      features: [selectedFeature]
    });
    map.setLayoutProperty('States-fill', 'visibility', 'none');
    map.setLayoutProperty('States-borders', 'visibility', 'none');

    // PlZ-5stellig innerhalb des Bundeslandes selektieren
    selectPlz5InsideState(selectedFeature);
  }
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('search-bar').value = '';
}

// Klick-Handler für PLZ-5stellig
function select5DigitPlzByPrefix(prefix) {
  if (!geojsonData) return;

  const matchingPlz = geojsonData.features
    .map(f => f.properties.plz)
    .filter(plz => plz.startsWith(prefix));

  const isSelected = selectedPostalCodes.has(matchingPlz[0]);

  matchingPlz.forEach(plz => {
    if (isSelected) {
      selectedPostalCodes.delete(plz);
    } else {
      selectedPostalCodes.add(plz);
    }
  });

  refreshSelectedFills();
  updateSelectedPlzLayer();
  updateEinwohnerSumTotal();
}
// Klick-Handler für PLZ-3stellig
function onPlzFillClick(e) {
  const postalCode = e.features[0].properties.plz;
  select5DigitPlzByPrefix(postalCode);
}
// Klick-Handler für PLZ-2stellig
function onPlz3FillClick(e) {
  const postalCode3 = e.features[0].properties.plz;
  select5DigitPlzByPrefix(postalCode3);
}
// Klick-Handler für PLZ-2stellig
function onPlz2FillClick(e) {
  const postalCode2 = e.features[0].properties.plz;
  select5DigitPlzByPrefix(postalCode2);
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

  const selected5 = Array.from(selectedPostalCodes);
  const selected3 = Array.from(selectedPostalCodes3);
  const selected2 = Array.from(selectedPostalCodes2);

  const isContained = (plz, higherLevelSet) => {
    return higherLevelSet.some(higherPlz => plz.startsWith(higherPlz));
  };

  if (geojsonData) {
    geojsonData.features.forEach(feature => {
      const plz = feature.properties.plz;
      if (selected5.includes(plz) && !isContained(plz, selected3) && !isContained(plz, selected2)) {
        einwohnerSum += Number(feature.properties.einwohner) || 0;
      }
    });
  }

  if (geojsonData3) {
    geojsonData3.features.forEach(feature => {
      const plz = feature.properties.plz;
      if (selected3.includes(plz) && !isContained(plz, selected2)) {
        einwohnerSum += Number(feature.properties.einwohner) || 0;
      }
    });
  }

  if (geojsonData2) {
    geojsonData2.features.forEach(feature => {
      const plz = feature.properties.plz;
      if (selected2.includes(plz)) {
        einwohnerSum += Number(feature.properties.einwohner) || 0;
      }
    });
  }

  const einwohnerInput = document.getElementById('Einwohner');
  if (einwohnerInput) einwohnerInput.value = einwohnerSum;
}
// Karte initialisieren
init();

function clearAllSelections() {
  selectedPostalCodes.clear();
  selectedPostalCodes3.clear();
  selectedPostalCodes2.clear();

  refreshSelectedFills();
  updateSelectedPlzLayer();
  updateEinwohnerSumTotal();

  // versteckt Bundesländer und Landkreise Layer
  if (map.getLayer('States-fill')) {
    map.setLayoutProperty('States-fill', 'visibility', 'none');
  }
  if (map.getLayer('States-borders')) {
    map.setLayoutProperty('States-borders', 'visibility', 'none');
  }
  if (map.getLayer('Landkreis-fill')) {
    map.setLayoutProperty('Landkreis-fill', 'visibility', 'none');
  }
  if (map.getLayer('Landkreis-borders')) {
    map.setLayoutProperty('Landkreis-borders', 'visibility', 'none');
  }
}

document.getElementById('clearSelections').addEventListener('click', clearAllSelections);

document.body.style.userSelect = 'none'; // Verhindert Textauswahl