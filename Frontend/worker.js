importScripts('https://cdn.jsdelivr.net/npm/@turf/turf/turf.min.js');

self.onmessage = (e) => {
  const { type } = e.data;

  if (type === 'bbox') {
    const { features } = e.data;
    const items = features.map(f => {
      const bbox = turf.bbox(f);
      return { minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], feature: f };
    });
    self.postMessage(items);
  }

  if (type === 'selectPlzInsideGeometry') {
    const { geometryFeature, plzFeatures } = e.data;
    const selectedPlz = [];
    plzFeatures.forEach(item => {
      const intersection = turf.intersect(item, geometryFeature);
      if (intersection) selectedPlz.push(item.properties.plz);
    });
    self.postMessage(selectedPlz);
  }

  if (type === 'selectPlzInsideCircles') {
    const { circles, plzFeatures } = e.data;
    const selectedPlz = [];
    plzFeatures.forEach(plzFeature => {
      circles.forEach(circle => {
        if (turf.booleanContains(circle, plzFeature) || turf.intersect(circle, plzFeature)) {
          selectedPlz.push(plzFeature.properties.plz);
        }
      });
    });
    self.postMessage(selectedPlz);
  }

  if (type === 'circles') {
    const { center, radii } = e.data;
    const features = radii.map(r => {
      const circle = turf.circle(center, r, { steps: 64, units: 'kilometers' });
      circle.properties = { radius: r };
      return circle;
    });
    self.postMessage({ type: 'FeatureCollection', features: features });
  }
};
