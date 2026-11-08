require("../config/env");

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { ScrapingError } = require("../errors/customErrors");
const { dayjs, DATE_FORMAT, DATEHOUR_FORMAT, HOUR_FORMAT } = require("../config/dayjsConfig");
const { JSDateToString, formatHour, excelDateToDayjs } = require("../utils/dateHourUtils");
const { getAverage, findMedian } = require("../utils/mathUtils");
const { log } = require("../utils/logUtils");

// === CONSTANTS ===
// API URL for retrieving the station ID
const BASE_URL = process.env.METEO_API_BASE_URL || 'https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=';
// User-Agent header constant
const USER_AGENT = process.env.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:159.0) Gecko/20100101 Firefox/159.0";
let archiveCookieHeader = null;
let archiveUserAgent = null;

function isPuppeteerEnabled() {
  return !["false", "0", "no", "off"].includes(
    String(process.env.METEO_USE_PUPPETEER || "true").trim().toLowerCase()
  );
}

function saveObservationTrace(url, html, diagnostics, artifacts = {}) {
  const traceDirectory = process.env.METEO_TRACE_DIR
    ? path.resolve(process.env.METEO_TRACE_DIR)
    : path.resolve(__dirname, "../../.debug/meteociel");
  const timestamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
  const basePath = path.join(traceDirectory, `observation-${timestamp}`);
  const htmlPath = `${basePath}.html`;
  const jsonPath = `${basePath}.json`;
  const savedArtifacts = {};

  try {
    fs.mkdirSync(traceDirectory, { recursive: true });
    fs.writeFileSync(htmlPath, html, "utf8");
    if (artifacts.axiosHtml) {
      savedArtifacts.axiosHtmlPath = `${basePath}-axios.html`;
      fs.writeFileSync(savedArtifacts.axiosHtmlPath, artifacts.axiosHtml, "utf8");
    }
    if (artifacts.documentBodies?.length) {
      savedArtifacts.documentResponsePaths = artifacts.documentBodies.map((body, index) => {
        const responsePath = `${basePath}-document-${index + 1}.html`;
        fs.writeFileSync(responsePath, body, "utf8");
        return responsePath;
      });
    }
    if (artifacts.screenshot) {
      savedArtifacts.screenshotPath = `${basePath}.png`;
      fs.writeFileSync(savedArtifacts.screenshotPath, artifacts.screenshot);
    }
    fs.writeFileSync(jsonPath, JSON.stringify({ url, ...diagnostics }, null, 2), "utf8");
    log(`Observation trace saved: ${htmlPath}`, "warn");
    log(`Observation diagnostics saved: ${jsonPath}`, "warn");
    return { htmlPath, jsonPath, ...savedArtifacts };
  } catch (error) {
    log(`Could not save observation trace: ${error.message}`, "error");
    return null;
  }
}

function getBrowserLaunchOptions() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return { headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH };
  }

  const bundledBrowserPath = puppeteer.executablePath();
  const bundledIcuDataPath = path.join(path.dirname(bundledBrowserPath), "icudtl.dat");
  if (!fs.existsSync(bundledIcuDataPath)) {
    // A partially downloaded Puppeteer browser cannot start. Prefer installed Chrome.
    return { headless: true, channel: "chrome" };
  }

  return { headless: true };
}

function findObservationTable($) {
  return $('table').filter((_, candidate) => {
    let hasObservationHeaders = false;
    $(candidate).children('tr, tbody').children('tr').each((__, row) => {
      const cells = $(row).find('td');
      const hourHeader = $(cells[0]).text().replace(/\s+/g, ' ').trim().toLowerCase();
      const temperatureHeader = $(cells[2]).text().replace(/\s+/g, ' ').trim().toLowerCase();
      if (hourHeader.includes('heure') && temperatureHeader.includes('temp')) {
        hasObservationHeaders = true;
        return false;
      }
    });
    return hasObservationHeaders;
  }).first();
}

