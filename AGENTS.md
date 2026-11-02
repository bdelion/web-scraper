# Agent Instructions for web-scraper

This document helps AI coding agents understand the project structure, conventions, and development workflows.

## Project Overview

**web-scraper** is a Node.js CLI tool that scrapes weather data from meteociel.fr and processes it with Excel files. It supports multiple web scraping approaches (Puppeteer, Axios/Cheerio) and date/time calculations for weather data analysis.

- **Current Branch**: develop
- **Default Branch**: main
- **Main Entry Point**: `src/meteo-scraping-file-input.js`

## Quick Start Commands

```bash
npm install              # Install dependencies
npm test                 # Run Jest tests with coverage
npm run lint             # Run ESLint check
npm start                # Run the main script (alias: node src/meteo-scraping-file-input.js)
npm run lint -- --fix    # Auto-fix linting issues
```

## Project Structure

```
src/
├── meteo-scraping-file-input.js    # CLI entry point with yargs command handling
├── scrapers/
│   └── weatherScraper.js           # Core scraping logic (formatData, performIdStationScraping, fetchWeatherDataByDateRanges)
├── utils/
│   ├── excelUtils.js               # readExcel, writeExcel functions
│   ├── dateHourUtils.js            # Excel date conversions, formatting
│   ├── logUtils.js                 # Structured logging
│   └── mathUtils.js                # getAverage, findMedian
├── config/
│   └── dayjsConfig.js              # dayjs setup, date format constants
├── errors/
│   └── customErrors.js             # ScrapingError class
└── explorations/                   # Experimental/reference implementations (ignore for main features)

tests/
├── meteo-scraping-file-input.tests.js    # Main integration tests
├── scrapers/weatherScraper.tests.js      # Scraper unit tests
└── utils/                                 # Utility tests
```

## Key Patterns & Conventions

### 1. **Date/Time Handling**
- Excel dates are stored as serial numbers (e.g., 45658 = 01/01/2025)
- Fractional parts represent time (0.25 = 6 hours, 0.5 = 12 hours)
- Use `excelDateToDayjs()` to convert to dayjs objects
- Use `dateToExcelValue()` to convert dayjs to Excel format
- Key constants in `config/dayjsConfig.js`: `DATE_FORMAT`, `DATEHOUR_FORMAT`, `HOUR_FORMAT`

### 2. **Web Scraping Setup**
- **Base API URL**: `process.env.METEO_API_BASE_URL || 'https://www.meteociel.fr/...'`
- **User-Agent**: `process.env.USER_AGENT || 'Mozilla/5.0...'` (required for requests)
- **Error Handling**: Throw `ScrapingError` with context: `throw new ScrapingError("message", { context })`
- **Async/Await**: All scraping functions are async; use try/catch or Promise chains

### 3. **Excel Handling**
- `readExcel(filePath, sheetName, firstRow)`: Returns array of objects
- `writeExcel(data, outputFile)`: Writes array of objects to XLSX file
- Use `read-excel-file` for parsing and `xlsx` for writing
- Handle undefined/null values for Min/Max columns (some data points may be incomplete)

### 4. **Logging**
- Use `log(message, level)` from logUtils
- Levels: "info", "warn", "error"
- Always log major operations (data processing start/end, file saves, API calls)

### 5. **CLI Commands (yargs)**
- The main script processes both `processExcel` command and weather data input
- Commands receive options: `--excelFile`, `--sheetName`, `--firstRow`, `--weatherStationName`, `--outputFile`
- Main logic in `processWeatherData()` function

### 6. **Error Handling**
- Global handlers are set up for unhandled rejections and exceptions (see top of meteo-scraping-file-input.js)
- Custom `ScrapingError` class for domain-specific errors
- Always validate input arrays and date ranges

### 7. **Testing**
- Framework: Jest with extended matchers (`jest-extended`)
- Mock libraries: `mock-fs` for file system, `axios-mock-adapter` for HTTP mocks
- Test pattern: Descriptive `describe()` blocks with `it()` cases
- Coverage tracked in `coverage/` directory (ignored in git)

## Common Tasks

### Adding a New Scraper
1. Create a new function in `src/scrapers/weatherScraper.js`
2. Export it from the module
3. Add corresponding tests in `tests/scrapers/weatherScraper.tests.js`
4. Use `ScrapingError` for error handling
5. Apply User-Agent header to requests

### Adding a New Utility
1. Create a file in `src/utils/`
2. Export functions with clear names
3. Add unit tests in `tests/utils/`
4. Use `log()` for any internal logging

### Handling Date Conversions
1. Always use `excelDateToDayjs()` when reading from Excel
2. Always use `dateToExcelValue()` before writing to Excel
3. For date comparisons/formatting, use dayjs methods (`.format()`, `.isBefore()`, etc.)
4. Never rely on JavaScript Date objects for Excel data (they lose precision)

### Fixing Linting Issues
- Run `npm run lint -- --fix` for auto-fixes
- Common issues: missing semicolons, unused variables, inconsistent spacing
- ESLint config: `eslint.config.mjs` with Jest plugin enabled

## Important Notes

### Pitfalls to Avoid
1. **Excel Date Precision**: Don't use native JavaScript `Date` for Excel serial numbers—always use dayjs conversion functions
2. **Web Scraping Timeouts**: Puppeteer operations may timeout on slow networks; consider adding retry logic or increasing timeouts
3. **User-Agent Headers**: Most web scraping will fail without a valid User-Agent; always include it in requests
4. **Async Sequencing**: Data is processed sequentially (not in parallel) to maintain order; changing this requires careful testing
5. **File Paths**: Use `path.resolve()` and `path.dirname()` for cross-platform compatibility (Windows vs. Unix)

### Environment Setup
- Node 16+ required (check `.nvmrc`)
- No global credentials needed; API URLs can be overridden via environment variables
- Jest coverage must stay above configured thresholds (check `package.json`)

## Related Documentation

- [README.md](./README.md) — Usage examples and project overview
- [CHANGELOG.md](./CHANGELOG.md) — Version history and breaking changes
- [sonar-project.properties](./sonar-project.properties) — SonarCloud configuration

## Next Steps for Agents

When working on this project:
1. Always run `npm test` before committing changes
2. Ensure `npm run lint` passes without errors
3. Add tests for new features (aim for >80% coverage)
4. Follow the async/await and error handling patterns in existing code
5. Use environment variables for configuration, not hardcoded URLs
