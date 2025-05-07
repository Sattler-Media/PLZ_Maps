import "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";

const mittel_DE = [13.4090638258883, 52.51156577109141];
const selectedPostalCodes = new Set();

async function init() {
  const map = new maplibregl.Map({
    container: 'map',
    center: mittel_DE,
    style: 'https://demotiles.maplibre.org/style.json',
    zoom: 13
  });

  map.on('load', () => {
    console.log('Map loaded successfully!');
    addPostalCodeLayers(map);
  });

  map.on('error', (e) => {
    console.error('Error in the map:', e.error);
  });
}

async function addPostalCodeLayers(map) {
  try {
    const response = await fetch('https://opendata.rhein-kreis-neuss.de/api/v2/catalog/datasets/nrw-postleitzahlen/exports/geojson');
    if (!response.ok) {
      throw new Error(`Error loading GeoJSON: ${response.status} ${response.statusText}`);
    }
    const geojsonData = await response.json();

    console.log('GeoJSON Data:', geojsonData);

    if (!geojsonData.features || geojsonData.features.length === 0) {
      throw new Error('The GeoJSON contains no features.');
    }
    const hasPostalCode = geojsonData.features.some(feature => feature.properties && feature.properties.plz_code);
    if (!hasPostalCode) {
      throw new Error('The features of the GeoJSON do not contain the property "plz_code".');
    }

    map.addSource('postal-codes-germany', {
      type: 'geojson',
      data: geojsonData
    });

    map.addLayer({
      id: 'PLZ-borders',
      type: 'line',
      source: 'PLZ-germany',
      paint: {
        'line-color': 'red',
        'line-width': 1
      }
    });

    map.addLayer({
      id: 'PLZ-fill',
      type: 'fill',
      source: 'PLZ-germany',
      paint: {
        'fill-color': [
          'case',
          ['in', ['get', 'plz_code'], ['literal', Array.from(selectedPostalCodes)]],
          '#ff0000',
          '#888888'
        ],
        'fill-opacity': 0.4
      }
    });

    map.addLayer({
      id: 'PLZ-labels',
      type: 'symbol',
      source: 'PLZ-germany',
      layout: {
        'text-field': ['get', 'plz_code'],
        'text-size': 12
      }
    });

    console.log('Layers added successfully.');

    map.on('click', 'PLZ-fill', (e) => {
      const postalCode = e.features[0].properties.plz_code;
      console.log(`Postal code ${postalCode} clicked.`);

      if (selectedPostalCodes.has(postalCode)) {
        selectedPostalCodes.delete(postalCode);
      } else {
        selectedPostalCodes.add(postalCode);
      }

      map.setPaintProperty('PLZ-fill', 'fill-color', [
        'case',
        ['in', ['get', 'plz_code'], ['literal', Array.from(selectedPostalCodes)]],
        '#ff0000',
        '#888888'
      ]);

      // Call the DHL API if at least one postal code is selected
      if (selectedPostalCodes.size > 0) {
        fetchDHLTargetingData(Array.from(selectedPostalCodes));
      }
    });

    map.on('mouseenter', 'postal-code-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'postal-code-fill', () => {
      map.getCanvas().style.cursor = '';
    });

  } catch (error) {
    console.error('Error adding postal code layers:', error);
  }
}

// Function to call the DHL Print-Mailing Targeting API
async function fetchDHLTargetingData(selectedPostalCodes) {
  const apiKey = 'YOUR_API_KEY'; // Replace with  DHL API Key
  const url = 'https://api.dhl.com/print-mailing/targeting'; // Base URL of the API

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DHL-API-Key': apiKey
      },
      body: JSON.stringify({
        postalCodes: selectedPostalCodes, // Send the selected postal codes
        countryCode: 'DE' // Country code (Germany)
      })
    });

    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('DHL Targeting Data:', data);

    // Display the results in the console or on the map
    alert(`DHL Targeting Data received: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error('Error fetching targeting data:', error);
  }
}

// Initialize the map
init();

document.body.style.userSelect = 'none'; /* Valid value */