async function fetchObservationPage(url) {
  const launchOptions = getBrowserLaunchOptions();
  log(`Launching Puppeteer with ${launchOptions.executablePath || launchOptions.channel || "bundled Chrome"}.`, "debug");
  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const networkEvents = [];
    const documentResponses = [];
    const documentBodyTasks = [];
    const requestUrl = new URL(url);
    const shouldTraceUrl = (candidateUrl) => {
      try {
        const hostname = new URL(candidateUrl).hostname;
        return hostname === requestUrl.hostname || hostname.endsWith(".meteociel.fr");
      } catch {
        return false;
      }
    };

    page.on("requestfailed", (request) => {
      if (shouldTraceUrl(request.url())) {
        networkEvents.push({
          type: "requestfailed",
          url: request.url(),
          resourceType: request.resourceType(),
          error: request.failure()?.errorText || "unknown",
        });
      }
    });
    page.on("response", (pageResponse) => {
      const request = pageResponse.request();
      if (!shouldTraceUrl(pageResponse.url())) return;

      const headers = pageResponse.headers();
      const entry = {
        url: pageResponse.url(),
        status: pageResponse.status(),
        resourceType: request.resourceType(),
        contentType: headers["content-type"] || null,
        contentLength: headers["content-length"] || null,
      };
      networkEvents.push({ type: "response", ...entry });
      if (request.resourceType() === "document") {
        const documentResponse = { ...entry, body: null, bodyError: null };
        documentResponses.push(documentResponse);
        documentBodyTasks.push(pageResponse.text().then(
          (body) => { documentResponse.body = body; },
          (error) => { documentResponse.bodyError = error.message; }
        ));
      }
    });
    page.on("pageerror", (error) => networkEvents.push({ type: "pageerror", message: error.message }));
    page.on("console", (message) => {
      if (message.type() === "error") networkEvents.push({ type: "console.error", message: message.text() });
    });

    const browserUserAgent = await page.evaluate(() => navigator.userAgent);
    archiveUserAgent = browserUserAgent;
    log(`Puppeteer browser User-Agent: ${browserUserAgent}`, "debug");
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const navigation = { status: response?.status() ?? null, url: page.url() };
    log(`Puppeteer navigation: status=${navigation.status ?? "unknown"}, url=${navigation.url}`, "debug");
    await page.waitForFunction(() => !globalThis.document.querySelector("#archive-message"), { timeout: 15000 });
    await Promise.allSettled(documentBodyTasks);

    const cookies = await page.cookies(url);
    archiveCookieHeader = cookies.map(({ name, value }) => `${name}=${value}`).join("; ") || null;
    const domHtml = await page.content();
    const domHasObservationTable = findObservationTable(cheerio.load(domHtml)).length > 0;
    const observationDocument = [...documentResponses].reverse().find(
      ({ body }) => body && findObservationTable(cheerio.load(body)).length > 0
    );
    const useDocumentResponse = !domHasObservationTable && Boolean(observationDocument);
    const html = useDocumentResponse ? observationDocument.body : domHtml;
    const diagnostics = {
      ...navigation,
      title: await page.title(),
      responseBytes: Buffer.byteLength(html),
      domBytes: Buffer.byteLength(domHtml),
      htmlSource: useDocumentResponse ? "document-response" : "browser-dom",
      browserUserAgent,
      cookieNames: cookies.map(({ name }) => name),
      networkEvents,
      documentResponses: documentResponses.map(({ body, ...metadata }) => ({ ...metadata, bodyBytes: body === null ? null : Buffer.byteLength(body) })),
    };
    log(`Puppeteer page loaded: title=${JSON.stringify(diagnostics.title)}, bytes=${diagnostics.responseBytes}, source=${diagnostics.htmlSource}, cookies=${diagnostics.cookieNames.join(",") || "none"}`, "debug");
    if (cheerio.load(html)("#archive-message").length) {
      throw new Error("Meteociel browser verification is still present after the page reload.");
    }
    let screenshot = null;
    try {
      screenshot = await page.screenshot({ type: "png", fullPage: true });
    } catch (error) {
      log(`Could not capture Puppeteer screenshot: ${error.message}`, "warn");
    }
    return {
      html,
      diagnostics,
      screenshot,
      documentBodies: documentResponses.map(({ body }) => body).filter((body) => body !== null),
    };
  } finally {
    await browser.close();
  }
}

