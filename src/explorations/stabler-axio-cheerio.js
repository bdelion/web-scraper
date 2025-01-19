"use strict";

const axios = require("axios").default;
const cheerio = require("cheerio");

console.log("=-= BEGIN =-=");
axios
  .get(
    "https://www.meteociel.fr/temps-reel/obs_villes.php?affint=1&code2=79049004&jour2=20&mois2=1&annee2=2022",
    {
      params: {
        query: "web scraping",
      },
    }
  )
  .then((response) => {
    if (response.status === 200) {
      console.log("Data retrieved successfully !");
      const $ = cheerio.load(response.data);
      const pageTitle = $("title").text();
      console.log("Page Title:", pageTitle);
      const pageBody = $("body").text();
      console.log("Page Body:", pageBody);
    }
  })
  .catch((error) => {
    console.error("Error fectching page :", error);
  })
  .finally(function () {
    console.log("=-= END =-=");
  });
