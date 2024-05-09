"use strict";

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");

async function performScraping(date) {
  const momentDate = moment(date, "DD/MM/YY hh:mm");
  let day = momentDate.date();
  let month = momentDate.month();
  let year = momentDate.year();
  let url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=79049004&jour2=${day}&mois2=${month}&annee2=${year}&affint=1`;

  // downloading the target web page
  // by performing an HTTP GET request in Axios
  const axiosResponse = await axios.request({
    method: "GET",
    url: url,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    },
  });

  // parsing the HTML source of the target web page with Cheerio
  const $ = cheerio.load(axiosResponse.data);

  // Select the table element
  const table = $('table:nth-child(3)[width="100%"]');

  // initializing the data structures
  // that will contain the scraped data
  const dataMeteo = [];

  // Iterate over each row of the table using the find and each methods
  table
    .find("tbody")
    .find("tr")
    .each((i, row) => {
      // Initialize an empty object to store the row data
      const rowData = {};

      // Iterate over each cell of the row using the find and each methods
      $(row)
        .find('td[align="center"], div[align="center"]')
        .each((j, cell) => {
          // Add the cell data to the row data object
          //rowData[$(cell).text()] = j;
          rowData[j] = $(cell).text();
        });

      // Add the row data to the table data array
      dataMeteo.push(rowData);
    });

  // Return the table data
  return dataMeteo;
}

// initializing the data structures
// that will contain all scraped data
const datasMeteo = {};

(async () => {
  datasMeteo["25/1/22 7:41"] = await performScraping("25/1/22 7:41");
  datasMeteo["6/5/24 7:40"] = await performScraping("6/5/24 7:40");
  console.log(JSON.stringify(datasMeteo));
})();
