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
  constructor(message, details) {
    super(message);
    this.details = details;
  }

  static fromResponseError(url, response) {
    return new ScrapingError(
      `HTTP error: Received ${response.status} (${response.statusText}) at ${url}`,
      { response }
    );
  }
}

// === FONCTIONS UTILITAIRES ===

// Calcule la moyenne d'un tableau de températures
function getAverage(...numbers) {
  if (numbers.length === 0) return "0"; // Si aucun argument, renvoyer "0"

  const sum = numbers.reduce((acc, temp) => acc + temp, 0);
  return (sum / numbers.length).toFixed(2);
}

// Calcule la médiane d'un tableau de nombres
function findMedian(...numbers) {
  if (numbers.length === 0) return "0"; // Si aucun argument, renvoyer "0"
  
  // Tri des températures par ordre croissant
  numbers.sort((a, b) => a - b);
  
  const middle = Math.floor(numbers.length / 2);

  // Si le nombre d'éléments est pair, on retourne la moyenne des deux éléments du milieu
  return (numbers.length % 2 === 0
    ? ((numbers[middle - 1] + numbers[middle]) / 2)
    : numbers[middle]
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

/**
 * Reads data from a specified sheet in an Excel file, starting from a specific row.
 * 
 * This function loads an Excel file, accesses the specified sheet by its name, and 
 * retrieves the data starting from the row indicated by the `firstRow` parameter. 
 * It returns the data as a JSON object.
 * 
 * @param {string} inputFile - The path to the input Excel file.
 * @param {string} sheetName - The name of the sheet to read data from.
 * @param {number} firstRow - The row number from which to start reading data (1-based index).
 * @returns {Array} - The data from the specified sheet starting from the `firstRow`, formatted as an array of JSON objects.
 */
function readExcel(inputFile, sheetName, firstRow) {
  // Read the Excel file into a workbook object
  const workbook = XLSX.readFile(inputFile);

  // Access the specified sheet by name
  const sheet = workbook.Sheets[sheetName];

  // Convert the sheet data to JSON starting from the specified row, with raw data for cells
  const data = XLSX.utils.sheet_to_json(sheet, { range: firstRow, raw: true });

  // Return the extracted data
  return data;
}

/**
 * Writes an Excel file with formatted dates and numbers from the provided JSON data.
 * The function creates a new workbook, converts the JSON data into a sheet, applies specific formatting 
 * for dates and numerical values, and writes the result to an output file.
 * 
 * @param {Array} data - The JSON data to be written to the Excel sheet.
 * @param {string} outputFile - The path and name of the output file where the Excel file will be saved.
 */
const writeExcel = (data, outputFile) => {
  // Create a new workbook
  const newWorkbook = XLSX.utils.book_new();
  
  // Convert the JSON data into a sheet, ensuring date cells are formatted correctly
  const newSheet = XLSX.utils.json_to_sheet(data, {
    cellDates: true,
    dateNF: DATEHOUR_FORMAT, // Date format: day/month/year hour:minute:second
  });

  // Define the columns that need to have a numerical format applied
  const columnsToFormat = ['D', 'E', 'F', 'G']; // For columns like minTemperature, maxTemperature, etc.
  
  // Decode the range of the sheet to loop through the data rows
  const range = XLSX.utils.decode_range(newSheet['!ref']);
  
  // Iterate over the rows in the sheet (skip the header row)
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    columnsToFormat.forEach((col) => {
      const cellAddress = `${col}${row + 1}`; // Construct the cell address (e.g., D2, E3, etc.)
      
      // Check if the cell exists and apply the format
      if (newSheet[cellAddress]) {
        newSheet[cellAddress].z = '0.00'; // Apply number format with two decimal places (e.g., 0.00)
      }
    });
  }

  // Append the sheet to the workbook
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
  
  // Write the workbook to a file with the specified output path
  XLSX.writeFile(newWorkbook, outputFile);
};

// === SCRAPING DES DONNÉES MÉTÉO ===

function processWeatherRow(row, $, date, weatherStationId) {
  const { heure, temperature } = extractWeatherDataRow(row, $);
  if (!heure || !temperature || heure === "Heurelocale") return null;

  const formattedHour = formatHour(heure);
  const fullDate = dayjs
    .utc(`${date.format(DATE_FORMAT)} ${formattedHour}:00`, DATEHOUR_FORMAT)
    .tz("Europe/Paris", true);

  if (!fullDate.isValid()) return null;

  return {
    weatherStationId,
    heure: formattedHour,
    temperature: cleanTemperature(temperature),
    dayjs: fullDate,
    dayjsFormated: fullDate.format(DATEHOUR_FORMAT),
  };
}

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
    throw new ScrapingError(`Invalid 'date': expected a valid dayjs object but received ${typeof date}`, { date });
  }

  const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${weatherStationId}&jour2=${date.date()}&mois2=${date.month()}&annee2=${date.year()}&affint=1`;

  try {
    const response = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (response.status !== 200) {
      throw new ScrapingError(`HTTP error: Received status ${response.status}`, { url });
    }

    //TODEL console.log(response.data);

    const $ = cheerio.load(response.data);
    const table = $('table:nth-child(3)[width="100%"]');
    if (!table.length) {
      throw new ScrapingError("Table not found on the page", { url });
    }

    const dataWeather = [];
    table.find("tbody tr").each((_, row) => {
      const data = processWeatherRow(row, $, date, weatherStationId);
      if (data) dataWeather.push(data);
    });    

    return dataWeather;
  } catch (error) {
    if (error.response) {
      // Erreur HTTP
      throw new ScrapingError(`HTTP error on ${url}: ${error.response.statusText} (${error.response.status})`, { url });
    }
    if (error.request) {
      // Erreur réseau
      throw new ScrapingError(`Network error while accessing ${url}`, { url, originalError: error });
    }
    throw new ScrapingError(`Unexpected error: ${error.message}`, { url, originalError: error });
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
  
  // Encode le nom de la station pour l'inclure correctement dans l'URL
  const encodedStationName = encodeURIComponent(weatherStationName);
  const url = `${BASE_URL}${encodedStationName}`;

  try {
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
    throw new ScrapingError(`Unexpected error on ${url}: ${error.message}`, { originalError: error });
  }
}

// Récupération des données météo entre deux dates
async function getWeatherDataBetween2Dates(weatherStationId, startDate, endDate) {
  //TODEL console.log(`weatherStationId : ${weatherStationId}`);
  //TODEL console.log(`startDate : ${startDate}`);
  //TODEL console.log(`endDate : ${endDate}`);

  // Formatage des dates Excel en date Dayjs sur le fuseau horaire de Paris
  let dayjsStartDate = excelDateToDayjs(startDate, 'Europe/Paris');
  let dayjsEndDate = excelDateToDayjs(endDate, 'Europe/Paris');
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
  // Scraping de données pour la station sur la plage de dates
  while (dateIteration.isBefore(dateEndIteration)) {
    const dayWeather = await performObservationScraping(weatherStationId, dateIteration);
    datasWeather.push(...dayWeather);
    dateIteration = dateIteration.add(1, "day");
  }

  // Filtrer les données pour n'avoir que celles sur la plage de dates en tenant compte des heures
  const filteredDatas = datasWeather.filter(
    (data) =>
      ((data.dayjs.isSame(dayjsStartDate) || data.dayjs.isAfter(dayjsStartDate)) && (data.dayjs.isSame(dayjsEndDate) || data.dayjs.isBefore(dayjsEndDate)))
  );

  // Tableau des données de températures uniquement pour les calculs
  const temperatures = filteredDatas.map((data) => Number(data.temperature));
  return {
    weatherStationId,
    startDate: dayjsStartDate.toDate(),
    endDate: dayjsEndDate.toDate(),
    minTemperature: parseFloat(Math.min(...temperatures).toFixed(2)),
    maxTemperature: parseFloat(Math.max(...temperatures).toFixed(2)),
    averageTemperature: parseFloat(getAverage(...temperatures)),
    medianTemperature: parseFloat(findMedian(...temperatures)),
  };
}

// Création d'un tableau qui contient les plages de date (début / fin) souhaitée
const formatData = (jsonArray) => {
  if (!Array.isArray(jsonArray)) {
    throw new ScrapingError("L'entrée doit être un tableau.", { jsonArray });
  }

  let previousDate = 0;
  const dateArray = [];

  jsonArray.forEach((entry, index) => {
    // Vérification que l'entrée a une propriété Date
    if (!entry.Date) {
      throw new ScrapingError(`Date invalide ou manquante dans l'entrée à l'index ${index}.`, { entry, index });
    }

    // Vérification que la date suivante est supérieure à la date précédente
    if (entry.Date < previousDate) {
      throw new ScrapingError(
        `La valeur de la date en cours (${JSDateToString(entry.Date)}) à l'index ${index} est inférieure à la date précédente (${JSDateToString(previousDate)}).`,
        { entry, previousDate, index }
      );
    }

    // Initialisation d'un objet pour stocker les données de la ligne
    const rowData = {};

    // Si on a une date précédente et que l'entrée a des températures non définies
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

  // Formatage des données dans un tableau avec la date/heure de début et de fin sur chaque ligne
  const inputData = formatData(jsonExcelData);

  // Récupération de l'id de la station météo souhaitée
  const weatherStationId = await performIdStationScraping(weatherStationName);

  // Initialisation de la structure de données qui contiendra les résulats
  let weatherData = [];
  let previousEndDate = 0; 

