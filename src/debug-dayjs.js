#!/usr/bin/env node

"use strict";

// Requiring the module
const XLSX = require("xlsx");
const axios = require("axios");
const cheerio = require("cheerio");

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
// Charger la locale française
require('dayjs/locale/fr');
// Appliquer la locale à Day.js
dayjs.locale('fr');
// Appliquer le plugin customParseFormat pour gérer les formats personnalisés
dayjs.extend(customParseFormat);

const dateFormat = "DD/MM/YYYY HH:mm:ss";

const fullDateStr = "13/12/2024 23:54:00";

// Vérifie si Day.js arrive à parser cette date avec le format et le mode strict
const parsedDate = dayjs(fullDateStr, dateFormat, true);  // true active le mode strict

if (!parsedDate.isValid()) {
  console.error("Invalid date format", fullDateStr);
} else {
  // Utilise un format personnalisé pour afficher la date
  console.log("Parsed date:", parsedDate.format("DD MMMM YYYY HH:mm"));
}
