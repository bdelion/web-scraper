"use strict";

const axios = require("axios");
const cheerio = require("cheerio");

async function performScraping() {
  // downloading the target web page
  // by performing an HTTP GET request in Axios
  const axiosResponse = await axios.request({
    method: "GET",
    url: "https://www.meteociel.fr/temps-reel/obs_villes.php?affint=1&code2=79049004&jour2=20&mois2=1&annee2=2024",
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
          rowData[$(cell).text()] = j;
        });

      // Add the row data to the table data array
      dataMeteo.push(rowData);
    });

  // Print the table data
  console.log(JSON.stringify(dataMeteo));
}

performScraping();
