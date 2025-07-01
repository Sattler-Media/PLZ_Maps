import fetch from 'node-fetch';

let apiKey = null;
let apiKeyExpiresAt = 0;

// 1. Login-Funktion (nur für Token)
async function fetchApiKey(username, password, locale = 'de') {
  const response = await fetch('https://api-uat-vzen.dhl.com/post/advertising/print-mailing/user/v1/authentication/businesslogin', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json'},
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

// 3. Preisabfrage mit allen Parametern für den Body
async function getPostwurfspezialPreis(
  quantity,
  lengthInDeciMm,
  widthInDeciMm,
  heightInDeciMm,
  weightInGram,
  inductionDate,
  mailingItemTypePostcard,
  notEnabledForAutomation,
  frankingType,
  username,
  password,
  locale = 'de'
) {
  const token = await getValidApiKey(username, password, locale);
  const url = 'https://api-uat-vzen.dhl.com/post/advertising/print-mailing/dispatchpreparation/v1/postwurfspezial/simplecostcalculation';

  const body = {
    quantity,
    lengthInDeciMm,
    widthInDeciMm,
    heightInDeciMm,
    weightInGram,
    inductionDate,
    mailingItemTypePostcard,
    notEnabledForAutomation,
    frankingType
  };

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

  // Devuelve el costo total y el franqueo total
  return {
    costs: data.costs,
    postageTotal: data.postwurfspezial?.postageTotal,
    raw: data // Por si necesitas otros datos
  };
}

// Beispiel-Aufruf:
(async () => {
  try {
    const result = await getPostwurfspezialPreis(
      32331,         // quantity
      2200,          // lengthInDeciMm
      1100,          // widthInDeciMm
      20,            // heightInDeciMm
      20,            // weightInGram
      "2025-12-03T12:26:24.782Z", // inductionDate
      false,         // mailingItemTypePostcard
      false,         // notEnabledForAutomation
      1,             // frankingType
      'dis_UATTimoKolbe', // username
      'J!RsGy7IY2-wu_G!'  // password
    );
    console.log('Kosten gesamt:', result.costs, 'EUR-Cent');
    console.log('Porto gesamt:', result.postageTotal, 'EUR-Cent');
    console.log('Alle Daten:', result.raw);
  } catch (err) {
    console.error(err.message);
  }
})();

