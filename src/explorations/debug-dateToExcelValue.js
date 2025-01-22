/**
 * Converts a date to an Excel date serial number.
 * @param {string} inputDate - A date string in the format "dd/mm/yyyy hh:mm:ss".
 * @param {string} format - The expected format of the input date.
 * @returns {number} The Excel serial number representing the date.
 * @throws Will throw an error if the input date is invalid.
 */
function dateToExcelValue(inputDate) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000; // Milliseconds per day
  const excelEpoch = Date.UTC(1900, 0, 1); // January 1, 1900, UTC

  // Parse the input date using the custom format in UTC
  const dayjsDate = dayjs.utc(inputDate, DATEHOUR_FORMAT, true); // Strict parsing with UTC

  // Validate input date
  if (!dayjsDate.isValid()) {
    throw new Error('Invalid date provided. Ensure it matches the format "DD/MM/YYYY HH:mm:ss".');
  }

  // Convert to a native JavaScript Date in UTC
  const jsDate = dayjsDate.toDate();

  // Calculate total milliseconds since Excel's epoch
  const exactMilliseconds = jsDate.getTime() - excelEpoch;

  // Convert milliseconds to days, adjusting for Excel's leap year bug
  const daysOffset = exactMilliseconds / MS_PER_DAY;
  const excelValue = daysOffset >= 59 ? daysOffset + 2 : daysOffset + 1; // Leap year bug adjustment

  return Math.floor(excelValue * 1e11) / 1e11; // Round to avoid floating-point errors
}

// Exemple d'utilisation
const { dayjs, DATEHOUR_FORMAT } = require("../config/dayjsConfig");

// Tester avec des dates
let dateInput = '12/01/2025 00:00:00';
let excelValue = dateToExcelValue(dateInput);
console.log(excelValue); // Affichera 45669

dateInput = '13/01/2025 00:00:00';
excelValue = dateToExcelValue(dateInput);
console.log(excelValue); // Affichera 45670

dateInput = '14/01/2025 00:01:02';
excelValue = dateToExcelValue(dateInput);
console.log(excelValue); // Affichera 45671.00071759259
