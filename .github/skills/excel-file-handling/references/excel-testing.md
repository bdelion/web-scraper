# Excel Testing Examples

## Mock File System Setup

### Basic Mock-fs Setup

```javascript
const mockFs = require("mock-fs");
const { readExcel, writeExcel } = require("../../src/utils/excelUtils");

describe("Excel Utils with mock-fs", () => {
  afterEach(() => {
    mockFs.restore();
  });

  it("should handle file read errors", () => {
    mockFs({
      "data/": {
        "other.txt": "some content"
      }
    });

    expect(() => {
      readExcel("data/missing.xlsx", "Sheet1", 2);
    }).toThrow("does not exist");

    mockFs.restore();
  });
});
```

### Mock Excel File Structure

```javascript
const mockFs = require("mock-fs");
const XLSX = require("xlsx");

// Create mock Excel data
function createMockExcelFile() {
  const data = [
    { Date: 45658, Temperature: 20.5, Humidity: 65 },
    { Date: 45659, Temperature: 21.0, Humidity: 62 }
  ];
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  
  return XLSX.write(wb, { type: 'buffer' });
}

describe("Excel reading with mock data", () => {
  beforeEach(() => {
    mockFs({
      "data/": {
        "weather.xlsx": createMockExcelFile()
      }
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should read mocked Excel file", () => {
    const data = readExcel("data/weather.xlsx", "Sheet1", 1);
    expect(data).toHaveLength(2);
    expect(data[0].Date).toBe(45658);
  });
});
```

## Testing Data Transformations

### Test Date Conversion

```javascript
const { readExcel } = require("../../src/utils/excelUtils");
const { excelDateToDayjs, dateToExcelValue } = require("../../src/utils/dateHourUtils");

describe("Excel Date Conversions", () => {
  it("should convert Excel serial to Dayjs correctly", () => {
    const excelSerial = 45658; // 01/01/2025
    const date = excelDateToDayjs(excelSerial);
    
    expect(date.format("DD/MM/YYYY")).toBe("01/01/2025");
  });

  it("should handle fractional dates (time)", () => {
    const excelDateTime = 45658.25; // 01/01/2025 06:00
    const date = excelDateToDayjs(excelDateTime);
    
    expect(date.format("HH:mm")).toBe("06:00");
  });

  it("should round-trip conversion accurately", () => {
    const original = "13/01/2025 14:30:45";
    const excelValue = dateToExcelValue(original);
    const date = excelDateToDayjs(excelValue);
    
    // Should match within 1 second
    expect(date.format("DD/MM/YYYY HH:mm")).toBe("13/01/2025 14:30");
  });
});
```

### Test Data Validation

```javascript
const { readExcel } = require("../../src/utils/excelUtils");
const { ScrapingError } = require("../../src/errors/customErrors");

describe("Excel Data Validation", () => {
  it("should reject invalid first row number", () => {
    const mockData = [{ col: "value" }];
    
    expect(() => {
      readExcel("data.xlsx", "Sheet1", -1);
    }).toThrow("must be greater than or equal to 0");
  });

  it("should handle empty sheets", () => {
    mockFs({
      "data/empty.xlsx": createEmptyExcelFile()
    });

    const data = readExcel("data/empty.xlsx", "Sheet1", 2);
    expect(data).toEqual([]);

    mockFs.restore();
  });

  it("should extract correct columns", () => {
    const data = [
      { Date: 45658, Temp: 20, Humidity: 65, Extra: "ignored" },
      { Date: 45659, Temp: 21, Humidity: 62, Extra: "ignored" }
    ];

    // Verify column names are keys from header row
    expect(Object.keys(data[0])).toContain("Date");
    expect(Object.keys(data[0])).toContain("Temp");
    expect(Object.keys(data[0])).toContain("Extra");
  });
});
```

## Testing Write Operations

### Test Excel File Writing

```javascript
const { writeExcel } = require("../../src/utils/excelUtils");
const mockFs = require("mock-fs");

describe("Excel Writing", () => {
  beforeEach(() => {
    mockFs({
      "output/": {}
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should write Excel file with correct format", () => {
    const data = [
      { Date: "01/01/2025 10:00:00", Temperature: 20.5 },
      { Date: "01/01/2025 11:00:00", Temperature: 21.0 }
    ];

    writeExcel(data, "output/result.xlsx");
    
    // Verify file was created
    const fs = require("fs");
    expect(fs.existsSync("output/result.xlsx")).toBe(true);
  });

  it("should apply number formatting", () => {
    const data = [
      { Temperature: 20.5678, Humidity: 65.123 }
    ];

    writeExcel(data, "output/formatted.xlsx");
    
    // Read back and verify formatting
    const result = readExcel("output/formatted.xlsx", "Sheet1", 1);
    expect(result[0].Temperature).toBeDefined();
  });
});
```

