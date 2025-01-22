#!/usr/bin/env node

"use strict";

// === IMPORTED MODULES ===
const { JSDateToString } = require("./utils/dateHourUtils");
const { ScrapingError } = require("./errors/customErrors");
const { writeExcel, readExcel } = require("./utils/excelUtils");
const { DATEHOUR_FORMAT } = require("./config/dayjsConfig");
const { formatData, performIdStationScraping, getWeatherDataBetween2Dates } = require("./scrapers/weatherScraper");
const { log } = require("./utils/logUtils");
const path = require("path");
const yargs = require("yargs");

// === YARGS CONFIGURATION ===
const argv = yargs
  .option('excelFile', {
    alias: 'e',
    description: 'Path to the input Excel file (e.g., assets/InputData.xlsx)',
    type: 'string',
    demandOption: true
  })
  .option('sheetName', {
    alias: 's',
    description: 'Name of the sheet to read from the Excel file',
    type: 'string',
    demandOption: true
  })
  .option('firstRow', {
    alias: 'r',
    description: 'Row to start reading from (must be a positive number)',
    type: 'number',
    demandOption: true
  })
  .option('weatherStationName', {
    alias: 'w',
    description: 'Name of the weather station to fetch data for',
    type: 'string',
    demandOption: true
  })
  .alias('h', 'help')
  .alias('v', 'version')
  .help()
  .argv;

// === GLOBAL ERROR HANDLING ===
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// === MAIN SCRIPT ===
(async () => {
  const { excelFile, sheetName, firstRow, weatherStationName } = argv;
  const timerStart = Date.now();
  log("Starting data processing...", "info");

  // Read the Excel file
  log(`Reading Excel file: ${excelFile}`, "info");
  const jsonExcelData = readExcel(excelFile, sheetName, firstRow);

  // Format data into an array with start and end dates/times on each row
  log("Formatting data from the file", "info");
  const inputData = formatData(jsonExcelData);

  // Retrieve the desired weather station's ID
  log(`Retrieving the weather station ID for: ${weatherStationName}`, "info");
  const weatherStationId = await performIdStationScraping(weatherStationName);

  // Initialize the data structure to store results
  let weatherData = [];
  let previousEndDate = 0;

  for (const entry of inputData) {
    if ((entry.end - entry.begin) !== 0) {
      // Push the result between two dates/times into the array
      log(`Fetching weather data for the station between ${JSDateToString(entry.begin)} and ${JSDateToString(entry.end)}`, "warn");
      weatherData.push(
        // Retrieve temperatures between two dates/times
        await getWeatherDataBetween2Dates(
          weatherStationId,
          entry.begin,
          entry.end
        )
      );
      previousEndDate = entry.end;
    } else if (((previousEndDate - entry.begin) === 0) && ((entry.end - entry.begin) === 0)) {
      weatherData.push(weatherData[weatherData.length - 1]);
    } else {
      throw new ScrapingError(`There is a problem with date ranges: ${previousEndDate.format(DATEHOUR_FORMAT)} / ${entry.begin.format(DATEHOUR_FORMAT)} / ${entry.end.format(DATEHOUR_FORMAT)}`);
    }
  }

  // Save the results to the same directory as the input file
  const inputDir = path.resolve(path.dirname(excelFile));
  const outputFile = path.join(inputDir, 'OutputData.xlsx');
  log(`Saving the results to: ${outputFile}`, "info");
  writeExcel(weatherData, outputFile);

  log("Script finished", "info");
  log(`Data processing completed in ${Date.now() - timerStart}ms`, "info");
})().catch((err) => {
  console.error("An error occurred:", err.message);
  process.exit(1);
});
