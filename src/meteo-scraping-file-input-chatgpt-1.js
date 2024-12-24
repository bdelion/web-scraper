#!/usr/bin/env node

"use strict";

// === MODULES IMPORTÉS ===
const XLSX = require("xlsx");
const axios = require("axios");
const cheerio = require("cheerio");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const customParseFormat = require("dayjs/plugin/customParseFormat");

// === CONFIGURATION DAYJS ===
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale("fr"); // Locale française

// === CONSTANTES ===
const DATE_FORMAT = "DD/MM/YYYY";
const DATEHOUR_FORMAT = "DD/MM/YYYY HH:mm:ss";

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

// Conversion d'une date Excel en objet Date
function excelDateToJSDate(serial) {
  const excelEpoch = new Date(Date.UTC(1900, 0, 1));
  const daysOffset = serial >= 60 ? serial - 2 : serial - 1; // Bug Excel 1900
  return new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
}

// Lecture d'un fichier Excel
function readExcel(inputFile, sheetName, firstRow) {
  const workbook = XLSX.readFile(inputFile);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { range: firstRow, raw: true });

  data.forEach(row => {
    const fullDateStr = row["Date"]; // Remplace "Date" par le nom de ta colonne
  
    // Si la valeur est un nombre (timestamp Excel), convertis-la en date
    if (typeof fullDateStr === "number") {
      try {
        console.log(`readExcel --> fullDateStr is Number: ${fullDateStr}`);
  
        // Conversion du nombre Excel en date JavaScript
        let parsedDate = dayjs(excelDateToJSDate(fullDateStr)).utc();
  
        console.log(`readExcel --> parsedDate (UTC): ${parsedDate.format("DD/MM/YYYY HH:mm:ss")}`);
  
        // Conversion en fuseau horaire Paris
        parsedDate = parsedDate.tz('Europe/Paris', true);
  
        console.log(`readExcel --> parsedDate (Paris): ${parsedDate.format("DD/MM/YYYY HH:mm:ss")}`);
  
        // Vérification de la validité de la date
        if (parsedDate.isValid()) {
          row.Date = parsedDate;
          console.log(`readExcel --> parsedDate formatée : ${parsedDate.format("DD/MM/YYYY HH:mm:ss")}`);
          console.log(`readExcel --> parsedDate en UTC : ${parsedDate.utc().format("DD/MM/YYYY HH:mm:ss")}`);
        } else {
          throw new Error("Date invalide");
        }
      } catch (error) {
        console.error(`Impossible de parser la date : ${fullDateStr}`);
        console.error(error.message);
        process.exit(1); // Arrêt du script en cas d'erreur
      }
    } else {
      console.warn(`La valeur de la colonne "Date" n'est pas un nombre, skipped: ${fullDateStr}`);
    }
  });

  return data;
}

// === SCRAPING DES DONNÉES MÉTÉO ===

// Récupère les données météo pour une commune et une date
async function performScraping(idCommune, date) {
  const dayjsDate = dayjs(date, DATEHOUR_FORMAT, true);
  const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${idCommune}&jour2=${dayjsDate.date()}&mois2=${dayjsDate.month()}&annee2=${dayjsDate.year()}&affint=1`;

  console.log("performScraping -> url : " + url);

  const response = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const $ = cheerio.load(response.data);
  const table = $('table:nth-child(3)[width="100%"]');
  const dataWeather = [];

  table.find("tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    const heure = $(cells[0]).text().replace("h", ":");
    const temperature = $(cells[2]).text().replace("°C", "").trim();

    if (heure && temperature) {
      const fullDate = dayjs(`${date.format(DATE_FORMAT)} ${heure}:00`, DATEHOUR_FORMAT, true);
      if (fullDate.isValid()) {
        dataWeather.push({ idCommune, heure, temperature, dayjs: fullDate });
      }
    }
  });
  return dataWeather;
}

// Récupère l'id de station météo
async function performIdStationScraping(stationName) {
  const url = `https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=${stationName}`;
  const response = await axios.post(url);
  const idStation = response.data.split("|")[0];
  return idStation;
}

// Récupération des données météo entre deux dates
async function getWeatherDataBetween2Dates(idCommune, startDate, endDate) {
  
  console.log("getWeatherDataBetween2Dates -> startDate : " + startDate);

  let dateIteration = startDate.clone();
  const datasWeather = [];

  while (dateIteration.isBefore(endDate)) {
    const dayWeather = await performScraping(idCommune, dateIteration);
    datasWeather.push(...dayWeather);
    dateIteration = dateIteration.add(1, "day");
  }

  const filteredDatas = datasWeather.filter(
    (data) =>
      data.dayjs.isAfter(startDate) && data.dayjs.isBefore(endDate)
  );

  const temperatures = filteredDatas.map((data) => Number(data.temperature));
  return {
    idCommune,
    startDate: startDate.format(DATEHOUR_FORMAT),
    endDate: endDate.format(DATEHOUR_FORMAT),
    minTemperature: Math.min(...temperatures).toFixed(2),
    maxTemperature: Math.max(...temperatures).toFixed(2),
    averageTemperature: getAverage(filteredDatas),
    medianTemperature: findMedian(filteredDatas),
  };
}

const formatData = (jsonArray) => {
  let previousDate = "";
  const dateArray = [];

  jsonArray.forEach((entry) => {
    // Vérification que la date est valide
    if (!entry.Date) {
      console.warn("Date invalide ou manquante dans l'entrée, ignorée.");
      return; // Passe à l'entrée suivante si la date est invalide
    }

    // Initialisation d'un objet pour stocker les données de la ligne
    const rowData = {};

    // Si on a une date précédente et que l'entrée a des températures définies
    if (previousDate !== "" && entry.Min !== undefined && entry.Max !== undefined) {
      rowData["begin"] = previousDate;
      rowData["end"] = entry.Date;
      dateArray.push(rowData);
    }

    // Mettre à jour la précédente date seulement si les conditions sont remplies
    previousDate = entry.Date;
  });

  return dateArray;
};

// === EXEMPLE PRINCIPAL ===

(async () => {
  const excelFile = "assets/InputData.xlsx";
  const sheetName = "Suivi Conso New";
  const firstRow = 2;

  const jsonData = readExcel(excelFile, sheetName, firstRow);

  console.log("main -> jsonData : " + JSON.stringify(jsonData, null, 2));

  // Formatage des données dans un tableau avec la date/heure de début et de fin sur chaque ligne
  const inputDatas = formatData(jsonData);

  console.log("main -> inputDatas : " + JSON.stringify(inputDatas, null, 2));


  const idCommune = await performIdStationScraping("Bressuire");

  console.log("main -> idCommune : " + idCommune);

  for (const entry of inputDatas) {
    const startDate = dayjs(entry.begin, DATEHOUR_FORMAT, true);
    const endDate = dayjs(entry.end, DATEHOUR_FORMAT, true);

    const weatherData = await getWeatherDataBetween2Dates(
      idCommune,
      startDate,
      endDate
    );
    console.log(weatherData);
  }
})();
