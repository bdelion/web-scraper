const MS_PER_DAY = 24 * 60 * 60 * 1000;
const serial = 44204;
const excelEpoch = new Date(Date.UTC(1900, 0, 1));
const adjustedEpoch = new Date(
  excelEpoch.getTime() + (serial - 2) * MS_PER_DAY
);
console.log(adjustedEpoch.toISOString());

// Ajustement pour le bug de l'année bissextile de 1900
const adjustedSerial = serial - 2; // Excel considère 1900 comme bissextile, donc on ajuste pour les dates >= 60
const adjustedEpoch2 = new Date(excelEpoch.getTime() + adjustedSerial * MS_PER_DAY);

console.log(adjustedEpoch2.toISOString()); // Affiche la date corrigée

// Calculer la date en fonction de la valeur de date Excel
function excelToJsDate(serial) {
  // L'ajustement pour l'erreur de bissextilité de l'année 1900 dans Excel
  const daysOffset = serial - 2; // Ajustement pour le bug de l'année bissextile de 1900
  return new Date(excelEpoch.getTime() + daysOffset * MS_PER_DAY);
}

const adjustedEpoch3 = excelToJsDate(serial);
console.log(adjustedEpoch3.toISOString()); // Affiche la date corrigée

console.log("Local Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log("Locale:", Intl.DateTimeFormat().resolvedOptions().locale);

// Fonction pour convertir une date Excel en date JS
function excelToJsDate2(excelDate) {
  // Correction du bug Excel : les dates >= 60 ont un décalage de 2 jours
  const correctedDate = new Date(excelEpoch.getTime() + (excelDate - 2) * MS_PER_DAY);
  return correctedDate;
}

// Tester avec la valeur Excel 44204
const excelDate = 44204;
const adjustedDate = excelToJsDate2(excelDate);

console.log(adjustedDate.toISOString()); // Affiche la date corrigée
