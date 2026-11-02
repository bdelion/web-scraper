---
name: excel-file-handling
description: 'Read and write Excel files in web-scraper. Use when: reading XLSX files with date columns; writing formatted Excel output; handling sheet names and row ranges; applying number formatting to cells; converting data structures to/from Excel format.'
argument-hint: 'Describe your Excel operation (e.g., "Read weather data from sheet named Suivi Conso")'
---

# Excel File Handling

## When to Use

- Reading XLSX files into JSON arrays
- Writing processed data to Excel files
- Formatting dates and numbers in Excel output
- Handling specific sheet names and starting rows
- Converting between Excel serial dates and JavaScript objects
- Applying number formatting (percentages, decimals, currency)

## Key Principles

1. **Use XLSX Library**: `xlsx` package for reading and writing
2. **Date Handling**: Excel uses serial numbers for dates; use `dateHourUtils` for conversions
3. **Error Handling**: Throw `ScrapingError` if file doesn't exist or is malformed
4. **Raw Data Mode**: Use `raw: true` in `sheet_to_json()` to get unformatted values
5. **Number Formatting**: Apply `z` property to cells for custom number formats
6. **Sheet References**: Always specify sheet name explicitly to avoid confusion

## Procedure

### 1. Reading Excel Files

**Basic Excel Read**:
```javascript
const { readExcel } = require("./utils/excelUtils");

// Read from sheet "Suivi Conso" starting at row 2
const data = readExcel("weather-data.xlsx", "Suivi Conso", 2);

console.log(data);
// Output: [
//   { Date: 45658, Min: 12.5, Max: 22.3 },
//   { Date: 45659, Min: 11.2, Max: 21.8 }
// ]
```

**With Error Handling**:
```javascript
try {
  const data = readExcel(filePath, sheetName, firstRow);
  console.log(`Read ${data.length} rows from ${sheetName}`);
} catch (error) {
  if (error instanceof ScrapingError) {
    console.error("File error:", error.message);
    // File doesn't exist or invalid sheet name
  }
}
```

**Key Parameters**:
- `inputFile` (string): Absolute or relative path to XLSX file
- `sheetName` (string): Name of sheet to read (case-sensitive)
- `firstRow` (number): Starting row (1-based index; use 2 for data after header)

