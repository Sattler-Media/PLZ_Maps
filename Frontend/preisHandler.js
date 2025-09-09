export async function calculatePreis(einwohnerSum) {
  const versandTyp = document.getElementById('versandTyp')?.value;
  const gewicht = parseInt(document.getElementById('gewicht')?.value ?? '0');
  const datum = document.getElementById('einlieferung')?.value;
  if (!datum) {
    console.warn('Einlieferungsdatum fehlt!');
    return;
  }
  const inductionDateISO = new Date(datum).toISOString();

  try {
    let result;

    if (versandTyp === 'postaktuell') {
      const produktVariante = parseInt(document.getElementById('produktVariante')?.value ?? '0');
      const bezirksAuswahl = document.getElementById('bezirksAuswahl')?.value === 'true';

      const body = {
        numberItemsTariffZoneA: einwohnerSum,
        numberItemsTariffZoneB: 0,
        itemWeightInGram: gewicht,
        paProductVariant: produktVariante,
        deliveryDistrictSelection: bezirksAuswahl,
        inductionDate: inductionDateISO
      };
      console.log("Fetch body (postaktuell):", JSON.stringify(body));

      const response = await fetch('http://localhost:3000/preis/postaktuell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      result = await response.json();
    } else if (versandTyp === 'postwurfsp') {
      const laenge = Math.max(1000, parseInt(document.getElementById('laenge')?.value ?? '0'));
      const breite = Math.max(700, parseInt(document.getElementById('breite')?.value ?? '0'));
      const hoehe = Math.max(1, parseInt(document.getElementById('hoehe')?.value ?? '0'));
      const postkarte = document.getElementById('postkarte')?.value === 'true';
      const automation = document.getElementById('automation')?.value === 'true';
      const frankierung = parseInt(document.getElementById('frankierung')?.value ?? '0');

      const body = {
        quantity: einwohnerSum,
        lengthInDeciMm: laenge,
        widthInDeciMm: breite,
        heightInDeciMm: hoehe,
        weightInGram: gewicht,
        inductionDate: inductionDateISO,
        mailingItemTypePostcard: postkarte,
        notEnabledForAutomation: automation,
        frankingType: frankierung
      };
      console.log("Fetch body (postwurfsp):", JSON.stringify(body));

      const response = await fetch('http://localhost:3000/preis/postwurfsp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      result = await response.json();
    }

    const preisInput = document.getElementById('Preis');
    if (preisInput && result?.costs !== undefined) {
      preisInput.value = `${result.costs} EUR-Cent`;
    }
  } catch (err) {
    console.error('Fehler bei Preisberechnung:', err.message);
  }
}

// Beobachter für Einwohner-Feld
function autoCalculatePreisFromEinwohner() {
  const einwohnerInput = document.getElementById('Einwohner');
  if (!einwohnerInput) return;

  let lastValue = 0;
  setInterval(() => {
    const currentValue = parseInt(einwohnerInput.value ?? '0');
    console.log("Einwohner aktuell:", currentValue);
    if (currentValue !== lastValue && currentValue > 0) {
      lastValue = currentValue;
      calculatePreis(currentValue);
    }
  }, 1000); // prüft jede Sekunde
}

window.addEventListener('DOMContentLoaded', autoCalculatePreisFromEinwohner);
