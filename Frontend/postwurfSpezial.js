export function initPostwurfSpezial() {
  const versandtypSelect = document.querySelector('select[name="versandTyp"]');

  // Prüfen, ob Option schon existiert
  let postwurfspezialOption = document.getElementById('postwurfspezial-option');
  if (!postwurfspezialOption) {
    postwurfspezialOption = document.createElement('option');
    postwurfspezialOption.value = 'postwurfsp';
    postwurfspezialOption.textContent = 'Postwurf Spezial';
    postwurfspezialOption.id = 'postwurfspezial-option';
    versandtypSelect.appendChild(postwurfspezialOption);
  }

  // Option aktivieren
  versandtypSelect.value = 'postwurfsp';

  // Event für Schließen hinzufügen
  const offcanvasElement = document.getElementById('postwurfSpezialCanvas');
  offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
    versandtypSelect.value = 'postaktuell';
  });
}