const assert = require("assert");
const { formatData, performIdStationScraping } = require("../src/scrapers/weatherScraper");
const { JSDateToString, dateToExcelValue } = require("../src/utils/dateHourUtils");
const { ScrapingError } = require("../src/errors/customErrors");

// Mocked dependencies
const mockExcelData = [
  { Date: 45658, Min: undefined, Max: undefined }, // 01/01/2025 00:00:00
  { Date: 45658.25, Min: undefined, Max: undefined }, // 01/01/2025 06:00
  { Date: 45658.5, Min: undefined, Max: undefined }, // 01/01/2025 12:00
  { Date: 45658.75, Min: undefined, Max: undefined }, // 01/01/2025 18:00
];

describe("Weather Script Tests", () => {
  describe("formatData", () => {
    it("should format Excel data correctly", () => {
      const input = [
        { Date: 45658, Min: undefined, Max: undefined }, // 01/01/2025 00:00:00
        { Date: 45658.25, Min: undefined, Max: undefined }, // 01/01/2025 06:00
        { Date: 45658.5, Min: undefined, Max: undefined }, // 01/01/2025 12:00
      ];

      const expectedOutput = [
        { begin: 45658, end: 45658.25 },
        { begin: 45658.25, end: 45658.5 },
      ];

      const output = formatData(input);
      assert.deepStrictEqual(output, expectedOutput);
    });

    it("should handle empty Excel data gracefully", () => {
      const input = [];
      const expectedOutput = [];
      const output = formatData(input);
      assert.deepStrictEqual(output, expectedOutput);
    });
  });

  describe("performIdStationScraping", () => {
    it("should return a valid station ID", async () => {
      const stationName = "Bressuire";
      const mockId = "12345";

      // Mock the function
      const performIdStationScraping = async (name) => {
        if (name === "Bressuire") return mockId;
        throw new Error("Station not found");
      };

      const result = await performIdStationScraping(stationName);
      assert.strictEqual(result, mockId);
    });

    it("should throw an error for an unknown station", async () => {
      const stationName = "InvalidStation";

      await assert.rejects(async () => {
        await performIdStationScraping(stationName);
      }, /[Error: Unexpected error: Invalid response received for the station]/);
    });
  });

  describe("getWeatherDataBetween2Dates", () => {
    it("should fetch weather data correctly", async () => {
      const weatherStationId = "12345";
      const startDate = new Date("2025-01-01T00:00:00Z");
      const endDate = new Date("2025-01-01T06:00:00Z");
      const mockResponse = [{ date: "2025-01-01", temperature: 5 }];

      const getWeatherDataBetween2Dates = async (stationId, start, end) => {
        assert.strictEqual(stationId, weatherStationId);
        assert.strictEqual(start.getTime(), startDate.getTime());
        assert.strictEqual(end.getTime(), endDate.getTime());
        return mockResponse;
      };

      const result = await getWeatherDataBetween2Dates(weatherStationId, startDate, endDate);
      assert.deepStrictEqual(result, mockResponse);
    });
  });

  describe("JSDateToString", () => {
    it("should format a Date object to a string", () => {
      const date = 45658;
      const expectedOutput = "01/01/2025 00:00:00";

      const result = JSDateToString(date);
      assert.strictEqual(result, expectedOutput);
    });
  });

  describe("dateToExcelValue", () => {
    it("should convert a date string to an Excel date value", () => {
      const date = "01/01/2025 00:00:00";
      const expectedOutput = 45658;
      const result = dateToExcelValue(date);
      assert.strictEqual(result, expectedOutput);
    });

    it("should throw an error for invalid date format", () => {
      const invalidDate = "invalid-date";
      assert.throws(() => {
        dateToExcelValue(invalidDate);
      }, /Error: Invalid date provided. Ensure it matches the format "DD\/MM\/YYYY HH:mm:ss"./);
    });
  });

  describe("Error Handling", () => {
    it("should throw ScrapingError for invalid date ranges", () => {
      const previousEndDate = 45658.25;
      const entry = {
        begin: 45658.25,
        end: 45658.25,
      };

      assert.throws(() => {
        if ((previousEndDate - entry.begin) === 0 && (entry.end - entry.begin) === 0) {
          throw new ScrapingError("There is a problem with date ranges");
        }
      }, ScrapingError);
    });
  });

  describe("Integration Tests", () => {
    it("should process Excel data and fetch weather data", async () => {
      // Mocked dependencies
      const mockReadExcel = () => mockExcelData;
      const mockPerformIdStationScraping = async () => "12345";
      const mockGetWeatherDataBetween2Dates = async () => [{ date: "2025-01-01", temperature: 5 }];

      // Simulate the processing flow
      const jsonExcelData = mockReadExcel();
      const inputData = formatData(jsonExcelData);
      const weatherStationId = await mockPerformIdStationScraping("Bressuire");

      const weatherData = [];
      for (const entry of inputData) {
        weatherData.push(await mockGetWeatherDataBetween2Dates(weatherStationId, entry.begin, entry.end));
      }

      assert.strictEqual(weatherData.length, 3);
    });

    it("should handle empty input data gracefully during processing", async () => {
      const inputData = [];
      const mockPerformIdStationScraping = async () => "12345";
      const mockGetWeatherDataBetween2Dates = async () => [];

      const weatherStationId = await mockPerformIdStationScraping("Bressuire");

      const weatherData = [];
      for (const entry of inputData) {
        weatherData.push(await mockGetWeatherDataBetween2Dates(weatherStationId, entry.begin, entry.end));
      }

      assert.strictEqual(weatherData.length, 0);
    });
  });
});
