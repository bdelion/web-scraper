#!/usr/bin/env node

"use strict";

// === IMPORTED MODULES ===
const { writeExcel, readExcel } = require("./utils/excelUtils");
const { formatData, performIdStationScraping, fetchWeatherDataByDateRanges } = require("./scrapers/weatherScraper");
const { dateToExcelValue } = require("./utils/dateHourUtils");
const { log } = require("./utils/logUtils");
const path = require("path");
const yargs = require("yargs");

// === GLOBAL ERROR HANDLING ===
process.on('unhandledRejection', (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// === LOGIC SHARED BETWEEN BOTH COMMANDS ===
async function processWeatherData({ weatherStationName, inputData, outputFile, isJSONOutput = false }) {
  const timerStart = Date.now();
  log("Starting data processing...", "info");

  // Retrieve the desired weather station's ID
  log(`Retrieving the weather station ID for: ${weatherStationName}`, "info");
  const weatherStationId = await performIdStationScraping(weatherStationName);

  // Process the entries sequentially
  log("Processing entries sequentially", "info");
  const weatherData = await fetchWeatherDataByDateRanges(inputData, weatherStationId);

  if (isJSONOutput) {
    // Output the result as JSON
    console.log(JSON.stringify(weatherData, null, 2));
  } else {
    // Save the results to an Excel file
    const inputDir = path.resolve(path.dirname(outputFile || '.'));
    const finalOutputFile = outputFile || path.join(inputDir, 'OutputData.xlsx');
    log(`Saving the results to: ${finalOutputFile}`, "info");
    writeExcel(weatherData, finalOutputFile);
  }

  const duration = (Date.now() - timerStart) / 1000;
  log(`Script finished in ${duration.toFixed(2)} seconds`, "info");
}

// === YARGS MULTI-COMMANDS CONFIGURATION ===
yargs
  // .scriptName("meteo-scraper") // Nom personnalisé
  .usage('Usage: $0 <command> [options]')
  .demandCommand(1, 'You must provide a valid command. Use --help for details.')
  .command({
    command: 'processExcel',
    describe: 'Process data from an Excel file',
    builder: (yargs) => {
      return yargs
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
        });
    },
    handler: async (argv) => {
      const { excelFile, sheetName, firstRow } = argv;

      log(`Reading Excel file: ${excelFile}`, "info");
      const jsonExcelData = readExcel(excelFile, sheetName, firstRow);

      log("Formatting data from the file", "info");
      const inputData = formatData(jsonExcelData);

      await processWeatherData({ ...argv, inputData });
    }
  })
  .command({
    command: 'processDates',
    describe: 'Process data for a custom date range',
    builder: (yargs) => {
      return yargs
        .option('startDate', {
          alias: 's',
          description: 'Start date for the custom date range (format: YYYY-MM-DD)',
          type: 'string',
          demandOption: true,
        })
        .option('endDate', {
          alias: 'e',
          description: 'End date for the custom date range (format: YYYY-MM-DD)',
          type: 'string',
          demandOption: true,
        })
        .option('weatherStationName', {
          alias: 'w',
          description: 'Name of the weather station to fetch data for',
          type: 'string',
          demandOption: true,
        });
    },
    handler: async (argv) => {
      const { startDate, endDate } = argv;

      // Construct date ranges based on the passed dates
      const inputData = [
        { begin: dateToExcelValue(startDate), end: dateToExcelValue(endDate) }
      ];

      await processWeatherData({ ...argv, inputData, isJSONOutput: true });
    }
  })
  .command({
    command: 'validateExcel',
    describe: 'Validate an Excel file for correct structure and data',
    builder: (yargs) => {
      return yargs
        .option('excelFile', {
          alias: 'e',
          description: 'Path to the Excel file to validate',
          type: 'string',
          demandOption: true,
        })
        .option('sheetName', {
          alias: 's',
          description: 'Name of the sheet to validate',
          type: 'string',
          demandOption: true,
        })
        .option('firstRow', {
          alias: 'r',
          description: 'Row to start checking from (must be a positive number)',
          type: 'number',
          default: 2,
        })
        .option('requiredColumns', {
          alias: 'c',
          description: 'Comma-separated list of required columns (e.g., "Date,Min,Max")',
          type: 'string',
          default: null,
        })
        .option('verbose', {
          alias: 'v',
          description: 'Show detailed validation output',
          type: 'boolean',
          default: false,
        });
    },
    handler: async (argv) => {
      const { excelFile, sheetName, firstRow, requiredColumns, verbose } = argv;

      try {
        log(`Validating Excel file: ${excelFile}`, "info");

        // Check if file exists
        const fs = require('fs');
        if (!fs.existsSync(excelFile)) {
          console.error(`✗ Error: File not found - ${excelFile}`);
          process.exit(1);
        }
        console.log('✓ File exists');

        // Read the Excel file
        let jsonExcelData;
        try {
          jsonExcelData = readExcel(excelFile, sheetName, firstRow);
          console.log(`✓ Successfully read sheet "${sheetName}"`);
        } catch (error) {
          console.error(`✗ Error reading sheet: ${error.message}`);
          process.exit(1);
        }

        // Check if data is not empty
        if (!Array.isArray(jsonExcelData) || jsonExcelData.length === 0) {
          console.error('✗ Error: No data found in sheet starting from row', firstRow);
          process.exit(1);
        }
        console.log(`✓ Found ${jsonExcelData.length} rows of data`);

        // Get column names from first row
        const columns = Object.keys(jsonExcelData[0]);
        if (verbose) {
          console.log(`  Columns: ${columns.join(', ')}`);
        }

        // Check required columns if specified
        if (requiredColumns) {
          const required = requiredColumns.split(',').map(col => col.trim());
          const missingColumns = required.filter(col => !columns.includes(col));

          if (missingColumns.length > 0) {
            console.error(`✗ Error: Missing required columns - ${missingColumns.join(', ')}`);
            process.exit(1);
          }
          console.log(`✓ All required columns present: ${required.join(', ')}`);
        }

        // Validate data structure
        let validRows = 0;
        let invalidRows = 0;
        const issues = [];

        jsonExcelData.forEach((row, index) => {
          let rowValid = true;

          // Check if Date field exists and is valid
          if (!row.Date) {
            issues.push(`Row ${firstRow + index}: Missing or empty Date field`);
            rowValid = false;
          } else if (typeof row.Date !== 'number') {
            issues.push(`Row ${firstRow + index}: Date is not a number (Excel format required)`);
            rowValid = false;
          }

          if (rowValid) {
            validRows++;
          } else {
            invalidRows++;
          }
        });

        if (validRows > 0) {
          console.log(`✓ Valid data rows: ${validRows}`);
        }

        if (invalidRows > 0) {
          console.error(`✗ Invalid data rows: ${invalidRows}`);
          if (verbose && issues.length > 0) {
            console.error('  Issues found:');
            issues.slice(0, 10).forEach(issue => console.error(`    - ${issue}`));
            if (issues.length > 10) {
              console.error(`    ... and ${issues.length - 10} more issues`);
            }
          }
          process.exit(1);
        }

        // All validations passed
        console.log('\n✓ Excel file validation successful!');
        console.log(`  File: ${excelFile}`);
        console.log(`  Sheet: ${sheetName}`);
        console.log(`  Rows: ${jsonExcelData.length}`);
        console.log(`  Columns: ${columns.length}`);
      } catch (error) {
        console.error('✗ Validation failed:', error.message);
        process.exit(1);
      }
    }
  })
  .alias('h', 'help')
  .alias('v', 'version')
  .help()
  .argv;
