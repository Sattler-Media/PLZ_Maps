// Auswahl-Sets für die verschiedenen PLZ-Ebenen
const selectedPostalCodes = new Set();   // 5-stellig
const selectedPostalCodes3 = new Set();  // 3-stellig
const selectedPostalCodes2 = new Set();  // 2-stellig
const customSelectedTags = new Set(); // Para mostrar etiquetas como 'PLZ: 38126', 'PLZ3: 38', 'Stadtkreis: Berlin'
const tagPlzMap = new Map();
const circleWorker = new Worker('./worker.js');
const { feature } = topojson;

// GeoJSON-Daten für die verschiedenen PLZ-Ebenen
let geojsonData = null;    // 5-stellig
let geojsonData3 = null;   // 3-stellig
let geojsonData2 = null;   // 2-stellig
let geojsonStates = null;  // Bundesländer
let geojsonLandkreise = null; // Landkreise
let map = null; // Map-Instanz
let plzSpatialIndex = null

// compressed TopoJSON laden und dekomprimieren
async function loadCompressedTopoJSON(url, objectName) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const decompressed = pako.inflate(new Uint8Array(buffer), { to: 'string' });
    const topology = JSON.parse(decompressed);

    
  if (!topology.objects[objectName]) {
    console.error(`Objeto ${objectName} no encontrado en TopoJSON`);
    return null;
  }

    return feature(topology, topology.objects[objectName]); // GeoJSON umwandeln
}
// Loader-Funktionen
function showLoader(message = 'Lade Karte...') {
    const loader = document.getElementById('loader');
    document.getElementById('loader-text').textContent = message;
    loader.style.display = 'flex';
}
// Versteckt den Loader
function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

// --- Dynamische Kreise Funktionen---
function addCircleLayer(map) {
    map.addSource('selection-circles', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
    });

    map.addLayer({
        id: 'selection-circles-layer',
        type: 'fill',
        source: 'selection-circles',
        paint: {
            'fill-color': [
                'match',
                ['get', 'radius'],
                5, '#007cbf',
                10, '#2ECC40',
                15, '#FF851B',
                '#007cbf'
            ],
            'fill-opacity': 0.3
        }
    }); 
}

// Kreise vom Worker anfragen
function requestCircles(radii) {
  const center = map.getCenter().toArray();
  circleWorker.postMessage({ type: 'circles', center: center, radii: radii });
}

// Worker Antwort für Kreise verarbeiten
circleWorker.onmessage = (e) => {
  if (e.data.type === 'FeatureCollection') {
    const circles = e.data;
    map.getSource('selection-circles').setData(circles);
    if (!geojsonData || !circles.features.length) return;
    // Delegar selección al worker
    circleWorker.postMessage({ type: 'selectPlzInsideCircles', circles: circles.features, plzFeatures: geojsonData.features });
  } else {
    // e.data es lista de PLZ seleccionadas
    const selectedPlz = e.data;
    selectedPlz.forEach(plz => selectedPostalCodes.add(plz));
    refreshSelectedFills();
    updateSelectedPlzLayer();
    updateEinwohnerSumTotal();
    updateSelectedTagsUI();
  }
};

// HTML-Buttons für Kreise einrichten
function setupCircleControls() {
    document.querySelectorAll('#circle-selection .umkreis-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#circle-selection .umkreis-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const radius = btn.dataset.radius;
            if (radius === 'none') {
                map.getSource('selection-circles').setData({ type: 'FeatureCollection', features: [] });
            } else if (radius === 'all') {
                requestCircles([5, 10, 15]);
            } else {
                requestCircles([parseInt(radius)]);
            }
        });
    });
}
// Aktualisieren der Kreise beim Bewegen der Karte, wenn eine Auswahl aktiv ist

function updateCirclesOnMove() {
    map.on('moveend', () => {
        const activeRadius = document.querySelector('#circle-selection button.active')?.dataset.radius;
        if (activeRadius && activeRadius !== 'none') {
            if (activeRadius === 'all') {
                requestCircles([5, 10, 15]);
            } else {
                requestCircles([parseInt(activeRadius)]);
            }
        }
    });
}
// --- Ende der Funktionen für dynamische Kreise ---

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

