---
name: cli-yargs-commands
description: 'Build CLI commands using yargs in web-scraper. Use when: adding new CLI commands; handling command arguments and options; parsing user input; building command handlers; integrating with existing CLI structure.'
argument-hint: 'Describe your CLI command (e.g., "Create a command to process weather station data")'
---

# CLI Commands with Yargs

## When to Use

- Adding new CLI commands to `meteo-scraping-file-input.js`
- Parsing user input arguments and options
- Building command handlers for different tasks
- Validating command inputs before processing
- Integrating with existing yargs configuration
- Building help text and documentation
- Handling errors from CLI operations

## Key Principles

1. **Yargs Framework**: Project uses `yargs` for CLI argument parsing
2. **Command Structure**: Each command has a handler function that processes arguments
3. **Option Validation**: Validate options before executing command logic
4. **Error Handling**: Throw `ScrapingError` with context for user-facing errors
5. **Async Handlers**: All handlers are async functions
6. **Global Error Handlers**: Set up at module level to catch unhandled rejections
7. **Help Text**: Provide clear descriptions for commands and options

## Procedure

### 1. Current CLI Structure

The main entry point is `src/meteo-scraping-file-input.js`:

```javascript
#!/usr/bin/env node

const yargs = require("yargs");
const { processWeatherData } = require("./scrapers/weatherScraper");

// Global error handling
process.on('unhandledRejection', (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Command definitions go here
yargs
  .command(/* ... */)
  .help()
  .argv;
```

### 2. Adding a New Command

**Basic Command Template**:
```javascript
yargs.command({
  command: 'mycommand',                    // Command name
  describe: 'Description of what it does', // Help text
  builder: (yargs) => {
    return yargs
      .option('input-file', {
        alias: 'i',
        describe: 'Path to input file',
        type: 'string',
        demandOption: true              // Required
      })
      .option('output-file', {
        alias: 'o',
        describe: 'Path to output file',
        type: 'string',
        default: './output.xlsx'        // Optional with default
      });
  },
  handler: async (argv) => {
    try {
      // Command logic here
      console.log('Processing:', argv.inputFile);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
});
```

### 3. Command Options

**Common Option Types**:
```javascript
builder: (yargs) => {
  return yargs
    // String option
    .option('weather-station-name', {
      alias: 'w',
      describe: 'Name of weather station',
      type: 'string'
    })
    
    // Number option
    .option('timeout', {
      describe: 'Request timeout in milliseconds',
      type: 'number',
      default: 5000
    })
    
    // Boolean flag
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose output',
      type: 'boolean',
      default: false
    })
    
    // Array option
    .option('stations', {
      describe: 'Multiple stations',
      type: 'array'
    })
    
    // Choices/enum
    .option('format', {
      describe: 'Output format',
      choices: ['json', 'xlsx', 'csv'],
      default: 'xlsx'
    })
    
    // Required option
    .option('required-param', {
      describe: 'This is mandatory',
      type: 'string',
      demandOption: true
    });
}
```

### 4. Command Handlers

**Basic Handler**:
```javascript
handler: async (argv) => {
  const { inputFile, outputFile, verbose } = argv;
  
  if (verbose) {
    console.log('Input:', inputFile);
    console.log('Output:', outputFile);
  }
  
  try {
    const result = await processData(inputFile, outputFile);
    console.log('Success!', result);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
```

**Handler with Validation**:
```javascript
handler: async (argv) => {
  const { excelFile, sheetName, firstRow } = argv;
  
  // Validate file exists
  const fs = require('fs');
  if (!fs.existsSync(excelFile)) {
    console.error(`File not found: ${excelFile}`);
    process.exit(1);
  }
  
  // Validate row number
  if (firstRow < 1) {
    console.error('First row must be >= 1');
    process.exit(1);
  }
  
  try {
    const data = readExcel(excelFile, sheetName, firstRow);
    console.log(`Read ${data.length} rows`);
  } catch (error) {
    console.error('Processing failed:', error.message);
    process.exit(1);
  }
}
```

### 5. Example: processExcel Command

This is the main command in the project:

```javascript
yargs.command({
  command: 'processExcel',
  describe: 'Process Excel file with weather data',
  builder: (yargs) => {
    return yargs
      .option('excelFile', {
        describe: 'Path to Excel file containing weather data',
        type: 'string',
        demandOption: true
      })
      .option('sheetName', {
        describe: 'Name of sheet in Excel file',
        type: 'string',
        demandOption: true
      })
      .option('firstRow', {
        describe: 'Starting row number (1-based index)',
        type: 'number',
        demandOption: true
      })
      .option('weatherStationName', {
        describe: 'Name of weather station to fetch data for',
        type: 'string',
        demandOption: true
      })
      .option('outputFile', {
        describe: 'Path for output Excel file',
        type: 'string',
        default: 'OutputData.xlsx'
      });
  },
  handler: async (argv) => {
    try {
      const { excelFile, sheetName, firstRow, weatherStationName, outputFile } = argv;
      
      // Read Excel data
      const data = readExcel(excelFile, sheetName, firstRow);
      
      // Process weather data
      const result = await processWeatherData({
        weatherStationName,
        inputData: data,
        outputFile
      });
      
      console.log('✓ Processing complete');
    } catch (error) {
      console.error('✗ Error:', error.message);
      process.exit(1);
    }
  }
});
```

