const { dayjs, DATEHOUR_FORMAT } = require("../config/dayjsConfig");

/**
 * Gets the current timestamp formatted according to the format "DD/MM/YYYY HH:mm:ss".
 * @returns {string} The current date and time as a formatted string.
 */
const getCurrentTimestamp = () => dayjs().format(DATEHOUR_FORMAT);

/**
 * Converts an Excel date serial number to a Dayjs date, applying a timezone.
 * @param {number} serial - The Excel serial number representing a date.
 * @param {string} [timezoneString='Europe/Paris'] - The timezone to apply.
 * @returns {Object} A Dayjs object representing the converted date.
 * @throws Will throw an error if the serial number is invalid or the resulting date is invalid.
 */
function excelDateToDayjs(serial, timezoneString = 'Europe/Paris') {
  const MS_PER_DAY = 24 * 60 * 60 * 1000; // Milliseconds per day
  const excelEpoch = Date.UTC(1900, 0, 1); // January 1, 1900, UTC

  // Explicit check for dates before 1900
  if (serial < 1) {
    return dayjs(null); // Returns an invalid date (null)
  }

  // Adjustment for Excel's leap year bug: Excel treats 1900 as a leap year.
  const daysOffset = serial >= 60 ? serial - 2 : serial - 1;

  // Convert to milliseconds with rounding to avoid precision issues
  const exactMilliseconds = Math.round(daysOffset * MS_PER_DAY);

  // Convert to UTC date
  const utcDate = new Date(excelEpoch + exactMilliseconds);

  // Check if the date is valid
  if (isNaN(utcDate)) {
    throw new Error(`Invalid Excel date: ${serial}`);
  }

  // Create a Dayjs object in UTC
  const dateInUTC = dayjs.utc(utcDate);

  // Apply the timezone to this UTC date
  const finalDate = dateInUTC.tz(timezoneString, true); // `true` prevents additional offset application

  return finalDate;
}

/**
 * Converts a date to an Excel date serial number.
 * @param {string} inputDate - A date string in the format "dd/mm/yyyy hh:mm:ss".
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
    throw new Error(`Invalid date provided. Ensure it matches the format "${DATEHOUR_FORMAT}".`);
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

/**
 * Converts an Excel date serial number to a formatted string.
 * @param {number} excelDate - The Excel serial number representing a date.
 * @returns {string} A formatted date string based on DATEHOUR_FORMAT.
 * @throws Will throw an error if the input is not a number or the date cannot be parsed.
 */
function JSDateToString(excelDate) {
  let parsedDate;

  if (typeof excelDate === "number") {
    try {
      // Convert the Excel serial number to a Dayjs date
      parsedDate = excelDateToDayjs(excelDate, 'Europe/Paris');

      if (parsedDate.isValid()) {
        return parsedDate.format(DATEHOUR_FORMAT);
      } else {
        throw new Error(`Invalid date, skipped: ${excelDate} -> ${parsedDate}`);
      }
    } catch (error) {
      throw new Error(`Unable to parse date, skipped: ${excelDate} -> ${parsedDate} / ${error.message}`);
    }
  } else {
    throw new Error(`Column "Date" value is not a number, skipped: ${excelDate}`);
  }
}

/**
 * Formats an hour string, ensuring it's in the correct format (HH:mm).
 * @param {string} heure - The hour string to format (e.g., "12h30").
 * @returns {string} A properly formatted hour string.
 * @throws Will throw an error if the input is null, incorrectly formatted, or contains invalid values.
 */
function formatHour(heure) {
  if (heure == null) {
    throw new Error(`Hour is not defined, skipped: ${heure}`);
  }

  let formattedHour = heure.replace("h", ":").trim();
  const hourParts = formattedHour.split(":");

  if (hourParts.length === 2) {
    // Pad hours and minutes to two digits
    const hours = hourParts[0].trim().padStart(2, "0");
    const minutes = hourParts[1].trim().padStart(2, "0");

    if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
      throw new Error(`Hour or minute values are invalid, skipped: ${heure}`);
    }

    formattedHour = `${hours}:${minutes}`;
  } else {
    throw new Error(`Hour value format is incorrect, skipped: ${heure}`);
  }

  return formattedHour;
}

module.exports = {
  getCurrentTimestamp,
  excelDateToDayjs,
  dateToExcelValue,
  JSDateToString,
  formatHour,
};
