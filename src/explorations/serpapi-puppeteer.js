"use strict";

const puppeteer = require("puppeteer");

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate the page to a URL
  //
  await page.goto("https://www.google.com/imghp?gl=us&hl=en");

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  // Search button "accept all" and validate Google condition
  const button = await page.waitForSelector("button ::-p-text(Accept all)");
  if (!button) throw new Error("button not found");
  await button.click();

  // Typing and submitting the form
  await page.type('textarea[name="q"]', "cat");
  await page.click('button[type="submit"]');

  await page.waitForNavigation();

  // Collect all images with certain class
  await page.waitForSelector(".rg_i.Q4LuWd");
  const images = await page.$$(".rg_i.Q4LuWd");
  // Simulate click on the first image
  await images[0].click();

  // Wait for the preview div to load, identified with id: "islsp"
  await page.waitForSelector("#islsp");
  await page.waitForSelector("#islsp img.sFlh5c.pT0Scc.iPVvYb");

  // Get the img src from img sFlh5c pT0Scc iPVvYb inside this div
  const imgSrc = await page.evaluate(() => {
    return document.querySelector("#islsp img.sFlh5c.pT0Scc.iPVvYb").src;
  });

  console.log(imgSrc);

  // console log the next page results
  console.log("New page URL:", page.url());
  // make a screenshot
  await page.screenshot({ path: "google.png" });

  await browser.close();
})();