// Hauptfunktion zum Hinzufügen aller PLZ-Layer
async function addPostalCodeLayers(mapInstance) {
    try {
        showLoader('Postleitzahlen werden geladen...');

        // Cargar todas las capas en paralelo
      
        const [plz5, plz3, plz2] = await Promise.all([
            loadCompressedTopoJSON('./Json/plz-5stellig.json.gz', 'plz-5stellig'),
            loadCompressedTopoJSON('./Json/plz-3stellig.json.gz', 'plz-3stellig'),
            loadCompressedTopoJSON('./Json/plz-2stellig.json.gz', 'plz-2stellig')
        ]);

        geojsonData = plz5;
        geojsonData3 = plz3;
        geojsonData2 = plz2;

        buildPlzSpatialIndex();

        // Añadir PLZ-5
        mapInstance.addSource('postal-codes-germany', { type: 'geojson', data: geojsonData });
        mapInstance.addLayer({
            id: 'PLZ-fill',
            type: 'fill',
            source: 'postal-codes-germany',
            paint: {
                'fill-color': ['case', ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes)]], '#ff0000', 'rgba(0,0,0,0)'],
                'fill-opacity': ['case', ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes)]], 0.4, 0]
            },
            minzoom: 9.5
        });
        mapInstance.addLayer({ id: 'PLZ-borders', type: 'line', source: 'postal-codes-germany', paint: { 'line-color': '#990000', 'line-width': 1.5 }, minzoom: 9.5 });
        mapInstance.addLayer({ id: 'PLZ-labels', type: 'symbol', source: 'postal-codes-germany', layout: { 'text-field': ['get', 'plz'], 'text-size': 12 }, paint: { 'text-color': 'red', 'text-halo-color': 'white', 'text-halo-width': 2 }, minzoom: 9.5 });

        // Añadir PLZ-3
        mapInstance.addSource('postal-codes-germany-3', { type: 'geojson', data: geojsonData3 });
        mapInstance.addLayer({
            id: 'PLZ3-fill',
            type: 'fill',
            source: 'postal-codes-germany-3',
            paint: {
                'fill-color': ['case', ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes3)]], '#0074D9', 'rgba(0,0,0,0)'],
                'fill-opacity': ['case', ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes3)]], 0.4, 0.3]
            },
            minzoom: 8,
            maxzoom: 9.5
        });
        mapInstance.addLayer({ id: 'PLZ3-borders', type: 'line', source: 'postal-codes-germany-3', paint: { 'line-color': '#0074D9', 'line-width': 1.5 }, minzoom: 8, maxzoom: 9.5 });
        mapInstance.addLayer({ id: 'PLZ3-labels', type: 'symbol', source: 'postal-codes-germany-3', layout: { 'text-field': ['get', 'plz'], 'text-size': 14 }, paint: { 'text-color': 'blue', 'text-halo-color': 'white', 'text-halo-width': 2 }, minzoom: 8, maxzoom: 9.5 });

        // Añadir PLZ-2
        mapInstance.addSource('postal-codes-germany-2', { type: 'geojson', data: geojsonData2 });
        mapInstance.addLayer({
            id: 'PLZ2-fill',
            type: 'fill',
            source: 'postal-codes-germany-2',
            paint: {
                'fill-color': ['case', ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes2)]], '#2ECC40', 'rgba(0,0,0,0)'],
                'fill-opacity': ['case', ['in', ['get', 'plz'], ['literal', Array.from(selectedPostalCodes2)]], 0.4, 0.3]
            },
            minzoom: 0,
            maxzoom: 8
        });
        mapInstance.addLayer({ id: 'PLZ2-borders', type: 'line', source: 'postal-codes-germany-2', paint: { 'line-color': 'green', 'line-width': 1.5 }, minzoom: 0, maxzoom: 8 });
        mapInstance.addLayer({ id: 'PLZ2-labels', type: 'symbol', source: 'postal-codes-germany-2', layout: { 'text-field': ['get', 'plz'], 'text-size': 16 }, paint: { 'text-color': '#ff7001', 'text-halo-color': 'white', 'text-halo-width': 2 }, minzoom: 0, maxzoom: 8 });

        // Selektions-Layer
        mapInstance.addSource('plz-selected', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        mapInstance.addLayer({ id: 'PLZ-selected', type: 'fill', source: 'plz-selected', paint: { 'fill-color': '#FFD700', 'fill-opacity': 0.6 }, minzoom: 0, maxzoom: 24 });

        // Eventos
        mapInstance.on('click', 'PLZ-fill', onPlzFillClick);
        mapInstance.on('click', 'PLZ2-fill', onPlz2FillClick);
        mapInstance.on('click', 'PLZ3-fill', onPlz3FillClick);

        hideLoader();
    } catch (error) {
        console.error('Fehler beim Hinzufügen der PLZ-Layer:', error);
        hideLoader();
    }
}

