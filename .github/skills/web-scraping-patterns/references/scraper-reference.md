# Scraper Code Examples

## Axios + Cheerio Pattern (Lightweight)

### Basic Setup

```javascript
const axios = require("axios");
const cheerio = require("cheerio");
const { ScrapingError } = require("../errors/customErrors");
const { log } = require("../utils/logUtils");

const BASE_URL = process.env.METEO_API_BASE_URL || 'https://www.meteociel.fr/temps-reel/lieuhelper.php';
const USER_AGENT = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
```

### Fetching Station ID (from weatherScraper.js)

```javascript
async function performIdStationScraping(weatherStationName) {
  try {
    log(`Searching for weather station: ${weatherStationName}`, "info");
    
    const response = await axios.get(`${BASE_URL}?mode=findstation&str=${encodeURIComponent(weatherStationName)}`, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const stationId = $("#station-id").val();

    if (!stationId) {
      throw new ScrapingError("Station not found", { weatherStationName });
    }

    log(`Found station ID: ${stationId}`, "info");
    return stationId;
  } catch (error) {
    if (error instanceof ScrapingError) throw error;
    throw new ScrapingError("Failed to fetch station ID", {
      weatherStationName,
      originalError: error.message
    });
  }
}
```

### Parsing HTML Table

```javascript
function parseWeatherTable(html) {
  const $ = cheerio.load(html);
  const results = [];

  $('table tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return; // Skip header rows

    results.push({
      timestamp: $(cells[0]).text().trim(),
      temperature: parseFloat($(cells[1]).text()) || null,
      humidity: parseFloat($(cells[2]).text()) || null,
      windSpeed: parseFloat($(cells[3]).text()) || null
    });
  });

  return results;
}
```

## Puppeteer Pattern (JavaScript-Heavy Sites)

### Setup

```javascript
const puppeteer = require("puppeteer");
const { ScrapingError } = require("../errors/customErrors");
const { log } = require("../utils/logUtils");
```

### Full Puppeteer Example

```javascript
async function fetchWithPuppeteer(url, options = {}) {
  const {
    headless = true,
    timeout = 30000,
    waitFor = "networkidle2"
  } = options;

  let browser;
  try {
    log(`Launching Puppeteer for: ${url}`, "info");
    
    browser = await puppeteer.launch({ 
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    // Navigate with timeout
    await page.goto(url, { 
      waitUntil: waitFor,
      timeout
    });

    // Wait for dynamic content to load
    await page.waitForSelector('.weather-data', { timeout: 5000 });

    const html = await page.content();
    return html;
  } catch (error) {
    throw new ScrapingError("Puppeteer fetch failed", {
      url,
      originalError: error.message
    });
  } finally {
    if (browser) await browser.close();
  }
}
```

### Taking Screenshots (Debugging)

```javascript
async function debugPage(url, outputPath) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url);
    await page.screenshot({ path: outputPath, fullPage: true });
    log(`Screenshot saved to ${outputPath}`, "info");
  } finally {
    await browser.close();
  }
}
```

## Retry Logic Pattern

### Exponential Backoff

```javascript
async function fetchWithRetry(url, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`Attempt ${attempt}/${maxRetries} to fetch ${url}`, "info");
      
      const response = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT },
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) break;
      
      const delay = initialDelay * Math.pow(2, attempt - 1);
      log(`Retry in ${delay}ms after error: ${error.message}`, "warn");
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new ScrapingError("Max retries exceeded", {
    url,
    attempts: maxRetries,
    originalError: lastError.message
  });
}
```

## Batch Processing Pattern

### Sequential Processing (Maintains Order)

```javascript
async function fetchMultipleDataPoints(stationId, dateRanges) {
  const results = [];
  
  for (const range of dateRanges) {
    try {
      log(`Processing range: ${range.begin} to ${range.end}`, "info");
      
      const data = await fetchWeatherDataForRange(stationId, range);
      results.push(...data);
      
      // Polite delay between requests
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      log(`Error processing range ${range.begin}: ${error.message}`, "error");
      // Continue with next range instead of failing entire batch
    }
  }
  
  return results;
}
```

### Parallel Processing (with Limit)

```javascript
async function fetchWithLimit(urls, concurrency = 3) {
  const results = [];
  
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => fetchData(url))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

## Common Selectors for Meteociel.fr

```javascript
// Station search result
const stationSelect = 'select[name="station"] option';

// Weather table data
const temperatureCell = 'td.temp';
const humidityCell = 'td.humidity';
const windSpeedCell = 'td.wind';

// Timestamp
const timeCell = 'td.time';
```

## Environment Configuration

### .env Example

```
METEO_API_BASE_URL=https://www.meteociel.fr/temps-reel/lieuhelper.php
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
SCRAPER_TIMEOUT=10000
SCRAPER_RETRIES=3
PUPPETEER_HEADLESS=true
```

### Loading Environment Variables

```javascript
require('dotenv').config();

const BASE_URL = process.env.METEO_API_BASE_URL;
const USER_AGENT = process.env.USER_AGENT;
const TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT) || 10000;
const MAX_RETRIES = parseInt(process.env.SCRAPER_RETRIES) || 3;
```
