const XLSX = require("xlsx");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require('dayjs/plugin/utc'); // Plugin pour UTC
const timezone = require('dayjs/plugin/timezone'); // Plugin pour timezone

// Charger les plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

require('dayjs/locale/fr');  // Charger la locale française
dayjs.locale('fr');  // Appliquer la locale par défaut à toutes les instances de Day.js

// Fonction pour convertir la date Excel en date JavaScript en UTC
function excelDateToJSDate(serial) {
  const excelEpoch = new Date(Date.UTC(1900, 0, 1)); // 1er janvier 1900, en UTC
  const daysOffset = serial >= 60 ? serial - 2 : serial - 1; // Correction pour le bug Excel 1900
  return new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000); // Renvoie la date en UTC
}

const workbook = XLSX.readFile("assets/InputData.xlsx");
const sheet = workbook.Sheets["Suivi Conso New"];
const data = XLSX.utils.sheet_to_json(sheet, { range: 2, raw: true });

data.forEach(row => {
  const cellValue = row["Date"]; // Remplacez par le nom réel de votre colonne
  console.log("cellValue :", cellValue);

  let parsedDate;

  if (typeof cellValue === "number") {
    // Cas 1 : Nombre Excel
    const jsDate = excelDateToJSDate(cellValue); // Convertir en date UTC
    console.log(jsDate);
    parsedDate = dayjs(jsDate).utc(); // Créer l'objet Day.js en UTC
  } else if (typeof cellValue === "string") {
    // Cas 2 : Texte formaté
    parsedDate = dayjs(cellValue, "DD/MM/YYYY H:mm", true).utc();
  }

  console.log(parsedDate);
  console.log("parsedDate : " + JSON.stringify(parsedDate, null, 2));

  if (parsedDate && parsedDate.isValid()) {
    // Applique le fuseau horaire Europe/Paris mais sans décaler l'heure interne
    const parisTime = parsedDate.tz('Europe/Paris', true); // true pour ne pas modifier l'heure interne

    console.log(parisTime);
    console.log("parisTime : " + JSON.stringify(parisTime, null, 2));
    
    console.log(parsedDate-parisTime);

    console.log("Date formatée : ", parisTime.format("DD/MM/YYYY HH:mm:ss"));
    console.log("Date en UTC :", parisTime.utc().format("DD/MM/YYYY HH:mm:ss"));
    console.log("Date locale Paris :", parisTime.format("DD/MM/YYYY HH:mm:ss"));
  } else {
    console.warn("Impossible de parser la date :", cellValue);
  }
});
