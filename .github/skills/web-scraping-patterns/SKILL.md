---
name: web-scraping-patterns
description: 'Implement web scraping in web-scraper project. Use when: adding new scrapers for meteociel.fr or similar sites; handling API calls with Axios; parsing HTML with Cheerio; managing Puppeteer for JavaScript-heavy sites; writing scraper tests with mocks.'
argument-hint: 'Describe what you want to scrape (e.g., "Create a scraper for retrieving station IDs")'
---

# Web Scraping Patterns

## When to Use

- Adding a new scraper for weather data or similar APIs
- Fetching data from web pages using Axios/Cheerio or Puppeteer
- Parsing HTML responses and extracting structured data
- Handling web scraping errors and retries
- Writing tests for web scrapers using mocks
- Configuring User-Agent headers and environment variables

## Key Principles

1. **Error Handling**: Always throw `ScrapingError` with contextual information
2. **User-Agent Headers**: Required for most web requests; use environment variables
3. **Async/Await**: All scrapers are async functions; use try/catch for error handling
4. **Testing**: Mock HTTP responses with `axios-mock-adapter`; test error conditions
5. **Environment Variables**: Make URLs and headers configurable via `.env` or process.env

## Procedure

### 1. Choose Scraping Method

**Axios + Cheerio** (Lightweight HTML parsing):
- For static HTML pages
- For RESTful APIs returning HTML or JSON
- Fast and memory-efficient
- Use `axios.get()` with User-Agent header
- Parse with Cheerio (`cheerio.load()`)

**Puppeteer** (Full browser automation):
- For JavaScript-heavy sites requiring DOM rendering
- For sites that detect headless browsers
- Slower but handles dynamic content
- Use `browser.newPage()` and `page.goto()`
- Add timeouts and retry logic for reliability

See [Scraper Reference](./references/scraper-reference.md) for code examples.

### 2. Set Up the Scraper Function

1. Create a new function in `src/scrapers/weatherScraper.js` or a new file in `src/scrapers/`
2. Import required modules:
   ```javascript
   const axios = require("axios");
   const cheerio = require("cheerio");
   const { ScrapingError } = require("../errors/customErrors");
   const { log } = require("../utils/logUtils");
   ```

3. Define constants for URL and headers:
   ```javascript
   const BASE_URL = process.env.METEO_API_BASE_URL || 'https://www.meteociel.fr/...';
   const USER_AGENT = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
   ```

4. Implement the async function with error handling:
   ```javascript
   async function fetchWeatherData(stationId, dateRange) {
     try {
       log(`Fetching data for station ${stationId}`, "info");
       const response = await axios.get(`${BASE_URL}?id=${stationId}`, {
         headers: { "User-Agent": USER_AGENT }
       });

       // Parse response
       const data = parseResponse(response.data);
       return data;
     } catch (error) {
       throw new ScrapingError("Failed to fetch weather data", {
         stationId,
         dateRange,
         originalError: error.message
       });
     }
   }
   ```

### 3. Handle Common Patterns

**Parsing HTML with Cheerio**:
```javascript
const $ = cheerio.load(response.data);
const results = [];
$('tr').each((i, elem) => {
  results.push({
    name: $(elem).find('td:first').text(),
    value: $(elem).find('td:last').text()
  });
});
```

**Retry Logic for Timeouts**:
```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, { timeout: 5000 });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      log(`Retry ${attempt}/${maxRetries} after timeout`, "warn");
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}
```

**Using Puppeteer for JavaScript Sites**:
```javascript
const puppeteer = require("puppeteer");

async function fetchWithPuppeteer(url) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    const html = await page.content();
    return cheerio.load(html);
  } finally {
    await browser.close();
  }
}
```

### 4. Write Tests

1. Create test file in `tests/scrapers/yourScraper.tests.js`
2. Mock HTTP responses using `axios-mock-adapter`:
   ```javascript
   const MockAdapter = require("axios-mock-adapter");
   const mock = new MockAdapter(axios);

   describe("weatherScraper", () => {
     it("should parse weather data correctly", async () => {
       mock.onGet(/meteociel/).reply(200, '<html>...</html>');
       const result = await fetchWeatherData(123);
       expect(result).toHaveProperty("temperature");
     });

     it("should throw ScrapingError on network failure", async () => {
       mock.onGet(/meteociel/).networkError();
       await expect(fetchWeatherData(123)).rejects.toThrow(ScrapingError);
     });
   });
   ```

3. Test error conditions and edge cases
4. Run `npm test` to verify coverage

### 5. Export and Integrate

1. Export the function from `src/scrapers/weatherScraper.js`
2. Import in `src/meteo-scraping-file-input.js`
3. Integrate with CLI command or existing workflow
4. Run `npm run lint` to check code quality

### 6. Verify and Document

1. Run all tests: `npm test`
2. Check linting: `npm run lint`
3. Add comments explaining non-obvious logic
4. Update [AGENTS.md](../../AGENTS.md) if adding new patterns

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 403 Forbidden errors | Add User-Agent header; check environment variables |
| Timeout errors | Increase axios timeout; add retry logic; use Puppeteer for JS-heavy sites |
| Parsing fails | Verify HTML structure with browser DevTools; update selectors |
| Tests fail with mocked responses | Ensure mock URL pattern matches actual request URL |
| Memory leaks with Puppeteer | Always close browser in `finally` block or use `.catch()` |

## Related References

- [Scraper Code Examples](./references/scraper-reference.md) — Axios/Cheerio and Puppeteer patterns
- [Error Handling Guide](./references/error-handling.md) — ScrapingError and async error patterns
- [Testing Strategies](./references/testing-strategies.md) — Jest mocks and test patterns
