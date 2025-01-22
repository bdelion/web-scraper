const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { dayjs } = require("../../src/config/dayjsConfig");
const {
  formatData,
  performIdStationScraping,
  performObservationScraping,
  getWeatherDataBetween2Dates,
} = require("../../src/scrapers/weatherScraper");
const { ScrapingError } = require('../../src/errors/customErrors');

require("jest-extended"); // Si vous utilisez jest-extended pour les assertions personnalisées

// Fonction d'extension pour Jest afin de valider les objets Day.js
expect.extend({
  toBeDayjs(received) {
    const pass = dayjs.isDayjs(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Day.js object`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Day.js object`,
        pass: false,
      };
    }
  },
});

// Create a mock timestamp for comparison
const mockTimestamp = '01/01/2025 12:00:01';

const mockAxios = new MockAdapter(axios);

// Tests for the formatData function
describe('formatData', () => {
  it("should return correct date ranges for valid input", () => {
    const input = [
      { Date: 45658, Min: 5, Max: 15 }, // 01/01/2025 00:00:00
      { Date: 45659, Min: undefined, Max: undefined }, // 02/01/2025 00:00:00
      { Date: 45660, Min: 10, Max: 20 }, // 03/01/2025 00:00:00
    ];
    const expected = [
      { begin: 45658, end: 45659 }, // 01/01/2025 00:00:00 ->  // 02/01/2025 00:00:00
    ];
    expect(formatData(input)).toEqual(expected);
  });

  it("should throw an error if input is not an array", () => {
    expect(() => formatData('not an array')).toThrow(ScrapingError);
  });

  it("should throw an error if an entry is missing the Date property", () => {
    const input = [
      { Date: 45658, Min: 5, Max: 15 }, // 01/01/2025 00:00:00
      { Min: undefined, Max: undefined },
    ];
    expect(() => formatData(input)).toThrow(ScrapingError);
  });

  it("should throw an error if dates are not in increasing order", () => {
    const input = [
      { Date: 45659, Min: 5, Max: 15 }, // 02/01/2025 00:00:00
      { Date: 45658, Min: 10, Max: 20 }, // 01/01/2025 00:00:00
    ];
    
    expect(() => formatData(input)).toThrow(ScrapingError);
  });

  it("should return an empty array if the input array is empty", () => {
    const input = [];
    const expected = [];
    expect(formatData(input)).toEqual(expected);
  });

  it("should create a range if Min and Max are undefined between dates", () => {
    const input = [
      { Date: 45658, Min: undefined, Max: undefined }, // 01/01/2025 00:00:00
      { Date: 45659, Min: undefined, Max: undefined }, // 02/01/2025 00:00:00
    ];
    const expected = [
      { begin: 45658, end: 45659 }, // 01/01/2025 00:00:00 -> 02/01/2025 00:00:00
    ];
    expect(formatData(input)).toEqual(expected);
  });

  it("should not create a range if all entries have defined Min and Max values", () => {
    const input = [
      { Date: 45658, Min: 5, Max: 15 }, // 01/01/2025 00:00:00
      { Date: 45659, Min: 10, Max: 20 }, // 02/01/2025 00:00:00
    ];
    const expected = [];
    expect(formatData(input)).toEqual(expected);
  });

  it("should handle multiple valid ranges in the input", () => {
    const input = [
      { Date: 45658, Min: 5, Max: 15 }, // 01/01/2025 00:00:00
      { Date: 45659, Min: undefined, Max: undefined }, // 02/01/2025 00:00:00
      { Date: 45660, Min: 10, Max: 20 }, // 03/01/2025 00:00:00
      { Date: 45661, Min: undefined, Max: undefined }, // 04/01/2025 00:00:00
      { Date: 45662, Min: 15, Max: 25 }, // 05/01/2025 00:00:00
    ];
    const expected = [
      { begin: 45658, end: 45659 }, // 01/01/2025 00:00:00 -> 02/01/2025 00:00:00
      { begin: 45660, end: 45661 }, // 03/01/2025 00:00:00 ->  04/01/2025 00:00:00
    ];
    expect(formatData(input)).toEqual(expected);
  });
});

