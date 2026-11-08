const axios = require("axios");
const cheerio = require("cheerio");
const { ScrapingError } = require("../errors/customErrors");
const { log } = require("../utils/logUtils");

// === CONSTANTS ===
// Base URL for station search
const STATION_SEARCH_URL = process.env.METEO_API_BASE_URL || 'https://www.meteociel.fr/temps-reel/lieuhelper.php?mode=findstation&str=';
// User-Agent header constant
const USER_AGENT = process.env.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

/**
 * Searches for available weather stations by name.
 * Supports partial name matching.
 * 
 * @param {string} stationNamePattern - Partial or full name of the weather station
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Promise<Array>} - Array of station objects with id, name, and region
 * @throws {ScrapingError} - Throws if the search fails or returns invalid data
 */
async function searchWeatherStations(stationNamePattern, maxResults = 10) {
  if (typeof stationNamePattern !== 'string' || !stationNamePattern.trim()) {
    throw new ScrapingError("Station name pattern must be a non-empty string", { stationNamePattern });
  }

  if (!Number.isInteger(maxResults) || maxResults < 1) {
    throw new ScrapingError("maxResults must be a positive integer", { maxResults });
  }

  const encodedPattern = encodeURIComponent(stationNamePattern.trim());
  const url = `${STATION_SEARCH_URL}${encodedPattern}`;

  try {
    log(`Searching for weather stations matching: ${stationNamePattern}`, "info");

    const response = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000
    });

    if (!response.data || typeof response.data !== 'string') {
      throw new ScrapingError("Invalid response format from station search", { url });
    }

    // Parse the response: each line contains "id|name|region"
    const stations = response.data
      .split('\n')
      .filter(line => line.trim())
      .map((line, index) => {
        const parts = line.split('|');
        if (parts.length < 2) {
          log(`Skipping invalid station entry at index ${index}: ${line}`, "warn");
          return null;
        }

        const [id, name, region] = parts;

        // Validate station ID is numeric
        if (isNaN(Number(id))) {
          log(`Invalid station ID format: ${id}`, "warn");
          return null;
        }

        return {
          id: id.trim(),
          name: name.trim(),
          region: region ? region.trim() : ""
        };
      })
      .filter(station => station !== null)
      .slice(0, maxResults);

    if (stations.length === 0) {
      log(`No weather stations found matching: ${stationNamePattern}`, "warn");
    } else {
      log(`Found ${stations.length} weather stations matching: ${stationNamePattern}`, "info");
    }

    return stations;
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error;
    }

    throw new ScrapingError("Failed to search for weather stations", {
      stationNamePattern,
      url,
      originalError: error.message
    });
  }
}

/**
 * Validates if a weather station ID is valid and accessible.
 * Attempts to fetch station metadata to verify accessibility.
 * 
 * @param {string} stationId - The weather station ID to validate
 * @returns {Promise<Object>} - Metadata object with validation status and details
 * @throws {ScrapingError} - Throws if validation fails
 */
async function validateWeatherStationId(stationId, options = {}) {
  const { timeoutMs = 5000 } = options;

  if (typeof stationId !== 'string' || !stationId.trim()) {
    throw new ScrapingError("Station ID must be a non-empty string", { stationId });
  }

  if (isNaN(Number(stationId))) {
    throw new ScrapingError("Station ID must be numeric", { stationId });
  }

  // Try to fetch a page for this station to verify it exists
  const testUrl = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${stationId}&jour2=${new Date().getDate()}&mois2=${new Date().getMonth()}&annee2=${new Date().getFullYear()}`;

  try {
    log(`Validating weather station ID: ${stationId}`, "info");

    const response = await axios.get(testUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: timeoutMs
    });

    if (response.status !== 200) {
      throw new ScrapingError(`HTTP error: Received status ${response.status}`, { stationId, status: response.status });
    }

    // Check if the response contains station data (not an error page)
    const $ = cheerio.load(response.data);
    const table = $('table[width="100%"]').first();

    if (!table.length) {
      throw new ScrapingError("Station page does not contain expected table structure", { stationId });
    }

    log(`Station ID ${stationId} is valid and accessible`, "info");

    return {
      isValid: true,
      stationId,
      message: "Station ID is valid and data can be fetched"
    };
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error;
    }

    throw new ScrapingError("Failed to validate weather station ID", {
      stationId,
      testUrl,
      originalError: error.message
    });
  }
}

/**
 * Retrieves available weather data time ranges for a station.
 * Checks what historical data is available.
 * 
 * @param {string} stationId - The weather station ID
 * @param {Object} dayjsDate - A dayjs date object to check
 * @returns {Promise<Object>} - Object with available data ranges and metadata
 * @throws {ScrapingError} - Throws if data cannot be retrieved
 */
async function getStationDataAvailability(stationId, dayjsDate) {
  if (typeof stationId !== 'string' || !stationId.trim()) {
    throw new ScrapingError("Station ID must be a non-empty string", { stationId });
  }

  try {
    log(`Checking data availability for station ${stationId}`, "info");

    // Use the standard observation page to check data availability
    const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${stationId}&jour2=${dayjsDate.date()}&mois2=${dayjsDate.month()}&annee2=${dayjsDate.year()}`;

    const response = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 5000
    });

    const $ = cheerio.load(response.data);
    const table = $('table[width="100%"]');

    // Count data rows
    const dataRows = table.find('tbody tr');
    const rowCount = dataRows.length;

    // Extract any error or info messages
    const titleText = $('title').text();
    const isErrorPage = titleText.includes('Erreur') || rowCount === 0;

    return {
      stationId,
      date: dayjsDate.format('DD/MM/YYYY'),
      hasData: !isErrorPage && rowCount > 0,
      rowCount,
      message: isErrorPage ? "No data available for this date" : `Found ${rowCount} data points`
    };
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error;
    }

    throw new ScrapingError("Failed to check station data availability", {
      stationId,
      originalError: error.message
    });
  }
}

