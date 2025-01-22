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

// === MAIN SCRIPT ===

const argv = yargs
  .option('excelFile', {
    alias: 'e',
    description: 'Path to the input Excel file',
    type: 'string',
    demandOption: true // Make this parameter mandatory
  })
  .option('sheetName', {
    alias: 's',
    description: 'Name of the sheet to read',
    type: 'string',
    demandOption: true // Make this parameter mandatory
  })
  .option('firstRow', {
    alias: 'r',
    description: 'Row to start reading from',
    type: 'number',
    demandOption: true // Make this parameter mandatory
  })
  .option('weatherStationName', {
    alias: 'w',
    description: 'Name of the weather station',
    type: 'string',
    demandOption: true // Make this parameter mandatory
  })
  .alias('h', 'help') // Add alias for --help
  .alias('v', 'version') // Add alias for --version
  .help()
  .argv;

(async () => {
  const { excelFile, sheetName, firstRow, weatherStationName } = argv;
  
  log("Script starting", "info");

  // Read the Excel file
  log(`Reading Excel file: ${excelFile}`, "info");
  const jsonExcelData = readExcel(excelFile, sheetName, firstRow);

  // Format data into an array with start and end dates/times on each row
  log(`Formatting data from the file`, "info");
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

  // Save the results
  // Get the directory of the input file
  const inputDir = path.dirname(path.resolve(excelFile));
  // Save the results in the same directory as the input file
  const outputFile = path.join(inputDir, 'OutputData.xlsx');
  log(`Saving the results to: ${outputFile}`, "info");
  writeExcel(weatherData, outputFile);

  log("Script finished", "info");
})().catch((err) => console.error(err));
