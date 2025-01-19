const parseExcelDate = (excelDate) => {
  // 1. Calculer la partie entière (jours) et la partie fractionnelle (heure)
  const days = Math.floor(excelDate);  // Partie entière, nombre de jours
  const fractionOfDay = excelDate - days;  // Partie décimale, fraction du jour

  // 2. Créer une date de référence Excel (1er janvier 1900)
  const excelEpoch = new Date(1900, 0, 1);

  // 3. Ajouter le nombre de jours à la date de référence
  excelEpoch.setDate(excelEpoch.getDate() + days - 2); // -1 pour ajuster le décalage Excel

  // 4. Convertir la fraction de jour en heures, minutes, secondes
  const totalSeconds = Math.round(fractionOfDay * 24 * 60 * 60);  // Fractions de jour en secondes
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // 5. Ajouter les heures, minutes et secondes à la date
  excelEpoch.setHours(hours);
  excelEpoch.setMinutes(minutes);
  excelEpoch.setSeconds(seconds);

  return excelEpoch;
};

// Exemple
const excelDateNumber = 44314.81180555555;  // Représente 28/04/2021 19:29
const parsedDate = parseExcelDate(excelDateNumber);

console.log("Date convertie :", parsedDate.toLocaleString());  // Affiche la date locale sans décalage
