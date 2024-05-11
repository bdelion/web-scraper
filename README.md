# Welcome to `web-scraper` :wave:

| Service             |                Main                |              Develop               |
| :------------------ | :--------------------------------: | :--------------------------------: |
| CI Status           |    [![Build Status][bmb]][bml]     |    [![Build Status][bdb]][bdl]     |
| Quality Gate Status | [![Quality Gate Status][qmb]][qml] | [![Quality Gate Status][qdb]][qdl] |

> NOTE : Le format est basé sur [Make a README].

## Descriptif

`web-scraper` est un project permetant de mettre en oeuvre les exemples de scrapping des sites Web suivants :

- [stabler.tech]
  - stabler-basic-get.js
  - stabler-puppeteer.js
  - stabler-crawler.js
  - **_A finir de lire_**
- [medium.com/@appiness68]
  - xxx
- [serpapi.com]
  - serpapi-axio-cheerio.js
  - serpapi-puppeteer.js
- [brightdata.com]
  - brightdata-axio-cheerio.js
  - brightdata-axio-cheerio-meteo.js
  - brightdata-axio-cheerio-meteo-v2.js
  - brightdata-puppeteer-meteo.js
- [risingstack mastering-async-await-in-nodejs]
  - risingstack-async-await.js
- [geeksforgeeks read-and-write-excel-file]
  - geeksforgeeks-read-excel-file.js

## Prérequis

Les éléments suivants doivent être installés :

- Node 16 ou supérieur
- NPM

## Installation

1. Se placer dans un dossier `web-scraper` ou autre
   ```sh
   $ mkdir web-scraper && cd web-scraper
   ```
2. Installer le logiciel :
   ```sh
   $ npm install -g web-scraper
   ```
3. Afin de vérifier la version installée et de créer le fichier de configuration par défaut, exécutez la commande la commande :
   ```sh
   $ web-scraper -v
   ```
4. La commande ci-dessus crée le fichier de configuration [config.json] dans votre home directory (C:\users\[matricule] sous Windows) nommé `~/.web-scraper/` et retourne le numéro de version du script. Pour ajuster la configuration, consulter la page de documentation [Configuration].

## :house: [Homepage]

## Usage

:construction: TO DO

## :construction_worker: Fabriqué avec

- [Visual Studio Code] - Editeur de code source.
- [Travis CI] - Logiciel libre d'intégration continue.
- [Codacy] - Outil d'analyse de code : qualité, compléxité, duplication et taux de couverture des tests unitaires.
- [Code Climate / Quality] - Outil d'analyse de code : qualité, maintenabilité, duplication et taux de couverture des tests unitaires.
- [Code Coverage] - Outil d'analyse de la couverture de tests.
- [Coveralls] - Outil d'analyse de la couverture de tests.
- [SonarCloud] - Service en ligne d'analyse de qualité et de sécurité du code.

## :busts_in_silhouette: Authors

:bust_in_silhouette: **Bertrand DELION**

- Github: [@bdelion]

Voir aussi la liste des [contributeurs] ayant participés à ce projet.

## :books: Journal des modifications

Pour connaître les dernières évolutions et leurs impacts, consuler la page [CHANGELOG].

## :handshake: Contributions

Les contributions, problèmes et demandes de fonctionnalités sont les bienvenus !
N'hésitez pas à consulter la page des [issues], et à ouvrir une `issue` afin de discuter de ce que vous souhaitez modifier.

## :bookmark: Versioning

Nous utilisons [SemVer] pour le versioning. Pour les versions disponibles, voir [les tags de ce projet].

## :link: Liens utiles

- :pencil: Documentation : [GitHub Pages]
- :building_construction: Build :
  - [Job Travis CI]
  - [Github Actions]
- Code Quality :
  - [Sonar]
- Repository : [GitHub Package Registry]

## :spider_web: Dependency

- [Dependencies] - Dépendances de ce projet
- [Dependents] - Projets dépendants de celui-ci

