import fetch from 'node-fetch';
import { getValidApiKey } from './auth.js';

export async function getPostaktuellPreis(
  numberItemsTariffZoneA,
  numberItemsTariffZoneB,
  itemWeightInGram,
  paProductVariant,
  deliveryDistrictSelection,
  inductionDate
) {
  const token = await getValidApiKey();
  const url = 'https://api-uat-vzen.dhl.com/post/advertising/print-mailing/dispatchpreparation/v1/postaktuell/simplecostcalculation';

  const body = {
    numberItemsTariffZoneA,
    numberItemsTariffZoneB,
    itemWeightInGram,
    paProductVariant,
    deliveryDistrictSelection,
    inductionDate
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
    const result = await getPostaktuellPreis(
      10000,
      0,
      21,
      3,
      false,
      "2026-07-04T09:23:55.205Z"
    );
    console.log('Kosten gesamt:', result.costs, 'EUR-Cent');
    console.log('Porto gesamt:', result.postageTotal, 'EUR-Cent');
    console.log('Alle Daten:', result.raw);
  } catch (err) {
    console.error(err.message);
  }
})();
