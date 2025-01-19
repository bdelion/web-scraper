// Import necessary modules and constants.
const { getCurrentTimestamp } = require('../../src/utils/dateHourUtils');

// List of valid log levels
const logLevels = ["info", "warn", "error", "debug"];

// Define icons for each log level
const iconsLevels = { info: "ℹ️", warn: "⚠️", error: "❌", debug: "🐞" };

/**
 * Logs messages to the console with a timestamp and severity level.
 *
 * @param {string | string[]} message - The message or array of messages to log.
 * @param {string} [level="info"] - The severity level of the message. Can be "info", "warn", "error", or "debug".
 */
const log = (messages, level = "info") => {
  if (!Array.isArray(messages)) {
    messages = [messages]; // If it's a single message, convert to an array
  }

  if (!logLevels.includes(level)) {
    console.warn(`Invalid log level: "${level}". Defaulting to "info".`);
    level = "info";
  }

  const timestamp = getCurrentTimestamp();

  messages.forEach((message) => {
    console.log(`${iconsLevels[level]} ${timestamp} - ${message}`);
  });
};

// Export the log function for use in other modules.
module.exports = {
  log,
};
