const path = require("path");
const dotenv = require("dotenv");

module.exports = dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});