// Tests for the cleanTemperature function
describe("cleanTemperature", () => {
  let cleanTemperature;
  let spyConsoleLog;

  beforeEach(() => {
    // Mock `getCurrentTimestamp` dynamiquement
    jest.resetModules();
    jest.doMock("../../src/utils/dateHourUtils", () => ({
      getCurrentTimestamp: jest.fn().mockReturnValue(mockTimestamp),
    }));

    // Réimporter les dépendances avec le mock appliqué
    cleanTemperature = require("../../src/scrapers/weatherScraper").cleanTemperature;

    // Mock de console.log pour capturer les appels
    spyConsoleLog = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    spyConsoleLog.mockRestore(); // Réinitialiser le mock de console.log
    jest.resetModules(); // Réinitialiser tous les modules
  });
  
  it("should return the cleaned temperature as a number for valid input", () => {
    expect(cleanTemperature("23.5")).toBe(23.5);
  });

  it("should return null for empty string and log error", () => {
    const message = 'Unexpected temperature input: ';
    const expectedOutput = `❌ ${mockTimestamp} - ${message}`;

    const spy = jest.spyOn(console, 'log');
    expect(cleanTemperature("")).toBeNull();
    expect(spyConsoleLog).toHaveBeenCalledWith(expectedOutput);
  });

  it("should return null for non-numeric input and log error", () => {
    const message = 'Unexpected temperature input: abc';
    const expectedOutput = `❌ ${mockTimestamp} - ${message}`;

    const spy = jest.spyOn(console, 'log');
    expect(cleanTemperature("abc")).toBeNull();
    expect(spyConsoleLog).toHaveBeenCalledWith(expectedOutput);
  });

  it("should return null for suspicious input and log error", async () => {
    let temp = "-101";
    let message = `Suspicious temperature value: ${temp}`;
    let expectedOutput = `⚠️ ${mockTimestamp} - ${message}`;
    expect(cleanTemperature(temp)).toBeNull();
    expect(spyConsoleLog).toHaveBeenCalledWith(expectedOutput);

    temp = "101";
    message = `Suspicious temperature value: ${temp}`;
    expectedOutput = `⚠️ ${mockTimestamp} - ${message}`;
    expect(cleanTemperature(temp)).toBeNull();
    expect(spyConsoleLog).toHaveBeenCalledWith(expectedOutput);
  });
});

