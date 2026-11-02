# Date/Time Guide

## Excel Serial Number System

### Understanding Excel Dates

Excel stores dates as integer days since 1900-01-01 (treated as day 1):
```
Day 1   = 1900-01-01
Day 45658 = 2025-01-01
Day 45705 = 2025-02-17
```

### Fractional Parts = Time of Day

Excel uses the fractional part to represent time:
```
.25  = 6 hours  (1/4 of 24 hours)
.5   = 12 hours (1/2 of 24 hours)
.75  = 18 hours (3/4 of 24 hours)

45658.0  = 2025-01-01 00:00:00
45658.25 = 2025-01-01 06:00:00
45658.5  = 2025-01-01 12:00:00
45658.75 = 2025-01-01 18:00:00
```

### The 1900 Leap Year Bug

Excel incorrectly treats 1900 as a leap year (it's not):
- Dates before 1900-03-01 are off by one day in Excel
- Conversion functions automatically handle this
- Always use `excelDateToDayjs()` and `dateToExcelValue()` for accuracy

## Conversion Functions

### excelDateToDayjs(serial, timezone)

Converts Excel serial number to Dayjs object:

```javascript
const { excelDateToDayjs } = require("./utils/dateHourUtils");

// Basic usage (defaults to Europe/Paris)
const date = excelDateToDayjs(45658);
console.log(date.format("DD/MM/YYYY")); // "01/01/2025"

// With time component
const dateTime = excelDateToDayjs(45658.5);
console.log(dateTime.format("HH:mm:ss")); // "12:00:00"

// Different timezone
const london = excelDateToDayjs(45658, "Europe/London");
const newyork = excelDateToDayjs(45658, "America/New_York");
```

**Parameters**:
- `serial` (number): Excel serial number (required)
- `timezone` (string): Timezone string (default: 'Europe/Paris')

**Returns**: Dayjs object

**Throws**: Error if serial is invalid

### dateToExcelValue(dateString)

Converts formatted date string to Excel serial number:

```javascript
const { dateToExcelValue } = require("./utils/dateHourUtils");

// Format: DD/MM/YYYY HH:mm:ss
const excelValue = dateToExcelValue("13/01/2025 14:30:45");
console.log(excelValue); // 45705.6046527777...

// With seconds precision
const excelValue2 = dateToExcelValue("01/01/2025 06:00:00");
console.log(excelValue2); // 45658.25
```

**Parameters**:
- `dateString` (string): Date in format "DD/MM/YYYY HH:mm:ss"

**Returns**: Number (Excel serial with precision to ~1 second)

**Throws**: Error if format doesn't match or date is invalid

### getCurrentTimestamp()

Returns current date/time as formatted string:

```javascript
const { getCurrentTimestamp } = require("./utils/dateHourUtils");

const now = getCurrentTimestamp();
console.log(now); // "13/01/2025 14:30:45"
```

## Common Operations

### Reading Excel Dates

```javascript
const { readExcel } = require("./utils/excelUtils");
const { excelDateToDayjs } = require("./utils/dateHourUtils");

// Raw data from Excel has serial numbers
const rawData = readExcel("data.xlsx", "Sheet1", 2);
console.log(rawData[0].Date); // 45658

// Convert to Dayjs
const convertedData = rawData.map(row => ({
  ...row,
  Date: excelDateToDayjs(row.Date)
}));

console.log(convertedData[0].Date.format("DD/MM/YYYY")); // "01/01/2025"
```

### Writing Excel Dates

```javascript
const { dateToExcelValue } = require("./utils/dateHourUtils");
const { writeExcel } = require("./utils/excelUtils");
const { DATEHOUR_FORMAT } = require("./config/dayjsConfig");

// Convert before writing
const dataForExcel = [
  {
    Date: dateToExcelValue("01/01/2025 10:00:00"),
    Temperature: 20.5
  },
  {
    Date: dateToExcelValue("02/01/2025 10:00:00"),
    Temperature: 21.0
  }
];

writeExcel(dataForExcel, "output.xlsx");
```

### Comparing Dates

```javascript
const { dayjs, DATEHOUR_FORMAT } = require("./config/dayjsConfig");
const { excelDateToDayjs } = require("./utils/dateHourUtils");

const date1 = excelDateToDayjs(45658);
const date2 = excelDateToDayjs(45659);

// Dayjs comparison methods
console.log(date1.isBefore(date2));        // true
console.log(date2.isAfter(date1));         // true
console.log(date1.isSame(date2, 'day'));   // false
console.log(date2.diff(date1, 'days'));    // 1
```

### Calculating Time Ranges

```javascript
const { dayjs, DATEHOUR_FORMAT } = require("./config/dayjsConfig");
const { excelDateToDayjs, dateToExcelValue } = require("./utils/dateHourUtils");

// Generate hourly ranges for a date
const startSerial = 45658;
const dayDate = excelDateToDayjs(startSerial);

const ranges = [];
for (let hour = 0; hour < 24; hour++) {
  const start = dayDate.hour(hour).minute(0);
  const end = start.add(1, 'hour');
  
  ranges.push({
    begin: dateToExcelValue(start.format(DATEHOUR_FORMAT)),
    end: dateToExcelValue(end.format(DATEHOUR_FORMAT))
  });
}

// ranges[0] = { begin: 45658, end: 45658.041667... }
// ranges[1] = { begin: 45658.041667..., end: 45658.083333... }
```

### Adding/Subtracting Time

```javascript
const { dayjs } = require("./config/dayjsConfig");
const { excelDateToDayjs, dateToExcelValue } = require("./utils/dateHourUtils");

const date = excelDateToDayjs(45658);

const nextDay = date.add(1, 'day');
const nextWeek = date.add(1, 'week');
const nextMonth = date.add(1, 'month');
const nextHour = date.add(1, 'hour');
const nextMinute = date.add(1, 'minute');

// Convert back to Excel
const excelNextDay = dateToExcelValue(nextDay.format("DD/MM/YYYY HH:mm:ss"));
```

### Formatting for Display

```javascript
const { dayjs, DATE_FORMAT, DATEHOUR_FORMAT } = require("./config/dayjsConfig");
const { excelDateToDayjs } = require("./utils/dateHourUtils");

const date = excelDateToDayjs(45658);

// Different formats
console.log(date.format(DATE_FORMAT));      // "01/01/2025"
console.log(date.format(DATEHOUR_FORMAT));  // "01/01/2025 00:00:00"
console.log(date.format("DD/MM/YYYY HH:mm")); // "01/01/2025 00:00"

// Relative formats (French locale)
console.log(date.format("dddd"));           // "mercredi" (day name)
console.log(date.format("MMMM"));           // "janvier" (month name)
```

## Edge Cases

### Handling Invalid Dates

```javascript
const { excelDateToDayjs } = require("./utils/dateHourUtils");

// Negative or zero values
try {
  const invalid = excelDateToDayjs(-1); // Before 1900-01-01
  // Returns invalid Dayjs object
  if (!invalid.isValid()) {
    console.error("Invalid date");
  }
} catch (error) {
  console.error("Conversion error:", error.message);
}
```

### Handling Missing or Null Dates

```javascript
const { excelDateToDayjs } = require("./utils/dateHourUtils");

// Excel returns undefined for empty cells
const data = readExcel("data.xlsx", "Sheet1", 2);

data.forEach(row => {
  if (row.Date !== undefined && row.Date !== null) {
    const date = excelDateToDayjs(row.Date);
    console.log(date.format("DD/MM/YYYY"));
  } else {
    console.log("No date for this row");
  }
});
```

### Timezone Conversions

```javascript
const { excelDateToDayjs } = require("./utils/dateHourUtils");

// Same Excel value, different timezones
const excelSerial = 45658;

const paris = excelDateToDayjs(excelSerial, "Europe/Paris");
const london = excelDateToDayjs(excelSerial, "Europe/London");
const newyork = excelDateToDayjs(excelSerial, "America/New_York");

// All represent the same moment in time, displayed differently
console.log(paris.format("HH:mm Z"));   // "00:00 +01:00"
console.log(london.format("HH:mm Z"));  // "23:59 +00:00" (1 hour behind)
console.log(newyork.format("HH:mm Z")); // "18:59 -05:00" (5 hours behind)
```

## Precision and Rounding

### Excel Precision Limits

Excel dates have limited precision (~1 second):

```javascript
const { dateToExcelValue } = require("./utils/dateHourUtils");

// Milliseconds are truncated
const value = dateToExcelValue("01/01/2025 10:30:45.123");
console.log(value); // Precision to ~1 second, not milliseconds
```

### Preventing Floating-Point Errors

Conversion functions round to 11 decimal places:

```javascript
const excelValue = 45658.25;
// Stored as 45658.25 exactly, not 45658.24999999 or 45658.25000001
```

## Performance Tips

1. **Convert Once**: Convert all Excel dates when reading, not repeatedly
2. **Cache Formats**: Store `DATEHOUR_FORMAT` constant reference
3. **Batch Processing**: Process date conversions in bulk, not one-by-one
4. **Avoid Recreating**: Don't call `excelDateToDayjs()` multiple times for same serial

```javascript
// Good: Convert once
const dates = rawData.map(row => excelDateToDayjs(row.Date));

// Bad: Convert multiple times
rawData.forEach(row => {
  const d1 = excelDateToDayjs(row.Date);
  const d2 = excelDateToDayjs(row.Date); // Redundant
});
```