/**
 * Creates an array containing date ranges (start/end).
 * @param {Array} jsonArray - The input array containing JSON objects.
 * @returns {Array} An array of objects with "begin" and "end" properties.
 * @throws {ScrapingError} Throws an error if the input is not an array, or if date validation fails.
 */
const formatData = (jsonArray) => {
  if (!Array.isArray(jsonArray)) {
    throw new ScrapingError("Input must be an array.", { jsonArray });
  }

  let previousDate = 0;
  const dateArray = [];

  jsonArray.forEach((entry, index) => {
    // Check if the entry has a Date property
    if (!entry.Date) {
      throw new ScrapingError(`Invalid or missing date in entry at index ${index}.`, { entry, index });
    }

    // Ensure the current date is greater than the previous date
    if (entry.Date < previousDate) {
      throw new ScrapingError(
        `The current date value (${JSDateToString(entry.Date)}) at index ${index} is earlier than the previous date (${JSDateToString(previousDate)}).`,
        { entry, previousDate, index }
      );
    }

    // Initialize an object to store row data
    const rowData = {};

    // If there is a previous date and the current entry has undefined temperature values
    if (previousDate !== 0 && entry.Min === undefined && entry.Max === undefined) {
      rowData["begin"] = previousDate;
      rowData["end"] = entry.Date;
      dateArray.push(rowData);
    }

    // Update the previous date only if conditions are met
    previousDate = entry.Date;
  });

  return dateArray;
};

/**
 * Cleans and parses a temperature string into a float.
 * Logs unexpected input values for better debugging.
 * @param {string} temp - The temperature as a string.
 * @returns {number|null} - The cleaned temperature as a float, or null if invalid.
 */
function cleanTemperature(temp) {
  const parsedTemp = parseFloat(temp);
  
  if (typeof temp !== 'string' || !temp.trim() || isNaN(parsedTemp)) {
    log(`Unexpected temperature input: ${temp}`, "error");
    return null;
  }

  if (parsedTemp < -100 || parsedTemp > 100) {
    log(`Suspicious temperature value: ${temp}`, "warn");
    return null;
  }

  return parsedTemp;
}

/**
 * Extracts weather data from a table row.
 * Validates the extracted data format.
 * @param {Object} row - The table row element.
 * @param {Object} $ - The cheerio instance for DOM manipulation.
 * @returns {Object} - An object containing extracted hour and temperature.
 */
function extractWeatherDataRow(row, $) {
  const cells = $(row).find("td");
  const heure = $(cells[0]).text().trim();
  const temperature = $(cells[2]).text().replace(/[^0-9.-]/g, "").trim();

  if (!heure || isNaN(parseFloat(temperature))) {
    log(`Invalid data extracted from row: heure=${heure}, temperature=${temperature}`, "warn");
    return null;
  }

  return {
    heure,
    temperature
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
  const weatherData = extractWeatherDataRow(row, $);
  if (!weatherData) return null;

  const { heure, temperature } = weatherData;
  if (heure === "Heurelocale") return null;

  const formattedHour = formatHour(heure);
  const fullDate = dayjs
    .utc(`${date.format(DATE_FORMAT)} ${formattedHour}:00`, DATEHOUR_FORMAT)
    .tz("Europe/Paris", true);

  if (!fullDate.isValid()) {
    log(`Invalid date formed from heure=${heure} and date=${date.format(DATE_FORMAT)}`, "warn");
    return null;
  }

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
 * Implements a retry mechanism to handle transient network errors.
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

  console.log("performIdStationScraping > url", url);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT }
      });

      if (!response.data || typeof response.data !== 'string' || !response.data.includes('|')) {
        throw new ScrapingError("Invalid response format for the station", { response, weatherStationName });
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
      log(`Attempt ${attempt} failed for ${url}: ${error.message}`, "warn");
      if (error.response && error.response.status === 429) {
        throw new ScrapingError("Meteociel rate limit reached (HTTP 429); retry later.", {
          url,
          status: error.response.status,
          retryAfter: error.response.headers.get("retry-after"),
          originalError: error
        });
      }
      if (attempt === 3 || error instanceof ScrapingError) {
        throw new ScrapingError(`Unexpected error: ${error.message}`, { url, originalError: error });
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
    }
  }
}

