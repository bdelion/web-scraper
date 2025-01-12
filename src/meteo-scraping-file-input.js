#!/usr/bin/env node

"use strict";

// === MODULES IMPORTÉS ===
const axios = require("axios");
const cheerio = require("cheerio");
const { getAverage, findMedian } = require("./utils/mathUtils");
const { excelDateToDayjs, formatHour, JSDateToString } = require("./utils/dateHourUtils");
const { ScrapingError } = require("./errors/customErrors");
const { writeExcel, readExcel } = require("./utils/excelUtils");
const { dayjs, DATE_FORMAT, HOUR_FORMAT, DATEHOUR_FORMAT } = require("./config/dayjsConfig");
const { performIdStationScraping, performObservationScraping } = require("./scrapers/weatherScraper");

// === SCRAPING DES DONNÉES MÉTÉO ===

// Récupération des données météo entre deux dates
async function getWeatherDataBetween2Dates(weatherStationId, startDate, endDate) {
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
  formatData
};
