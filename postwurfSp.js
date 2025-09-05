
import fetch from 'node-fetch';
import { getValidApiKey } from './auth.js';

export async function getPostwurfspezialPreis(
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

(async () => {
  try {
    const result = await getPostwurfspezialPreis(
      4000,
      2200,
      1100,
      20,
      25,
      "2025-12-03T12:26:24.782Z",
      false,
      false,
      1
    );
    console.log('Kosten gesamt:', result.costs, 'EUR-Cent');
    console.log('Porto gesamt:', result.postageTotal, 'EUR-Cent');
    console.log('Alle Daten:', result.raw);
  } catch (err) {
    console.error(err.message);
  }
})();
