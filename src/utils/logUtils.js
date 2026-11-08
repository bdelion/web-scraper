require("../config/env");

// Import necessary modules and constants.
const { getCurrentTimestamp } = require('../../src/utils/dateHourUtils');

// List of valid log levels
const logLevels = ["info", "warn", "error", "debug", "always"];
const logLevelPriority = { debug: 10, info: 20, warn: 30, error: 40 };

// Define icons for each log level
const iconsLevels = { info: "ℹ️", warn: "⚠️", error: "❌", debug: "🐞", always: "ℹ️" };

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

  const configuredLevel = String(process.env.LOG_LEVEL || "info").trim().toLowerCase();
  const minimumPriority = logLevelPriority[configuredLevel] ?? logLevelPriority.info;
  if (level !== "always" && logLevelPriority[level] < minimumPriority) return;

  const timestamp = getCurrentTimestamp();

  messages.forEach((message) => {
    console.log(`${iconsLevels[level]} ${timestamp} - ${message}`);
  });
};

// Export the log function for use in other modules.
module.exports = {
  log,
};
