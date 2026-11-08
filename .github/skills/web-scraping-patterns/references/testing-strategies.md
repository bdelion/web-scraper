# Testing Web Scrapers

## Test Setup

### Required Dependencies

The project includes testing tools in `package.json`:

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-extended": "^4.0.2",
    "axios-mock-adapter": "^2.1.0",
    "mock-fs": "^5.4.1"
  }
}
```

### Test File Structure

Create test files in `tests/scrapers/yourScraper.tests.js`:

```javascript
const assert = require("assert");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const { performIdStationScraping, fetchWeatherData } = require("../../src/scrapers/weatherScraper");
const { ScrapingError } = require("../../src/errors/customErrors");

const mock = new MockAdapter(axios);

describe("Weather Scraper", () => {
  // Tests go here
});
```

## Mocking HTTP Responses

### Mock Successful Responses

```javascript
describe("performIdStationScraping", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("should return station ID for valid station name", async () => {
    const mockHtml = `
      <html>
        <select name="station">
          <option value="12345">Paris, France</option>
        </select>
      </html>
    `;

    mock.onGet(/meteociel.*findstation/).reply(200, mockHtml);

    const stationId = await performIdStationScraping("Paris");

    expect(stationId).toBe("12345");
  });
});
```

### Mock Error Responses

```javascript
it("should throw ScrapingError on HTTP 403", async () => {
  mock.onGet(/meteociel/).reply(403);

  await expect(
    performIdStationScraping("Paris")
  ).rejects.toThrow(ScrapingError);
});

it("should throw ScrapingError on network timeout", async () => {
  mock.onGet(/meteociel/).timeoutOnce();

  await expect(
    performIdStationScraping("Paris")
  ).rejects.toThrow(ScrapingError);
});

it("should throw ScrapingError on network error", async () => {
  mock.onGet(/meteociel/).networkError();

  await expect(
    performIdStationScraping("Paris")
  ).rejects.toThrow(ScrapingError);
});
```

### Mock Different Responses Per Call

```javascript
it("should handle multiple sequential requests", async () => {
  mock.onGet(/meteociel.*station=1/).reply(200, { temp: 20 });
  mock.onGet(/meteociel.*station=2/).reply(200, { temp: 15 });

  const temp1 = await fetchWeatherData(1);
  const temp2 = await fetchWeatherData(2);

  expect(temp1.temp).toBe(20);
  expect(temp2.temp).toBe(15);
});
```

## Testing Data Parsing

### Test HTML Parsing with Cheerio

```javascript
const cheerio = require("cheerio");

it("should parse weather table correctly", () => {
  const html = `
    <table>
      <tr>
        <td class="time">10:00</td>
        <td class="temp">20.5</td>
        <td class="humidity">65</td>
      </tr>
    </table>
  `;

  const $ = cheerio.load(html);
  const results = [];

  $("table tr").each((i, row) => {
    results.push({
      time: $(row).find(".time").text(),
      temp: parseFloat($(row).find(".temp").text())
    });
  });

  expect(results).toEqual([
    { time: "10:00", temp: 20.5 }
  ]);
});
```

### Test Edge Cases in Parsing

```javascript
it("should handle missing data fields", () => {
  const html = `
    <table>
      <tr>
        <td class="time">10:00</td>
        <td class="temp"></td>
      </tr>
    </table>
  `;

  const $ = cheerio.load(html);
  const temp = parseFloat($(".temp").text()) || null;

  expect(temp).toBeNull();
});

