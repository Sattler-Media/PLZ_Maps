import "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";

const selectedPostalCodes = new Set();

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
    console.warn('Could not get user location, using default center.');
  }
  return defaultCenter;
}

async function init() {
  const center = await getUserCenter();
  const map = new maplibregl.Map({
    container: 'map',
    center: center,
    style: 'https://api.maptiler.com/maps/streets/style.json?key=4BNJO72dCI17waAmwZ2E',
    zoom: 10
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
    const response = await fetch('./plz-5stellig.geojson');
    if (!response.ok) {
      throw new Error(`Error loading GeoJSON: ${response.status} ${response.statusText}`);
    }
    const geojsonData = await response.json();

    console.log('GeoJSON Data:', geojsonData);

    if (!geojsonData.features || geojsonData.features.length === 0) {
      throw new Error('The GeoJSON contains no features.');
    }
    const hasPostalCode = geojsonData.features.some(feature => feature.properties && feature.properties.plz);
    if (!hasPostalCode) {
      throw new Error('The features of the GeoJSON do not contain the property "plz".');
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
      minzoom: 8 
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

    console.log('Layers added successfully.');

    map.on('click', 'PLZ-fill', (e) => {
      const postalCode = e.features[0].properties.plz;
      console.log(`Postal code ${postalCode} clicked.`);

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

      // Call the DHL API if at least one postal code is selected
      if (selectedPostalCodes.size > 0) {
        fetchDHLTargetingData(Array.from(selectedPostalCodes));
      }
    });

    map.on('mouseenter', 'PLZ-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'PLZ-fill', () => {
      map.getCanvas().style.cursor = '';
    });

  } catch (error) {
    console.error('Error adding postal code layers:', error);
  }
}

// Function to call the DHL Print-Mailing Targeting API
async function fetchDHLTargetingData(selectedPostalCodes) {
  const apiKey = 'API_KEY'; // Replace with  DHL API Key
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