"use strict";

const puppeteer = require("puppeteer");
const moment = require("moment");

async function performScraping(date) {
  const momentDate = moment(date, "DD/MM/YY hh:mm");
  let day = momentDate.date();
  let month = momentDate.month();
  let year = momentDate.year();
  let url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=79049004&jour2=${day}&mois2=${month}&annee2=${year}&affint=1`;
  const temperatureLabel = "Température";
  const heureLocaleLabel = "Heure\nlocale";
  // initializing the data structures that will contain the scraped data
  const dataMeteo = [];

  try {
    // Iterate over each cell of the row using the find and each methods
    let data = [];
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch();
    const [page] = await browser.pages();
    // Navigate the page to a URL
    await page.goto(url);

    data = await page.evaluate(() => {
      const table = document.querySelector("table:nth-child(3)");
      const rowsWithNumbers = [...table.rows].slice(0);
      const numbers = rowsWithNumbers.map((row) =>
        [...row.cells].slice(0).map((cell) => cell.innerText)
      );
      return numbers;
    });
    const temperatureIndex = data[0].indexOf(temperatureLabel);
    const heureLocaleIndex = data[0].indexOf(heureLocaleLabel);

    data.forEach((line) => {
      if (!(line[heureLocaleIndex] === heureLocaleLabel)) {
        let time = moment().set({
          year: year,
          month: month,
          date: day,
          hour: line[heureLocaleIndex].split("h")[0],
          minute: line[heureLocaleIndex].split("h")[1],
          second: 0,
        });
      }
    });

    dataMeteo.push(...data);

    await browser.close();
  } catch (err) {
    console.error(err);
  }

  // Return the table data
  return dataMeteo;
}

// initializing the data structures that will contain all scraped data
const datasMeteo = {};

(async () => {
  datasMeteo["25/1/22 7:41"] = await performScraping("25/1/22 7:41");
  datasMeteo["6/5/24 7:40"] = await performScraping("6/5/24 7:40");
  console.log(JSON.stringify(datasMeteo));
})();
