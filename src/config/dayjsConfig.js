// === Imported Modules ===
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

// === Day.js Configuration ===
// Extend Day.js with custom parse formats for flexible date parsing.
dayjs.extend(customParseFormat);
// Enable support for UTC time handling.
dayjs.extend(utc);
// Add support for time zones.
dayjs.extend(timezone);

// Load and set the French locale for Day.js.
require("dayjs/locale/fr");
dayjs.locale("fr");

// === Exported Constants and Configurations ===
module.exports = {
  /**
   * The main Day.js instance configured with French locale, custom parse formats, UTC, and timezone support.
   */
  dayjs,

  /**
   * Date format: DD/MM/YYYY (e.g., 13/01/2025).
   */
  DATE_FORMAT: "DD/MM/YYYY",

  /**
   * Time format: HH:mm:ss (e.g., 14:30:15).
   */
  HOUR_FORMAT: "HH:mm:ss",

  /**
   * Combined date and time format: DD/MM/YYYY HH:mm:ss (e.g., 13/01/2025 14:30:15).
   */
  DATEHOUR_FORMAT: "DD/MM/YYYY HH:mm:ss",
};