it("should handle malformed numbers", () => {
  const value = parseFloat("N/A") || null;
  expect(value).toBeNull();
});
```

## Testing Async Operations

### Test Sequential Processing

```javascript
it("should process data sequentially", async () => {
  const callOrder = [];

  mock.onGet(/station=1/).reply(() => {
    callOrder.push(1);
    return [200, { data: "station1" }];
  });

  mock.onGet(/station=2/).reply(() => {
    callOrder.push(2);
    return [200, { data: "station2" }];
  });

  await fetchSequential([1, 2]);

  expect(callOrder).toEqual([1, 2]);
});
```

### Test Error Recovery

```javascript
it("should continue processing after individual errors", async () => {
  mock.onGet(/station=1/).reply(200, { data: "ok" });
  mock.onGet(/station=2/).reply(500); // Will error
  mock.onGet(/station=3/).reply(200, { data: "ok" });

  const { results, errors } = await fetchMultipleWithErrorHandling([1, 2, 3]);

  expect(results).toHaveLength(2);
  expect(errors).toHaveLength(1);
  expect(errors[0].station).toBe(2);
});
```

## File System Mocking

### Mock Excel File Operations

```javascript
const mockFs = require("mock-fs");
const { readExcel, writeExcel } = require("../../src/utils/excelUtils");

describe("Excel Operations", () => {
  beforeEach(() => {
    mockFs({
      "data.xlsx": Buffer.from([/* mock binary data */])
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should read Excel file", () => {
    const data = readExcel("data.xlsx");
    expect(data).toBeDefined();
  });

  it("should write Excel file", () => {
    writeExcel([{ temp: 20 }], "output.xlsx");
    // File operations are isolated in mock-fs
  });
});
```

## Testing with Extended Matchers

Jest Extended provides additional matchers useful for scraper testing:

```javascript
it("should validate response structure", () => {
  const response = {
    stationId: "12345",
    data: [
      { temp: 20, humidity: 65 }
    ]
  };

  expect(response).toHaveProperty("stationId");
  expect(response.data).toBeArrayOfObjects();
  expect(response.data[0].temp).toBeNumber();
});

it("should validate array operations", () => {
  const results = [1, 2, 3, 4, 5];
  expect(results).toIncludeAllMembers([1, 3, 5]);
  expect(results).toHaveLength(5);
});
```

## Snapshot Testing

Use snapshots for comparing complex HTML parsing results:

```javascript
it("should match snapshot for weather data", () => {
  const html = fetchedWeatherHtml; // From mock
  const parsed = parseWeatherData(html);

  expect(parsed).toMatchSnapshot();
});

// First run creates snapshot, subsequent runs compare
// Update with: npm test -- -u
```

## Test Coverage

Check coverage with:

```bash
npm test -- --coverage
```

Coverage reports are in `coverage/`:

```
✓ Branches      80%+
✓ Statements    80%+
✓ Lines         80%+
✓ Functions     80%+
```

### Coverage Configuration (package.json)

```json
{
  "jest": {
    "collectCoverage": true,
    "coverageDirectory": "coverage",
    "coveragePathIgnorePatterns": ["/node_modules/", "/explorations/"],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "statements": 80,
        "lines": 80,
        "functions": 80
      }
    }
  }
}
```

## Integration Test Example

```javascript
describe("Full Weather Data Pipeline", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("should fetch, parse, and format weather data end-to-end", async () => {
    // Mock station lookup
    mock.onGet(/findstation/).reply(200, `
      <select><option value="69001">Paris</option></select>
    `);

    // Mock weather data
    mock.onGet(/temps-reel/).reply(200, `
      <table>
        <tr><td>10:00</td><td>20.5</td><td>65</td></tr>
      </table>
    `);

    const stationId = await performIdStationScraping("Paris");
    const weatherData = await fetchWeatherData(stationId);

    expect(stationId).toBe("69001");
    expect(weatherData).toEqual(expect.objectContaining({
      time: "10:00",
      temperature: 20.5
    }));
  });
});
```

## Debugging Failing Tests

### Run Specific Test

```bash
npm test -- weatherScraper.tests.js
```

### Run with Verbose Output

```bash
npm test -- --verbose
```

### Debug Mode (VS Code)

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

Then press F5 to debug.

### Check Mock Calls

```javascript
it("should call API with correct parameters", async () => {
  mock.onGet(/meteociel/).reply(200, { ok: true });

  await fetchWeatherData("Paris", { timeout: 5000 });

  // Inspect what was called
  expect(mock.history.get).toHaveLength(1);
  expect(mock.history.get[0].url).toContain("Paris");
});
```
