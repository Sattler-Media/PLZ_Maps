import "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";

const mittel_DE = [13.4090638258883, 52.51156577109141];

// Estado para almacenar los PLZ seleccionados
const selectedPlzCodes = new Set();

async function init() {
  // 1. Karte mit alternativem Stil erstellen
  const map = new maplibregl.Map({
    container: 'map',
    center: mittel_DE,
    style: 'https://demotiles.maplibre.org/style.json', // Alternativer Stil
    zoom: 13
  });

  // 2. Überprüfen, ob der Basisstil geladen wurde
  map.on('load', () => {
    console.log('Karte erfolgreich geladen!');
    addPostalCodeLayers(map);
  });

  // 3. Fehler beim Laden behandeln
  map.on('error', (e) => {
    console.error('Fehler in der Karte:', e.error);
  });
}

async function addPostalCodeLayers(map) {
  try {
    // 4. GeoJSON laden
    const response = await fetch('https://opendata.rhein-kreis-neuss.de/api/v2/catalog/datasets/nrw-postleitzahlen/exports/geojson');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden des GeoJSON: ${response.status} ${response.statusText}`);
    }
    const geojsonData = await response.json();

    // GeoJSON-Inhalt debuggen
    console.log('GeoJSON-Daten:', geojsonData);

    // Überprüfen, ob die Features die Eigenschaft 'plz_code' enthalten
    if (!geojsonData.features || geojsonData.features.length === 0) {
      throw new Error('Das GeoJSON enthält keine Features.');
    }
    const hasPlzCode = geojsonData.features.some(feature => feature.properties && feature.properties.plz_code);
    if (!hasPlzCode) {
      throw new Error('Die Features des GeoJSON enthalten nicht die Eigenschaft "plz_code".');
    }

    // 5. Quelle und Layer hinzufügen
    map.addSource('plz-germany', {
      type: 'geojson',
      data: geojsonData
    });

    map.addLayer({
      id: 'plz-borders',
      type: 'line',
      source: 'plz-germany',
      paint: {
        'line-color': 'red',
        'line-width': 1
      }
    });

    map.addLayer({
      id: 'plz-fill',
      type: 'fill',
      source: 'plz-germany',
      paint: {
        'fill-color': [
          'case',
          ['in', ['get', 'plz_code'], ['literal', Array.from(selectedPlzCodes)]],
          '#ff0000', // Highlight-Farbe
          '#888888'  // Standardfarbe
        ],
        'fill-opacity': 0.4
      }
    });

    map.addLayer({
      id: 'plz-labels',
      type: 'symbol',
      source: 'plz-germany',
      layout: {
        'text-field': ['get', 'plz_code'],
        'text-size': 12
      }
    });

    console.log('Layer erfolgreich hinzugefügt.');

    // 6. Klick-Event hinzufügen
    map.on('click', 'plz-fill', (e) => {
      const plzCode = e.features[0].properties.plz_code;
      console.log(`PLZ ${plzCode} wurde angeklickt.`);

      // PLZ hinzufügen oder entfernen
      if (selectedPlzCodes.has(plzCode)) {
        selectedPlzCodes.delete(plzCode); // Entfernen, wenn bereits ausgewählt
      } else {
        selectedPlzCodes.add(plzCode); // Hinzufügen, wenn nicht ausgewählt
      }

      // Aktualisieren der Farbe basierend auf den ausgewählten PLZ
      map.setPaintProperty('plz-fill', 'fill-color', [
        'case',
        ['in', ['get', 'plz_code'], ['literal', Array.from(selectedPlzCodes)]],
        '#ff0000', // Highlight-Farbe
        '#888888'  // Standardfarbe
      ]);
    });

    // 7. Cursor ändern, wenn die Maus über einer Fläche ist
    map.on('mouseenter', 'plz-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'plz-fill', () => {
      map.getCanvas().style.cursor = '';
    });

  } catch (error) {
    console.error('Fehler beim Hinzufügen der Postleitzahlen-Layer:', error);
  }
}

// 6. Initialisieren
init();

document.body.style.userSelect = 'none'; /* Gültiger Wert */