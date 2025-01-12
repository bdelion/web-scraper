#!/usr/bin/env node

"use strict";

// === MODULES IMPORTÉS ===
const XLSX = require("xlsx");
const axios = require("axios");
const cheerio = require("cheerio");
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
const DATE_FORMAT = "DD/MM/YYYY";
const HOUR_FORMAT = "HH:mm:ss";
const DATEHOUR_FORMAT = "DD/MM/YYYY HH:mm:ss";
// URL de l'API pour la récupération de l'ID de station
const BASE_URL = 'https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=';
// Constante pour l'en-tête User-Agent
const USER_AGENT = "Mozilla/5.0";

// === CLASSES ===

class ScrapingError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = "ScrapingError";
    this.context = context; // Contexte supplémentaire, comme l'URL ou les paramètres
  }
}

// === FONCTIONS UTILITAIRES ===

// Calcule la moyenne d'une propriété d'un tableau
function getAverage(tableauObjets) {
  if (!tableauObjets.length) return "0";
  const sum = tableauObjets.reduce((acc, obj) => acc + Number(obj.temperature), 0);
  return (sum / tableauObjets.length).toFixed(2).toString();
}

// Calcule la médiane des températures
function findMedian(tableauObjets) {
  const temperatures = tableauObjets.map(obj => Number(obj.temperature));
  temperatures.sort((a, b) => a - b);
  const middle = Math.floor(temperatures.length / 2);
  return (temperatures.length % 2 === 0
    ? (temperatures[middle - 1] + temperatures[middle]) / 2
    : temperatures[middle]
  ).toFixed(2);
}

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
  // Si la valeur est un nombre (timestamp Excel), convertis-la en date
  if (typeof excelDate === "number") {
    try {
      // Conversion du nombre Excel en date Dayjs
      let parsedDate= excelDateToDayjs(excelDate, 'Europe/Paris');
      // Vérification de la validité de la date
      if (parsedDate.isValid()) {
        return parsedDate.format(DATEHOUR_FORMAT);
      } else {
        throw new Error("Date invalide");
      }
    } catch (error) {
      console.error(`Impossible de parser la date : ${excelDate}`);
      console.error(error.message);
      process.exit(1); // Arrêt du script en cas d'erreur
    }
  } else {
    console.error(`La valeur de la colonne "Date" n'est pas un nombre, skipped: ${excelDate}`);
    process.exit(1); // Arrêt du script en cas d'erreur
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

function extractWeatherDataRow(row, $) {
  const cells = $(row).find("td");
  return {
    heure: $(cells[0]).text().trim(),
    temperature: $(cells[2]).text().replace(/[^0-9.-]/g, "").trim() // Nettoyage avancé
  };
}

function cleanTemperature(temp) {
  const parsedTemp = parseFloat(temp);
  return isNaN(parsedTemp) ? null : parsedTemp;
}

// Lecture d'un onglet d'un fichier Excel à partir d'une ligne indiquée
function readExcel(inputFile, sheetName, firstRow) {
  const workbook = XLSX.readFile(inputFile);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { range: firstRow, raw: true });
  return data;
}

