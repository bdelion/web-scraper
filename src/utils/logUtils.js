// Import necessary modules and constants.
const { dayjs, DATEHOUR_FORMAT } = require("../config/dayjsConfig");

/**
 * Logs messages to the console with a timestamp and severity level.
 *
 * @param {string} message - The message to log.
 * @param {string} [level="info"] - The severity level of the message. Can be "info", "warn", or "error".
 */
const log = (message, level = "info") => {
  // Define icons for each log level.
  const levels = { info: "ℹ️", warn: "⚠️", error: "❌" };

  // Log the message with the appropriate icon, timestamp, and content.
  console.log(`${levels[level]} ${dayjs().format(DATEHOUR_FORMAT)} - ${message}`);
};

// Export the log function for use in other modules.
module.exports = {
  log,
};
