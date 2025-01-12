// === MODULES IMPORTÉS ===
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

// === CONFIGURATION DAYJS ===
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
require("dayjs/locale/fr"); // Charger la locale française
dayjs.locale("fr"); // Appliquer la locale par défaut à toutes les instances de Day.js

module.exports = {
  dayjs,
  DATE_FORMAT: "DD/MM/YYYY",
  HOUR_FORMAT: "HH:mm:ss",
  DATEHOUR_FORMAT: "DD/MM/YYYY HH:mm:ss",
};