// Hauptfunktion zum Bundesländer Hinzufügen 
async function addStatesLayer(mapInstance) {
  geojsonStates = await loadCompressedTopoJSON('./Json/states.json.gz', 'states');
  console.log('States loaded:', geojsonStates?.features.length);
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
  geojsonLandkreise = await loadCompressedTopoJSON('./Json/landkreise.json.gz', 'landkreise');
  console.log('Landkreise loaded:', geojsonLandkreise?.features.length);
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
document.addEventListener('DOMContentLoaded', function () {document.getElementById('search-bar').addEventListener('input', function(e) {
  const query = e.target.value.toLowerCase();
  const resultsList = document.getElementById('search-results');  
  // Warten auf das Laden der GeoJSON-Daten
  if (!geojsonData || !geojsonData2 || !geojsonData3) {
    showLoader('Postleitzahlen werden geladen...');
    return; // Verhindert das Fortfahren, bis die Daten bereit sind
}
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
  // PLZ-2stellig durchsuchen
  if (geojsonData2) {
    const plz2Results = geojsonData2.features.filter(f =>
      f.properties.plz && f.properties.plz.includes(query)
    ).map(f => ({
      type: 'plz2',
      name: f.properties.plz,
      plz: f.properties.plz,
      feature: f
    }));
    results = results.concat(plz2Results);
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
});});

// suchergebnisse anzeigen
function showSearchResults(results) {
  const resultsList = document.getElementById('search-results');
  resultsList.innerHTML = '';

  const grouped = {
    landkreis: [],
    state: [],
    plz2: [],
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
  addGroupToList('2-Stellig PLZ', grouped.plz2);
  addGroupToList('3-Stellig PLZ', grouped.plz3);
  addGroupToList('5-Stellig PLZ', grouped.plz5);
}

// Enter-Taste Funktionalität
document.addEventListener('DOMContentLoaded', function () {document.getElementById('search-bar').addEventListener('keydown', function(e) {
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
});});

// Klick-Handler für Suchergebnisse
function handleResultClick(result, resultsList) {
    if (result.type === 'plz5') {
        select5DigitPlzByPrefix(result.plz);
        selectedPostalCodes.add(result.plz);
        customSelectedTags.add(`PLZ: ${result.plz}`);
    } else if (result.type === 'plz3') {
        select5DigitPlzByPrefix(result.plz);
        selectedPostalCodes3.add(result.plz);
        customSelectedTags.add(`PLZ3: ${result.plz}`);
    } else if (result.type === 'plz2') {
        select5DigitPlzByPrefix(result.plz);
        selectedPostalCodes2.add(result.plz);
        customSelectedTags.add(`PLZ2: ${result.plz}`);
    } else if (result.type === 'state') {
        plzList = selectPlz5InsideState(result.feature);
        const tag = `Bundesland: ${result.name}`;
        customSelectedTags.add(tag);
        tagPlzMap.set(tag, plzList);
    } else if (result.type === 'landkreis') {
        plzList = selectPlz5InsideLandkreis(result.feature);
        const tag = `Stadtkreis: ${result.name}`;
        customSelectedTags.add(tag);
        tagPlzMap.set(tag, plzList);
    }

    updateSelectedTagsUI();
    resultsList.innerHTML = '';
    document.getElementById('search-bar').value = '';
    centerMapOnFeature(result.feature);
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
// Landkreise auswählen und alle PLZ-5stellig darin selektieren
function select5DigitPlzByPrefix(prefix) {
  console.log("select5DigitPlzByPrefix wurde aufgerufen mit:", prefix);

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
  console.log("PLZ seleccionadas:", Array.from(selectedPostalCodes));

  refreshSelectedFills();
  updateSelectedPlzLayer();
  updateEinwohnerSumTotal();
  updateSelectedTagsUI();
}

// Klick-Handler für PLZ-5stellig
function onPlzFillClick(e) {
    if (!geojsonData) {
        showLoader('Postleitzahlen werden geladen...');
        return;
       }

    const postalCode = e.features[0].properties.plz;
    const tag = `PLZ: ${postalCode}`;

    if (customSelectedTags.has(tag)) {
        // Deseleccionar
        customSelectedTags.delete(tag);
        selectedPostalCodes.delete(postalCode);
    } else {
        // Seleccionar
        select5DigitPlzByPrefix(postalCode);
        selectedPostalCodes.add(postalCode);
        customSelectedTags.add(tag);
    }

    refreshSelectedFills();
    updateSelectedPlzLayer();
    updateEinwohnerSumTotal();
    updateSelectedTagsUI();
}

// Klick-Handler für PLZ-3stellig
function onPlz3FillClick(e) {

    if (!geojsonData) {
            showLoader('Postleitzahlen werden geladen...');
            return;
        }

    const postalCode3 = e.features[0].properties.plz;
    const tag = `PLZ3: ${postalCode3}`;

    if (customSelectedTags.has(tag)) {
        // Deseleccionar
        customSelectedTags.delete(tag);
        selectedPostalCodes3.delete(postalCode3);
        // Eliminar todos los PLZ de 5 dígitos que empiezan con este prefijo
        Array.from(selectedPostalCodes).forEach(code => {
            if (code.startsWith(postalCode3)) selectedPostalCodes.delete(code);
        });
    } else {
        // Seleccionar
        select5DigitPlzByPrefix(postalCode3);
        selectedPostalCodes3.add(postalCode3);
        customSelectedTags.add(tag);
    }

    refreshSelectedFills();
    updateSelectedPlzLayer();
    updateEinwohnerSumTotal();
    updateSelectedTagsUI();
}

// Klick-Handler für PLZ-2stellig
function onPlz2FillClick(e) {
    if (!geojsonData) {
            showLoader('Postleitzahlen werden geladen...');
            return;
        }

    const postalCode2 = e.features[0].properties.plz;
    const tag = `PLZ2: ${postalCode2}`;

    if (customSelectedTags.has(tag)) {
        // Deseleccionar
        customSelectedTags.delete(tag);
        selectedPostalCodes2.delete(postalCode2);
        // Eliminar todos los PLZ de 5 dígitos que empiezan con este prefijo
        Array.from(selectedPostalCodes).forEach(code => {
            if (code.startsWith(postalCode2)) selectedPostalCodes.delete(code);
        });
    } else {
        // Seleccionar
        select5DigitPlzByPrefix(postalCode2);
        selectedPostalCodes2.add(postalCode2);
        customSelectedTags.add(tag);
    }

    refreshSelectedFills();
    updateSelectedPlzLayer();
    updateEinwohnerSumTotal();
    updateSelectedTagsUI();
}

// Aktualisiert die Farben/Opazität der Layer je nach Auswahl
function refreshSelectedFills() {
  // PLZ-5
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
  // PLZ-3
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
  // PLZ-2
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
// Alle Auswahlen löschen
function clearAllSelections() {
  selectedPostalCodes.clear();
  selectedPostalCodes3.clear();
  selectedPostalCodes2.clear();
  updateSelectedTagsUI();
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
// Button-Event Listener zum Löschen aller Auswahlen
document.addEventListener('DOMContentLoaded', function () {
  const clearBtn = document.getElementById('clearSelections');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllSelections);
  } else {
    console.warn('clearSelections button not found in DOM');
  }
});
// Verhindert Textauswahl auf der Seite
document.body.style.userSelect = 'none'; // Verhindert Textauswahl

// --- Spatial Index für schnellere Geometrie-Abfragen ---
function buildPlzSpatialIndex() {
  const worker = new Worker('./worker.js');
  worker.postMessage({ features: geojsonData.features });
  worker.onmessage = (e) => {
    plzSpatialIndex = new rbush();
    plzSpatialIndex.load(e.data);
    console.log('Spatial Index erfolgreich erstellt!');
  };
}

// PLZ-5stellig innerhalb einer Region selektieren (allgemeine Funktion)
function selectPlz5InsideRegion(regionFeature, options = {}) {
    const { minOverlap = 0.2 } = options;
    if (!regionFeature) return [];

    const newSelected = [];
    const regionBbox = turf.bbox(regionFeature);

    // Auxiliar: determina si una PLZ solapa >= umbral con la región (misma lógica para todos)
    const qualifies = (plzFeature) => {
        // Filtro rápido por bbox para evitar intersectar todo
        const plzBbox = turf.bbox(plzFeature);
        const bboxOverlaps =
            plzBbox[0] <= regionBbox[2] && plzBbox[2] >= regionBbox[0] &&
            plzBbox[1] <= regionBbox[3] && plzBbox[3] >= regionBbox[1];
        if (!bboxOverlaps) return false;

        const intersection = turf.intersect(plzFeature, regionFeature);
        if (!intersection) return false;

        const overlapRatio = turf.area(intersection) / turf.area(plzFeature);
        return overlapRatio >= minOverlap;
    };

    if (plzSpatialIndex) {
        // Índice: buscar candidatos por bbox de la región
        const candidates = plzSpatialIndex.search({
            minX: regionBbox[0],
            minY: regionBbox[1],
            maxX: regionBbox[2],
            maxY: regionBbox[3]
        });

        candidates.forEach(item => {
            const plzFeature = item.feature;
            if (qualifies(plzFeature)) {
                const plz = plzFeature.properties.plz;
                if (!selectedPostalCodes.has(plz)) {
                    selectedPostalCodes.add(plz);
                    newSelected.push(plz);
                }
            }
        });
    } else {
        // Fallback PRECISO sin índice: misma lógica (intersección + ratio), sin centroides
        if (!geojsonData || !geojsonData.features) return [];

        geojsonData.features.forEach(f => {
            if (qualifies(f)) {
                const plz = f.properties.plz;
                if (!selectedPostalCodes.has(plz)) {
                    selectedPostalCodes.add(plz);
                    newSelected.push(plz);
                }
            }
        });
    }

    // Actualizaciones comunes
    refreshSelectedFills();
    updateSelectedPlzLayer();
    updateEinwohnerSumTotal();

    return newSelected; // Gibt die Liste der ausgewählten PLZ zurück
}

// --- Spezifische Wrapper (behalten die ursprünglichen Signaturen bei) ---
function selectPlz5InsideState(stateFeature) {
    return selectPlz5InsideRegion(stateFeature, { minOverlap: 0.2 });
}

function selectPlz5InsideLandkreis(landkreisFeature) {
    return selectPlz5InsideRegion(landkreisFeature, { minOverlap: 0.2 });
}


// PLZ-5stellig innerhalb eines Landkreises selektieren
function updateSelectedTagsUI() {
  requestIdleCallback(() => {
    const container = document.getElementById('selected-tags-container');
    container.innerHTML = '';

    customSelectedTags.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'selected-tag';
        tagEl.textContent = tag;

        const removeBtn = document.createElement('span');
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-btn';
        removeBtn.onclick = () => {
            customSelectedTags.delete(tag);

            if (tag.startsWith('PLZ:')) {
                const plz = tag.replace('PLZ: ', '');
                selectedPostalCodes.delete(plz);
            } else if (tag.startsWith('PLZ3:')) {
                const plz3 = tag.replace('PLZ3: ', '');
                selectedPostalCodes3.delete(plz3);
                Array.from(selectedPostalCodes).forEach(code => {
                    if (code.startsWith(plz3)) selectedPostalCodes.delete(code);
                });
            } else if (tag.startsWith('PLZ2:')) {
                const plz2 = tag.replace('PLZ2: ', '');
                selectedPostalCodes2.delete(plz2);
                Array.from(selectedPostalCodes).forEach(code => {
                    if (code.startsWith(plz2)) selectedPostalCodes.delete(code);
                });
            } else if (tag.startsWith('Stadtkreis:') || tag.startsWith('Bundesland:')) {
                const plzList = tagPlzMap.get(tag);
                if (plzList) {
                    plzList.forEach(plz => selectedPostalCodes.delete(plz));
                    tagPlzMap.delete(tag);
                }
            }

            refreshSelectedFills();
            updateSelectedPlzLayer();
            updateEinwohnerSumTotal();
            updateSelectedTagsUI();
        };

        tagEl.appendChild(removeBtn);
        container.appendChild(tagEl);
    });
  });
}

// Initialisierung der Karte
async function init() {
  const center = await getUserCenter();
  map = new maplibregl.Map({
    container: 'map',
    center: center,
    style: 'https://api.maptiler.com/maps/streets/style.json?key=4BNJO72dCI17waAmwZ2E',
    zoom: 10,
    maxTileCacheSize: 200, // Erhöht den Cache für bessere Leistung
    workerCount: 4 // Nutzt mehrere Worker für bessere Performance
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
init();

// --- ENDE Spatial Index ---