/**
 * Fetches metadata about a specific weather station.
 * Includes station name, region, and current data availability status.
 * 
 * @param {string} stationId - The weather station ID
 * @returns {Promise<Object>} - Object with station metadata
 * @throws {ScrapingError} - Throws if metadata cannot be retrieved
 */
async function getWeatherStationMetadata(stationId) {
  if (typeof stationId !== 'string' || !stationId.trim()) {
    throw new ScrapingError("Station ID must be a non-empty string", { stationId });
  }

  try {
    log(`Fetching metadata for station ${stationId}`, "info");

    const url = `https://www.meteociel.fr/temps-reel/obs_villes.php?code2=${stationId}`;

    const response = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 5000
    });

    const $ = cheerio.load(response.data);

    // Extract station name from page title or header
    const titleMatch = $('title').text().match(/(\w+(?:\s+\w+)*)\s*-\s*Meteociel/);
    const stationName = titleMatch ? titleMatch[1].trim() : "Unknown";

    // Check for data availability
    const table = $('table[width="100%"]');
    const hasData = table.length > 0 && table.find('tbody tr').length > 0;

    return {
      stationId,
      stationName,
      hasCurrentData: hasData,
      lastUpdate: new Date().toISOString(),
      message: `Metadata retrieved for station ${stationId}`
    };
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error;
    }

    throw new ScrapingError("Failed to retrieve station metadata", {
      stationId,
      originalError: error.message
    });
  }
}

/**
 * Bulk validates multiple weather station IDs.
 * Useful for checking if multiple stations are accessible.
 * 
 * @param {Array<string>} stationIds - Array of station IDs to validate
 * @param {Object} options - Optional configuration
 * @param {number} options.timeoutMs - Timeout per request (default: 5000)
 * @param {boolean} options.stopOnError - Stop processing on first error (default: false)
 * @returns {Promise<Object>} - Object with validation results for each station
 */
async function validateWeatherStationIdBulk(stationIds, options = {}) {
  if (!Array.isArray(stationIds) || stationIds.length === 0) {
    throw new ScrapingError("stationIds must be a non-empty array", { stationIds });
  }

  const { stopOnError = false, timeoutMs = 5000 } = options;
  const results = {
    total: stationIds.length,
    valid: [],
    invalid: [],
    errors: []
  };

  log(`Starting bulk validation of ${stationIds.length} weather stations`, "info");

  for (const stationId of stationIds) {
    try {
      await validateWeatherStationId(stationId, { timeoutMs });
      results.valid.push(stationId);
      log(`✓ Station ${stationId} is valid`, "info");
    } catch (error) {
      results.invalid.push(stationId);
      results.errors.push({
        stationId,
        error: error.message
      });
      log(`✗ Station ${stationId} validation failed: ${error.message}`, "warn");

      if (stopOnError) {
        break;
      }
    }

    // Polite delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const summary = `Validation complete: ${results.valid.length} valid, ${results.invalid.length} invalid`;
  log(summary, "info");

  return results;
}

// === EXPORTS ===
module.exports = {
  searchWeatherStations,
  validateWeatherStationId,
  validateWeatherStationIdBulk,
  getStationDataAvailability,
  getWeatherStationMetadata
};