// Écriture du fichier Excel avec les dates et nombres formatés à partir du json des résultats
const writeExcel = (data, outputFile) => {

  console.log(`writeExcel --> data : ${JSON.stringify(data, null, 2)}`);

  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.json_to_sheet(data, { cellDates: true ,  dateNF: DATEHOUR_FORMAT});
  // Appliquer un format numérique à toute la colonne "temperatureMin" et "temperatureMax"
  const columnTempMin = 'D'; // Colonne "temperatureMin"
  const columnTempMax = 'E'; // Colonne "temperatureMax"
  const columnTempAverage = 'F'; // Colonne "temperatureMoyenne"
  const columnTempMedian = 'G'; // Colonne "temperatureMediane"
  // Obtenir toutes les clés (adresses de cellules) de la feuille
  const range = XLSX.utils.decode_range(newSheet['!ref']);
  // Appliquer le format à chaque cellule de la colonne
  for (let row = range.s.r + 1; row <= range.e.r; row++) { // range.s.r + 1 pour éviter l'en-tête
    const cellAddressTempMin = `${columnTempMin}${row + 1}`; // +1 car les indices de ligne sont basés sur 0
    const cellAddressTempMax = `${columnTempMax}${row + 1}`;
    const cellAddressTempAverage = `${columnTempAverage}${row + 1}`;
    const cellAddressTempMedian = `${columnTempMedian}${row + 1}`;
    if (newSheet[cellAddressTempMin]) {
      newSheet[cellAddressTempMin].z = '0.00'; // Format numérique avec deux décimales
    }
    if (newSheet[cellAddressTempMax]) {
      newSheet[cellAddressTempMax].z = '0.00'; // Format numérique avec deux décimales
    }
    if (newSheet[cellAddressTempAverage]) {
      newSheet[cellAddressTempAverage].z = '0.00'; // Format numérique avec deux décimales
    }
    if (newSheet[cellAddressTempMedian]) {
      newSheet[cellAddressTempMedian].z = '0.00'; // Format numérique avec deux décimales
    }
  }
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
  XLSX.writeFile(newWorkbook, outputFile);
};

// === SCRAPING DES DONNÉES MÉTÉO ===

/**
 * Récupère les données météo pour une commune et une date.
 * @param {string} weatherStationId L'ID de la station météo.
 * @param {dayjs} date La date à laquelle récupérer les données.
 * @returns {Array} Un tableau des données météo.
 */
