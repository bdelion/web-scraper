import globals from "globals";
import pluginJs from "@eslint/js";
import pluginJest from "eslint-plugin-jest";

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended, // Config JavaScript par défaut
  {
    files: ["**/*.js"], // Tous les fichiers JavaScript
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      jest: pluginJest,
    },
    rules: {
      ...pluginJest.configs.recommended.rules,
    },
  },
  {
    ignores: [
      "coverage/**",
      "src/brightdata-axio-cheerio-meteo-v2.js",
      "src/brightdata-axio-cheerio-meteo.js",
      "src/brightdata-axio-cheerio.js",
      "src/brightdata-puppeteer-meteo.js",
      "src/chatgpt-excel.js",
      "src/debug-dayjs-2.js",
      "src/debug-dayjs.js",
      "src/debug-read-excel-files.js",
      "src/debug-write-excel.js",
      "src/geeksforgeeks-read-excel-file.js",
      "src/meteo-scraping-file-input-chatgpt-1.js",
      "src/meteo-scraping-file-input-chatgpt-2.js",
      "src/meteo-scraping.js",
      "src/parsedate.js",
      "src/risingstack-async-await.js",
      "src/serpapi-axio-cheerio.js",
      "src/serpapi-puppeteer.js",
      "src/stabler-axio-cheerio.js",
      "src/stabler-crawler.js",
      "src/stabler-puppeteer.js",
      "tests/**",
    ],
  },
];
