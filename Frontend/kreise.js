(function (global) {
  'use strict';

  const DEFAULTS = {
    followMouseEnabled: true,            // der Kreis folgt dem Mauszeiger
    followOnDragOnly: false,             // wenn true, folgt nur während des Ziehens (Maus gedrückt)
    deferPlzSelectionWhileMoving: true,  // wenn true, wählt PLZ erst beim Loslassen aus (bessere Leistung)
    mouseThrottleMs: 50,                 // Throttling der Anfragen an den Worker (ms)
    layerId: 'selection-circles-layer',
    sourceId: 'selection-circles',
    sliderId: 'circle-slider',
    sliderValueId: 'circle-value',
    noneButtonId: 'circle-none'          // optional: Schaltfläche zum Löschen der Kreise
  };

  function init(options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const {
      map,
      circleWorker,
      geojsonData,
      selectedPostalCodes,
      refreshSelectedFills,
      updateSelectedPlzLayer,
      updateEinwohnerSumTotal,
      updateSelectedTagsUI
    } = cfg;

    if (!map) {
      console.error('[CirclesController] Karte ist erforderlich.');
      return;
    }
    if (!circleWorker) {
      console.error('[CirclesController] circleWorker ist erforderlich.');
      return;
    }

    // Intern state
    let circleSelectionEnabled = true;
    let followMouseEnabled = !!cfg.followMouseEnabled;
    let followOnDragOnly = !!cfg.followOnDragOnly;
    let deferPlzSelectionWhileMoving = !!cfg.deferPlzSelectionWhileMoving;
    let isPointerDown = false;
    let lastSendTs = 0;
    let lastCirclesFC = null;
    let geojsonRef = geojsonData || null;    
    let lastClickTs = 0

    // UI Referenzen
    const slider = document.getElementById(cfg.sliderId);
    const circleValue = document.getElementById(cfg.sliderValueId);
    const btnNone = document.getElementById(cfg.noneButtonId);

    if (!slider || !circleValue) {
      console.warn('[CirclesController] slider oder label nicht gefunden. Überprüfe IDs:', cfg.sliderId, cfg.sliderValueId);
    }

    // Cursor (visuell)
    try { map.getCanvas().style.cursor = 'pointer'; } catch (e) {}

    // Source & Layer
    addCircleLayer(map, cfg);

    // Slider
    if (slider && circleValue) {
      const radiusInit = parseInt(slider.value || '5', 10);
      circleValue.textContent = `${radiusInit} km`;

      slider.addEventListener('input', () => {
        const radius = parseInt(slider.value, 10);
        circleValue.textContent = `${radius} km`;
        circleSelectionEnabled = true;

        // wenn der Kreis nicht dem Mauszeiger folgt, neu berechnen
        if (!followMouseEnabled) {
          requestCircles(map, circleWorker, [radius]);
        }
      });
    }

    // "Keine" Knopf (event)
    if (btnNone) {
      btnNone.addEventListener('click', () => {
        circleSelectionEnabled = false;
        safeSetData(map, cfg.sourceId, { type: 'FeatureCollection', features: [] });

        // Si quieres limpiar también selección PLZ:
        // selectedPostalCodes?.clear?.();
        // refreshSelectedFills?.();
        // updateSelectedPlzLayer?.();
        // updateEinwohnerSumTotal?.();
        // updateSelectedTagsUI?.();
      });
    }

    // Worker onmessage
    circleWorker.onmessage = (e) => {
      console.log('[CirclesController] onmessage <-', e.data);
      if (e.data?.type === 'FeatureCollection') {
        const circles = e.data;
        lastCirclesFC = circles;
        safeSetData(map, cfg.sourceId, circles);      

        // defer Bewegung wenn bewegt wird
        if (deferPlzSelectionWhileMoving && isPointerDown) return;
        
        console.log('[CirclesController] envío selectPlzInsideCircles →', {
              circles: circles.features.length,
              plzFeatures: geojsonRef?.features?.length
            });
        
      } else {
        // e.data ist eine Liste der ausgewählten PLZ
         const selectedPlz = e.data;
         
        if (Array.isArray(selectedPlz)) {
          const plz5 = [...new Set(selectedPlz.filter(p => /^\d{5}$/.test(p)))];          
          const radius = lastCirclesFC?.features?.[0]?.properties?.radius ?? '?';
          const circleTag = `Kreis ${radius}km – ${plz5.length} PLZ`; 

          customSelectedTags.add(circleTag);          
          tagPlzMap.set(circleTag, plz5); 

          plz5.forEach(plz => selectedPostalCodes.add(plz));
   
          refreshSelectedFills?.();
          updateSelectedPlzLayer?.();
          updateEinwohnerSumTotal?.();
          updateSelectedTagsUI?.();

          console.log('[CircleTag] creado:', circleTag, 'PLZ:', plz5.length);
        }
      }
    };

    // Mausbewegung (folgt dem Zeiger)
    map.on('mousemove', (e) => {
      if (!followMouseEnabled || !circleSelectionEnabled) return;
      if (followOnDragOnly && !isPointerDown) return;

      const now = performance.now();
      if (now - lastSendTs < cfg.mouseThrottleMs) return;
      lastSendTs = now;

      const center = [e.lngLat.lng, e.lngLat.lat];
      const radius = parseInt(slider?.value || '5', 10);
      requestCirclesAt(circleWorker, center, [radius]);
    });

    // Drag / Pointer
    map.on('mousedown', () => { isPointerDown = true; });

    // Touch events
    map.on('touchstart', () => { isPointerDown = true; });
    map.on('touchend',   () => {
      isPointerDown = false;
      if (deferPlzSelectionWhileMoving && lastCirclesFC && geojsonData) {
        const features = lastCirclesFC.features || [];
        if (features.length) {
          circleWorker.postMessage({
            type: 'selectPlzInsideCircles',
            circles: features,
            plzFeatures: geojsonData.features
          });
        }
      }
    });

    map.on('touchmove', (e) => {
      if (!followMouseEnabled || !circleSelectionEnabled) return;
      if (followOnDragOnly && !isPointerDown) return;

      const now = performance.now();
      if (now - lastSendTs < cfg.mouseThrottleMs) return;
      lastSendTs = now;

      const touchPoint = e.points?.[0];
      let lngLat;

      if (touchPoint) {
        lngLat = map.unproject([touchPoint.x, touchPoint.y]);
      } else if (e.originalEvent?.touches?.[0]) {
        const t = e.originalEvent.touches[0];
        const rect = map.getCanvas().getBoundingClientRect();
        lngLat = map.unproject([t.clientX - rect.left, t.clientY - rect.top]);
      } else {
        return;
      }

      const center = [lngLat.lng, lngLat.lat];
      const radius = parseInt(slider?.value || '5', 10);
      requestCirclesAt(circleWorker, center, [radius]);
    });

    // Neu berechnen beim Bewegen der Karte (wenn der Kreis nicht dem Mauszeiger folgt)
    map.on('moveend', () => {
      if (!circleSelectionEnabled) return;
      if (followMouseEnabled) return; // wenn der Kreis dem Mauszeiger folgt, nicht das Kartenzentrum verwenden
      const radius = parseInt(slider?.value || '5', 10);
      requestCircles(map, circleWorker, [radius]);
    });
    
    map.on('click', () => {      
      const now = performance.now();
        if (now - lastClickTs < 150) return; // anti‑doble click
        lastClickTs = now;

        if (!lastCirclesFC || !geojsonRef) return;
        const features = lastCirclesFC.features || [];
        if (!features.length) return;

        circleWorker.postMessage({
          type: 'selectPlzInsideCircles',
          circles: features,
          plzFeatures: geojsonRef.features
        });
    });


    // Veröffentliche Steuerungs-API
    return {
      setGeojsonData(data) { geojsonRef = data; },
      enableFollowMouse() { followMouseEnabled = true; },
      disableFollowMouse() { followMouseEnabled = false; },
      enableFollowOnDragOnly() { followOnDragOnly = true; },
      disableFollowOnDragOnly() { followOnDragOnly = false; },
      enableDeferredSelection() { deferPlzSelectionWhileMoving = true; },
      disableDeferredSelection() { deferPlzSelectionWhileMoving = false; }
    };
  }

  // Helpers
  function addCircleLayer(map, cfg) {
    if (!map.getSource(cfg.sourceId)) {
      map.addSource(cfg.sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }
    if (!map.getLayer(cfg.layerId)) {
      map.addLayer({
        id: cfg.layerId,
        type: 'fill',
        source: cfg.sourceId,
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['get', 'radius'],
            1,  '#2ECC40',
            25, '#FF851B',
            50, '#FF4136'
          ],
          'fill-opacity': 0.3
        }
      });
    }
  }

  function requestCircles(map, circleWorker, radii) {
    const center = map.getCenter().toArray(); // [lng, lat]
    circleWorker.postMessage({ type: 'circles', center, radii });
  }

  function requestCirclesAt(circleWorker, centerLngLatArray, radii) {
    circleWorker.postMessage({ type: 'circles', center: centerLngLatArray, radii });
  }

  function safeSetData(map, sourceId, data) {
    try {
      const src = map.getSource(sourceId);
      if (src) src.setData(data);
    } catch (e) {
      console.warn('[CirclesController] setData failed:', e);
    }
  }

  // Veröffentliche Steuerungs-API
  global.CirclesController = { init };
})(window);
