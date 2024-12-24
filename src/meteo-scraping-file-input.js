#!/usr/bin/env node

"use strict";

// Requiring the module
const XLSX = require("xlsx");
const axios = require("axios");
const cheerio = require("cheerio");

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc'); // Plugin pour UTC
const timezone = require('dayjs/plugin/timezone'); // Plugin pour timezone

// Charger les plugins
dayjs.extend(utc);
dayjs.extend(timezone);


const customParseFormat = require('dayjs/plugin/customParseFormat');
// Charger la locale française
require('dayjs/locale/fr');
// Appliquer la locale à Day.js
dayjs.locale('fr');
// Appliquer le plugin customParseFormat pour gérer les formats personnalisés
dayjs.extend(customParseFormat);

const dateFormat = "DD/MM/YYYY";
const datehourFormat = "DD/MM/YYYY HH:mm:ss";

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
  const dayjsDate = dayjs(date, datehourFormat, true);

  console.log("performScraping ->  date.toISOString : " + date.toISOString());
  console.log("performScraping ->  date.format : " + date.format(datehourFormat));
  console.log("performScraping ->  date.toString : " + date.toString());

  //TODEL console.log("performScraping -> locale : " + dayjs.locale());

  //TODEL console.log("performScraping -> Date locale actuelle avec Day.js : ", dayjs().format());

  //TODEL console.log("performScraping -> dayjsDate : " + dayjsDate.format(datehourFormat));

  let day = dayjsDate.date();
  let month = dayjsDate.month();
  let year = dayjsDate.year();
  // URL de récupération des données
  let url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${idCommune}&jour2=${day}&mois2=${month}&annee2=${year}&affint=1`;

  console.log("performScraping -> url : " + url);
  
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
        rowData["jour"] = dayjsDate.format(dateFormat);

        //TODEL console.log("performScraping ->rowData[jour] : " + rowData["jour"]);

        //TODEL console.log("performScraping -> dataLine[0] : " + dataLine[0]);

        rowData["heure"] = dataLine[0].replace("h", ":");

        //TODEL console.log("performScraping ->  rowData[heure] : " + rowData["heure"]);

        const cleanedJour = rowData["jour"]?.trim();
        let cleanedHeure = rowData["heure"]?.trim() || "00:00"; // Si "heure" est manquant, ajouter "00:00"

        // Vérifie et complète les heures et minutes si nécessaire
        const heureParts = cleanedHeure.split(":");

        if (heureParts.length === 2) {
          // Complète les heures et minutes à deux chiffres
          const heures = heureParts[0].padStart(2, "0");
          const minutes = heureParts[1].padStart(2, "0");
          cleanedHeure = `${heures}:${minutes}`;
        } else {
          cleanedHeure = "00:00"; // Valeur par défaut si format incorrect
        }
        
        const fullDateStr = `${cleanedJour} ${cleanedHeure}:00`; // Ajoute les secondes par défaut        

        console.log("performScraping ->  fullDateStr : " + fullDateStr);

        //TODO? rowData["dayjs"] = dayjs(fullDateStr, datehourFormat, true);
        rowData["dayjs"] = dayjs(fullDateStr, datehourFormat, true);

        console.log("performScraping ->  rowData[dayjs] : " + rowData["dayjs"]);
        console.log("performScraping ->  rowData[dayjs].tz : " + rowData["dayjs"].tz('Europe/Paris'));
        console.log("performScraping ->  rowData[dayjs].toISOString : " + rowData["dayjs"].toISOString());
        console.log("performScraping ->  rowData[dayjs].format : " + rowData["dayjs"].format(datehourFormat));
        console.log("performScraping ->  rowData[dayjs].toString : " + rowData["dayjs"].toString());

        process.exit(1);

        //TODEL? rowData["dayjs"] = dayjs(rowData["jour"] + " " + rowData["heure"], datehourFormat, true);

        if (!rowData["dayjs"].isValid()) {
          console.error("performScraping ->  La date n'est pas valide :", fullDateStr);
          process.exit(1);  // Arrête l'exécution du script avec un code d'erreur (1)
        } else {
          //TODEL console.log("performScraping ->  Date valide :", rowData["dayjs"].format(datehourFormat));
        }

        //TODO Replace string by number
        rowData["temperature"] = dataLine[2].substring(0, dataLine[2].indexOf(" �C"));

        //TODEL console.log("performScraping -> rowData[jour] : " + rowData["jour"]);
        //TODEL console.log("performScraping -> rowData[heure] : " + rowData["heure"]);
        //TODEL console.log("performScraping -> rowData[dayjs] : " + rowData["dayjs"]);

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
      
  console.log("getWeatherDataBetween2Dates ->  startDate.toISOString : " + startDate.toISOString());
  console.log("getWeatherDataBetween2Dates ->  startDate.format : " + startDate.format(datehourFormat));
  console.log("getWeatherDataBetween2Dates ->  startDate.toString : " + startDate.toString());
  console.log("getWeatherDataBetween2Dates ->  endDate.toISOString : " + endDate.toISOString());
  console.log("getWeatherDataBetween2Dates ->  endDate.format : " + endDate.format(datehourFormat));
  console.log("getWeatherDataBetween2Dates ->  endDate.toString : " + endDate.toString());
  
  // Initialisation de la structure qui contiendra les données scrapées sur le site
  let datasWeather = [];
  //TODEL? const dateStart = dayjs(startDate, datehourFormat, true);
  //TODEL? const dateEnd = dayjs(endDate, datehourFormat, true);
  // On fixe la borne pour l'itération au jour suivant
  //TODO? const dateEndIteration = endDate.clone().add(1, "day");
  const dateEndIteration = endDate.clone();
  let dateIteration = startDate.clone();

  while (dateIteration.isBefore(dateEndIteration)) {  // Utilisation de .isBefore() pour la comparaison

    console.log("getWeatherDataBetween2Dates ->  dateIteration.toISOString : " + dateIteration.toISOString());
    console.log("getWeatherDataBetween2Dates ->  dateIteration.format : " + dateIteration.format(datehourFormat));
    console.log("getWeatherDataBetween2Dates ->  dateIteration.toString : " + dateIteration.toString());

    datasWeather = datasWeather.concat(
      await performScraping(idCommune, dateIteration)
    );

    //TODEL console.log("getWeatherDataBetween2Dates -> dateIteration before : " + dateIteration.format(datehourFormat));

    dateIteration = dateIteration.add(1, "day");  // Réassignation après modification de dateIteration

    //TODEL console.log("getWeatherDataBetween2Dates -> dateIteration after : " + dateIteration.format(datehourFormat));
  }

  // Tri des données par date
  datasWeather.sort((a, b) => a.dayjs.valueOf() - b.dayjs.valueOf());
  
  console.log("getWeatherDataBetween2Dates -> datasWeather : " + JSON.stringify(datasWeather, null, 2));

  // Initialisation de la structure qui contiendra les données filtrées entre la date/heure de début et de fin
  let filteredDatasWeather = [];
  // Filtrer les données sur une plage de dates
  datasWeather.forEach(function (value) {

    //TODEL console.log("getWeatherDataBetween2Dates -> value : " + JSON.stringify(value, null, 2));

    //TODEL console.log("getWeatherDataBetween2Dates -> dateStart : " + dayjs(dateStart, datehourFormat, true).toString());
    //TODEL console.log("getWeatherDataBetween2Dates -> value[dayjs] : " + dayjs(value["dayjs"], datehourFormat, true).toString());
    //TODEL console.log("getWeatherDataBetween2Dates -> dateEnd : " + dayjs(dateEnd, datehourFormat, true).toString());

    if (value["dayjs"].valueOf() >= startDate.valueOf() && value["dayjs"].valueOf() <= endDate.valueOf()) {
      // Ajouter la ligne de données au tableau des données filtrées
      filteredDatasWeather.push(value);
    }
  });

  console.log("getWeatherDataBetween2Dates -> value : " + JSON.stringify(filteredDatasWeather, null, 2));

  // Trier les données par température croissante
  filteredDatasWeather.sort((a, b) => a.temperature - b.temperature);

  // Initialisation d'un objet vide pour stocker la ligne de données du résultat
  const rowData = {};
  rowData["idCommune"] = idCommune;
  rowData["date"] = endDate;
  rowData["dayjs"] = endDate;

  //TODEL console.log("getWeatherDataBetween2Dates -> rowData[date] : " + rowData["date"]);
  //TODEL console.log("getWeatherDataBetween2Dates -> rowData[dayjs] : " + rowData["dayjs"]);


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
    
    //######################################### TOREDO if ((previousDate !== "") && (entry.Min === undefined) && (entry.Max === undefined)) { #########################################
    
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

// Transformation de la date d'un format number en un format object (ex : 2024-09-07T05:59:00.000Z)
function excelDateToJSDate(serial) {
  const excelEpoch = new Date(Date.UTC(1900, 0, 1));
  const daysOffset = serial >= 60 ? serial - 2 : serial - 1; // Bug Excel 1900
  return new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
}

// Lecture du fichier Excel et enregistrement dans un json
const readExcel = (inputFile, sheetName, firstRow) => {
  const workbook = XLSX.readFile(inputFile);
  // Lire la feuille passée en paramètre
  const sheet = workbook.Sheets[sheetName];

  // Convertir les données de la feuille en JSON, lire à partir de la 2nde ligne les données en brut
  const data = XLSX.utils.sheet_to_json(sheet, { range: firstRow, raw: true });
  
  //TODEL console.log("Données brutes :", data);

/*   data.forEach((row, index) => {
    //TODEL console.log(`Row ${index + 1}:`, row);
    const fullDateStr = row["Date"]; // Remplace "Date" par le nom de ta colonne
    console.log(`Value in "Date" column:`, fullDateStr, typeof fullDateStr);
  }); */

  // Exemple : si tu veux travailler sur la première ligne et vérifier les dates
  data.forEach(row => {
    const fullDateStr = row["Date"]; // Remplace "Date" par le nom de ta colonne
  
    // Si la valeur est un nombre (timestamp Excel), convertis-la en date
    if (typeof fullDateStr === "number") {
      console.log("readExcel --> fullDateStr is Number : " + fullDateStr);
      console.log("readExcel --> excelDateToJSDate(fullDateStr) : " + excelDateToJSDate(fullDateStr));
      
      let parsedDate;
      parsedDate = dayjs(excelDateToJSDate(fullDateStr)).utc();

      console.log("readExcel --> parsedDate : " + parsedDate);
      console.log(parsedDate);

      parsedDate = parsedDate.tz('Europe/Paris', true); // true pour ne pas modifier l'heure interne

      console.log("readExcel --> parsedDate : " + parsedDate);
      console.log(parsedDate);
      console.log("Date formatée : ", parsedDate.format("DD/MM/YYYY HH:mm:ss"));
      process.exit(1);

      if (parsedDate && parsedDate.isValid()) {
        console.log("readExcel --> parsedDate formatée :", parsedDate.format("DD/MM/YYYY HH:mm:ss"));
        console.log("readExcel --> parsedDate formatée en utc :", parsedDate.utc().format("DD/MM/YYYY HH:mm:ss"));
        row.Date=parsedDate;
      } else {
        console.error("Impossible de parser la date :", fullDateStr);
        process.exit(1);
      }
    }
  });


/*       // Convertir le timestamp Excel (nombre de jours) en millisecondes
      // Excel commence le 1er janvier 1900, tandis que JavaScript commence le 1er janvier 1970
      const excelDate = (fullDateStr - 25569) * 86400 * 1000; // Calcul du nombre de millisecondes
      const parsedDate = dayjs(excelDate);
  
      if (!parsedDate.isValid()) {
        console.error("Invalid date format", fullDateStr);
        process.exit(1);
      } else {
        //TODEL console.log("Parsed date number:", parsedDate.format("DD MMMM YYYY HH:mm"));
      }
    } else if (fullDateStr instanceof Date) {
      console.log("readExcel --> fullDateStr is Date");

      // Si c'est déjà un objet Date natif
      const parsedDate = dayjs(fullDateStr);
  
      if (!parsedDate.isValid()) {
        console.error("Invalid date format", fullDateStr);
      } else {
        console.log("Parsed date:", parsedDate.format("DD MMMM YYYY HH:mm"));
      }
    } else {
      console.error("readExcel --> Non-date value:", fullDateStr);
    }
  });

  // Traiter les dates
  data.forEach(row => {
    // console.log("Ligne actuelle :", row); // Afficher chaque ligne pour voir la structure
    if (row.Date) {
      //TODEL console.log("Date avant transformation : ", row.Date, "Type : ", typeof row.Date); // Afficher la date actuelle
      // Transformer les dates si besoin
      //TODEL ? row.Date = parseExcelDate(row.Date);
      row.Date = dayjs((row.Date - 25569) * 86400 * 1000);
      //TODEL console.log("Date après transformation : ", row.Date, "Type : ", typeof row.Date); // Afficher la date transformée
    }
  }); */

  return data;
};

// Écriture du fichier Excel avec les dates et nombres formatés à partir du json des résultats
const writeExcel = (data, outputFile) => {
  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.json_to_sheet(data, { cellDates: true ,  dateNF: datehourFormat});
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

  console.log("main -> jsonResult : " + JSON.stringify(jsonResult, null, 2));

  // Formatage des données dans un tableau avec la date/heure de début et de fin sur chaque ligne
  const inputDatas = formatData(jsonResult);

  console.log("main -> inputDatas : " + JSON.stringify(inputDatas, null, 2));

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
      
      //TODEL console.log("main ->  currentValue.begin.toISOString : " + currentValue.begin.toISOString());
      //TODEL console.log("main ->  currentValue.begin.format : " + currentValue.begin.format(datehourFormat));
      //TODEL console.log("main ->  currentValue.begin.toString : " + currentValue.begin.toString());
      //TODEL console.log("main ->  currentValue.end.toISOString : " + currentValue.end.toISOString());
      //TODEL console.log("main ->  currentValue.end.format : " + currentValue.end.format(datehourFormat));
      //TODEL console.log("main ->  currentValue.end.toString : " + currentValue.end.toString());

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

    //TODEL console.log("main -> result : " + JSON.stringify(result, null, 2));

    // Sauvegarde des résultats
    writeExcel(result, "assets/OutputData.xlsx");
  })
  .catch((err) => console.error(err));
