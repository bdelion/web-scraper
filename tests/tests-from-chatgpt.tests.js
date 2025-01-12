// script.test.js
const { getAverage, findMedian, excelDateToDayjs, formatHour, cleanTemperature, ScrapingError, performIdStationScraping, performObservationScraping, JSDateToString, writeExcel, formatData, getWeatherDataBetween2Dates} = require('../src/meteo-scraping-file-input.js'); // Adjust the path to your script
const dayjs = require('dayjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');
const XLSX = require('xlsx');

jest.mock('axios');

// Tests pour getWeatherDataBetween2Dates
describe("getWeatherDataBetween2Dates", () => {

  it("should return weather data between two valid Excel dates", async () => {
    const weatherStationId = "1234";
    const startDate = 45640.020833333336; // 14/12/24 0:30
    const endDate = 45640.96666666667; // 14/12/24 23:12
  
    // Mock de la réponse réseau
    const mockData = fs.readFileSync(
      path.resolve(__dirname, './mocks/mockWeatherData-2.html'),
      'utf-8'
    );

    axios.get.mockResolvedValue({ status: 200, data: mockData });

    const result = await getWeatherDataBetween2Dates(weatherStationId, startDate, endDate);
  
    expect(result.weatherStationId).toEqual(weatherStationId);
    expect(result.minTemperature).toEqual(1.6);
    expect(result.maxTemperature).toEqual(7.1);
    expect(result.averageTemperature).toEqual(3.73);
    expect(result.medianTemperature).toEqual(2.9);
  });
  
  it("should throw a ScrapingError on network issues", async () => {
    const weatherStationId = "12345";
    const startDate = 44562;
    const endDate = 44563;
  
    jest.spyOn(axios, "get").mockRejectedValueOnce(new Error("Network Error"));
  
    await expect(getWeatherDataBetween2Dates(weatherStationId, startDate, endDate))
      .rejects.toThrow(ScrapingError);
  });
});
