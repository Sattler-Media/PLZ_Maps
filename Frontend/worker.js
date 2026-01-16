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

  // Cache simple de bbox por feature (se guarda en la propia feature)
  // para no recalcular bbox en cada click.
  for (const f of plzFeatures) {
    if (!f.__bbox) {
      try { f.__bbox = turf.bbox(f); } catch (e) { f.__bbox = null; }
    }
  }

  const selectedPlz = new Set();

  circles.forEach((circle) => {
    if (!circle?.geometry) return;

    let circleBbox;
    try {
      circleBbox = turf.bbox(circle);
    } catch (e) {
      circleBbox = null;
    }

    for (const plzFeature of plzFeatures) {
      if (!plzFeature?.geometry || !plzFeature.__bbox) continue;

      // 1) Prefiltro rápido por BBOX (skip 90%+)
      const b = plzFeature.__bbox; // [minX,minY,maxX,maxY]
      if (
        !circleBbox ||
        b[0] > circleBbox[2] || b[2] < circleBbox[0] || // no overlap en X
        b[1] > circleBbox[3] || b[3] < circleBbox[1]    // no overlap en Y
      ) {
        continue;
      }

      // 2) Una sola prueba geométrica: "tocan o se superponen"
      try {
        if (turf.booleanIntersects(circle, plzFeature)) {
          selectedPlz.add(plzFeature.properties.plz);
        }
      } catch (err) {
        // Evita que errores con MultiPolygon o geometrías inválidas rompan la selección
        // console.warn('[worker] booleanIntersects error:', err.message);
        continue;
      }
    }
  });

  self.postMessage([...selectedPlz]);
}

  if (type === 'circles') {
    const { center, radii } = e.data;
    const features = radii.map(r => {
      const circle = turf.circle(center, r, { steps: 32, units: 'kilometers' });
      circle.properties = { radius: r };
      return circle;
    });
    self.postMessage({ type: 'FeatureCollection', features: features });
  }
};
