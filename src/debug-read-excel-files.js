const XLSX = require("xlsx");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const utc = require('dayjs/plugin/utc'); // Plugin pour UTC
const timezone = require('dayjs/plugin/timezone'); // Plugin pour timezone

// Charger les plugins
dayjs.extend(utc);
dayjs.extend(timezone);

require('dayjs/locale/fr');  // Charger la locale française
// Appliquer la locale française
dayjs.locale('fr');  // Applique la locale par défaut à toutes les instances de Day.js

function excelDateToJSDate(serial) {
  const excelEpoch = new Date(Date.UTC(1900, 0, 1));
  const daysOffset = serial >= 60 ? serial - 2 : serial - 1; // Bug Excel 1900
  return new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
}

const workbook = XLSX.readFile("assets/InputData.xlsx");
const sheet = workbook.Sheets["Suivi Conso New"];
const data = XLSX.utils.sheet_to_json(sheet, { range: 2, raw: true });

data.forEach(row => {
  const cellValue = row["Date"]; // Remplacez par le nom réel de votre colonne

  console.log(cellValue);

  let parsedDate;

  if (typeof cellValue === "number") {
    // Cas 1 : Nombre Excel
    parsedDate = dayjs(excelDateToJSDate(cellValue)).tz('Europe/Paris', true);
  } else if (typeof cellValue === "string") {
    // Cas 2 : Texte formaté
    parsedDate = dayjs(cellValue, "DD/MM/YY H:mm", true).tz('Europe/Paris', true);
  }

  console.log(parsedDate);

  if (parsedDate && parsedDate.isValid()) {
    console.log("Date formatée :", parsedDate.format("DD/MM/YYYY HH:mm:ss"));
    console.log("Date formatée en utc :", parsedDate.utc().format("DD/MM/YYYY HH:mm:ss"));
  } else {
    console.warn("Impossible de parser la date :", cellValue);
  }
});
