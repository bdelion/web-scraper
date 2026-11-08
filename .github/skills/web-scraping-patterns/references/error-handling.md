# Error Handling in Web Scraping

## ScrapingError Custom Class

Located in `src/errors/customErrors.js`, this class provides structured error handling with context:

```javascript
class ScrapingError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = "ScrapingError";
    this.context = context;
  }
}
```

## Usage Patterns

### Basic Error Throwing

```javascript
throw new ScrapingError("Failed to parse HTML", {
  url: "https://example.com",
  selector: ".temperature",
  html: htmlSnippet
});
```

### With Network Errors

```javascript
try {
  const response = await axios.get(url, { timeout: 5000 });
} catch (error) {
  if (error.code === "ECONNABORTED") {
    throw new ScrapingError("Request timeout", {
      url,
      timeout: 5000,
      originalError: error.message
    });
  } else if (error.response?.status === 403) {
    throw new ScrapingError("Access forbidden - check User-Agent", {
      url,
      status: error.response.status,
      headers: error.config.headers
    });
  }
}
```

### Nested Error Handling

```javascript
async function fetchAndParse(url) {
  try {
    const response = await axios.get(url);
    return parseWeatherData(response.data);
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error; // Re-throw domain errors
    }
    throw new ScrapingError("Unexpected error during fetch and parse", {
      url,
      step: "fetch_and_parse",
      originalError: error.message
    });
  }
}
```

## Global Error Handlers

Set up at the top of `src/meteo-scraping-file-input.js`:

```javascript
process.on('unhandledRejection', (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
```

## Logging with Errors

Use the logging utility to capture errors with context:

```javascript
const { log } = require("./utils/logUtils");

try {
  const data = await fetchWeatherData(stationId);
  log(`Successfully fetched data for station ${stationId}`, "info");
} catch (error) {
  log(`Error fetching weather data: ${error.message}`, "error");

  // Also log context if available
  if (error instanceof ScrapingError) {
    console.error("Context:", error.context);
  }
}
```

## Async/Await Error Patterns

### Try/Catch Pattern (Recommended)

```javascript
async function processData() {
  try {
    const stationId = await performIdStationScraping("Paris");
    const weatherData = await fetchWeatherDataByDateRanges(data, stationId);
    return weatherData;
  } catch (error) {
    if (error instanceof ScrapingError) {
      console.error("Scraping failed:", error.message);
      console.error("Context:", error.context);
    } else {
      console.error("Unexpected error:", error);
    }
    throw error; // Re-throw for caller to handle
  }
}
```

### Promise Chain Pattern

```javascript
performIdStationScraping("Paris")
  .then(stationId => fetchWeatherDataByDateRanges(data, stationId))
  .then(weatherData => {
    console.log("Success:", weatherData);
  })
  .catch(error => {
    if (error instanceof ScrapingError) {
      console.error("Scraping error:", error.message);
    }
    throw error;
  });
```

### Parallel Operations with Error Aggregation

```javascript
async function fetchMultipleStations(stationNames) {
  const results = [];
  const errors = [];

  for (const name of stationNames) {
    try {
      const data = await fetchWeatherData(name);
      results.push(data);
    } catch (error) {
      errors.push({ station: name, error: error.message });
      log(`Skipping station ${name}: ${error.message}`, "warn");
    }
  }

  if (errors.length > 0) {
    log(`${errors.length} stations failed`, "warn");
  }

  return { results, errors };
}
```

## HTTP Status Code Handling

```javascript
async function fetchWithStatusHandling(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    const status = error.response?.status;

    switch (status) {
      case 400:
        throw new ScrapingError("Bad request - check parameters", { url, status });
      case 401:
      case 403:
        throw new ScrapingError("Authentication failed - check credentials", { url, status });
      case 404:
        throw new ScrapingError("Resource not found", { url, status });
      case 429:
        throw new ScrapingError("Rate limited - wait before retrying", { url, status });
      case 500:
      case 502:
      case 503:
        throw new ScrapingError("Server error - retry later", { url, status });
      default:
        throw new ScrapingError("HTTP request failed", {
          url,
          status,
          message: error.message
        });
    }
  }
}
```

## Timeout and Retry Strategy

```javascript
async function fetchWithTimeoutAndRetry(url, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, {
        timeout: 5000,
        headers: { "User-Agent": USER_AGENT }
      });
    } catch (error) {
      lastError = error;

      // Don't retry client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw new ScrapingError("Client error - not retrying", {
          url,
          status: error.response.status
        });
      }

      // Retry server errors (5xx) and timeouts
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        log(`Retry ${attempt}/${maxRetries} in ${delay}ms`, "warn");
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw new ScrapingError("Max retries exceeded", {
    url,
    attempts: maxRetries,
    originalError: lastError?.message
  });
}
```

## Puppeteer Error Handling

```javascript
async function fetchWithPuppeteerErrorHandling(url) {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    return await page.content();
  } catch (error) {
    if (error.message.includes("Timeout")) {
      throw new ScrapingError("Puppeteer timeout - page too slow", { url });
    } else if (error.message.includes("not a valid URL")) {
      throw new ScrapingError("Invalid URL format", { url });
    } else {
      throw new ScrapingError("Puppeteer error", {
        url,
        originalError: error.message
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
```

## Data Validation Before Processing

```javascript
function validateWeatherData(data) {
  if (!Array.isArray(data)) {
    throw new ScrapingError("Weather data must be an array", { data });
  }

  if (data.length === 0) {
    throw new ScrapingError("Weather data is empty", { data });
  }

  data.forEach((entry, index) => {
    if (!entry.Date) {
      throw new ScrapingError("Missing Date field in entry", {
        index,
        entry
      });
    }

    if (typeof entry.Date !== "number") {
      throw new ScrapingError("Date must be a number (Excel format)", {
        index,
        date: entry.Date,
        type: typeof entry.Date
      });
    }
  });

  return data;
}
```

## Error Context Best Practices

- **Always include the URL** being scraped
- **Include input parameters** that led to the error
- **Add relevant snippets** of HTML/JSON that couldn't be parsed
- **Include HTTP status codes** and response headers
- **Log the original error message** from underlying libraries
- **Provide enough context** for debugging without exposing sensitive data
