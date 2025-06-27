const fetch = require('node-fetch');

/**
 * Holt den Versandpreis von der Deutsche Post Postwurfspezial API.
 * @param {string} plz - Die Postleitzahl.
 * @param {number} menge - Die Sendungsmenge.
 * @param {string} produkt - Das Produkt (z.B. 'POSTWURFSPEZIAL').
 * @param {string} apiKey - Dein API-Key von Deutsche Post.
 * @returns {Promise<number>} - Der Preis in Euro.
 */
async function getPostwurfspezialPreis(plz, menge, produkt, apiKey) {
  const url = 'https://api.deutschepost.de/postwurfspezial/v1/prices'; // Beispiel-Endpoint, bitte anpassen!
  const body = {
    plz: plz,
    menge: menge,
    produkt: produkt
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Fehler: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.preis; // Passe dies an das echte API-Response-Format an
}

// Beispiel-Aufruf:
(async () => {
  try {
    const preis = await getPostwurfspezialPreis('10115', 1000, 'POSTWURFSPEZIAL', 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjb20uZHBkaGwuZGlhbG9nbWFya2V0aW5nIiwic3ViIjoiZGlzX1VBVFRpbW9Lb2xiZSIsImlhdCI6MTc1MDIzNjkxOSwiZXhwIjoxNzUwMjM4NzI5LCJhdXRob3JpdGllcyI6WyJST0xFX0RJU19BQ0NFU1MiLCJST0xFX0RJU19NQU5BR0VfRElBTE9HUE9TVCIsIlJPTEVfRElTX01BTkFHRV9QT1NUV1VSRlNQRVpJQUwiLCJST0xFX0RJU19NQU5BR0VfUE9TVEFLVFVFTEwiXSwiY3VzdG9tZXJJZHMiOlsiNjUyMyJdLCJsb2NhbGUiOiJkZSIsImZ1bGxOYW1lIjoiVGltbyBLb2xiZSIsInVzZXJJZCI6NTM0N30.AhPzQwUVUGTXemlTZOtRTZMozEjsqhWqZnGsQPgeU6unTiNP5ZWzQCXC3z1wJqMTHE0I-mwyt-4PbIyenLJrYA');
    console.log('Preis:', preis, 'EUR');
  } catch (err) {
    console.error(err.message);
  }
})();