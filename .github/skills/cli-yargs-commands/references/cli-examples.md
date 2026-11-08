# CLI Examples

## Basic processExcel Command

### Full Example

```bash
npm start processExcel \
  --excelFile "/path/to/weather-data.xlsx" \
  --sheetName "Suivi Conso" \
  --firstRow 2 \
  --weatherStationName "Paris" \
  --outputFile "/path/to/output.xlsx"
```

### With Aliases

```bash
npm start processExcel \
  -i "/path/to/weather-data.xlsx" \
  -s "Suivi Conso" \
  -f 2 \
  -w "paris" \
  -o "/path/to/output.xlsx"
```

## Real-World Usage

### Example 1: Process Weather Station Data

```bash
node src/meteo-scraping-file-input.js processExcel \
  --excelFile "D:\Electricité-Relevés-v6.xlsx" \
  --sheetName "Suivi Conso New" \
  --firstRow 2 \
  --weatherStationName "paris" \
  --outputFile "D:\Electricité-Relevés-v6.xlsx"
```

### Example 2: Different Station, Different File

```bash
npm start processExcel \
  --excelFile "./data/temperature-readings.xlsx" \
  --sheetName "January 2025" \
  --firstRow 1 \
  --weatherStationName "Paris" \
  --outputFile "./results/paris-analysis.xlsx"
```

### Example 3: Using Relative Paths

```bash
npm start processExcel \
  --excelFile "./input/data.xlsx" \
  --sheetName "Weather" \
  --firstRow 2 \
  --weatherStationName "Lyon" \
  --outputFile "./output/result.xlsx"
```

## Environment Variables

### Set Environment Variables

```bash
# Windows PowerShell
$env:METEO_API_BASE_URL = "https://www.meteociel.fr/temps-reel/lieuhelper.php"
$env:USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

npm start processExcel --excelFile "data.xlsx" --sheetName "Sheet1" --firstRow 2 --weatherStationName "Paris"
```

```bash
# Linux/Mac
export METEO_API_BASE_URL="https://www.meteociel.fr/temps-reel/lieuhelper.php"
export USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

npm start processExcel --excelFile "data.xlsx" --sheetName "Sheet1" --firstRow 2 --weatherStationName "Paris"
```

### With .env File

Create `.env` file:
```
METEO_API_BASE_URL=https://www.meteociel.fr/temps-reel/lieuhelper.php
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
SCRAPER_TIMEOUT=10000
SCRAPER_RETRIES=3
```

Then run:
```bash
npm start processExcel --excelFile "data.xlsx" --sheetName "Sheet1" --firstRow 2 --weatherStationName "Paris"
```

## Script Examples

### Process Multiple Files

Create `process-all.sh`:
```bash
#!/bin/bash

files=("file1.xlsx" "file2.xlsx" "file3.xlsx")
stations=("Paris" "Lyon" "Marseille")

for i in "${!files[@]}"; do
  npm start processExcel \
    --excelFile "${files[$i]}" \
    --sheetName "Weather" \
    --firstRow 2 \
    --weatherStationName "${stations[$i]}" \
    --outputFile "output/result-${i}.xlsx"
done
```

Then run:
```bash
chmod +x process-all.sh
./process-all.sh
```

### Windows Batch Script

Create `process-all.bat`:
```batch
@echo off

npm start processExcel ^
  --excelFile "D:\data\file1.xlsx" ^
  --sheetName "Weather" ^
  --firstRow 2 ^
  --weatherStationName "Paris" ^
  --outputFile "D:\output\result1.xlsx"

npm start processExcel ^
  --excelFile "D:\data\file2.xlsx" ^
  --sheetName "Weather" ^
  --firstRow 2 ^
  --weatherStationName "Lyon" ^
  --outputFile "D:\output\result2.xlsx"
```

Run:
```cmd
process-all.bat
```

## Testing Commands

### Unit Test for CLI

