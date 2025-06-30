const fetch = require('node-fetch');

let apiKey = null;
let apiKeyExpiresAt = 0;


async function fetchApiKey(username, password, locale = 'de') {
  const response = await fetch('https://api-uat-vzen.dhl.com/post/advertising/print-mailing/user/v1/authentication/businesslogin', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, locale })
  });
  if (!response.ok) throw new Error('Login fehlgeschlagen');
  const data = await response.json();
  apiKey = data.token; 
  apiKeyExpiresAt = Date.now() + (14 * 60 * 1000); // 14 min gültig
}

// 2. Funktion, die immer einen gültigen Token liefert
async function getValidApiKey(username, password, locale) {
  if (!apiKey || Date.now() > apiKeyExpiresAt) {
    await fetchApiKey(username, password, locale);
  }
  return apiKey;
}

// 3. Deine Preisabfrage nutzt getValidApiKey
async function getPostwurfspezialPreis(plz, menge, produkt, username, password, locale = 'de') {
  const token = await getValidApiKey(username, password, locale);
  const url = 'https://api-uat-vzen.dhl.com/post/advertising/print-mailing/dispatchpreparation/v1/postwurfspezial/simplecostcalculation'; // Passe ggf. an
  const body = { plz, menge, produkt };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Fehler: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.preis;
}

// Beispiel-Aufruf:
(async () => {
  try {
    const preis = await getPostwurfspezialPreis('10115', 1000, 'POSTWURFSPEZIAL', 'dis_UATTimoKolbe', 'J!RsGy7IY2-wu_G!');
    console.log('Preis:', preis, 'EUR');
  } catch (err) {
    console.error(err.message);
  }
})();