/*   //TODO A TESTER
  // Récupérer plusieurs données météo en parallèle (pour chaque intervalle de dates)
  const weatherDataPromises = inputData.map(entry => {    
    if (!((entry.end - entry.begin) === 0)) {
      previousEndDate = entry.end;
      return getWeatherDataBetween2Dates(weatherStationId, entry.begin, entry.end);
    } else {
      // 
      if (((previousEndDate - entry.begin) === 0) && ((entry.end - entry.begin) === 0)) {
        previousEndDate = entry.end;
        return weatherData[weatherData.length - 1];
      } else {
        throw new ScrapingError(`There is a problem with date ranges : ${previousEndDate.format(DATEHOUR_FORMAT)} / ${entry.begin.format(DATEHOUR_FORMAT)} / ${entry.end.format(DATEHOUR_FORMAT)}`);
      }
    }
  });

  weatherData = await Promise.all(weatherDataPromises); */

  for (const entry of inputData) {    
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

  // Sauvegarde des résultats
  writeExcel(weatherData, "assets/OutputData.xlsx");
})().catch((err) => console.error(err));

// Exportation des fonctions
module.exports = {
  getAverage,
  findMedian,
  excelDateToDayjs,
  formatHour,
  cleanTemperature,
  ScrapingError,
  performIdStationScraping,
  performObservationScraping,
  JSDateToString,
  writeExcel,
  formatData,
  getWeatherDataBetween2Dates
};
