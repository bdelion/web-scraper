const { dayjs, DATEHOUR_FORMAT } = require('../config/dayjsConfig');

const XLSX = require('xlsx');
const MS_PER_DAY = 24 * 60 * 60 * 1000; // Millisecondes par jour

// Fonction de conversion pour Excel -> JS
const excelEpoch1 = new Date(Date.UTC(1900, 0, 1)); // 1er janvier 1900 en UTC
function excelToJsDate(excelDate) {
  const correctedDate = new Date(excelEpoch1.getTime() + (excelDate - 2) * MS_PER_DAY);
  return correctedDate;
}

// Fonction pour convertir une date Excel (nombre) en date Dayjs en appliquant le fuseau horaire
function excelDateToDayjs(serial, timezoneString = 'Europe/Paris') {
  const MS_PER_DAY = 24 * 60 * 60 * 1000; // Millisecondes par jour
  const excelEpoch = Date.UTC(1900, 0, 1); // 1er janvier 1900 UTC
  
  // Vérification explicite pour les dates avant 1900
  if (serial < 1) {
    return dayjs(null); // Renvoie une date invalide (null)
  }

  // Ajustement pour le bug de l'année 1900 : 
  // Excel considère 1900 comme une année bissextile, mais en réalité elle ne l'est pas.
  // Pour corriger cela, les dates >= 60 sont décalées de 2 jours.
  const daysOffset = serial >= 60 ? serial - 2 : serial - 1;

  // Conversion en millisecondes avec arrondi pour éviter les imprécisions
  const exactMilliseconds = Math.round(daysOffset * MS_PER_DAY);

  // Conversion en date UTC
  const utcDate = new Date(excelEpoch + exactMilliseconds);
  
  // Vérification si la date est valide
  if (isNaN(utcDate)) {
    throw new Error(`Date Excel invalide: ${serial}`);
  }

  // Création d'un objet dayjs en UTC
  const dateInUTC = dayjs.utc(utcDate);

  // Appliquer le fuseau horaire à cette date UTC
  const finalDate = dateInUTC.tz(timezoneString, true); // `true` pour éviter l'ajout d'un offset supplémentaire

  return finalDate;
}

// Lire le fichier Excel
const workbook = XLSX.readFile("assets/InputData.xlsx");
const sheet = workbook.Sheets["Suivi Conso New"];
const data = XLSX.utils.sheet_to_json(sheet, { range: 2, raw: true });

// Conversion des dates Excel en dates JS
data.forEach(row => {
  const excelDate = row["Date"]; // Remplacez par le nom de la colonne avec les dates Excel
  if (typeof excelDate === 'number') {
    let jsDate = excelToJsDate(excelDate);
    let jsDate2 = excelDateToDayjs(excelDate);
    console.log(`Date Excel ${excelDate} : ${jsDate.toISOString()} / ${jsDate2.toISOString()} / ${jsDate2.format(DATEHOUR_FORMAT)}`);
    jsDate = excelToJsDate(excelDate);
    jsDate2 = excelDateToDayjs(excelDate, 'America/New_York');
    console.log(`Date Excel ${excelDate} New York : ${jsDate.toISOString()} / ${jsDate2.toISOString()} / ${jsDate2.format(DATEHOUR_FORMAT)}`);
  }
});
