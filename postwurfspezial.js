import fetch from 'node-fetch';

// --- Constantes de autenticación ---
const USERNAME = 'dis_UATTimoKolbe';
const PASSWORD = 'J!RsGy7IY2-wu_G!';
const LOCALE = 'de';

let apiKey = null;
let apiKeyExpiresAt = 0;

// 1. Login-Funktion (nur für Token)
async function fetchApiKey() {
  const response = await fetch('https://api-uat-vzen.dhl.com/post/advertising/print-mailing/user/v1/authentication/businesslogin', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json'},
    body: JSON.stringify({ username: USERNAME, password: PASSWORD, locale: LOCALE })
  });
  if (!response.ok) throw new Error('Login fehlgeschlagen');
  const data = await response.json();  
  apiKey = data.jwtToken; 
  apiKeyExpiresAt = Date.now() + (14 * 60 * 1000); // 14 min gültig
}

// 2. Funktion, die immer einen gültigen Token liefert
async function getValidApiKey() {
  if (!apiKey || Date.now() > apiKeyExpiresAt) {
    await fetchApiKey();
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
  frankingType
) {
  const token = await getValidApiKey();
  const url = 'https://api-uat-vzen.dhl.com/post/advertising/print-mailing/dispatchpreparation/v1/postwurfspezial/simplecostcalculation';

  // Usa los parámetros recibidos
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

  console.log('Body sent:', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',      
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fehler: ${response.status} - ${errorText}`);
  }
  const data = await response.json();

  return {
    costs: data.costs,
    postageTotal: data.postwurfspezial?.postageTotal,
    raw: data
  };
}

// Beispiel-Aufruf:
(async () => {
  try {
    const result = await getPostwurfspezialPreis(
      4000,         // quantity
      2200,         // lengthInDeciMm
      1100,         // widthInDeciMm
      20,            // heightInDeciMm
      98,           // weightInGram
      "2025-12-03T12:26:24.782Z", // inductionDate (prueba con una fecha más cercana)
      false,        // mailingItemTypePostcard
      false,        // notEnabledForAutomation
      1             // frankingType
    );
    console.log('Kosten gesamt:', result.costs, 'EUR-Cent');
    console.log('Porto gesamt:', result.postageTotal, 'EUR-Cent');
    console.log('Alle Daten:', result.raw);
  } catch (err) {
    console.error(err.message);
  }
})();

