#!/usr/bin/env node

"use strict";

// === MODULES IMPORTÉS ===
// const XLSX = require("xlsx");
// const axios = require("axios");
// const cheerio = require("cheerio");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require('dayjs/plugin/utc'); // Plugin pour UTC
const timezone = require('dayjs/plugin/timezone'); // Plugin pour timezone

// === CONFIGURATION DAYJS ===
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
require('dayjs/locale/fr');  // Charger la locale française
dayjs.locale('fr');  // Appliquer la locale par défaut à toutes les instances de Day.js

// === CONSTANTES ===
// const DATE_FORMAT = "DD/MM/YYYY";
// const HOUR_FORMAT = "HH:mm:ss";
// const DATEHOUR_FORMAT = "DD/MM/YYYY HH:mm:ss";

// Fonction pour convertir une date Excel (nombre) en date Dayjs en appliquant le fuseau horaire
function excelDateToDayjs(serial, timezoneString = 'Europe/Paris') {
  const MS_PER_DAY = 24 * 60 * 60 * 1000; // Millisecondes par jour
  const excelEpoch = Date.UTC(1900, 0, 1); // 1er janvier 1900 UTC

  console.log(serial);

  // Ajustement pour le bug de l'année 1900
  const daysOffset = serial >= 60 ? serial - 2 : serial - 1;
  // Conversion en millisecondes avec arrondi pour éviter les imprécisions
  const exactMilliseconds = Math.round(daysOffset * MS_PER_DAY);
  // Conversion en date UTC
  const utcDate = new Date(excelEpoch + exactMilliseconds);
  // Création d'un objet dayjs en UTC
  const dateInUTC = dayjs.utc(utcDate);

  console.log(dateInUTC);

  // Appliquer le fuseau horaire à cette date UTC
  const finalDate = dateInUTC.tz(timezoneString, true); // `true` pour éviter l'ajout d'un offset supplémentaire

  console.log(finalDate);

  return finalDate;
}

