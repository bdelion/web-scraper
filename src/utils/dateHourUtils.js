const { dayjs, DATEHOUR_FORMAT } = require("../config/dayjsConfig");

// Fonction pour convertir une date Excel (nombre) en date Dayjs en appliquant le fuseau horaire
function excelDateToDayjs(serial, timezoneString = 'Europe/Paris') {
  const MS_PER_DAY = 24 * 60 * 60 * 1000; // Millisecondes par jour
  const excelEpoch = Date.UTC(1900, 0, 1); // 1er janvier 1900 UTC

  // Ajustement pour le bug de l'année 1900
  const daysOffset = serial >= 60 ? serial - 2 : serial - 1;
  // Conversion en millisecondes avec arrondi pour éviter les imprécisions
  const exactMilliseconds = Math.round(daysOffset * MS_PER_DAY);
  // Conversion en date UTC
  const utcDate = new Date(excelEpoch + exactMilliseconds);
  // Création d'un objet dayjs en UTC
  const dateInUTC = dayjs.utc(utcDate);
  // Appliquer le fuseau horaire à cette date UTC
  const finalDate = dateInUTC.tz(timezoneString, true); // `true` pour éviter l'ajout d'un offset supplémentaire

  return finalDate;
}

// Fonction pour convertir une date Excel (nombre) en chaine de caractère
function JSDateToString(excelDate) {
  let parsedDate

  // Si la valeur est un nombre (timestamp Excel), convertis-la en date
  if (typeof excelDate === "number") {
    try {
      // Conversion du nombre Excel en date Dayjs
      parsedDate= excelDateToDayjs(excelDate, 'Europe/Paris');
      // Vérification de la validité de la date
      if (parsedDate.isValid()) {
        return parsedDate.format(DATEHOUR_FORMAT);
      } else {
        throw new Error(`Date invalide, skipped: ${excelDate} -> ${parsedDate}`);
      }
    } catch (error) {
      throw new Error(`Impossible de parser la date, skipped: ${excelDate} -> ${parsedDate} / ${error.message}`);
    }
  } else {
    throw new Error(`La valeur de la colonne "Date" n'est pas un nombre, skipped: ${excelDate}`);
  }
}

// Fonction pour extraire et formater l'heure
function formatHour(heure) {
  let formattedHour = heure.replace("h", ":").trim();
  const hourParts = formattedHour.split(":");

  if (hourParts.length === 2) {
    // Complète les heures et minutes à deux chiffres
    const hours = hourParts[0].padStart(2, "0");
    const minutes = hourParts[1].padStart(2, "0");
    formattedHour = `${hours}:${minutes}`;
  } else {
    formattedHour = "00:00"; // Valeur par défaut si format incorrect
  }
  return formattedHour;
}

module.exports = {
  excelDateToDayjs,
  JSDateToString,
  formatHour,
};
