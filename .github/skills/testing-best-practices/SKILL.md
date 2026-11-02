---
name: testing-best-practices
description: 'Write and run tests for web-scraper project. Use when: setting up Jest test suites; mocking files and HTTP requests; testing async functions; debugging failing tests; achieving code coverage; writing integration tests.'
argument-hint: 'Describe what you want to test (e.g., "Test Excel reading with missing data")'
---

# Testing Best Practices

## When to Use

- Writing unit tests for scrapers, utilities, and CLI commands
- Mocking HTTP responses with `axios-mock-adapter`
- Mocking file system operations with `mock-fs`
- Testing async operations and error handling
- Debugging test failures and coverage gaps
- Integration testing across multiple modules
- Test setup and teardown for isolation

## Key Principles

1. **Jest Framework**: Project uses Jest with extended matchers
2. **Mocking First**: Always mock external dependencies (HTTP, file system)
3. **Async Testing**: All scrapers are async; use `async/await` in tests
4. **Error Testing**: Test both success and failure paths
5. **Isolation**: Each test suite is independent; reset mocks before each test
6. **Coverage Threshold**: Aim for 80%+ coverage on all metrics
7. **Descriptive Names**: Test names should describe what's tested and expected

## Procedure

### 1. Project Setup

**Run Tests**:
```bash
npm test                    # Run all tests with coverage
npm test -- --watch        # Watch mode for development
npm test -- --verbose      # Detailed output
npm test -- myFile.test.js # Run specific test file
```

**Check Coverage**:
```bash
npm test                    # Coverage report in console
# Detailed HTML report: coverage/lcov-report/index.html
```

**Jest Configuration** (in `package.json`):
- Test files: `**/*.tests.js` or `**/*.test.js`
- Coverage threshold: 80% (branches, statements, lines, functions)
- Reporters: `default` and coverage reports

### 2. Basic Test Structure

**File Organization**:
```
tests/
├── meteo-scraping-file-input.tests.js
├── scrapers/
│   └── weatherScraper.tests.js
└── utils/
    ├── excelUtils.tests.js
    ├── dateHourUtils.tests.js
    └── mathUtils.tests.js
```

**Test Template**:
```javascript
const { myFunction } = require("../../src/module");
const { MyError } = require("../../src/errors");

describe("Module Name", () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it("should do something specific", () => {
    // Arrange
    const input = "test data";
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe("expected");
  });
});
```

### 3. Mocking HTTP Requests

**Setup axios Mock**:
```javascript
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const mock = new MockAdapter(axios);

describe("Weather Scraper", () => {
  beforeEach(() => {
    mock.reset(); // Clear all mocks before each test
  });

  afterEach(() => {
    mock.reset();
  });
});
```

**Mock Successful Response**:
```javascript
it("should fetch station ID successfully", async () => {
  const mockResponse = `
    <select name="station">
      <option value="69001">Paris</option>
    </select>
  `;

  mock.onGet(/meteociel.*findstation/).reply(200, mockResponse);

  const stationId = await performIdStationScraping("Paris");
  expect(stationId).toBe("69001");
});
```

**Mock Error Responses**:
```javascript
it("should handle 403 Forbidden", async () => {
  mock.onGet(/meteociel/).reply(403);

  await expect(
    performIdStationScraping("Paris")
  ).rejects.toThrow(ScrapingError);
});

it("should handle network timeout", async () => {
  mock.onGet(/meteociel/).timeoutOnce();

  await expect(
    performIdStationScraping("Paris")
  ).rejects.toThrow();
});

it("should handle network error", async () => {
  mock.onGet(/meteociel/).networkError();

  await expect(
    performIdStationScraping("Paris")
  ).rejects.toThrow();
});
```

**Mock Multiple Calls**:
```javascript
it("should handle sequential requests", async () => {
  mock.onGet(/station=1/).reply(200, { temp: 20 });
  mock.onGet(/station=2/).reply(200, { temp: 15 });

  const temp1 = await fetchWeather(1);
  const temp2 = await fetchWeather(2);

  expect(temp1.temp).toBe(20);
  expect(temp2.temp).toBe(15);
});
```

### 4. Mocking File System

**Setup mock-fs**:
```javascript
const mockFs = require("mock-fs");
const { readExcel, writeExcel } = require("../../src/utils/excelUtils");

describe("Excel Utils", () => {
  beforeEach(() => {
    mockFs({
      "data.xlsx": Buffer.from([/* mock XLSX binary */]),
      "output/": {} // Create directory
    });
  });

  afterEach(() => {
    mockFs.restore(); // Restore real file system
  });
});
```

**Test File Reading**:
```javascript
it("should read Excel file", () => {
  const data = readExcel("data.xlsx", "Sheet1", 2);
  expect(data).toBeDefined();
  expect(Array.isArray(data)).toBe(true);
});
```

