#!/usr/bin/env node

"use strict";

// === MODULES IMPORTÉS ===
const { JSDateToString } = require("./utils/dateHourUtils");
const { ScrapingError } = require("./errors/customErrors");
const { writeExcel, readExcel } = require("./utils/excelUtils");
const { DATEHOUR_FORMAT } = require("./config/dayjsConfig");
const { performIdStationScraping, getWeatherDataBetween2Dates } = require("./scrapers/weatherScraper");
const { log } = require("./utils/logUtils");

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
  log("Démarrage du script", "info");

  const excelFile = "assets/InputData.xlsx";
  const sheetName = "Suivi Conso New";
  const firstRow = 2;
  const weatherStationName = "Bressuire";

  // Lecture du fichier Excel
  log(`Lecture du fichier Excel : ${excelFile}`, "info");
  const jsonExcelData = readExcel(excelFile, sheetName, firstRow);

  // Formatage des données dans un tableau avec la date/heure de début et de fin sur chaque ligne
  log(`Formatage des données issues du fichier`, "info");
  const inputData = formatData(jsonExcelData);

  // Récupération de l'id de la station météo souhaitée
  log(`Récupération de l'id de la station météo de : ${weatherStationName}`, "info");
  const weatherStationId = await performIdStationScraping(weatherStationName);

  // Initialisation de la structure de données qui contiendra les résulats
  let weatherData = [];
  let previousEndDate = 0;

  for (const entry of inputData) {    
    if (!((entry.end - entry.begin) === 0)) {
      // Push du résultat entre deux dates/heures dans le tableau
      log(`Récupération des données météo de la station entre le ${JSDateToString(entry.begin)} et le ${JSDateToString(entry.end)}`, "warn");
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
      if (((previousEndDate - entry.begin) === 0) && ((entry.end - entry.begin) === 0)) {
        weatherData.push(weatherData[weatherData.length - 1]);
      } else {
        throw new ScrapingError(`There is a problem with date ranges : ${previousEndDate.format(DATEHOUR_FORMAT)} / ${entry.begin.format(DATEHOUR_FORMAT)} / ${entry.end.format(DATEHOUR_FORMAT)}`);
      }
    }
  }

  // Sauvegarde des résultats
  log(`Sauvegarde du résultat dans le fichier Excel`, "info");
  writeExcel(weatherData, "assets/OutputData.xlsx");

  log("Fin du script", "info");
})().catch((err) => console.error(err));