```javascript
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

describe("CLI Commands", () => {
  it("should execute processExcel command", async () => {
    const { stdout, stderr } = await execPromise(
      'npm start processExcel --excelFile "test.xlsx" --sheetName "Sheet1" --firstRow 2 --weatherStationName "Test"'
    );

    expect(stderr).toEqual("");
    expect(stdout).toContain("Processing");
  });

  it("should handle missing required arguments", async () => {
    try {
      await execPromise("npm start processExcel");
      fail("Should have thrown error");
    } catch (error) {
      expect(error.stderr).toContain("required");
    }
  });
});
```

## Debugging Commands

### Run with Verbose Output

```bash
npm start processExcel \
  --excelFile "data.xlsx" \
  --sheetName "Sheet1" \
  --firstRow 2 \
  --weatherStationName "Paris" \
  --verbose
```

### Run with Full Error Trace

```bash
node --trace-uncaught src/meteo-scraping-file-input.js processExcel \
  --excelFile "data.xlsx" \
  --sheetName "Sheet1" \
  --firstRow 2 \
  --weatherStationName "Paris"
```

### Run in Debug Mode (VS Code)

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/meteo-scraping-file-input.js",
      "args": [
        "processExcel",
        "--excelFile", "test.xlsx",
        "--sheetName", "Sheet1",
        "--firstRow", "2",
        "--weatherStationName", "Paris"
      ],
      "console": "integratedTerminal"
    }
  ]
}
```

Press F5 to start debugging.

## Common Patterns

### With Timestamps

```bash
echo "[$(date)] Starting weather data processing..."
npm start processExcel \
  --excelFile "data.xlsx" \
  --sheetName "Sheet1" \
  --firstRow 2 \
  --weatherStationName "Paris" \
  --outputFile "result.xlsx" && \
echo "[$(date)] Processing complete"
```

### With Error Handling

```bash
npm start processExcel \
  --excelFile "data.xlsx" \
  --sheetName "Sheet1" \
  --firstRow 2 \
  --weatherStationName "Paris" \
  --outputFile "result.xlsx" \
  || { echo "Command failed"; exit 1; }

echo "Success!"
```

### With Exit Code Checking

```bash
#!/bin/bash

npm start processExcel \
  --excelFile "data.xlsx" \
  --sheetName "Sheet1" \
  --firstRow 2 \
  --weatherStationName "Paris"

if [ $? -eq 0 ]; then
  echo "✓ Processing succeeded"
else
  echo "✗ Processing failed"
  exit 1
fi
```

## npm Scripts

Update `package.json`:
```json
{
  "scripts": {
    "start": "node src/meteo-scraping-file-input.js",
    "process:paris": "npm start processExcel -- --excelFile './data/paris.xlsx' --sheetName 'Weather' --firstRow 2 --weatherStationName 'Paris'",
    "process:lyon": "npm start processExcel -- --excelFile './data/lyon.xlsx' --sheetName 'Weather' --firstRow 2 --weatherStationName 'Lyon'",
    "process:all": "npm run process:paris && npm run process:lyon"
  }
}
```

Usage:
```bash
npm run process:paris
npm run process:lyon
npm run process:all
```

## Troubleshooting Commands

### Check Node Version

```bash
node --version  # Should be 16+
npm --version
```

### Check if File Exists

```bash
# Windows PowerShell
Test-Path "data.xlsx"

# Linux/Mac
ls -la data.xlsx
```

### Show Help

```bash
npm start --help
npm start processExcel --help
```

### Run with Timeout

```bash
# Linux/Mac
timeout 30 npm start processExcel --excelFile "data.xlsx" --sheetName "Sheet1" --firstRow 2 --weatherStationName "Paris"

# Windows PowerShell
$job = Start-Process -FilePath "npm" -ArgumentList @("start", "processExcel", "--excelFile", "data.xlsx", "--sheetName", "Sheet1", "--firstRow", "2", "--weatherStationName", "Paris") -PassThru
Wait-Process -InputObject $job -Timeout 30
```