**Test File Writing**:
```javascript
it("should write Excel file", () => {
  const data = [{ temp: 20 }, { temp: 21 }];
  writeExcel(data, "output/result.xlsx");
  
  // Verify file was written (with mock-fs, it's in memory)
  expect(() => readExcel("output/result.xlsx")).not.toThrow();
});
```

### 5. Testing Async Functions

**Basic Async Test**:
```javascript
it("should process data asynchronously", async () => {
  mock.onGet(/api/).reply(200, { data: "success" });

  const result = await fetchData();
  
  expect(result.data).toBe("success");
});
```

**Test Error Handling in Async**:
```javascript
it("should reject on error", async () => {
  mock.onGet(/api/).reject(new Error("Network failed"));

  await expect(fetchData()).rejects.toThrow("Network failed");
});
```

**Test Promise Sequences**:
```javascript
it("should handle promise chains", async () => {
  mock.onGet(/station/).reply(200, { id: 123 });
  mock.onGet(/weather/).reply(200, { temp: 20 });

  const stationId = await getStation();
  const weather = await getWeather(stationId);

  expect(weather.temp).toBe(20);
});
```

### 6. Using Extended Matchers

Jest Extended provides additional matchers:

```javascript
describe("Extended Matchers", () => {
  it("should check array properties", () => {
    const data = [
      { id: 1, name: "Paris" },
      { id: 2, name: "Lyon" }
    ];

    expect(data).toBeArrayOfObjects();
    expect(data).toIncludeAllMembers([{ id: 1 }, { id: 2 }]);
    expect(data).toHaveLength(2);
  });

  it("should check object properties", () => {
    const obj = { name: "John", age: 30 };

    expect(obj).toHaveProperty("name");
    expect(obj).toContainEntries([["name", "John"]]);
    expect(obj).toMatchObject({ age: 30 });
  });

  it("should check value types", () => {
    expect(42).toBeNumber();
    expect("text").toBeString();
    expect([1, 2]).toBeArray();
  });
});
```

### 7. Data Validation Tests

**Test Input Validation**:
```javascript
const { formatData } = require("../../src/scrapers/weatherScraper");
const { ScrapingError } = require("../../src/errors/customErrors");

describe("Data Validation", () => {
  it("should reject non-array input", () => {
    expect(() => {
      formatData({ data: "not an array" });
    }).toThrow(ScrapingError);
  });

  it("should reject empty array", () => {
    expect(() => {
      formatData([]);
    }).toThrow(ScrapingError);
  });

  it("should accept valid data structure", () => {
    const validData = [
      { Date: 45658, Min: 10, Max: 20 },
      { Date: 45659, Min: 11, Max: 21 }
    ];

    expect(() => {
      formatData(validData);
    }).not.toThrow();
  });
});
```

### 8. Integration Tests

**Full Pipeline Test**:
```javascript
describe("Full Weather Pipeline", () => {
  beforeEach(() => {
    mock.reset();
    mockFs({
      "input.xlsx": mockExcelData,
      "output/": {}
    });
  });

  it("should process weather data end-to-end", async () => {
    // Mock station lookup
    mock.onGet(/findstation/).reply(200, `<option value="69001">Paris</option>`);
    
    // Mock weather data
    mock.onGet(/weather/).reply(200, mockWeatherHtml);

    // Run full pipeline
    const results = await processWeatherData({
      weatherStationName: "Paris",
      inputFile: "input.xlsx",
      outputFile: "output/result.xlsx"
    });

    // Verify results
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty("Date");
    expect(results[0]).toHaveProperty("Temperature");
  });
});
```

### 9. Snapshot Testing

Use snapshots for comparing complex results:

```javascript
it("should match snapshot", () => {
  const result = parseWeatherData(mockHtml);
  expect(result).toMatchSnapshot();
});

// First run: Creates snapshot file
// Subsequent runs: Compares against snapshot
// Update with: npm test -- -u
```

### 10. Running Tests

**Development Workflow**:
```bash
npm test -- --watch                    # Watch for changes
npm test -- weatherScraper.tests.js    # Single file
npm test -- --testNamePattern="Excel"  # Filter by test name
```

**CI/CD Pipeline**:
```bash
npm test                  # Full coverage check
npm run lint              # Code quality
npm test -- --coverage    # Generate coverage report
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Mock not intercepting requests | Check URL pattern matches actual request; use `.onGet(/pattern/)` or exact URL |
| File mock not working | Use `mock-fs` beforeEach; call `restore()` in afterEach |
| Async test times out | Increase Jest timeout: `jest.setTimeout(10000)` |
| Coverage threshold fails | Add tests for missing branches; check coverage report |
| Test order matters (tests fail in random order) | Fix test isolation; don't share state between tests |

## Related References

- [Testing Strategies](../web-scraping-patterns/references/testing-strategies.md) — Detailed scraper testing
- [Error Handling](../web-scraping-patterns/references/error-handling.md) — Testing error scenarios
- [Mock Examples](./references/mock-examples.md) — Common mocking patterns
