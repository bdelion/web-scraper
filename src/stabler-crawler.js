"use strict";

const crawler = require("crawler");

const c = new crawler({
  maxConnections: 10,
  callback: function (error, res, done) {
    if (error) {
      console.error(error);
    } else {
      let $ = res.$;
      console.log($("title").text());
    }
    done();
  },
});

c.queue(
  "https://www.meteociel.fr/temps-reel/obs_villes.php?affint=1&code2=79049004&jour2=20&mois2=1&annee2=2022"
);
c.queue(
  "https://www.meteociel.fr/temps-reel/obs_villes.php?affint=1&code2=79049004&jour2=20&mois2=1&annee2=2024"
);
