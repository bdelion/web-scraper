// === MODULES IMPORTED ===
const XLSX = require("xlsx");
const { DATEHOUR_FORMAT } = require("../config/dayjsConfig");
const { ScrapingError } = require("../errors/customErrors");
const fs = require("fs");

/**
 * Reads data from a specified sheet in an Excel file, starting from a specific row.
 * 
 * This function loads an Excel file, accesses the specified sheet by its name, and 
 * retrieves the data starting from the row indicated by the `firstRow` parameter. 
 * It returns the data as a JSON object.
 * 
 * @param {string} inputFile - The path to the input Excel file.
 * @param {string} sheetName - The name of the sheet to read data from.
 * @param {number} firstRow - The row number from which to start reading data (1-based index).
 * @returns {Array} - The data from the specified sheet starting from the `firstRow`, formatted as an array of JSON objects.
 */
function readExcel(inputFile, sheetName, firstRow) {
  if (!fs.existsSync(inputFile)) {
    throw new ScrapingError(`The file "${inputFile}" does not exist.`);
  }
  if (firstRow < 0) {
    throw new ScrapingError("The first row must be greater than or equal to 0.");
  }

  // Read the Excel file into a workbook object
  const workbook = XLSX.readFile(inputFile);

  // Access the specified sheet by name
  const sheet = workbook.Sheets[sheetName];

  // Convert the sheet data to JSON starting from the specified row, with raw data for cells
  const data = XLSX.utils.sheet_to_json(sheet, { range: firstRow, raw: true });

  // Return the extracted data
  return data;
}

/**
 * Writes an Excel file with formatted dates and numbers from the provided JSON data.
 * The function creates a new workbook, converts the JSON data into a sheet, applies specific formatting 
 * for dates and numerical values, and writes the result to an output file.
 * 
 * @param {Array} data - The JSON data to be written to the Excel sheet.
 * @param {string} outputFile - The path and name of the output file where the Excel file will be saved.
 */
const writeExcel = (data, outputFile) => {
  // Create a new workbook
  const newWorkbook = XLSX.utils.book_new();
  
  // Convert the JSON data into a sheet, ensuring date cells are formatted correctly
  const newSheet = XLSX.utils.json_to_sheet(data, {
    cellDates: true,
    dateNF: DATEHOUR_FORMAT, // Date format: day/month/year hour:minute:second
  });

  // Define the columns that need to have a numerical format applied
  const columnsToFormat = ['D', 'E', 'F', 'G']; // For columns like minTemperature, maxTemperature, etc.
  
  // Decode the range of the sheet to loop through the data rows
  const range = XLSX.utils.decode_range(newSheet['!ref']);
  
  // Iterate over the rows in the sheet (skip the header row)
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    columnsToFormat.forEach((col) => {
      const cellAddress = `${col}${row + 1}`; // Construct the cell address (e.g., D2, E3, etc.)
      
      // Check if the cell exists and apply the format
      if (newSheet[cellAddress]) {
        newSheet[cellAddress].z = '0.00'; // Apply number format with two decimal places (e.g., 0.00)
      }
    });
  }

  // Append the sheet to the workbook
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
  
  // Write the workbook to a file with the specified output path
  XLSX.writeFile(newWorkbook, outputFile);
};

// Export the functions for external usage
module.exports = {
  readExcel,
  writeExcel,
};
