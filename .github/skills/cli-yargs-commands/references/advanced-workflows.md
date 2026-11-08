# Advanced CLI Patterns and Workflows

## validateExcel Command Reference

The new `validateExcel` command validates Excel files before processing.

### Basic Validation

```bash
npm start validateExcel --excelFile "data.xlsx" --sheetName "Weather"
```

**Output**:
```
✓ File exists
✓ Successfully read sheet "Weather"
✓ Found 150 rows of data
✓ Valid data rows: 150

✓ Excel file validation successful!
  File: data.xlsx
  Sheet: Weather
  Rows: 150
  Columns: 4
```

### Validation with Required Columns

Check that specific columns exist:

```bash
npm start validateExcel \
  --excelFile "data.xlsx" \
  --sheetName "Suivi Conso" \
  --firstRow 2 \
  --requiredColumns "Date,Min,Max,Humidity"
```

**Output**:
```
✓ File exists
✓ Successfully read sheet "Suivi Conso"
✓ Found 100 rows of data
✓ All required columns present: Date, Min, Max, Humidity
✓ Valid data rows: 100

✓ Excel file validation successful!
  File: data.xlsx
  Sheet: Suivi Conso
  Rows: 100
  Columns: 4
```

### Verbose Mode (Detailed Diagnostics)

Shows column names and detailed issue information:

```bash
npm start validateExcel \
  --excelFile "data.xlsx" \
  --sheetName "Weather" \
  --verbose
```

**Output with issues**:
```
✓ File exists
✓ Successfully read sheet "Weather"
✓ Found 50 rows of data
  Columns: Date, Temperature, Humidity, WindSpeed
✗ Invalid data rows: 3
  Issues found:
    - Row 5: Missing or empty Date field
    - Row 12: Date is not a number (Excel format required)
    - Row 25: Date is not a number (Excel format required)
```

### Using Aliases

Short options are also available:

```bash
# Equivalent to above
npm start validateExcel -e data.xlsx -s Weather -r 2 -c "Date,Min,Max" -v
```

## Workflow Patterns

### Sequential Workflow: Validate → Process

Validate before processing to catch issues early:

```bash
# Step 1: Validate
npm start validateExcel \
  --excelFile "data.xlsx" \
  --sheetName "Weather" \
  --requiredColumns "Date,Min,Max"

# If validation succeeds, run processing
npm start processExcel \
  --excelFile "data.xlsx" \
  --sheetName "Weather" \
  --firstRow 2 \
  --weatherStationName "Paris" \
  --outputFile "result.xlsx"
```

### PowerShell Workflow Script

Create `validate-and-process.ps1`:

```powershell
param(
    [string]$excelFile = "data.xlsx",
    [string]$sheetName = "Weather",
    [string]$stationName = "Paris",
    [string]$outputFile = "result.xlsx"
)

Write-Host "Step 1: Validating Excel file..." -ForegroundColor Cyan
npm start validateExcel `
  --excelFile $excelFile `
  --sheetName $sheetName `
  --requiredColumns "Date,Min,Max" `
  --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host "Validation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 2: Processing weather data..." -ForegroundColor Cyan
npm start processExcel `
  --excelFile $excelFile `
  --sheetName $sheetName `
  --firstRow 2 `
  --weatherStationName $stationName `
  --outputFile $outputFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Complete! Results saved to $outputFile" -ForegroundColor Green
} else {
    Write-Host "`n✗ Processing failed!" -ForegroundColor Red
    exit 1
}
```

Usage:
```powershell
.\validate-and-process.ps1 -excelFile "data.xlsx" -stationName "Lyon"
```

### Bash Workflow Script

Create `validate-and-process.sh`:

```bash
#!/bin/bash

set -e  # Exit on error

EXCEL_FILE="${1:-data.xlsx}"
SHEET_NAME="${2:-Weather}"
STATION_NAME="${3:-Paris}"
OUTPUT_FILE="${4:-result.xlsx}"

echo "Step 1: Validating Excel file..."
npm start validateExcel \
  --excelFile "$EXCEL_FILE" \
  --sheetName "$SHEET_NAME" \
  --requiredColumns "Date,Min,Max" \
  --verbose

