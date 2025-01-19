const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const { dayjs, DATE_FORMAT } = require("../../src/config/dayjsConfig");
const {
  performIdStationScraping,
  getWeatherDataBetween2Dates,
} = require("../../src/scrapers/weatherScraper");
const { ScrapingError } = require("../../src/errors/customErrors");

// Initialiser le mock adapter pour axios
const mock = new MockAdapter(axios);

describe("Weather Scraping Functions", () => {
  afterEach(() => {
    mock.reset();
  });

  describe("performIdStationScraping", () => {
    it("should throw a ScrapingError if weatherStationName is invalid", async () => {
      await expect(performIdStationScraping("")).rejects.toThrow(ScrapingError);
      await expect(performIdStationScraping(null)).rejects.toThrow(
        ScrapingError
      );
      await expect(performIdStationScraping(123)).rejects.toThrow(
        ScrapingError
      );
    });

    it("should return the station ID for a valid weatherStationName", async () => {
      mock.onPost().reply(200, "12345|Some Station");
      const id = await performIdStationScraping("validStationName");
      expect(id).toBe("12345");
    });

    it("should throw a ScrapingError if response data is invalid", async () => {
      mock.onPost().reply(200, "");
      await expect(
        performIdStationScraping("validStationName")
      ).rejects.toThrow(ScrapingError);
    });
  });

  describe("getWeatherDataBetween2Dates", () => {
    it("should throw an error if one of the dates is invalid", async () => {
      await expect(
        getWeatherDataBetween2Dates("validStationId", 44554, "invalidDate")
      ).rejects.toThrow(Error);
    });

    it("should return weather data between two dates", async () => {
      const mockHtmlResponse = `
        <table width="100%">
          <tbody>
            <tr>
              <td>08:00</td>
              <td>Clear</td>
              <td>5.0 °C</td>
            </tr>
          </tbody>
        </table>
      `;

      mock.onGet().reply(200, mockHtmlResponse);

      const result = await getWeatherDataBetween2Dates(
        "validStationId",
        44554,
        44555
      );
      expect(result).toEqual(
        expect.objectContaining({
          weatherStationId: "validStationId",
          minTemperature: expect.any(Number),
          maxTemperature: expect.any(Number),
          averageTemperature: expect.any(Number),
          medianTemperature: expect.any(Number),
        })
      );
    });
  });
});
