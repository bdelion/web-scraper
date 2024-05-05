"use strict";

const puppeteer = require("puppeteer");

async function scrapeDynamicContent(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  const data = await page.evaluate(() => {
    return document.querySelector("h1").innerText;
  });

  console.log(data);
  await browser.close();
}

scrapeDynamicContent(
  "https://www.meteociel.fr/temps-reel/obs_villes.php?affint=1&code2=79049004&jour2=20&mois2=1&annee2=2022"
);