/**
 * Retrieves weather data for a given station and date.
 * Implements pagination for large datasets.
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
    const requestUserAgent = archiveUserAgent || USER_AGENT;
    const headers = { "User-Agent": requestUserAgent };
    if (archiveCookieHeader) headers.Cookie = archiveCookieHeader;
    const response = await axios.get(url, { headers });
    log(`Axios response: status=${response.status}, content-type=${response.headers?.["content-type"] || "unknown"}, bytes=${Buffer.byteLength(String(response.data))}, cached-cookie=${Boolean(archiveCookieHeader)}`, "debug");
    if (response.status !== 200) {
      throw new ScrapingError(`HTTP error: Received status ${response.status}`, { url });
    }

    let html = response.data;
    let pageSource = "axios";
    let browserDiagnostics = null;
    let axiosChallengeHtml = null;
    let browserScreenshot = null;
    let browserDocumentBodies = [];
    if (cheerio.load(html)("#archive-message").length) {
      axiosChallengeHtml = html;
      if (!isPuppeteerEnabled()) {
        log("Meteociel requested browser verification; Puppeteer is disabled, keeping the Axios response for analysis.", "warn");
        const challengePage = cheerio.load(html);
        const diagnostics = {
          source: "axios",
          puppeteerEnabled: false,
          axiosStatus: response.status,
          axiosContentType: response.headers?.["content-type"] || null,
          axiosUserAgent: requestUserAgent,
          responseBytes: Buffer.byteLength(String(html)),
          title: challengePage("title").text().trim(),
          archiveMessage: challengePage("#archive-message").text().trim() || null,
          bodyPreview: challengePage("body").text().replace(/\s+/g, " ").trim().slice(0, 1200),
          tableCount: challengePage("table").length,
        };
        const tracePaths = saveObservationTrace(url, html, diagnostics);
        throw new ScrapingError(
          `Meteociel returned browser verification and Puppeteer is disabled. Axios trace: ${tracePaths?.htmlPath || "see preceding log"}`,
          { url, diagnostics, tracePaths }
        );
      }
      log("Meteociel requested browser verification; retrying with Puppeteer.", "warn");
      const browserPage = await fetchObservationPage(url);
      html = browserPage.html;
      browserDiagnostics = browserPage.diagnostics;
      browserScreenshot = browserPage.screenshot;
      browserDocumentBodies = browserPage.documentBodies;
      pageSource = "puppeteer";
    }

    const $ = cheerio.load(html);
    if ($("#archive-message").length) {
      throw new ScrapingError(
        "Meteociel browser verification is still present after retrying with Puppeteer.",
        { url }
      );
    }

    // Meteociel has moved this table between nested layout tables over time.
    // Locate it by its column headers instead of its position in the page.
    const table = findObservationTable($);
    if (!table.length) {
      const tables = $("table").map((index, candidate) => {
        const rows = $(candidate).find("tr").slice(0, 3).map((_, row) =>
          $(row).find("td, th").map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim()).get()
        ).get();
        return {
          index,
          attributes: candidate.attribs,
          rowCount: $(candidate).find("tr").length,
          sampleRows: rows,
        };
      }).get();
      const diagnostics = {
        source: pageSource,
        axiosUserAgent: requestUserAgent,
        axiosStatus: response.status,
        axiosContentType: response.headers?.["content-type"] || null,
        browser: browserDiagnostics,
        axiosChallengeBytes: axiosChallengeHtml ? Buffer.byteLength(axiosChallengeHtml) : null,
        title: $("title").text().trim(),
        responseBytes: Buffer.byteLength(String(html)),
        archiveMessage: $("#archive-message").text().trim() || null,
        bodyPreview: $("body").text().replace(/\s+/g, " ").trim().slice(0, 1200),
        tableCount: tables.length,
        tables,
      };
      log(`Observation table not found: source=${pageSource}, title=${JSON.stringify(diagnostics.title)}, tables=${tables.length}, body=${JSON.stringify(diagnostics.bodyPreview.slice(0, 300))}`, "error");
      const tracePaths = saveObservationTrace(url, html, diagnostics, {
        axiosHtml: axiosChallengeHtml,
        screenshot: browserScreenshot,
        documentBodies: browserDocumentBodies,
      });
      throw new ScrapingError(
        `Table not found on the page. Diagnostic trace: ${tracePaths?.htmlPath || "see preceding log for trace save error"}`,
        { url, diagnostics, tracePaths }
      );
    }

    const dataWeather = [];
    table.children("tr, tbody").children("tr").each((_, row) => {
      const data = processWeatherRow(row, $, date, weatherStationId);
      if (data) dataWeather.push(data);
    });

    return dataWeather;
  } catch (error) {
    throw new ScrapingError(`Unexpected error: ${error.message}`, { url, originalError: error });
  }
}

/**
 * Retrieves weather data between two dates for a given station.
 * Logs progress for long-running loops.
 * 
 * This function fetches weather data (e.g., temperature) for each day between the provided start and end dates.
 * The data is filtered to include only valid entries, and a summary of temperatures is returned, including:
 * - Minimum temperature
 * - Maximum temperature
 * - Average temperature
 * - Median temperature
 * 
 * @param {string} weatherStationId - The weather station ID.
 * @param {number} startDate - The start date in Excel format (serial number).
 * @param {number} endDate - The end date in Excel format (serial number).
 * @returns {Promise<Object>} - A weather data summary including min, max, average, and median temperatures.
 * @throws {Error} - Throws an error if one of the provided dates is invalid.
 */
