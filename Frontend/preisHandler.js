export async function calculatePreis(einwohnerSum) {
    const versandTyp = document.getElementById('versandTyp')?.value;
    const gewicht = parseInt(document.getElementById('gewicht')?.value ?? '0');
    const datum = document.getElementById('einlieferung')?.value;
    const preisInput = document.getElementById('Preis');
    const fehlerDiv = document.getElementById('preisFehler');

    if (!datum || isNaN(new Date(datum).getTime())) {
        console.error('Ungültiges Einlieferungsdatum – Preis gelöscht');
        if (preisInput) preisInput.value = '';
        if (fehlerDiv) fehlerDiv.textContent = 'Ungültiges Einlieferungsdatum. Bitte korrigieren.';
        return;
    } else {
        if (fehlerDiv) fehlerDiv.textContent = '';
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
            console.log("API Response:", result);  

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
             console.log("API Response:", result);
        }

        // Backend-Fehler anzeigen, falls vorhanden
        if (result?.error || result?.message) {
            if (fehlerDiv) fehlerDiv.innerHTML = `Es ist ein Fehler aufgetreten:<br>Bitte überprüfen Sie Ihre Eingaben <br>oder versuchen Sie es später erneut.`;
            if (preisInput) preisInput.value = '';
            return;
        }

        // Preis anzeigen
        if (preisInput && result?.costs !== undefined) {
            const rawPrice = parseInt(result.costs);
            const euros = Math.floor(rawPrice / 100);
            const cents = rawPrice % 100;
            const formattedPrice = `${euros.toLocaleString('de-DE')},${cents.toString().padStart(2, '0')} EUR-Cent`;
            preisInput.value = formattedPrice;
        }

    } catch (err) {
        console.error('Fehler bei Preisberechnung:', err.message);
        if (fehlerDiv) fehlerDiv.textContent = 'Fehler bei der Preisberechnung: ' + err.message;
        if (preisInput) preisInput.value = '';
    }
}

// Beobachter für Einwohner-Feld
function autoCalculatePreisFromEinwohner() {
    const einwohnerInput = document.getElementById('Einwohner');
    const preisInput = document.getElementById('Preis');
    if (!einwohnerInput || !preisInput) return;

    let lastValue = -1;
    setInterval(() => {
        const currentValue = parseInt(einwohnerInput.value ?? '0');
        console.log("Einwohner aktuell:", currentValue);
        if (currentValue !== lastValue) {
            lastValue = currentValue;
            if (currentValue > 0) {
                calculatePreis(currentValue);
            } else {
                preisInput.value = '0 EUR-Cent';
            }
        }
    }, 1000); // prüft jede Sekunde
}

window.addEventListener('DOMContentLoaded', autoCalculatePreisFromEinwohner);