**Usage**:
```bash
npm start processExcel \
  --excelFile "data.xlsx" \
  --sheetName "Suivi Conso" \
  --firstRow 2 \
  --weatherStationName "Paris" \
  --outputFile "result.xlsx"
```

### 6. Building Help Text

**Full Command with Help**:
```javascript
yargs
  .command(/* ... */)
  .option('help', {
    alias: 'h',
    describe: 'Show help',
    type: 'boolean'
  })
  .example('npm start processExcel --excelFile data.xlsx --sheetName "Weather" --firstRow 2 --weatherStationName "Paris"', 
           'Process weather data from Excel')
  .example('npm start mycommand --input input.json --output output.json',
           'Convert JSON to Excel')
  .epilog('For more help, visit: https://github.com/bdelion/web-scraper')
  .help()
  .argv;
```

### 7. Using Logging in Commands

**Log Command Execution**:
```javascript
const { log } = require("./utils/logUtils");

handler: async (argv) => {
  log(`Starting command: ${argv._[0]}`, "info");
  
  try {
    const data = await processWeatherData(argv);
    log(`Command completed successfully`, "info");
  } catch (error) {
    log(`Command failed: ${error.message}`, "error");
    process.exit(1);
  }
}
```

### 8. Multiple Commands in One File

**Chaining Commands**:
```javascript
yargs
  .command({
    command: 'fetch',
    describe: 'Fetch weather data',
    handler: async (argv) => { /* ... */ }
  })
  .command({
    command: 'process',
    describe: 'Process fetched data',
    handler: async (argv) => { /* ... */ }
  })
  .command({
    command: 'export',
    describe: 'Export to Excel',
    handler: async (argv) => { /* ... */ }
  })
  .demandCommand()
  .help()
  .argv;
```

### 9. Conditional Logic Based on Options

```javascript
handler: async (argv) => {
  const { inputFile, format, verbose } = argv;
  
  const data = readInput(inputFile);
  
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else if (format === 'xlsx') {
    writeExcel(data, 'output.xlsx');
  } else if (format === 'csv') {
    writeCSV(data, 'output.csv');
  }
  
  if (verbose) {
    log(`Exported ${data.length} rows`, "info");
  }
}
```

### 10. Testing CLI Commands

**Mock yargs Input**:
```javascript
jest.mock('yargs', () => {
  return {
    command: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    help: jest.fn().mockReturnThis(),
    argv: { inputFile: 'test.xlsx', sheetName: 'Sheet1' }
  };
});

it('should handle CLI arguments', async () => {
  const result = await myCommandHandler({ inputFile: 'test.xlsx' });
  expect(result).toBeDefined();
});
```

## Common Patterns

**Accessing Arguments in Handler**:
```javascript
handler: async (argv) => {
  const { 
    excelFile,           // From --excelFile
    sheetName,           // From --sheetName
    _: [command, ...args] // Positional arguments
  } = argv;
  
  console.log('Command:', command);
  console.log('File:', excelFile);
}
```

**Environment Variables Override**:
```javascript
builder: (yargs) => {
  return yargs.option('api-url', {
    describe: 'API base URL',
    type: 'string',
    default: process.env.METEO_API_BASE_URL || 'https://www.meteociel.fr'
  });
}
```

**Progress Reporting**:
```javascript
handler: async (argv) => {
  const steps = ['Fetching', 'Parsing', 'Writing'];
  
  for (const step of steps) {
    console.log(`[${step}] Processing...`);
    await processStep(step);
    console.log(`[${step}] ✓ Complete`);
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Option not recognized | Add option definition in `builder`; check spelling and hyphens |
| Command not executing | Add `demandCommand()` to yargs chain; check command name |
| Default values not working | Use `default:` in option definition; environment variables override defaults |
| Help not showing | Call `.help()` on yargs chain; check for typos in option descriptions |
| Arguments undefined in handler | Access via `argv` parameter; check option was defined |

## Related References

- [CLI Examples](./references/cli-examples.md) — Complete working examples
- [Yargs Documentation](https://github.com/yargs/yargs) — Official yargs docs
- [Error Handling](../web-scraping-patterns/references/error-handling.md) — Error handling in commands