async function getWeatherDataBetween2Dates(weatherStationId, startDate, endDate) {
  // Convert Excel serial dates to Dayjs objects, applying the 'Europe/Paris' timezone
  const dayjsStartDate = excelDateToDayjs(startDate, 'Europe/Paris');
  const dayjsEndDate = excelDateToDayjs(endDate, 'Europe/Paris');

  // Check if the dates are valid
  if (!dayjsStartDate.isValid() || !dayjsEndDate.isValid()) {
    throw new Error("One or both of the dates are invalid.");
  }

  let dateIteration = dayjsStartDate.clone(); // Clone the start date for iteration
  let dateEndIteration;

  // If the start and end dates are on the same day or the end date is later in the day, no need to adjust the iteration end date
  if ((dayjsStartDate.format(DATE_FORMAT) === dayjsEndDate.format(DATE_FORMAT)) || (dayjsEndDate.format(HOUR_FORMAT) > dayjsStartDate.format(HOUR_FORMAT))) {
    dateEndIteration = dayjsEndDate.clone();
  } else {
    // If the end date is earlier, adjust it by adding one day
    dateEndIteration = dayjsEndDate.clone().add(1, "day");
  }

  // Log the start, end, and iteration end dates
  log(`Start Date: ${dayjsStartDate.format(DATEHOUR_FORMAT)}`, "info");
  log(`End Date: ${dayjsEndDate.format(DATEHOUR_FORMAT)}`, "info");
  log(`End Iteration Date: ${dateEndIteration.format(DATEHOUR_FORMAT)}`, "info");

  let plannedObservationDays = 0;
  for (let plannedDate = dateIteration.clone(); plannedDate.isBefore(dateEndIteration); plannedDate = plannedDate.add(1, "day")) {
    plannedObservationDays += 1;
  }
  log(`Observation URLs planned for this range: ${plannedObservationDays}`, "info");

  const weatherData = []; // Array to hold the collected weather data
  while (dateIteration.isBefore(dateEndIteration)) {
    log(`Iteration Date: ${dateIteration.format(DATE_FORMAT)}`, "info");

    // Fetch weather data for the current day
    const dayWeather = await performObservationScraping(weatherStationId, dateIteration);
    if (!dayWeather.length) {
      log(`No weather data found for ${dateIteration.format(DATE_FORMAT)}`, "warn");
    }
    weatherData.push(...dayWeather); // Add the data to the weatherData array
    dateIteration = dateIteration.add(1, "day"); // Move to the next day

    log(`Progress: Retrieved data for ${dateIteration.format(DATE_FORMAT)}`, "info");
  }

  // Filter out any invalid or out-of-range weather data
  const validData = weatherData.filter(
    (data) =>
      ((data.dayjs.isSame(dayjsStartDate) || data.dayjs.isAfter(dayjsStartDate)) &&
       (data.dayjs.isSame(dayjsEndDate) || data.dayjs.isBefore(dayjsEndDate))) &&
      Number.isFinite(data.temperature)
  );

  // Extract temperatures from the valid data
  const temperatures = validData.map((data) => Number(data.temperature));

  log(`Temperatures between ${dayjsStartDate.format(DATEHOUR_FORMAT)} and ${dayjsEndDate.format(DATEHOUR_FORMAT)}: ${temperatures}`, "info");

  if (temperatures.length === 0) {
    throw new ScrapingError("No valid temperature data found for the requested date range", {
      weatherStationId,
      startDate: dayjsStartDate.toDate(),
      endDate: dayjsEndDate.toDate()
    });
  }

  // Return an object with the weather summary
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

/**
 * Process entries sequentially to fetch weather data.
 * @param {Array} entries - Array of input data entries with start and end dates.
 * @param {string} weatherStationId - ID of the weather station.
 * @returns {Array} Array of weather data results.
 */
async function fetchWeatherDataByDateRanges(entries, weatherStationId) {
  const weatherData = [];
  let previousEndDate = 0;

  const rangesToFetch = entries.filter((entry) => entry.end - entry.begin !== 0);
  log(
    `Weather data ranges: total=${entries.length}, ranges requiring scraping=${rangesToFetch.length}`,
    "info"
  );
  if (entries.length === 0) {
    log("No missing temperature ranges; no observation requests will be made.", "info");
  }

  for (const entry of entries) {
    if (entry.end - entry.begin !== 0) {
      log(`Fetching weather data for the station between ${JSDateToString(entry.begin)} and ${JSDateToString(entry.end)}`, "warn");
      try {
        const data = await getWeatherDataBetween2Dates(weatherStationId, entry.begin, entry.end);
        weatherData.push(data);
      } catch (err) {
        log(`Error fetching weather data: ${err.message}`, "error");
        throw err;
      }
      previousEndDate = entry.end;
    } else if (entry.begin === previousEndDate) {
      weatherData.push(weatherData[weatherData.length - 1]); // Reuse the last data
    } else {
      throw new ScrapingError(`Invalid date ranges: ${JSDateToString(entry.begin)} / ${JSDateToString(entry.end)}`);
    }
  }

  return weatherData;
}

module.exports = {
  formatData,
  cleanTemperature,
  extractWeatherDataRow,
  performIdStationScraping,
  performObservationScraping,
  getWeatherDataBetween2Dates,
  fetchWeatherDataByDateRanges,
};
