import "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";

const mittel_DE = [52.51156577109141, 13.4090638258883];
const geojsonUrl = "https://opendata.rhein-kreis-neuss.de/api/v2/catalog/datasets/nrw-postleitzahlen/exports/geojson";
async function getLocation() {
  try {
    const response = await fetch("http://ip-api.com/json/");
    const json = await response.json();
    if (typeof json.lat === "number" && typeof json.lon === "number") {
      return [json.lon, json.lat];
    }
  } catch (error) {}
  return mittel_DE;
}

async function init() {
  const map = new maplibregl.Map({
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: mittel_DE,
    zoom: 2,
    container: "map",
  });

  const location = await getLocation();
  if (location !== mittel_DE) {
    map.flyTo({ center: location, zoom: 10 });

    new maplibregl.Popup({
      closeOnClick: true,
    })
      .setLngLat(location)
      .setHTML("<h3>Du bist hier in der Nähe!</h3>")
      .addTo(map);
  }
  // GeoJson anruf
  map.on('load', () => {
    map.addSource('plz-germany', {
      type: 'geojson',
      data: geojsonUrl,
    });
 
    map.addLayer({
      id: 'plz-germany-borders',
      type: 'line',
      source: 'plz-germany',
      paint: {
        'line-color': 'red', 
        'line-width': 1,
        'line-opacity': 0.8
      }
    });
  
   
  });
}

init();
