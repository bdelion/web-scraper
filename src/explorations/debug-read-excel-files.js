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

// Fonction pour convertir une date Excel (nombre) en JavaScript (UTC)
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

  // Appliquer le fuseau horaire de Paris à cette date UTC
  const finalDate = dateInUTC.tz(timezoneString, true); // `true` pour éviter l'ajout d'un offset supplémentaire

  return finalDate;
}

const workbook = XLSX.readFile("assets/InputData.xlsx");
const sheet = workbook.Sheets["Suivi Conso New"];
const data = XLSX.utils.sheet_to_json(sheet, { range: 2, raw: true });

data.forEach(row => {
  const cellValue = row["Date"]; // Nom de la colonne contenant la date
  console.log("Valeur d'origine de la cellule Excel :", cellValue);
  let parsedDate;

  if (typeof cellValue === "number") {
    // Cas 1 : Nombre Excel
    parsedDate= excelDateToDayjs(cellValue, 'Europe/Paris');
  } else if (typeof cellValue === "string") {
    // Cas 2 : Texte formaté
    parsedDate = dayjs(cellValue, "DD/MM/YYYY H:mm", true).utc();
  }

  if (parsedDate && parsedDate.isValid()) {
    // Applique le fuseau horaire Europe/Paris
    const parisTime = parsedDate.tz('Europe/Paris');
    console.log("parisTime : " + parisTime);
    console.log("parisTime stringify : " + JSON.stringify(parisTime, null, 2));
    console.log("parisTime formatée : ", parisTime.format("DD/MM/YYYY HH:mm:ss"));
    console.log("parisTime en UTC formatée :", parisTime.utc().format("DD/MM/YYYY HH:mm:ss"));
    console.log("parisTime TZ formatée :", parisTime.tz('Europe/Paris').format("DD/MM/YYYY HH:mm:ss"));
    console.log("parisTime TZ true formatée :", parisTime.tz('Europe/Paris',true).format("DD/MM/YYYY HH:mm:ss"));
    console.log(parisTime);

    console.log("parsedDate : " + parsedDate);
    console.log("parsedDate stringify : " + JSON.stringify(parsedDate, null, 2));
    console.log("parsedDate formatée : ", parsedDate.format("DD/MM/YYYY HH:mm:ss"));
    console.log("parsedDate en UTC formatée :", parsedDate.utc().format("DD/MM/YYYY HH:mm:ss"));
    console.log("parsedDate TZ formatée :", parsedDate.tz('Europe/Paris').format("DD/MM/YYYY HH:mm:ss"));
    console.log("parsedDate TZ true formatée :", parsedDate.tz('Europe/Paris',true).format("DD/MM/YYYY HH:mm:ss"));
    console.log(parsedDate);
    console.log("==============================================================");
  } else {
    console.warn("Impossible de parser la date :", cellValue);
  }
});