<!-- liens -->

[bmb]: https://github.com/bdelion/web-scraper/actions/workflows/node.js.yml/badge.svg?branch=main "Jenkins main Build Status Icon"
[bml]: https://github.com/bdelion/web-scraper/actions/workflows/node.js.yml "Jenkins main Job"
[bdb]: https://github.com/bdelion/web-scraper/actions/workflows/node.js.yml/badge.svg?branch=develop "Jenkins develop Build Status Icon"
[bdl]: https://github.com/bdelion/web-scraper/actions/workflows/node.js.yml "Jenkins develop Job"
[qmb]: https://sonarcloud.io/api/project_badges/measure?project=bdelion_web-scraper&branch=main&metric=alert_status "Sonar main Quality Gate Status Badge"
[qml]: https://sonarcloud.io/summary/new_code?id=bdelion_web-scraper&branch=main "Sonar main Dashboard"
[qdb]: https://sonarcloud.io/api/project_badges/measure?project=bdelion_web-scraper&branch=develop&metric=alert_status "Sonar develop Quality Gate Status Badge"
[qdl]: https://sonarcloud.io/summary/new_code?id=bdelion_web-scraper&branch=develop "Sonar develop Dashboard"
[Make a README]: https://www.makeareadme.com/#template-1 "README Template et bonnes pratiques"
[stabler.tech]: https://stabler.tech/blog/web-scraping-with-nodejs
[medium.com/@appiness68]: https://medium.com/@appiness68/web-scraping-using-node-js-2d0e1a1b606c
[serpapi.com]: https://serpapi.com/blog/web-scraping-in-javascript-complete-tutorial-for-beginner/
[brightdata.com]: https://brightdata.com/blog/how-tos/web-scraping-with-node-js
[risingstack mastering-async-await-in-nodejs]: https://blog.risingstack.com/mastering-async-await-in-nodejs/
[geeksforgeeks read-and-write-excel-file]: https://www.geeksforgeeks.org/how-to-read-and-write-excel-file-in-node-js/
[config.json]: https://github.com/bdelion/web-scraper/blob/main/src/assets/config.json "Lien vers le fichier de configuration de référence"
[Configuration]: https://bdelion.github.io/web-scraper/Installation-&-configuration/Configuration "Documentation pour configurer web-scraper"
[Homepage]: https://github.com/bdelion/web-scraper/tree/main "Documentation pour configurer web-scraper"
[Visual Studio Code]: https://code.visualstudio.com/
[Travis CI]: https://travis-ci.com/
[Codacy]: https://www.codacy.com/
[Code Climate / Quality]: https://codeclimate.com/quality/
[Code Coverage]: https://codecov.io/
[Coveralls]: https://coveralls.io/
[SonarCloud]: https://sonarcloud.io/about
[@bdelion]: https://github.com/bdelion
[contributeurs]: https://github.com/bdelion/web-scraper/graphs/contributors "Liste des contributeurs au projet"
[CHANGELOG]: CHANGELOG.md "CHANGELOG du projet"
[issues]: https://github.com/bdelion/web-scraper/issues "Liste des issues ouvertes"
[SemVer]: https://semver.org/lang/fr/ "Bonnes pratique de la Gestion de Version"
[les tags de ce projet]: https://github.com/bdelion/web-scraper/tags "Liste des tags du projet"
[GitHub Pages]: https://bdelion.github.io/web-scraper/
[Job Travis CI]: https://travis-ci.com/bdelion/web-scraper "Job Travis du projet"
[Github Actions]: https://github.com/bdelion/web-scraper/actions "Workflows GitHub Actions du projet"
[Sonar]: https://sonarcloud.io/project/overview?id=bdelion_web-scraper "Dashboard Sonar du projet"
[GitHub Package Registry]: https://github.com/bdelion/web-scraper/packages
[Dependencies]: https://github.com/bdelion/web-scraper/network/dependencies
[Dependents]: https://github.com/bdelion/web-scraper/network/dependents
