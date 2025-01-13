const axios = require("axios");
const cheerio = require("cheerio");
const { ScrapingError } = require("../errors/customErrors");
const { dayjs, DATE_FORMAT, DATEHOUR_FORMAT, HOUR_FORMAT } = require("../config/dayjsConfig");
const { formatHour, excelDateToDayjs } = require("../utils/dateHourUtils");
const { getAverage, findMedian } = require("../utils/mathUtils");
const { log } = require("../utils/logUtils");

// === CONSTANTS ===
// API URL for retrieving the station ID
const BASE_URL = 'https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=';
// User-Agent header constant
const USER_AGENT = "Mozilla/5.0";

/**
 * Cleans and parses a temperature string into a float.
 * @param {string} temp - The temperature as a string.
 * @returns {number|null} - The cleaned temperature as a float, or null if invalid.
 */
function cleanTemperature(temp) {
  const parsedTemp = parseFloat(temp);
  return isNaN(parsedTemp) ? null : parsedTemp;
}

/**
 * Extracts weather data from a table row.
 * @param {Object} row - The table row element.
 * @param {Object} $ - The cheerio instance for DOM manipulation.
 * @returns {Object} - An object containing extracted hour and temperature.
 */
function extractWeatherDataRow(row, $) {
  const cells = $(row).find("td");
  return {
    heure: $(cells[0]).text().trim(),
    temperature: $(cells[2]).text().replace(/[^0-9.-]/g, "").trim()
  };
}

/**
 * Processes a weather data row and formats it.
 * @param {Object} row - The table row element.
 * @param {Object} $ - The cheerio instance for DOM manipulation.
 * @param {Object} date - The dayjs date object.
 * @param {string} weatherStationId - The station ID.
 * @returns {Object|null} - The formatted weather data or null if invalid.
 */
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
 * Retrieves the station ID using the station name.
 * @param {string} weatherStationName - The name of the weather station.
 * @returns {Promise<string>} - The station ID.
 * @throws {ScrapingError} - Throws if the station name or response is invalid.
 */
async function performIdStationScraping(weatherStationName) {
  if (typeof weatherStationName !== 'string' || !weatherStationName.trim()) {
    throw new ScrapingError("Invalid 'weatherStationName'", { weatherStationName });
  }

  const encodedStationName = encodeURIComponent(weatherStationName);
  const url = `${BASE_URL}${encodedStationName}`;

  try {
    const response = await axios.post(url, {}, {
      headers: { "User-Agent": USER_AGENT }
    });

    if (!response.data || typeof response.data !== 'string') {
      throw new ScrapingError("Invalid response received for the station", { weatherStationName });
    }

    const idStation = response.data.split("|")[0].trim();

    if (!idStation) {
      throw new ScrapingError("Station ID not found in the response", { weatherStationName });
    }

    if (!(!isNaN(Number(idStation)) && Number(idStation).toString() === idStation)) {
      throw new ScrapingError("Station ID is not a number in the response", { weatherStationName });
    }

    return idStation;
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error;
    }
    throw new ScrapingError(`Unexpected error on ${url}: ${error.message}`, { originalError: error });
  }
}

/**
 * Retrieves weather data for a given station and date.
 * @param {string} weatherStationId - The weather station ID.
 * @param {Object} date - The dayjs date object.
 * @returns {Promise<Array>} - An array of weather data.
 * @throws {ScrapingError} - Throws if the station ID or date is invalid, or on network errors.
 */
async function performObservationScraping(weatherStationId, date) {
  if (typeof weatherStationId !== 'string' || !weatherStationId.trim()) {
    throw new ScrapingError("Invalid 'weatherStationId'", { weatherStationId });
  }
  if (!dayjs.isDayjs(date) || !date.isValid()) {
    throw new ScrapingError(`Invalid 'date': expected a valid dayjs object but received ${typeof date}`, { date });
  }

  const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${weatherStationId}&jour2=${date.date()}&mois2=${date.month()}&annee2=${date.year()}&affint=1`;

  log(`URL called: ${url}`, "info");

  try {
    const response = await axios.get(url, { headers: { "User-Agent": USER_AGENT } });
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
      throw new ScrapingError(`HTTP error on ${url}: ${error.response.statusText} (${error.response.status})`, { url });
    }
    if (error.request) {
      throw new ScrapingError(`Network error while accessing ${url}`, { url, originalError: error });
    }
    throw new ScrapingError(`Unexpected error: ${error.message}`, { url, originalError: error });
  }
}

/**
 * Retrieves weather data between two dates for a given station.
 * @param {string} weatherStationId - The weather station ID.
 * @param {number} startDate - The start date in Excel format.
 * @param {number} endDate - The end date in Excel format.
 * @returns {Promise<Object>} - Weather data summary including min, max, average, and median temperatures.
 */
async function getWeatherDataBetween2Dates(weatherStationId, startDate, endDate) {
  const dayjsStartDate = excelDateToDayjs(startDate, 'Europe/Paris');
  const dayjsEndDate = excelDateToDayjs(endDate, 'Europe/Paris');
  let dateIteration = dayjsStartDate.clone();
  let dateEndIteration;

  if ((dayjsStartDate.format(DATE_FORMAT) === dayjsEndDate.format(DATE_FORMAT)) || (dayjsEndDate.format(HOUR_FORMAT) > dayjsStartDate.format(HOUR_FORMAT))) {
    dateEndIteration = dayjsEndDate.clone();
  } else {
    dateEndIteration = dayjsEndDate.clone().add(1, "day");
  }

  log(`Start Date: ${dayjsStartDate}`, "info");
  log(`End Date: ${dayjsEndDate}`, "info");
  log(`End Iteration Date: ${dateEndIteration}`, "info");

  const datasWeather = [];
  while (dateIteration.isBefore(dateEndIteration)) {
    log(`Iteration Date: ${dateIteration}`, "info");
    const dayWeather = await performObservationScraping(weatherStationId, dateIteration);
    datasWeather.push(...dayWeather);
    dateIteration = dateIteration.add(1, "day");
  }

  const filteredDatas = datasWeather.filter(
    (data) =>
      ((data.dayjs.isSame(dayjsStartDate) || data.dayjs.isAfter(dayjsStartDate)) && (data.dayjs.isSame(dayjsEndDate) || data.dayjs.isBefore(dayjsEndDate)))
  );

  const temperatures = filteredDatas.map((data) => Number(data.temperature));

  log(`Temperatures between ${dayjsStartDate} and ${dayjsEndDate}: ${temperatures}`, "info");

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
