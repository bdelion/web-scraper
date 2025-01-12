#!/usr/bin/env node

"use strict";

// Import des modules nécessaires
// const XLSX = require("xlsx");
const axios = require("axios");
const cheerio = require("cheerio");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const customParseFormat = require("dayjs/plugin/customParseFormat");

// Configuration et extensions de Day.js
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale("fr");

// Formats de date
const dateFormat = "DD/MM/YYYY";
const datehourFormat = "DD/MM/YYYY HH:mm:ss";

// Fonction pour calculer la moyenne d'une propriété dans un tableau d'objets
function getAverage(data) {
  if (!data.length) return "0";
  const sum = data.reduce((acc, item) => acc + parseFloat(item.temperature), 0);
  return (sum / data.length).toFixed(2);
}

// Fonction pour calculer la médiane d'une propriété dans un tableau d'objets
function findMedian(data) {
  const sorted = data.map(d => parseFloat(d.temperature)).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid].toFixed(2)
    : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);
}

// Fonction pour scrapper les données météo
async function performScraping(idCommune, date) {
  const dayjsDate = dayjs(date, datehourFormat, true);

  const day = dayjsDate.date();
  const month = dayjsDate.month();
  const year = dayjsDate.year();
  const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${idCommune}&jour2=${day}&mois2=${month}&annee2=${year}&affint=1`;

  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    },
  });

  const $ = cheerio.load(response.data);
  const rows = $('table:nth-child(3)[width="100%"] tbody tr');
  const weatherData = [];

  rows.each((_, row) => {
    const cells = $(row).find("td");
    const time = cells.eq(0).text().trim().replace("h", ":");
    const temperature = cells.eq(2).text().trim().replace("°C", "");

    if (time && temperature) {
      const fullDateStr = `${dayjsDate.format(dateFormat)} ${time.padStart(5, "0")}:00`;
      const parsedDate = dayjs(fullDateStr, datehourFormat, true);

      weatherData.push({
        idCommune,
        jour: dayjsDate.format(dateFormat),
        heure: time,
        dayjs: parsedDate,
        temperature: temperature,
      });
    }
  });

  return weatherData;
}

// Fonction pour récupérer les données météo entre deux dates
async function getWeatherDataBetween2Dates(idCommune, startDate, endDate) {
  let weatherData = [];
  let dateIteration = startDate.clone();
  const dateEndIteration = endDate.clone();

  while (dateIteration.isBefore(dateEndIteration)) {
    const dailyData = await performScraping(idCommune, dateIteration);
    weatherData = weatherData.concat(dailyData);
    dateIteration = dateIteration.add(1, "day");
  }

  weatherData.sort((a, b) => a.dayjs.valueOf() - b.dayjs.valueOf());

  const filteredData = weatherData.filter(
    d => d.dayjs.isBetween(startDate, endDate, null, "[]")
  );

  return {
    temperatureMin: findMedian(filteredData),
    temperatureMax: getAverage(filteredData),
    temperatureMoyenne: getAverage(filteredData),
    temperatureMediane: findMedian(filteredData),
  };
}

// Fonction pour obtenir l'ID d'une station météo
async function performIdStationScraping(stationName) {
  const url = `https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=${stationName}`;
  const response = await axios.post(url);
  const result = response.data.split("|")[0];
  if (!result) throw new Error("ID de station introuvable");
  return result;
}

// Fonction pour lire et convertir un fichier Excel
// function readExcel(inputFile, sheetName, firstRow) {
//   const workbook = XLSX.readFile(inputFile);
//   const sheet = workbook.Sheets[sheetName];
//   return XLSX.utils.sheet_to_json(sheet, { range: firstRow, raw: true });
// }

// Exemple d'exécution
(async () => {
  try {
    const idCommune = await performIdStationScraping("Bressuire");
    const startDate = dayjs("2023-12-01 00:00:00", datehourFormat, true);
    const endDate = dayjs("2023-12-05 23:59:59", datehourFormat, true);
    const data = await getWeatherDataBetween2Dates(idCommune, startDate, endDate);
    console.log("Données météo entre les dates :", data);
  } catch (error) {
    console.error("Erreur :", error.message);
  }
})();
