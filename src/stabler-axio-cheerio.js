"use strict";

const axios = require("axios").default;
const cheerio = require("cheerio");

// console.log('=-= BEGIN 2 =-=');
// // vous souhaitez utiliser async/await ?
// // ajoutez le mot-clé `async` à la fonction/méthode englobante
// async function getSite() {
//     try {
//       const response = await axios.get('https://axios-http.com');
//       console.log('Response : ' + response);
//     } catch (error) {
//         console.error('Error fectching page :', error);
//     }
//   }

// test = gestSite;

// console.log('=-= END 2 =-=');

console.log("=-= BEGIN 2 =-=");
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
    console.log("=-= END 2 =-=");
  });