**Important**: Use `raw: true` mode internally to get Excel serial numbers as-is (don't let XLSX auto-convert dates).

### 2. Converting Excel Dates to JavaScript

Always convert Excel serial numbers to Dayjs when reading:

```javascript
const { excelDateToDayjs } = require("./utils/dateHourUtils");
const { readExcel } = require("./utils/excelUtils");

const rawData = readExcel("data.xlsx", "Weather", 2);

// Convert each row's Date field
const processedData = rawData.map(row => ({
  ...row,
  Date: excelDateToDayjs(row.Date, 'Europe/Paris') // Converts serial to Dayjs
}));

// Now you can use date methods
console.log(processedData[0].Date.format("DD/MM/YYYY HH:mm:ss"));
```

### 3. Writing Excel Files

**Basic Excel Write**:
```javascript
const { writeExcel } = require("./utils/excelUtils");

const outputData = [
  { Date: "13/01/2025 10:00:00", Temperature: 20.5, Humidity: 65 },
  { Date: "13/01/2025 11:00:00", Temperature: 21.0, Humidity: 62 }
];

writeExcel(outputData, "output.xlsx");
```

**With Date Conversion**:
```javascript
const { writeExcel } = require("./utils/excelUtils");
const { dateToExcelValue } = require("./utils/dateHourUtils");

const processedData = [
  { Date: dateToExcelValue("13/01/2025 10:00:00"), Temp: 20.5 },
  { Date: dateToExcelValue("13/01/2025 11:00:00"), Temp: 21.0 }
];

writeExcel(processedData, "output.xlsx");
// Excel will display dates in format DD/MM/YYYY HH:mm:ss
```

**Number Formatting Applied Automatically**:
- Columns D, E, F, G are formatted as numbers with 2 decimal places
- Dates use `DATEHOUR_FORMAT` from config
- Modify `excelUtils.js` if you need different column formatting

### 4. Handling Multiple Sheets

Current implementation writes to single sheet named "Sheet1":

```javascript
// If you need to write to specific sheet, modify writeExcel():
const newSheet = XLSX.utils.json_to_sheet(data, { cellDates: true });
XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'MyCustomSheet');
```

### 5. Data Structure Requirements

**Input to readExcel()**:
- Excel file must have header row
- Data starts at specified `firstRow` (typically 2 for data after header)
- Each column becomes object key (header row values)
- Cells are read as-is without type conversion (use `raw: true`)

**Output from readExcel()**:
```javascript
[
  { 
    "Date Column Name": 45658,           // Excel serial number
    "Numeric Column": 20.5,              // Number as-is
    "Text Column": "Paris",              // Text as-is
    "Empty Column": undefined            // Missing cells are undefined
  },
  // ... more rows
]
```

**Input to writeExcel()**:
- Array of objects
- Each object is a row
- Object keys become column headers
- Values can be: numbers, strings, dates (converted via `dateToExcelValue()`)

### 6. Common Patterns

**Read, Transform, Write Pipeline**:
```javascript
async function processWeatherExcel(inputFile, sheetName, firstRow, outputFile) {
  const { readExcel } = require("./utils/excelUtils");
  const { writeExcel } = require("./utils/excelUtils");
  const { excelDateToDayjs, dateToExcelValue } = require("./utils/dateHourUtils");

  // Step 1: Read raw Excel data
  const rawData = readExcel(inputFile, sheetName, firstRow);

  // Step 2: Process (convert dates, calculate values)
  const processed = rawData.map(row => ({
    Date: dateToExcelValue(excelDateToDayjs(row.Date).format("DD/MM/YYYY HH:mm:ss")),
    Temperature: row.Temp || null,
    Humidity: row.Humidity || null
  }));

  // Step 3: Write output
  writeExcel(processed, outputFile);
  
  return processed.length;
}
```

**Handle Missing Data**:
```javascript
const data = readExcel("data.xlsx", "Sheet", 2);

data.forEach((row, i) => {
  // Excel returns undefined for empty cells
  if (row.Temperature === undefined) {
    console.warn(`Row ${i + 2}: Missing temperature data`);
  }
  
  // Provide default values
  row.Temperature = row.Temperature ?? 0;
  row.Humidity = row.Humidity ?? null;
});
```

**Validate Before Writing**:
```javascript
function validateDataForExcel(data) {
  if (!Array.isArray(data)) {
    throw new ScrapingError("Data must be an array", { data });
  }
  
  if (data.length === 0) {
    throw new ScrapingError("Data array is empty", { data });
  }
  
  // Check required fields
  data.forEach((row, i) => {
    if (!row.Date) {
      throw new ScrapingError(`Row ${i} missing Date field`, { row });
    }
  });
  
  return data;
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Sheet not found" error | Verify sheet name matches exactly (case-sensitive); check with `XLSX.utils.sheet_name_list()` |
| Date columns show as numbers in Excel | Make sure `dateToExcelValue()` was used to convert dates before writing |
| Number formatting not applied | Check that column letters (D, E, F, G) match your actual data columns; edit `columnsToFormat` in `excelUtils.js` |
| First row contains data instead of headers | Adjust `firstRow` parameter (use 1 if no header row exists) |
| File not found error | Use `path.resolve()` for absolute paths; check file exists with `fs.existsSync()` |
| Out of memory reading large files | Consider reading in chunks or splitting into multiple files |

## Related References

- [Date/Time Conversions](./references/date-time-guide.md) — Excel serial number conversions
- [Error Handling](../web-scraping-patterns/references/error-handling.md) — Using ScrapingError
- [Testing Excel Operations](./references/excel-testing.md) — Mock file system, test reading/writing
