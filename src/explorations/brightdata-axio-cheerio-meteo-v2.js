"use strict";

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");

async function performScraping(idCommune, date) {
  const momentDate = moment(date, "DD/MM/YY hh:mm");
  let day = momentDate.date();
  let month = momentDate.month();
  let year = momentDate.year();
  let url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${idCommune}&jour2=${day}&mois2=${month}&annee2=${year}&affint=1`;

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
      const dataLine = [];
      $(row)
        // .find('td[align="center"], div[align="center"]')
        .find("td")
        .each((j, cell) => {
          // Add the cell data to the row data object
          dataLine.push($(cell).text());
        });

      if (!(dataLine[0] === "Heurelocale")) {
        rowData["idCommune"] = idCommune;
        rowData["jour"] = momentDate.format("DD/MM/YYYY");
        rowData["heure"] = dataLine[0].replace("h", ":");
        rowData["moment"] = moment(
          rowData["jour"] + " " + rowData["heure"],
          "DD/MM/YYYY hh:mm"
        );
        rowData["temperature"] = dataLine[2].substring(
          0,
          dataLine[2].indexOf(" �C")
        );

        // Add the row data to the table data array
        dataMeteo.push(rowData);
      }
    });

  // Return the table data
  return dataMeteo;
}

// initializing the data structures
// that will contain all scraped data
let datasMeteo = [];

(async () => {
  datasMeteo = datasMeteo.concat(
    await performScraping(79049004, "25/1/22 7:41")
  );
  datasMeteo = datasMeteo.concat(
    await performScraping(79049004, "6/5/24 7:40")
  );
  datasMeteo.sort((a, b) => a.moment - b.moment);
  console.log(JSON.stringify(datasMeteo));
})();