async function performObservationScraping(weatherStationId, date) {
  if (typeof weatherStationId !== 'string' || !weatherStationId.trim()) {
    throw new ScrapingError("Invalid 'weatherStationId'", { weatherStationId });
  }
  if (!dayjs.isDayjs(date) || !date.isValid()) {
    throw new ScrapingError("Invalid 'date'", { date });
  }

  const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${weatherStationId}&jour2=${date.date()}&mois2=${date.month()}&annee2=${date.year()}&affint=1`;

  try {
    const response = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = cheerio.load(response.data);
    const table = $('table:nth-child(3)[width="100%"]');
    if (!table.length) {
      throw new ScrapingError("Table not found on the page", { url });
    }

    const dataWeather = [];
    table.find("tbody tr").each((_, row) => {
      const { heure, temperature } = extractWeatherDataRow(row, $);
      if (heure && temperature && heure !== "Heurelocale") {
        const formattedHour = formatHour(heure);
        const fullDate = dayjs.utc(`${date.format(DATE_FORMAT)} ${formattedHour}:00`, DATEHOUR_FORMAT).tz('Europe/Paris', true);

        if (fullDate.isValid()) {
          dataWeather.push({
            weatherStationId,
            heure: formattedHour,
            temperature: cleanTemperature(temperature),
            dayjs: fullDate,
            dayjsFormated: fullDate.format(DATEHOUR_FORMAT)
          });
        }
      }
    });

    return dataWeather;
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error; // Relance l'erreur personnalisée
    }
    throw new ScrapingError(`Unexpected error: ${error.message}`, { originalError: error });
  }
}

/**
 * Récupère l'ID de station météo en utilisant le nom de la station.
 * @param {string} weatherStationName Le nom de la station météo à rechercher.
 * @returns {string} L'ID de la station météo.
 */
async function performIdStationScraping(weatherStationName) {
  if (typeof weatherStationName !== 'string' || !weatherStationName.trim()) {
    throw new ScrapingError("Invalid 'weatherStationName'", { weatherStationName });
  }

  try {
    // Encode le nom de la station pour l'inclure correctement dans l'URL
    const encodedStationName = encodeURIComponent(weatherStationName);
    const url = `${BASE_URL}${encodedStationName}`;

    // Effectue la requête POST pour récupérer l'ID de la station
    const response = await axios.post(url, {}, {
      headers: { "User-Agent": USER_AGENT } // Simule un navigateur
    });

    // Vérifie si la réponse contient bien des données
    if (!response.data || typeof response.data !== 'string') {
      throw new ScrapingError("Réponse invalide reçue pour la station", { weatherStationName });
    }

    // Sépare la réponse par '|' et récupère l'ID de la station
    const idStation = response.data.split("|")[0].trim();

    // Si l'ID est invalide ou vide, renvoie une erreur
    if (!idStation) {
      throw new ScrapingError("ID de la station non trouvé dans la réponse", { weatherStationName });
    }

    // Si l'ID est n'est pas un nombre
    if (!(!isNaN(Number(idStation)) && Number(idStation).toString() === idStation)) {
      throw new ScrapingError("ID de la station n'est pas un nombre dans la réponse", { weatherStationName });
    }

    return idStation;
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error; // Relance l'erreur personnalisée
    }
    throw new ScrapingError(`Unexpected error: ${error.message}`, { originalError: error });
  }
}

// Récupération des données météo entre deux dates
async function getWeatherDataBetween2Dates(weatherStationId, startDate, endDate) {
  // Formatage des dates Excel en date Dayjs sur le fuseau horaire de Paris
  let dayjsStartDate = excelDateToDayjs(startDate, 'Europe/Paris');
  let dayjsEndDate = excelDateToDayjs(endDate, 'Europe/Paris');

  console.log(`getWeatherDataBetween2Dates --> startDate: ${startDate}`);
  console.log(`getWeatherDataBetween2Dates --> endDate: ${endDate}`);
  console.log(`getWeatherDataBetween2Dates --> dayjsStartDate formatée : ${dayjsStartDate.format(DATEHOUR_FORMAT)}`);
  console.log(`getWeatherDataBetween2Dates --> dayjsEndDate formatée : ${dayjsEndDate.format(DATEHOUR_FORMAT)}`);

  // Init de la date de début d'itération
  let dateIteration = dayjsStartDate.clone();
  // Init de la date de fin d'itération
  let dateEndIteration;
  // WARNING : les itérations se font sur des dates heures et pas des dates d'où la nécessité d'ajuster la date de fin d'itération
  // Si date de début et date de fin sont égale ou si l'heure de fin est strictement supérieure à l'heure de début sans tenir compte de la date
  // Alors la date de fin d'itération est égale à la date de fin
  // Sinon la date de fin d'itération est égale à la date de fin + 1 jour
  if ((dayjsStartDate.format(DATE_FORMAT) === dayjsEndDate.format(DATE_FORMAT)) || (dayjsEndDate.format(HOUR_FORMAT) > dayjsStartDate.format(HOUR_FORMAT))) {
    dateEndIteration = dayjsEndDate.clone();
  } else {
    dateEndIteration = dayjsEndDate.clone().add(1, "day");
  }
  
  const datasWeather = [];

  while (dateIteration.isBefore(dateEndIteration)) {
    const dayWeather = await performObservationScraping(weatherStationId, dateIteration);
    datasWeather.push(...dayWeather);
    dateIteration = dateIteration.add(1, "day");
  }

  //TODEL console.log(`getWeatherDataBetween2Dates --> datasWeather : ${JSON.stringify(datasWeather, null, 2)}`);

  const filteredDatas = datasWeather.filter(
    (data) =>
      data.dayjs.isAfter(dayjsStartDate) && data.dayjs.isBefore(dayjsEndDate)
  );

  console.log(`getWeatherDataBetween2Dates --> filteredDatas : ${JSON.stringify(filteredDatas, null, 2)}`);

  const temperatures = filteredDatas.map((data) => Number(data.temperature));
  return {
    weatherStationId,
    startDate: dayjsStartDate.format(DATEHOUR_FORMAT),
    endDate: dayjsEndDate.format(DATEHOUR_FORMAT),
    minTemperature: Math.min(...temperatures).toFixed(2),
    maxTemperature: Math.max(...temperatures).toFixed(2),
    averageTemperature: getAverage(filteredDatas),
    medianTemperature: findMedian(filteredDatas),
  };
}

// Création d'un tableau qui contient les plages de date (début / fin) souhaitée
const formatData = (jsonArray) => {
  let previousDate = 0;
  const dateArray = [];

  jsonArray.forEach((entry) => {
    // Vérification que la date est valide
    if (!entry.Date) {
      console.error("Date invalide ou manquante dans l'entrée.");
      process.exit(1); // Arrêt du script en cas d'erreur
    }
    // Vérification que la date suivante est supérieure à la date précédente
    if (entry.Date < previousDate) {
      console.error(`La valeur de la date en cours ${JSDateToString(entry.Date)} est inférieure à la date précédente ${JSDateToString(previousDate)}.`);
      process.exit(1); // Arrêt du script en cas d'erreur
    }

    // Initialisation d'un objet pour stocker les données de la ligne
    const rowData = {};

    // Si on a une date précédente et que l'entrée a des températures définies
    if (previousDate !== 0 && entry.Min === undefined && entry.Max === undefined) {
      rowData["begin"] = previousDate;
      rowData["end"] = entry.Date;
      dateArray.push(rowData);
    }

    // Mettre à jour la précédente date seulement si les conditions sont remplies
    previousDate = entry.Date;
  });

  return dateArray;
};

// === SCRIPT PRINCIPAL ===

(async () => {
  const excelFile = "assets/InputData.xlsx";
  const sheetName = "Suivi Conso New";
  const firstRow = 2;
  const weatherStationName = "Bressuire";

  // Lecture du fichier Excel
  const jsonExcelData = readExcel(excelFile, sheetName, firstRow);
  
  console.log(`main -> jsonExcelData : ${JSON.stringify(jsonExcelData, null, 2)}`);

  // Formatage des données dans un tableau avec la date/heure de début et de fin sur chaque ligne
  const inputData = formatData(jsonExcelData);
  
  console.log(`main -> inputData : ${JSON.stringify(inputData, null, 2)}`);

  // Récupération de l'id de la station météo souhaitée
  const weatherStationId = await performIdStationScraping(weatherStationName);
  console.log(`main -> weatherStationId : ${weatherStationId}`);

  // Initialisation de la structure de données qui contiendra les résulats
  let weatherData = [];
  let previousEndDate = 0; 

  for (const entry of inputData) {
    console.log(`main --> entry.begin:`);
    console.log(entry.begin);
    console.log(`main --> entry.end:`);
    console.log(entry.end);

    if (!((entry.end - entry.begin) === 0)) {
      // Push du résultat entre deux dates/heures dans le tableau
      weatherData.push(
        // Récupération des températures entre deux dates/heures
        await getWeatherDataBetween2Dates(
          weatherStationId,
          entry.begin,
          entry.end
        )
      );
      previousEndDate = entry.end;
    } else {
      // 
      if (((previousEndDate - entry.begin) === 0) && ((entry.end - entry.begin) === 0)) {
        weatherData.push(weatherData[weatherData.length - 1]);
      } else {
        throw new ScrapingError(`There is a problem with date ranges : ${previousEndDate.format(DATEHOUR_FORMAT)} / ${entry.begin.format(DATEHOUR_FORMAT)} / ${entry.end.format(DATEHOUR_FORMAT)}`);
      }
    }
  }
  
  console.log(`main -> weatherData : ${JSON.stringify(weatherData, null, 2)}`);

  // Fonction pour convertir les dates et les nombres
  weatherData = weatherData.map(item => {
    return {
      ...item,
      startDate: new Date(item.startDate), // Convertir la date en objet Date
      endDate: new Date(item.endDate), // Convertir la date en objet Date
      minTemperature: parseFloat(item.minTemperature), // Convertir les températures en nombres
      maxTemperature: parseFloat(item.maxTemperature),
      averageTemperature: parseFloat(item.averageTemperature),
      medianTemperature: parseFloat(item.medianTemperature)
    };
  });

  console.log(`main -> weatherData : ${JSON.stringify(weatherData, null, 2)}`);

  // Sauvegarde des résultats
  writeExcel(weatherData, "assets/OutputData.xlsx");

})().catch((err) => console.error(err));