// Tests for the extractWeatherDataRow function
describe('extractWeatherDataRow', () => {
  let spyConsoleLog;

  beforeEach(() => {
    // Mock `getCurrentTimestamp` dynamiquement
    jest.resetModules();
    jest.doMock("../../src/utils/dateHourUtils", () => ({
      getCurrentTimestamp: jest.fn().mockReturnValue(mockTimestamp),
    }));

    // Réimporter les dépendances avec le mock appliqué
    extractWeatherDataRow = require("../../src/scrapers/weatherScraper").extractWeatherDataRow;

    // Mock de console.log pour capturer les appels
    spyConsoleLog = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    spyConsoleLog.mockRestore(); // Réinitialiser le mock de console.log
    jest.resetModules(); // Réinitialiser tous les modules
  });
  
  test('should extract valid weather data from a row', () => {
    const row = '<tr><td>14</td><td>Some other data</td><td>22.5°C</td></tr>'; // Exemple de ligne valide
    const $ = cheerio.load(row);
    
    const result = extractWeatherDataRow(row, $);

    expect(result).toEqual({
      heure: '14',
      temperature: '22.5',
    });
  });

  test('should return null when heure is invalid and log error', () => {
    const row = '<tr><td></td><td>Some other data</td><td>22.5°C</td></tr>'; // Heure manquante
    const $ = cheerio.load(row);
    const message = 'Invalid data extracted from row: heure=, temperature=22.5';
    const expectedOutput = `⚠️ ${mockTimestamp} - ${message}`;
    
    const result = extractWeatherDataRow(row, $);

    expect(result).toBeNull();
    expect(spyConsoleLog).toHaveBeenCalledWith(expectedOutput);
  });

  test('should return null when temperature is invalid and log error', () => {
    const row = '<tr><td>14</td><td>Some other data</td><td>Not a number</td></tr>'; // Température invalide
    const $ = cheerio.load(row);
    const message = 'Invalid data extracted from row: heure=14, temperature=';
    const expectedOutput = `⚠️ ${mockTimestamp} - ${message}`;
    
    const result = extractWeatherDataRow(row, $);

    expect(result).toBeNull();
    expect(spyConsoleLog).toHaveBeenCalledWith(expectedOutput);
  });

  test('should return null when temperature is empty and log error', () => {
    const row = '<tr><td>14</td><td>Some other data</td><td></td></tr>'; // Température vide
    const $ = cheerio.load(row);
    const message = 'Invalid data extracted from row: heure=14, temperature=';
    const expectedOutput = `⚠️ ${mockTimestamp} - ${message}`;
    
    const result = extractWeatherDataRow(row, $);

    expect(result).toBeNull();
    expect(spyConsoleLog).toHaveBeenCalledWith(expectedOutput);
  });

  test('should handle rows with unexpected formats', () => {
    const row = '<tr><td>14</td><td>Some other data</td><td>$22.5</td></tr>'; // Température avec un symbole
    const $ = cheerio.load(row);
    
    const result = extractWeatherDataRow(row, $);

    expect(result).toEqual({
      heure: '14',
      temperature: '22.5', // Le symbole "$" doit être nettoyé
    });
  });

  test('should extract weather data with extra spaces around data', () => {
    const row = '<tr><td>  14 </td><td>Some other data</td><td>  22.5°C  </td></tr>'; // Données avec espaces supplémentaires
    const $ = cheerio.load(row);

    const result = extractWeatherDataRow(row, $);

    expect(result).toEqual({
      heure: '14', // Les espaces sont enlevés
      temperature: '22.5', // Les espaces et symboles sont nettoyés
    });
  });

  test('should return null when row is empty and log error', () => {
    const row = ''; // Ligne vide
    const $ = cheerio.load(row);
    const message = 'Invalid data extracted from row: heure=, temperature=';
    const expectedOutput = `⚠️ ${mockTimestamp} - ${message}`;
    
    const result = extractWeatherDataRow(row, $);

    expect(result).toBeNull();
    expect(spyConsoleLog).toHaveBeenCalledWith(expectedOutput);
  });

});

// Tests for the performIdStationScraping function
describe("performIdStationScraping", () => {
  afterEach(() => {
    mockAxios.reset();
  });

  it("should throw an error if 'weatherStationName' is invalid", async () => {
    await expect(performIdStationScraping("")).rejects.toThrow("Invalid 'weatherStationName'");
    await expect(performIdStationScraping(null)).rejects.toThrow("Invalid 'weatherStationName'");
  });

  it("should return the station ID if the API responds correctly", async () => {
    const stationName = "TestStation";
    const stationId = "12345";
    mockAxios.onPost(`https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=${encodeURIComponent(stationName)}`)
      .reply(200, `${stationId}|Other data`);

    const result = await performIdStationScraping(stationName);
    expect(result).toBe(stationId);
  });

  it("should throw an error if the API response is invalid", async () => {
    const stationName = "InvalidStation";
    mockAxios.onPost(`https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=${encodeURIComponent(stationName)}`)
      .reply(200, "|");

    await expect(performIdStationScraping(stationName)).rejects.toThrow("Station ID not found in the response");
  });

  it("should throw an error if the API response is not a number", async () => {
    const stationName = "ValidStation";
    mockAxios.onPost(`https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=${encodeURIComponent(stationName)}`)
      .reply(200, "bob|");

    await expect(performIdStationScraping(stationName)).rejects.toThrow("Station ID is not a number in the response");
  });

  it("should throw an error on network issues", async () => {
    const stationName = "NetworkIssueStation";
    mockAxios.onPost(`https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=${encodeURIComponent(stationName)}`)
      .networkError();

    await expect(performIdStationScraping(stationName)).rejects.toThrow("Unexpected error: Network Error");
  }, 7000);
});