echo ""
echo "Step 2: Processing weather data..."
npm start processExcel \
  --excelFile "$EXCEL_FILE" \
  --sheetName "$SHEET_NAME" \
  --firstRow 2 \
  --weatherStationName "$STATION_NAME" \
  --outputFile "$OUTPUT_FILE"

echo ""
echo "✓ Complete! Results saved to $OUTPUT_FILE"
```

Usage:
```bash
chmod +x validate-and-process.sh
./validate-and-process.sh data.xlsx Weather Paris result.xlsx
```

## Batch Processing

### Process Multiple Files with Validation

Create `process-multiple.ps1`:

```powershell
$files = @(
    @{ file = "data/paris.xlsx"; sheet = "Weather"; station = "Paris"; output = "output/paris.xlsx" },
    @{ file = "data/lyon.xlsx"; sheet = "Weather"; station = "Lyon"; output = "output/lyon.xlsx" },
    @{ file = "data/marseille.xlsx"; sheet = "Weather"; station = "Marseille"; output = "output/marseille.xlsx" }
)

$successCount = 0
$failureCount = 0

foreach ($item in $files) {
    Write-Host "Processing $($item.file)..." -ForegroundColor Cyan

    # Validate
    npm start validateExcel `
      --excelFile $item.file `
      --sheetName $item.sheet

    if ($LASTEXITCODE -eq 0) {
        # Process
        npm start processExcel `
          --excelFile $item.file `
          --sheetName $item.sheet `
          --firstRow 2 `
          --weatherStationName $item.station `
          --outputFile $item.output

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Success" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "✗ Processing failed" -ForegroundColor Red
            $failureCount++
        }
    } else {
        Write-Host "✗ Validation failed" -ForegroundColor Red
        $failureCount++
    }

    Write-Host ""
}

Write-Host "Summary: $successCount succeeded, $failureCount failed" -ForegroundColor Yellow
```

## Error Handling and Recovery

### Validate with Error Recovery

```bash
# Attempt validation, capture exit code
npm start validateExcel --excelFile "data.xlsx" --sheetName "Weather" --verbose

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "Validation passed" -ForegroundColor Green
} elseif ($exitCode -eq 1) {
    Write-Host "Validation failed - data integrity issues" -ForegroundColor Red
    Write-Host "Please review the issues above and fix the Excel file"
} else {
    Write-Host "Unexpected error (code: $exitCode)" -ForegroundColor Red
}
```

### Retry with Exponential Backoff

```powershell
function Invoke-WithRetry {
    param(
        [scriptblock]$ScriptBlock,
        [int]$MaxRetries = 3,
        [int]$DelayMs = 1000
    )

    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        Write-Host "Attempt $attempt/$MaxRetries..."

        & $ScriptBlock

        if ($LASTEXITCODE -eq 0) {
            return 0
        }

        if ($attempt -lt $MaxRetries) {
            $delay = $DelayMs * [Math]::Pow(2, $attempt - 1)
            Write-Host "Retrying in ${delay}ms..."
            Start-Sleep -Milliseconds $delay
        }
    }

    return 1
}

Invoke-WithRetry {
    npm start validateExcel --excelFile "data.xlsx" --sheetName "Weather"
}
```

## Logging and Monitoring

### Log All Operations to File

```bash
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "logs/cli-operations-$timestamp.log"

npm start validateExcel `
  --excelFile "data.xlsx" `
  --sheetName "Weather" `
  --verbose 2>&1 | Tee-Object -FilePath $logFile

npm start processExcel `
  --excelFile "data.xlsx" `
  --sheetName "Weather" `
  --firstRow 2 `
  --weatherStationName "Paris" `
  --outputFile "result.xlsx" 2>&1 | Tee-Object -FilePath $logFile -Append
```

### Email Results on Failure

```powershell
$smtpServer = "smtp.company.com"
$smtpPort = 587
$emailFrom = "alerts@company.com"
$emailTo = "admin@company.com"

npm start validateExcel --excelFile "data.xlsx" --sheetName "Weather"

if ($LASTEXITCODE -ne 0) {
    $body = @"
CLI Command Failed
==================
Command: validateExcel
File: data.xlsx
Sheet: Weather
Time: $(Get-Date)

Please review the logs for details.
"@

    Send-MailMessage `
      -SmtpServer $smtpServer `
      -Port $smtpPort `
      -From $emailFrom `
      -To $emailTo `
      -Subject "⚠️ Web Scraper CLI Alert" `
      -Body $body
}
```

## Scheduled Execution

### Windows Task Scheduler

Create `run-validation.bat`:

```batch
@echo off
cd "C:\path\to\web-scraper"
npm start validateExcel --excelFile "data.xlsx" --sheetName "Weather" --verbose
pause
```

Schedule via Task Scheduler:
- Action: Start a program
- Program: `C:\path\to\run-validation.bat`
- Trigger: Daily at 08:00

### Cron Job (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add scheduled validation (daily at 8 AM)
0 8 * * * cd /path/to/web-scraper && npm start validateExcel --excelFile data.xlsx --sheetName Weather >> /var/log/web-scraper.log 2>&1

# Add scheduled processing (daily at 8:15 AM after validation)
15 8 * * * cd /path/to/web-scraper && npm start processExcel --excelFile data.xlsx --sheetName Weather --firstRow 2 --weatherStationName Paris --outputFile result.xlsx >> /var/log/web-scraper.log 2>&1
```

## Testing CLI Commands

### Unit Test validateExcel Handler

```javascript
const { readExcel } = require("../../src/utils/excelUtils");
const mockFs = require("mock-fs");
const XLSX = require("xlsx");

describe("validateExcel command", () => {
  beforeEach(() => {
    // Create mock Excel file
    const data = [
      { Date: 45658, Min: 10, Max: 20 },
      { Date: 45659, Min: 11, Max: 21 }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    mockFs({
      "data/": {
        "valid.xlsx": XLSX.write(wb, { type: 'buffer' })
      }
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should validate correct Excel file", () => {
    const data = readExcel("data/valid.xlsx", "Sheet1", 1);
    expect(data).toHaveLength(2);
    expect(data[0].Date).toBeDefined();
  });

  it("should detect missing Date field", () => {
    const invalidData = [
      { Min: 10, Max: 20 },  // Missing Date
      { Date: 45659, Min: 11, Max: 21 }
    ];

    const hasMissingDate = invalidData.some(row => !row.Date);
    expect(hasMissingDate).toBe(true);
  });

  it("should detect non-numeric Date", () => {
    const invalidData = [
      { Date: "2025-01-01", Min: 10, Max: 20 },  // String instead of number
    ];

    const hasNonNumericDate = invalidData.some(row => typeof row.Date !== 'number');
    expect(hasNonNumericDate).toBe(true);
  });
});
```

### Integration Test Full Workflow

```javascript
describe("CLI validation workflow", () => {
  it("should validate then process successfully", async () => {
    const { execSync } = require("child_process");

    // Validate
    const validateOutput = execSync(
      'npm start validateExcel --excelFile test-data.xlsx --sheetName Weather'
    ).toString();

    expect(validateOutput).toContain("✓");

    // Process
    const processOutput = execSync(
      'npm start processExcel --excelFile test-data.xlsx --sheetName Weather --firstRow 1 --weatherStationName Paris'
    ).toString();

    expect(processOutput).toContain("✓ Processing complete");
  });
});
```

## Command Reference Table

| Command | Purpose | Key Options |
|---------|---------|------------|
| `validateExcel` | Validate file structure and data | `--excelFile`, `--sheetName`, `--requiredColumns`, `--verbose` |
| `processExcel` | Process weather data from Excel | `--excelFile`, `--sheetName`, `--firstRow`, `--weatherStationName`, `--outputFile` |
| `processDates` | Process custom date range | `--startDate`, `--endDate`, `--weatherStationName` |

## Troubleshooting

### validateExcel Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| "File not found" | Path doesn't exist | Check file path; use absolute path if needed |
| "Sheet not found" | Wrong sheet name | Use `--verbose` to see available sheets; check case-sensitivity |
| "Invalid data rows" | Missing/wrong Date fields | Check Excel file has Date column with numbers; run with `--verbose` |
| "Missing required columns" | Columns don't match | Verify column names match exactly; use `--verbose` to see all columns |

### Exit Codes

- `0`: Success
- `1`: Validation/processing failed
- Other: Unexpected error

Use exit codes in scripts to determine success/failure.
