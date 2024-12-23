#!/usr/bin/env node

"use strict";

// Requiring the module
const XLSX = require("xlsx");
const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");

// Obtenir la moyenne d'une propriété d'un tableau d'objet
function getAverage(tableauObjets) {
  let sum = 0;

  //TODO avec reduce https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce

  if(!tableauObjets.length){
    return sum;  
  }
  for (let i = 0; i < tableauObjets.length; i++){
    sum += Number(tableauObjets[i].temperature);
  }
  return (sum / tableauObjets.length).toFixed(2).toString();
}

// Obtenir la valeur médiane d'un tableau
function findMedian(tableauObjets) {
  tableauObjets.sort((a, b) => a.temperature - b.temperature);
  const middleIndex = Math.floor(tableauObjets.length / 2);
  if (tableauObjets.length % 2 === 0) {
    return ((Number(tableauObjets[middleIndex - 1].temperature) + Number(tableauObjets[middleIndex].temperature)) / 2).toFixed(2).toString();
  } else {
    return tableauObjets[middleIndex].temperature.toString();
  }
}

// Scrapper les données sur le site pour une commune et une date données
async function performScraping(idCommune, date) {
  const momentDate = moment(date, "DD/MM/YYYY HH:mm:ss");
  let day = momentDate.date();
  let month = momentDate.month();
  let year = momentDate.year();
  // URL de récupération des données
  let url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${idCommune}&jour2=${day}&mois2=${month}&annee2=${year}&affint=1`;
  
  // Télécharger la page Web cible en effectuant une requête HTTP GET via Axios
  const axiosResponse = await axios.request({
    method: "GET",
    url: url,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    },
  });

  // Analyser la source HTML de la page Web cible avec Cheerio
  const $ = cheerio.load(axiosResponse.data);

  // Sélection de l'élément dans la source HTML
  const table = $('table:nth-child(3)[width="100%"]');

  // Initialisation de la structure de données qui contiendra les données scrapées
  const dataWeather = [];

  // Parcours de chaque ligne du contenu scrapé en utilisant les méthodes find et each
  table
    .find("tbody")
    .find("tr")
    .each((i, row) => {
      // Initialisation d'un objet vide pour stocker les données de la ligne
      const rowData = {};

      // Parcours de chaque cellule de la ligne en utilisant les méthodes find et each
      const dataLine = [];
      $(row)
        .find("td")
        .each((j, cell) => {
          // Ajout des données de la cellule à une ligne de l'objet de données
          dataLine.push($(cell).text());
        });

      // Si ligne de données et température non vide
      if (!(dataLine[0] === "Heurelocale") && !(dataLine[2].trim().length === 0)) {
        rowData["idCommune"] = idCommune;
        rowData["jour"] = momentDate.format("DD/MM/YYYY");
        rowData["heure"] = dataLine[0].replace("h", ":");
        rowData["moment"] = moment(rowData["jour"] + " " + rowData["heure"], "DD/MM/YYYY HH:mm:ss");
        //TODO Replace string by number
        rowData["temperature"] = dataLine[2].substring(0, dataLine[2].indexOf(" �C"));
        // Ajout des données de la ligne au tableau des résultats retournés
        dataWeather.push(rowData);
      }
    });

  // Renvoie des données du tableau
  return dataWeather;
}

// Récupération des températures d'une commune entre une date/heure de début et de fin
async function getWeatherDataBetween2Dates(idCommune, startDate, endDate) {
  console.log("idCommune: " + idCommune + " / startDate: " + startDate + " / endDate: " + endDate);
  
  // Initialisation de la structure qui contiendra les données scrapées sur le site
  let datasWeather = [];
  const dateStart = moment(startDate, "DD/MM/YYYY HH:mm:ss");
  const dateEnd = moment(endDate, "DD/MM/YYYY HH:mm:ss");
  // On fixe la borne pour l'itération au jour suivant
  const dateEndIteration = dateEnd.clone().add(1, "days");

  let dateIteration = dateStart.clone();
  while (dateIteration < dateEndIteration) {
    datasWeather = datasWeather.concat(
      await performScraping(idCommune, dateIteration)
    );
    dateIteration.add(1, "days");
  }

  // Tri des données par date
  datasWeather.sort((a, b) => a.moment - b.moment);
  // Initialisation de la structure qui contiendra les données filtrées entre la date/heure de début et de fin
  let filteredDatasWeather = [];
  // Filtrer les données sur une plage de dates
  datasWeather.forEach(function (value) {
    if (value["moment"] >= dateStart && value["moment"] <= dateEnd) {
      // Ajouter la ligne de données au tableau des données filtrées
      filteredDatasWeather.push(value);
    }
  });

  // Trier les données par température croissante
  filteredDatasWeather.sort((a, b) => a.temperature - b.temperature);
  // Initialisation d'un objet vide pour stocker la ligne de données du résultat
  const rowData = {};
  rowData["idCommune"] = idCommune;
  rowData["date"] = endDate;
  rowData["moment"] = dateEnd;
  // TODO faire des tests sans la transformations "." en "," et avec le formattage des données lors de l'écriture du fichier
  rowData["temperatureMin"] = filteredDatasWeather[0].temperature.replace(".", ",");
  rowData["temperatureMax"] = filteredDatasWeather[filteredDatasWeather.length - 1].temperature.replace(".", ",");
  rowData["temperatureMoyenne"] = getAverage(filteredDatasWeather).replace(".", ",");
  rowData["temperatureMediane"] = findMedian(filteredDatasWeather).replace(".", ",");
  return rowData;
}

// Récupération de l'id de la station météo d'une ville
async function performIdStationScraping(stationName) {
  let url = `https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=${stationName}`;

  try {
    // downloading the target web page by performing an HTTP GET request in Axios
    const axiosResponse = await axios.request({
      method: "POST",
      url: url,
      headers: {
        "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      },
    })
    
    // Vérifier si le contenu est vide
    if (!axiosResponse.data || axiosResponse.data === '') {
      throw new Error('La réponse est vide');
    }
    
    // Si tout est bon, tu peux continuer avec le traitement des données
    console.log('Données reçues:', axiosResponse.data);
    // Return the Weather Station Id bu Parsing the response, format : 7156|Paris-Montsouris (75)|0|75|0|1716185221
    return axiosResponse.data.substring(0, axiosResponse.data.indexOf("|"));
  } catch (error) {
    // Remonter l'erreur à la méthode appelante
    throw error;
  }
}

// Création d'un tableau avec la date/heure de début et de fin sur une ligne
const formatData = (jsonArray) => {
  let previousDate = "";
  const dateArray = [];

  jsonArray.forEach((entry) => {
    // Initialisation d'un objet vide pour stocker les données de la ligne
    const rowData = {};
    // On ne veut que les intervalles sans données de températures
    //TOREDO if ((previousDate !== "") && (entry.Min === undefined) && (entry.Max === undefined)) {
      if ((previousDate !== "")) {
      rowData["begin"] = previousDate;
      rowData["end"] = entry.Date;
      dateArray.push(rowData);
    }
    previousDate = entry.Date;
  });

  return dateArray;
};

// Transformation de la date d'un format number en un format object (ex : 2024-09-07T05:59:00.000Z)
const parseExcelDate = (excelDate) => {
  // 1. Calculer la partie entière (jours) et la partie fractionnelle (heure)
  const days = Math.floor(excelDate);  // Partie entière, nombre de jours
  const fractionOfDay = excelDate - days;  // Partie décimale, fraction du jour

  // 2. Créer une date de référence Excel (1er janvier 1900)
  const excelEpoch = new Date(1900, 0, 1);

  // 3. Ajouter le nombre de jours à la date de référence
  excelEpoch.setDate(excelEpoch.getDate() + days - 2); // -1 pour ajuster le décalage Excel

  // 4. Convertir la fraction de jour en heures, minutes, secondes
  const totalSeconds = Math.round(fractionOfDay * 24 * 60 * 60);  // Fractions de jour en secondes
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // 5. Ajouter les heures, minutes et secondes à la date
  excelEpoch.setHours(hours);
  excelEpoch.setMinutes(minutes);
  excelEpoch.setSeconds(seconds);

  return excelEpoch;
};

// Lecture du fichier Excel et enregistrement dans un json
const readExcel = (inputFile, sheetName, firstRow) => {
  const workbook = XLSX.readFile(inputFile);
  // Lire la feuille passée en paramètre
  const sheet = workbook.Sheets[sheetName];

  // Convertir les données de la feuille en JSON, lire à partir de la 2nde ligne les données en brut
  const data = XLSX.utils.sheet_to_json(sheet, { range: firstRow, raw: true });
  //TODEL console.log("Données brutes :", data);

  // Traiter les dates
  data.forEach(row => {
    // console.log("Ligne actuelle :", row); // Afficher chaque ligne pour voir la structure
    if (row.Date) {
      console.log("Date avant transformation : ", row.Date, "Type : ", typeof row.Date); // Afficher la date actuelle
      // Transformer les dates si besoin
      row.Date = parseExcelDate(row.Date);
      console.log("Date après transformation : ", row.Date, "Type : ", typeof row.Date); // Afficher la date transformée
    }
  });

  return data;
};

// Écriture du fichier Excel avec les dates et nombres formatés à partir du json des résultats
const writeExcel = (data, outputFile) => {
  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.json_to_sheet(data, { cellDates: true ,  dateNF: "DD/MM/YYYY HH:mm:ss"});
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

// Initialisation de la structure de données qui contiendra les résulats
let weatherDatas = [];

async function main() {
  // Lecture des données sources à partir d'une feuille d'un fichier Excel donné
  const jsonResult = readExcel("assets/InputData.xlsx", "Suivi Conso New", 2);
  // Formatage des données dans un tableau avec la date/heure de début et de fin sur chaque ligne
  const inputDatas = formatData(jsonResult);
  // Déclaration
  let stationId;
  let precValueEnd;

  // Récupération de l'id de la station météo d'une ville donnée
  try {
    stationId = await performIdStationScraping("Bressuire");
    console.log("stationId: " + stationId);
  } catch (error) {
    // Gérer l'erreur remontée lors de la récupération de l'id de la station météo
    console.error('Erreur performIdStationScraping :', error.message);
    // Stopper le script
    process.exit(1);
  }
  
  // Pour chacune des lignes, récuparation des infos
  for (const currentValue of inputDatas) {
    // La date/heure de début et de fin doivent être différente
    if (!((currentValue.end - currentValue.begin) === 0)) {
      // Push du résultat entre deux dates/heures dans le tableau
      weatherDatas.push(
        // Récupération des températures entre deux dates/heures
        await getWeatherDataBetween2Dates(
          stationId,
          currentValue.begin,
          currentValue.end
        )
      );
      precValueEnd = currentValue.end;
    } else {
      if ((precValueEnd - currentValue.begin) === 0) {
        weatherDatas.push(weatherDatas[weatherDatas.length - 1]);
      } else {
        console.log("######### ALERTE : " + precValueEnd + "/" + currentValue.begin + "/" + currentValue.end + " #########");
      }
    }
  }

  // Tri des données par date
  // TODEL moment ? weatherDatas.sort((a, b) => a.moment - b.moment);
  // TODO ? weatherDatas.sort((a, b) => a.date - b.date);
  return weatherDatas;
};

// Save result in Excel file
main()
  .then((result) => {
    // Sauvegarde des résultats
    writeExcel(result, "assets/OutputData.xlsx");
  })
  .catch((err) => console.error(err));
