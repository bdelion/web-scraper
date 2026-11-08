---
name: date-time-conversions
description: 'Handle date and time operations in web-scraper. Use when: converting between Excel serial numbers and JavaScript dates; formatting dates for display; working with timezones; calculating time ranges; validating date values.'
argument-hint: 'Describe what you need to do with dates (e.g., "Convert Excel date serial 45658 to readable format")'
---

# Date/Time Conversions

## When to Use

- Converting Excel serial numbers (45658) to human-readable dates
- Converting JavaScript dates back to Excel format for writing
- Parsing and formatting dates with specific locales (French)
- Handling timezone conversions (default: Europe/Paris)
- Working with fractional dates that represent time (0.25 = 6 hours)
- Comparing and calculating date ranges
- Formatting output for display or logging

## Key Principles

1. **Excel Serial Numbers**: Excel uses day count from 1900-01-01; fractional parts represent time
2. **Timezone-Aware**: All dates in project use Europe/Paris timezone (UTC+1/UTC+2)
3. **Dayjs Preferred**: Use Dayjs library instead of native Date (better precision)
4. **Format Constants**: Use `DATE_FORMAT`, `HOUR_FORMAT`, `DATEHOUR_FORMAT` from config
5. **French Locale**: Dayjs is configured with French locale (months/days in French)
6. **Leap Year Bug**: Excel has a bug treating 1900-02-29 as valid; conversions handle this

## Procedure

### 1. Excel Serial Numbers Explained

Excel stores dates as days since 1900-01-01:
- `45658` = 01/01/2025
- `45658.25` = 01/01/2025 06:00 (0.25 = 1/4 of 24 hours)
- `45658.5` = 01/01/2025 12:00 (0.5 = 1/2 of 24 hours)
- `45658.75` = 01/01/2025 18:00 (0.75 = 3/4 of 24 hours)

