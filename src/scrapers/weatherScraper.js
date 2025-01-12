const axios = require("axios");
const cheerio = require("cheerio");
const { ScrapingError } = require("../errors/customErrors");
const { dayjs, DATE_FORMAT, DATEHOUR_FORMAT, HOUR_FORMAT } = require("../config/dayjsConfig");
const { formatHour, excelDateToDayjs } = require("../utils/dateHourUtils");
const { getAverage, findMedian } = require("../utils/mathUtils");
const { log } = require("../utils/logUtils");

// === CONSTANTES ===
// URL de l'API pour la récupération de l'ID de station
const BASE_URL = 'https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=';
// Constante pour l'en-tête User-Agent
const USER_AGENT = "Mozilla/5.0";

function cleanTemperature(temp) {
  const parsedTemp = parseFloat(temp);
  return isNaN(parsedTemp) ? null : parsedTemp;
}

function extractWeatherDataRow(row, $) {
  const cells = $(row).find("td");
  return {
    heure: $(cells[0]).text().trim(),
    temperature: $(cells[2]).text().replace(/[^0-9.-]/g, "").trim() // Nettoyage avancé
  };
}

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

  log(`URL appelée ${url}`, "info");

  try {
    const response = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (response.status !== 200) {
      throw new ScrapingError(`HTTP error: Received status ${response.status}`, { url });
    }

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

  log(`dayjsStartDate HOUR FORMAT : ${dayjsStartDate.format(HOUR_FORMAT)}`, "info");
  log(`dayjsEndDate HOUR FORMAT : ${dayjsEndDate.format(HOUR_FORMAT)}`, "info");
  log(`Compare : ${(dayjsEndDate.format(HOUR_FORMAT) > dayjsStartDate.format(HOUR_FORMAT))}`, "info");

  if ((dayjsStartDate.format(DATE_FORMAT) === dayjsEndDate.format(DATE_FORMAT)) || (dayjsEndDate.format(HOUR_FORMAT) > dayjsStartDate.format(HOUR_FORMAT))) {
    dateEndIteration = dayjsEndDate.clone();
  } else {
    dateEndIteration = dayjsEndDate.clone().add(1, "day");
  }
  
  log(`dayjsStartDate : ${dayjsStartDate}`, "info");
  log(`dayjsEndDate : ${dayjsEndDate}`, "info");
  log(`dateEndIteration : ${dateEndIteration}`, "info");

  const datasWeather = [];
  // Scraping de données pour la station sur la plage de dates
  while (dateIteration.isBefore(dateEndIteration)) {
    log(`dateIteration : ${dateIteration}`, "info");
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

  log(`Tableau des températures entre ${dayjsStartDate} et ${dayjsEndDate} : ${temperatures}`, "info");
  
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

module.exports = {
  performIdStationScraping,
  getWeatherDataBetween2Dates,
};
