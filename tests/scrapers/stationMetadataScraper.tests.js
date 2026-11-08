const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const {
  searchWeatherStations,
  validateWeatherStationId,
  validateWeatherStationIdBulk,
  getStationDataAvailability,
  getWeatherStationMetadata
} = require("../../src/scrapers/stationMetadataScraper");
const { ScrapingError } = require("../../src/errors/customErrors");
const { dayjs } = require("../../src/config/dayjsConfig");

const mock = new MockAdapter(axios);

describe("Station Metadata Scraper", () => {
  beforeEach(() => {
    mock.reset();
  });

  afterEach(() => {
    mock.reset();
  });

  describe("searchWeatherStations", () => {
    it("should search for weather stations and return results", async () => {
      const mockResponse = "69001|Paris|Île-de-France\n75001|Paris-Montsouris|Île-de-France";

      mock.onGet(/findstation.*Paris/).reply(200, mockResponse);

      const results = await searchWeatherStations("Paris");

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("name");
      expect(results[0]).toHaveProperty("region");
    });

    it("should return limited results based on maxResults parameter", async () => {
      const mockResponse = "1|Station 1|Region 1\n2|Station 2|Region 2\n3|Station 3|Region 3";

      mock.onGet(/findstation/).reply(200, mockResponse);

      const results = await searchWeatherStations("Test", 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should throw ScrapingError on invalid station name", async () => {
      await expect(searchWeatherStations("")).rejects.toThrow(ScrapingError);
    });

    it("should throw ScrapingError on network error", async () => {
      mock.onGet(/findstation/).networkError();

      await expect(searchWeatherStations("Paris")).rejects.toThrow(ScrapingError);
    });

    it("should throw ScrapingError on invalid maxResults", async () => {
      await expect(searchWeatherStations("Paris", -1)).rejects.toThrow(ScrapingError);
    });

    it("should handle response with invalid station entries", async () => {
      // Mix of valid and invalid entries
      const mockResponse = "69001|Paris|Île-de-France\ninvalid_line\n75001|Paris-Montsouris|Île-de-France";

      mock.onGet(/findstation/).reply(200, mockResponse);

      const results = await searchWeatherStations("Paris");

      // Should only include valid entries
      expect(results.every(s => s.id && s.name)).toBe(true);
    });
  });

  describe("validateWeatherStationId", () => {
    it("should validate a correct weather station ID", async () => {
      const mockHtml = `
        <html>
          <table width="100%">
            <tbody>
              <tr><td>10:00</td><td>20.5</td></tr>
            </tbody>
          </table>
        </html>
      `;

      mock.onGet(/obs_villes/).reply(200, mockHtml);

      const result = await validateWeatherStationId("69001");

      expect(result.isValid).toBe(true);
      expect(result.stationId).toBe("69001");
      const requestUrl = new URL(mock.history.get[0].url);
      expect(requestUrl.searchParams.get("mois2")).toBe(String(new Date().getMonth()));
    });

    it("should throw ScrapingError on empty station ID", async () => {
      await expect(validateWeatherStationId("")).rejects.toThrow(ScrapingError);
    });

    it("should throw ScrapingError on non-numeric station ID", async () => {
      await expect(validateWeatherStationId("INVALID")).rejects.toThrow(ScrapingError);
    });

    it("should throw ScrapingError on network timeout", async () => {
      mock.onGet(/obs_villes/).timeoutOnce();

      await expect(validateWeatherStationId("69001")).rejects.toThrow(ScrapingError);
    });

    it("should throw ScrapingError when station page has no table", async () => {
      const mockHtml = "<html><body>No table here</body></html>";

      mock.onGet(/obs_villes/).reply(200, mockHtml);

      await expect(validateWeatherStationId("69001")).rejects.toThrow(ScrapingError);
    });

    it("should throw ScrapingError on HTTP error", async () => {
      mock.onGet(/obs_villes/).reply(404);

      await expect(validateWeatherStationId("69001")).rejects.toThrow(ScrapingError);
    });
  });

  describe("validateWeatherStationIdBulk", () => {
    beforeEach(() => {
      // Set up mock responses for validation
      const mockHtml = `
        <html>
          <table width="100%">
            <tbody><tr><td>10:00</td><td>20.5</td></tr></tbody>
          </table>
        </html>
      `;

      mock.onGet(/obs_villes/).reply(200, mockHtml);
    });

    it("should validate multiple station IDs", async () => {
      const stationIds = ["69001", "75001", "13000"];

      const result = await validateWeatherStationIdBulk(stationIds);

      expect(result.total).toBe(3);
      expect(result.valid.length).toBeGreaterThan(0);
      expect(result).toHaveProperty("invalid");
      expect(result).toHaveProperty("errors");
    });

    it("should pass the configured timeout to each station validation request", async () => {
      await validateWeatherStationIdBulk(["69001"], { timeoutMs: 1234 });

      expect(mock.history.get[0].timeout).toBe(1234);
    });

    it("should throw ScrapingError on empty array", async () => {
      await expect(validateWeatherStationIdBulk([])).rejects.toThrow(ScrapingError);
    });

    it("should handle partial failures with stopOnError false", async () => {
      // Mock first two stations to succeed, third to fail
      let callCount = 0;

      mock.onGet(/obs_villes/).reply(() => {
        callCount++;
        if (callCount === 3) {
          return [404, {}];
        }
        return [200, '<table width="100%"><tbody><tr><td>10:00</td></tr></tbody></table>'];
      });

      const result = await validateWeatherStationIdBulk(["69001", "75001", "99999"], { stopOnError: false });

      expect(result.valid.length >= 0).toBe(true);
      expect(Array.isArray(result.invalid)).toBe(true);
    });
  });

  describe("getStationDataAvailability", () => {
    it("should return data availability for a station on a specific date", async () => {
      const mockHtml = `
        <html>
          <table width="100%">
            <tbody>
              <tr><td>10:00</td><td>20.5</td></tr>
              <tr><td>11:00</td><td>21.0</td></tr>
            </tbody>
          </table>
        </html>
      `;

      mock.onGet(/obs_villes/).reply(200, mockHtml);

      const date = dayjs("2025-01-01", "YYYY-MM-DD");
      const result = await getStationDataAvailability("69001", date);

      expect(result).toHaveProperty("stationId", "69001");
      expect(result).toHaveProperty("date");
      expect(result).toHaveProperty("hasData");
      expect(result).toHaveProperty("rowCount");
      expect(result.hasData).toBe(true);
      expect(new URL(mock.history.get[0].url).searchParams.get("mois2")).toBe("0");
    });

    it("should return hasData false when no data available", async () => {
      const mockHtml = "<html><title>Erreur</title><body>No data</body></html>";

      mock.onGet(/obs_villes/).reply(200, mockHtml);

      const date = dayjs("2099-01-01", "YYYY-MM-DD");
      const result = await getStationDataAvailability("69001", date);

      expect(result.hasData).toBe(false);
    });

    it("should throw ScrapingError on empty station ID", async () => {
      const date = dayjs();
      await expect(getStationDataAvailability("", date)).rejects.toThrow(ScrapingError);
    });

    it("should throw ScrapingError on network error", async () => {
      mock.onGet(/obs_villes/).networkError();

      const date = dayjs();
      await expect(getStationDataAvailability("69001", date)).rejects.toThrow(ScrapingError);
    });
  });

  describe("getWeatherStationMetadata", () => {
    it("should retrieve station metadata", async () => {
      const mockHtml = `
        <html>
          <title>Paris - Meteociel</title>
          <table width="100%">
            <tbody>
              <tr><td>10:00</td><td>20.5</td></tr>
            </tbody>
          </table>
        </html>
      `;

      mock.onGet(/obs_villes/).reply(200, mockHtml);

      const result = await getWeatherStationMetadata("69001");

      expect(result).toHaveProperty("stationId", "69001");
      expect(result).toHaveProperty("stationName");
      expect(result).toHaveProperty("hasCurrentData");
      expect(result).toHaveProperty("lastUpdate");
    });

    it("should extract station name from page title", async () => {
      const mockHtml = `
        <html>
          <title>Lyon - Meteociel</title>
          <table width="100%"><tbody><tr><td>10:00</td></tr></tbody></table>
        </html>
      `;

      mock.onGet(/obs_villes/).reply(200, mockHtml);

      const result = await getWeatherStationMetadata("69001");

      expect(result.stationName).toContain("Lyon");
    });

    it("should extract station name from Meteociel's observation page title", async () => {
      const mockHtml = `
        <html>
          <title>Meteociel - Observations Bressuire (79) - données météo de la station - Tableaux horaires en temps réel</title>
          <table width="100%"><tbody><tr><td>10:00</td></tr></tbody></table>
        </html>
      `;

      mock.onGet(/obs_villes/).reply(200, mockHtml);

      const result = await getWeatherStationMetadata("69001");

      expect(result.stationName).toBe("Bressuire");
    });

    it("should throw ScrapingError on empty station ID", async () => {
      await expect(getWeatherStationMetadata("")).rejects.toThrow(ScrapingError);
    });

    it("should throw ScrapingError on network error", async () => {
      mock.onGet(/obs_villes/).networkError();

      await expect(getWeatherStationMetadata("69001")).rejects.toThrow(ScrapingError);
    });

    it("should handle missing station name gracefully", async () => {
      const mockHtml = `
        <html>
          <title>Meteociel</title>
          <table width="100%"><tbody><tr><td>10:00</td></tr></tbody></table>
        </html>
      `;

      mock.onGet(/obs_villes/).reply(200, mockHtml);

      const result = await getWeatherStationMetadata("69001");

      expect(result.stationName).toBe("Unknown");
    });
  });

  describe("Error handling", () => {
    it("should handle HTTP 403 Forbidden", async () => {
      mock.onGet(/obs_villes/).reply(403);

      await expect(validateWeatherStationId("69001")).rejects.toThrow(ScrapingError);
    });

    it("should handle HTTP 500 Server Error", async () => {
      mock.onGet(/obs_villes/).reply(500);

      await expect(validateWeatherStationId("69001")).rejects.toThrow(ScrapingError);
    });

    it("should preserve original error in ScrapingError context", async () => {
      mock.onGet(/obs_villes/).networkError();

      try {
        await validateWeatherStationId("69001");
        fail("Should have thrown error");
      } catch (error) {
        expect(error instanceof ScrapingError).toBe(true);
        expect(error.details).toBeDefined();
        expect(error.details.originalError).toBeDefined();
      }
    });
  });
});