// Tests for the performObservationScraping function
describe("performObservationScraping", () => {
  // Cas où la réponse HTTP réussie avec données météo valides
  it("devrait récupérer et formater les données météo correctement", async () => {
    const mockData = fs.readFileSync(
      path.resolve(__dirname, "../mocks/mockWeatherData.html"),
      "utf-8"
    );

    mockAxios.onGet(/https:\/\/www\.meteociel\.fr\/temps-reel\/obs_villes\.php.*/)
      .reply(200, mockData);

    const stationId = "1234";
    const mockDate = dayjs("2024-12-14");

    const result = await performObservationScraping(stationId, mockDate);

    // Vérifiez les formats et les valeurs
    expect(result).toEqual([
      expect.objectContaining({
        weatherStationId: stationId,
        heure: "23:54",
        temperature: 4.9,
        dayjs: expect.toBeDayjs(), // Utilisation de l'assertion personnalisée
        dayjsFormated: "14/12/2024 23:54:00",
      }),
      expect.objectContaining({
        weatherStationId: stationId,
        heure: "23:48",
        temperature: 4.8,
        dayjs: expect.toBeDayjs(), // Utilisation de l'assertion personnalisée
        dayjsFormated: "14/12/2024 23:48:00",
      }),
    ]);
  });
});

// Tests for the getWeatherDataBetween2Dates function
describe("getWeatherDataBetween2Dates", () => {
  afterEach(() => {
    mockAxios.reset();
  });

  //TODO
  // it("should return weather data for a valid date range", async () => {
  //   const weatherStationId = "12345";
  //   const startDate = 44561; // Exemple de date Excel
  //   const endDate = 44562;

  //   const mockedResponse = `
  //     <table width="100%">
  //       <tbody>
  //         <tr>
  //           <td>00:00</td><td></td><td>10.5</td>
  //         </tr>
  //         <tr>
  //           <td>01:00</td><td></td><td>12.2</td>
  //         </tr>
  //       </tbody>
  //     </table>
  //   `;

  //   mockAxios.onGet(/https:\/\/www\.meteociel\.fr\/temps-reel\/obs_villes\.php.*/)
  //     .reply(200, mockedResponse);

  //   const result = await getWeatherDataBetween2Dates(weatherStationId, startDate, endDate);

  //   expect(result.weatherStationId).toBe(weatherStationId);
  //   expect(result.minTemperature).toBe(10.5);
  //   expect(result.maxTemperature).toBe(12.2);
  //   expect(result.averageTemperature).toBeCloseTo(11.35, 2);
  //   expect(result.medianTemperature).toBeCloseTo(11.35, 2);
  // });

  it("should throw an error for invalid weatherStationId", async () => {
    await expect(getWeatherDataBetween2Dates("", 44561, 44562)).rejects.toThrow("Invalid 'weatherStationId'");
  });

  it("should throw an error for invalid dates", async () => {
    await expect(getWeatherDataBetween2Dates("12345", "invalidDate", "invalidDate")).rejects.toThrow("Invalid Excel date: invalidDate");
  });

  it("should handle empty weather data gracefully", async () => {
    const weatherStationId = "12345";
    const startDate = 44561;
    const endDate = 44562;

    mockAxios.onGet(/https:\/\/www\.meteociel\.fr\/temps-reel\/obs_villes\.php.*/)
      .reply(200, `<table width="100%"><tbody></tbody></table>`);
    
    await expect(getWeatherDataBetween2Dates(weatherStationId, startDate, endDate)).rejects.toThrow("Table not found on the page");
  });
});
