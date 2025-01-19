// Import the log module
const { log } = require('../../src/utils/logUtils');
const { dayjs, DATEHOUR_FORMAT } = require('../../src/config/dayjsConfig');

// Create a fixed date for comparison
const mockDate = dayjs(); 

// Mock the console.log function before each test
beforeEach(() => {
  jest.spyOn(dayjs, 'default' in dayjs ? 'default' : 'constructor').mockImplementation(() => mockDate);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

// Restore the original console.log function after each test
afterEach(() => {
  jest.restoreAllMocks();
});

describe('log function', () => {
  it('should log an info message with the correct timestamp and icon', () => {
    const message = 'Test Info Message';
    const expectedOutput = `ℹ️ ${mockDate.format(DATEHOUR_FORMAT)} - ${message}`;

    // Call the log function with "info" level (default)
    log(message);

    // Check if console.log was called with the correct format and icon
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(expectedOutput));
  });

  it('should log a warn message with the correct timestamp and icon', () => {
    const message = 'Test Warning Message';
    const expectedOutput = `⚠️ ${mockDate.format(DATEHOUR_FORMAT)} - ${message}`;

    // Call the log function with "warn" level
    log(message, 'warn');

    // Check if console.log was called with the correct format and icon
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(expectedOutput));
  });

  it('should log an error message with the correct timestamp and icon', () => {
    const message = 'Test Error Message';
    const expectedOutput = `❌ ${mockDate.format(DATEHOUR_FORMAT)} - ${message}`;

    // Call the log function with "error" level
    log(message, 'error');

    // Check if console.log was called with the correct format and icon
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(expectedOutput));
  });

  it('should log a debug message with the correct timestamp and icon', () => {
    const message = 'Test Debug Message';
    const expectedOutput = `🐞 ${mockDate.format(DATEHOUR_FORMAT)} - ${message}`;

    // Call the log function with "debug" level
    log(message, 'debug');

    // Check if console.log was called with the correct format and icon
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(expectedOutput));
  });

  it('should default to "info" level if an invalid level is provided', () => {
    const message = 'Invalid Level Message';
    
    // Call the log function with an invalid level
    log(message, 'invalidLevel');

    // Check if console.log was called with the "info" level as fallback
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`ℹ️ .+ - ${message}`)));

    // Check if a warning was logged due to the invalid level
    expect(console.warn).toHaveBeenCalledWith('Invalid log level: "invalidLevel". Defaulting to "info".');
  });

  it('should log multiple messages at once', () => {
    const messages = ['Message 1', 'Message 2'];
    const expectedOutput1 = `ℹ️ ${mockDate.format(DATEHOUR_FORMAT)} - Message 1`;
    const expectedOutput2 = `ℹ️ ${mockDate.format(DATEHOUR_FORMAT)} - Message 2`;

    // Call the log function with multiple messages
    log(messages);

    // Check if console.log was called for each message
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(expectedOutput1));
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(expectedOutput2));
  });

  it('should handle missing levels gracefully and default to "info"', () => {
    const message = 'Message with no level specified';

    // Call the log function with no level (should default to "info")
    log(message);

    // Check if console.log was called with the "info" level by default
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`ℹ️ .+ - ${message}`)));
  });
});
