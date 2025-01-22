#!/usr/bin/env node

"use strict";

// === IMPORTED MODULES ===
const { writeExcel, readExcel } = require("./utils/excelUtils");
const { formatData, performIdStationScraping, fetchWeatherDataByDateRanges } = require("./scrapers/weatherScraper");
const { log } = require("./utils/logUtils");
const path = require("path");
const yargs = require("yargs");

// === YARGS CONFIGURATION ===
const argv = yargs
  .option('excelFile', {
    alias: 'e',
    description: 'Path to the input Excel file (e.g., assets/InputData.xlsx)',
    type: 'string',
    demandOption: true,
  })
  .option('sheetName', {
    alias: 's',
    description: 'Name of the sheet to read from the Excel file',
    type: 'string',
    demandOption: true,
  })
  .option('firstRow', {
    alias: 'r',
    description: 'Row to start reading from (must be a positive number)',
    type: 'number',
    demandOption: true,
  })
  .option('weatherStationName', {
    alias: 'w',
    description: 'Name of the weather station to fetch data for',
    type: 'string',
    demandOption: true,
  })
  .option('outputFile', {
    alias: 'o',
    description: 'Path to the output Excel file',
    type: 'string',
    default: null,
  })
  .alias('h', 'help')
  .alias('v', 'version')
  .help()
  .argv;

// === GLOBAL ERROR HANDLING ===
process.on('unhandledRejection', (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// === MAIN SCRIPT ===
(async () => {
  const { excelFile, sheetName, firstRow, weatherStationName, outputFile } = argv;

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

  // Process entries sequentially to avoid server overload
  log("Processing entries sequentially", "info");
  const weatherData = await fetchWeatherDataByDateRanges(inputData, weatherStationId);

  // Save the results in the same directory as the input file
  const inputDir = path.resolve(path.dirname(excelFile));
  const finalOutputFile = outputFile || path.join(inputDir, 'OutputData.xlsx');
  log(`Saving the results to: ${finalOutputFile}`, "info");
  writeExcel(weatherData, finalOutputFile);

  const duration = (Date.now() - timerStart) / 1000;
  log(`Script finished in ${duration.toFixed(2)} seconds`, "info");
})().catch((err) => {
  console.error("An error occurred:", err.message);
  process.exit(1);
});
