
importScripts('https://cdn.jsdelivr.net/npm/@turf/turf/turf.min.js');

self.onmessage = (e) => {
  const { features } = e.data;
  const items = features.map(f => {
    const bbox = turf.bbox(f);
    return {
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3],
      feature: f
    };
  });
  self.postMessage(items);
};