**Important**: Excel has a leap year bug — it counts 1900-02-29 as a valid date (it's not). Conversion functions handle this automatically.

### 2. Converting Excel to Dayjs

**Basic Conversion**:
```javascript
const { excelDateToDayjs } = require("./utils/dateHourUtils");

// Excel serial number to Dayjs
const excelDate = 45658;
const dayjsDate = excelDateToDayjs(excelDate);

console.log(dayjsDate.format("DD/MM/YYYY"));      // Output: 01/01/2025
console.log(dayjsDate.format("DD/MM/YYYY HH:mm")); // Output: 01/01/2025 00:00
```

**With Fractional Time**:
```javascript
// 0.25 = 6 hours (1/4 of 24h)
const excelDateTime = 45658.25;
const dayjsDate = excelDateToDayjs(excelDateTime);

console.log(dayjsDate.format("DD/MM/YYYY HH:mm:ss")); // 01/01/2025 06:00:00
```

**With Custom Timezone**:
```javascript
// Default timezone is Europe/Paris
const parisDate = excelDateToDayjs(45658); // Europe/Paris

// Use different timezone
const londonDate = excelDateToDayjs(45658, 'Europe/London');
const nyDate = excelDateToDayjs(45658, 'America/New_York');
```

### 3. Converting Dayjs to Excel

**Format String to Excel Number**:
```javascript
const { dateToExcelValue } = require("./utils/dateHourUtils");

const dateString = "13/01/2025 10:30:45";
const excelValue = dateToExcelValue(dateString);

console.log(excelValue); // Output: 45705.4380208...
```

**From Dayjs Object to Excel**:
```javascript
const { dayjs } = require("./config/dayjsConfig");
const { dateToExcelValue } = require("./utils/dateHourUtils");

const now = dayjs();
const excelValue = dateToExcelValue(now.format("DD/MM/YYYY HH:mm:ss"));
```

### 4. Format Constants

Always use the constants from `config/dayjsConfig.js`:

```javascript
const { dayjs, DATE_FORMAT, HOUR_FORMAT, DATEHOUR_FORMAT } = require("./config/dayjsConfig");

// DATE_FORMAT = "DD/MM/YYYY"
// HOUR_FORMAT = "HH:mm:ss"
// DATEHOUR_FORMAT = "DD/MM/YYYY HH:mm:ss"

const date = dayjs();
console.log(date.format(DATE_FORMAT));         // 13/01/2025
console.log(date.format(HOUR_FORMAT));         // 14:30:15
console.log(date.format(DATEHOUR_FORMAT));     // 13/01/2025 14:30:15
```

### 5. Dayjs Methods for Common Operations

**Getting Current Time**:
```javascript
const { getCurrentTimestamp } = require("./utils/dateHourUtils");

const now = getCurrentTimestamp();
console.log(now); // "13/01/2025 14:30:15" (formatted string)
```

**Comparing Dates**:
```javascript
const { dayjs } = require("./config/dayjsConfig");

const date1 = dayjs("13/01/2025", "DD/MM/YYYY");
const date2 = dayjs("14/01/2025", "DD/MM/YYYY");

console.log(date1.isBefore(date2));  // true
console.log(date1.isAfter(date2));   // false
console.log(date1.isSame(date2));    // false
console.log(date1.diff(date2, 'days')); // -1
```

**Adding/Subtracting Time**:
```javascript
const { dayjs } = require("./config/dayjsConfig");

const date = dayjs("13/01/2025 10:00:00", DATEHOUR_FORMAT);

const nextDay = date.add(1, 'day');
const nextHour = date.add(1, 'hour');
const previousWeek = date.subtract(1, 'week');

console.log(nextDay.format(DATEHOUR_FORMAT));    // 14/01/2025 10:00:00
console.log(nextHour.format(DATEHOUR_FORMAT));   // 13/01/2025 11:00:00
console.log(previousWeek.format(DATEHOUR_FORMAT)); // 06/01/2025 10:00:00
```

**Date Range Parsing**:
```javascript
const { dayjs } = require("./config/dayjsConfig");

// Parse with French locale
dayjs.locale('fr');

const frenchDate = dayjs("13 janvier 2025", "DD MMMM YYYY");
console.log(frenchDate.format("DD/MM/YYYY")); // 13/01/2025

// Day name in French
console.log(frenchDate.format("dddd")); // "mardi"
```

### 6. Working with Time Ranges

**Calculate Range Between Two Excel Dates**:
```javascript
const { excelDateToDayjs } = require("./utils/dateHourUtils");
const { dayjs } = require("./config/dayjsConfig");

const startExcel = 45658;    // 01/01/2025 00:00
const endExcel = 45658.5;    // 01/01/2025 12:00

const startDate = excelDateToDayjs(startExcel);
const endDate = excelDateToDayjs(endExcel);

const diffHours = endDate.diff(startDate, 'hours');
const diffMinutes = endDate.diff(startDate, 'minutes');

console.log(diffHours);    // 12
console.log(diffMinutes);  // 720
```

**Generate Date Ranges for Scraping**:
```javascript
function generateHourlyRanges(startExcel, endExcel) {
  const { excelDateToDayjs, dateToExcelValue } = require("./utils/dateHourUtils");
  const { dayjs, DATEHOUR_FORMAT } = require("./config/dayjsConfig");

  const ranges = [];
  let currentDate = excelDateToDayjs(startExcel);
  const endDate = excelDateToDayjs(endExcel);

  while (currentDate.isBefore(endDate)) {
    const nextDate = currentDate.add(1, 'hour');
    ranges.push({
      begin: dateToExcelValue(currentDate.format(DATEHOUR_FORMAT)),
      end: dateToExcelValue(nextDate.format(DATEHOUR_FORMAT))
    });
    currentDate = nextDate;
  }

  return ranges;
}
```

### 7. Validation and Error Handling

**Validate Excel Date**:
```javascript
function isValidExcelDate(serial) {
  if (typeof serial !== 'number') return false;
  if (serial < 0 || serial > 2958465) return false; // Max date is 31/12/9999
  return true;
}

try {
  const date = excelDateToDayjs(45658);
} catch (error) {
  console.error("Invalid Excel date:", error.message);
}
```

**Validate Date String Format**:
```javascript
const { dayjs, DATEHOUR_FORMAT } = require("./config/dayjsConfig");

function isValidDateString(dateStr) {
  const parsed = dayjs(dateStr, DATEHOUR_FORMAT, true); // strict mode
  return parsed.isValid();
}

console.log(isValidDateString("13/01/2025 14:30:15")); // true
console.log(isValidDateString("13-01-2025 14:30:15")); // false (wrong separator)
console.log(isValidDateString("32/01/2025 14:30:15")); // false (invalid day)
```

### 8. Common Patterns

**Pipeline: Excel → Transform → Display**:
```javascript
const { excelDateToDayjs } = require("./utils/dateHourUtils");
const { dayjs, DATE_FORMAT } = require("./config/dayjsConfig");

function formatExcelDateForDisplay(excelSerial) {
  const dayjsDate = excelDateToDayjs(excelSerial);

  // Get relative time (e.g., "today", "yesterday")
  if (dayjsDate.isSame(dayjs(), 'day')) {
    return "Aujourd'hui " + dayjsDate.format("HH:mm");
  } else if (dayjsDate.isSame(dayjs().subtract(1, 'day'), 'day')) {
    return "Hier";
  } else {
    return dayjsDate.format(DATE_FORMAT);
  }
}
```

**Logging with Timestamps**:
```javascript
const { getCurrentTimestamp } = require("./utils/dateHourUtils");
const { log } = require("./utils/logUtils");

function logWithTimestamp(message) {
  const timestamp = getCurrentTimestamp();
  log(`[${timestamp}] ${message}`, "info");
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Excel date shows as "Invalid Date" | Check serial is positive number; use `isValid()` on Dayjs object |
| Date formatting shows English month names | Dayjs is configured with French locale; ensure you haven't changed it |
| Timezone shows UTC instead of Paris time | Use `excelDateToDayjs()` with second param or check timezone config |
| Fractional date part is lost | Make sure you're not converting to `Math.floor()` before conversion |
| Date comparison fails | Use Dayjs methods (`.isBefore()`) not `>` operator directly |

## Related References

- [Date/Time Guide](./references/date-time-guide.md) — Detailed examples and edge cases
- [Excel File Handling](../excel-file-handling/SKILL.md) — Reading/writing dates in Excel
- [Data Formatting](./references/formatting-guide.md) — Formatting for output and logging