let excelValue = 45505.33472222222; // Valeur Excel
let frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/08/2024 08:02 -> ${frenchDate}`);
console.log(`01/08/2024 08:02 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 45627.41736111111; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/12/2024 10:01 -> ${frenchDate}`);
console.log(`01/12/2024 10:01 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 31; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`30/01/1900 00:00:00 -> ${frenchDate}`);
console.log(`30/01/1900 00:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 60; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`28/02/1900 00:00:00 -> ${frenchDate}`);
console.log(`28/02/1900 00:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 61; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/03/1900 00:00:00 -> ${frenchDate}`);
console.log(`01/03/1900 00:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 92; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/04/1900 00:00 -> ${frenchDate}`);
console.log(`01/04/1900 00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 3654.25; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/01/1910 06:00:00 -> ${frenchDate}`);
console.log(`01/01/1910 06:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 4019.2916666666665; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/01/1911 07:00:00 -> ${frenchDate}`);
console.log(`01/01/1911 07:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

// ****************** ENTRE CES 2 DATES il y a un truc **************************************************

excelValue = 4383.999988425926; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`31/12/1911 23:59:00 -> ${frenchDate}`);
console.log(`31/12/1911 23:59:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 4384; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/01/1912 00:00:00 -> ${frenchDate}`);
console.log(`01/01/1912 00:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 4384.333333333333; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/01/1912 08:00:00 -> ${frenchDate}`);
console.log(`01/01/1912 08:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 7306.208333333333; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/01/1920 05:00:00 -> ${frenchDate}`);
console.log(`01/01/1920 05:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 10959.166666666666; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/01/1930 04:00:00 -> ${frenchDate}`);
console.log(`01/01/1930 04:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 26299.125; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/01/1972 03:00:00 -> ${frenchDate}`);
console.log(`01/01/1972 03:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 26665.125; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/01/1973 03:00:00 -> ${frenchDate}`);
console.log(`01/01/1973 03:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);

excelValue = 27030.125; // Valeur Excel
frenchDate = excelDateToDayjs(excelValue, 'Europe/Paris');
console.log(`01/01/1974 03:00:00 -> ${frenchDate}`);
console.log(`01/01/1974 03:00:00 -> ${frenchDate.format('DD/MM/YYYY HH:mm')}`);


/* let oldDate1 = dayjs.tz("01/01/1930 03:00", 'Europe/Paris');
let oldDate2 = dayjs.tz("01/01/1900 03:00", 'Europe/Paris');

console.log("1930: ", oldDate1.format());
console.log("1900: ", oldDate2.format());

oldDate1 = dayjs("01/01/1930 03:00").tz('Europe/Paris');
oldDate2 = dayjs("01/01/1900 03:00").tz('Europe/Paris');

console.log("1930: ", oldDate1.format());
console.log("1900: ", oldDate2.format());
 */

let date = dayjs.tz("01/01/1910 06:00", "Europe/Paris");
console.log(date);
// Affichage de la date avec l'offset
console.log(date.format());  // Affiche la date avec l'offset calculé

// Vérifier l'offset en minutes
console.log("Offset en minutes : ", date.utcOffset());

// Vérifier si la date est en heure d'été
const isDST = (date.utcOffset() !== date.clone().month(6).utcOffset());  // Comparaison avec une date en Juillet (mois d'été)
console.log("Est-ce que la date est en heure d'été ? ", isDST);

// https://fr.wikipedia.org/wiki/Heure_en_France

// Test avec différentes dates pour vérifier l'offset
const testDates = [
  "01/01/1900 06:00", // Date donnée
  "01/07/1900 06:00", // Date en été (par exemple)
  "01/01/1905 06:00", // Date donnée
  "01/07/1905 06:00", // Date en été (par exemple)
  "01/01/1910 06:00", // Date donnée
  "01/07/1910 06:00", // Date en été (par exemple)
  "01/01/1911 06:00", // Date en été (par exemple)
  "01/07/1911 06:00", // Date en été (par exemple)
  "01/01/1912 06:00", // Date en été (par exemple)
  "01/07/1912 06:00", // Date en été (par exemple)
  "01/01/1922 06:00", // Date en été (par exemple)
  "01/07/1922 06:00", // Date en été (par exemple)
  "01/01/1932 06:00", // Date en été (par exemple)
  "01/07/1932 06:00", // Date en été (par exemple)
  "01/01/1939 06:00", // Date en été (par exemple)
  "01/07/1939 06:00", // Date en été (par exemple)
  "01/01/1940 06:00", // Date en été (par exemple)
  "01/07/1940 06:00", // Date en été (par exemple)
  "01/01/1941 06:00", // Date en été (par exemple)
  "01/07/1941 06:00", // Date en été (par exemple)
  "01/01/1942 06:00", // Date en été (par exemple)
  "01/07/1942 06:00", // Date en été (par exemple)
  "01/01/1943 06:00", // Date en été (par exemple)
  "01/07/1943 06:00", // Date en été (par exemple)
  "01/01/1944 06:00", // Date en été (par exemple)
  "01/07/1944 06:00", // Date en été (par exemple)
  "01/01/1945 06:00", // Date en été (par exemple)
  "01/07/1945 06:00", // Date en été (par exemple)
  "01/01/1946 06:00", // Date en été (par exemple)
  "01/07/1946 06:00", // Date en été (par exemple)
  "01/01/1952 06:00", // Date en été (par exemple)
  "01/07/1952 06:00", // Date en été (par exemple)
  "01/01/1962 06:00", // Date en été (par exemple)
  "01/07/1962 06:00", // Date en été (par exemple)
  "01/01/1972 06:00", // Date en été (par exemple)
  "01/07/1972 06:00", // Date en été (par exemple)
  "01/01/2023 06:00", // Date récente
];

testDates.forEach(dateString => {
  let date = dayjs.tz(dateString, "Europe/Paris");
  console.log(`${dateString} -> Offset: ${date.utcOffset()} minutes`);
});
