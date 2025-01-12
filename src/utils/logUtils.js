const { dayjs, DATEHOUR_FORMAT } = require("../config/dayjsConfig");

// Fonction de journalisation
const log = (message, level = "info") => {
  const levels = { info: "ℹ️", warn: "⚠️", error: "❌" };
  console.log(`${levels[level]} ${dayjs().format(DATEHOUR_FORMAT)} - ${message}`);
};

module.exports = {
  log,
};
