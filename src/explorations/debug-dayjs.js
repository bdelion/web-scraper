"use strict";

// Import des modules nécessaires
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require("dayjs/plugin/utc");

// Charger les plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);

// Configurer la locale française
require("dayjs/locale/fr"); // Charger la locale française
dayjs.locale("fr"); // Appliquer la locale

// Format de la date
const dateFormat = "DD/MM/YYYY HH:mm:ss";

// Exemple d'entrée
const fullDateStr = "13/12/2024 00:00:00";

// Parsing de la date en mode strict
const parsedDate = dayjs(fullDateStr, dateFormat, true).local();

if (!parsedDate.isValid()) {
  console.error("Invalid date format", fullDateStr);
} else {
  console.log("Date parsée au format ISO :", parsedDate.toISOString());
  console.log("Date locale formatée :", parsedDate.format(dateFormat)); // En français
  console.log("Date toString :", parsedDate.toString());
}
const nativeDate = parsedDate.toDate();
console.log("Date parsée au format ISO :", nativeDate.toISOString());
// console.log("Date locale formatée :", nativeDate.format(dateFormat)); // En français

console.log("parsedDate :", parsedDate);
console.log("nativeDate :", nativeDate);