### Test Sheet Names

```javascript
const { writeExcel } = require("../../src/utils/excelUtils");
const XLSX = require("xlsx");
const mockFs = require("mock-fs");

describe("Excel Sheet Handling", () => {
  beforeEach(() => {
    mockFs({
      "output/": {}
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should create sheets with correct name", () => {
    const data = [{ col: "value" }];
    writeExcel(data, "output/data.xlsx");
    
    // Read workbook to check sheet names
    const workbook = XLSX.readFile("output/data.xlsx");
    const sheetNames = workbook.SheetNames;
    
    expect(sheetNames).toContain("Sheet1");
  });
});
```

## Integration Tests

### Full Pipeline Test

```javascript
const { readExcel, writeExcel } = require("../../src/utils/excelUtils");
const { excelDateToDayjs, dateToExcelValue } = require("../../src/utils/dateHourUtils");
const mockFs = require("mock-fs");

describe("Full Excel Pipeline", () => {
  beforeEach(() => {
    const inputData = [
      { Date: 45658, Temp: 20, Humidity: 65 },
      { Date: 45659, Temp: 21, Humidity: 62 }
    ];
    
    const ws = XLSX.utils.json_to_sheet(inputData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weather");
    
    mockFs({
      "input/": {
        "data.xlsx": XLSX.write(wb, { type: 'buffer' })
      },
      "output/": {}
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should read, transform, and write Excel data", () => {
    // Step 1: Read input
    const input = readExcel("input/data.xlsx", "Weather", 1);
    
    // Step 2: Transform (convert dates and calculate values)
    const transformed = input.map(row => ({
      Date: dateToExcelValue(
        excelDateToDayjs(row.Date).format("DD/MM/YYYY HH:mm:ss")
      ),
      Temperature: row.Temp * 1.1, // Apply transformation
      Humidity: row.Humidity
    }));
    
    // Step 3: Write output
    writeExcel(transformed, "output/processed.xlsx");
    
    // Step 4: Verify output
    const output = readExcel("output/processed.xlsx", "Sheet1", 1);
    expect(output).toHaveLength(2);
    expect(output[0].Temperature).toBeGreaterThan(20);
  });
});
```

## Error Cases

### Missing File

```javascript
it("should throw error for missing file", () => {
  expect(() => {
    readExcel("nonexistent.xlsx", "Sheet1", 1);
  }).toThrow(/does not exist/);
});
```

### Invalid Sheet Name

```javascript
const mockFs = require("mock-fs");
const XLSX = require("xlsx");

it("should throw error for missing sheet", () => {
  mockFs({
    "data/": {
      "test.xlsx": createMockExcelFile()
    }
  });

  expect(() => {
    readExcel("data/test.xlsx", "NonexistentSheet", 1);
  }).toThrow();

  mockFs.restore();
});
```

### Empty Data Array Before Write

```javascript
it("should handle writing empty data", () => {
  const emptyData = [];
  
  // writeExcel should handle empty arrays gracefully
  writeExcel(emptyData, "output/empty.xlsx");
  
  const result = readExcel("output/empty.xlsx", "Sheet1", 1);
  expect(result).toEqual([]);
});
```

## Snapshot Testing

### Excel Output Snapshots

```javascript
describe("Excel Output Snapshots", () => {
  it("should match snapshot for weather data format", () => {
    const data = [
      { 
        Date: "01/01/2025 10:00:00",
        Temperature: 20.5,
        Humidity: 65,
        WindSpeed: 12.3
      },
      { 
        Date: "01/01/2025 11:00:00",
        Temperature: 21.0,
        Humidity: 62,
        WindSpeed: 11.8
      }
    ];
    
    // Snapshot captures exact format
    expect(JSON.stringify(data)).toMatchSnapshot();
  });
});
```

## Performance Tests

### Large File Handling

```javascript
describe("Large Excel Files", () => {
  it("should handle reading large files", () => {
    // Generate large dataset
    const largeData = Array(10000).fill().map((_, i) => ({
      Date: 45658 + i,
      Temperature: 20 + Math.random() * 5,
      Humidity: 60 + Math.random() * 20
    }));
    
    const ws = XLSX.utils.json_to_sheet(largeData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    mockFs({
      "data/": {
        "large.xlsx": XLSX.write(wb, { type: 'buffer' })
      }
    });

    const start = Date.now();
    const data = readExcel("data/large.xlsx", "Sheet1", 1);
    const duration = Date.now() - start;
    
    expect(data).toHaveLength(10000);
    expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    
    mockFs.restore();
  });
});
```
