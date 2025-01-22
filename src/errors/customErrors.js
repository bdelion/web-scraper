// === CLASSES ===

/**
 * Custom error class for handling scraping-related errors.
 * Extends the built-in Error class to include additional details.
 */
class ScrapingError extends Error {
  /**
   * Constructs a ScrapingError instance.
   * @param {string} message - The error message.
   * @param {object} details - Additional details about the error.
   */
  constructor(message, details) {
    super(message); // Call the parent Error constructor with the message.
    this.details = details; // Attach additional details to the error instance.
  }

  /**
   * Creates a ScrapingError instance based on an HTTP response error.
   * @param {string} url - The URL where the error occurred.
   * @param {object} response - The HTTP response object causing the error.
   * @returns {ScrapingError} - A new instance of ScrapingError.
   */
  static fromResponseError(url, response) {
    return new ScrapingError(
      `HTTP error: Received ${response.status} (${response.statusText}) for ${response.config.method.toUpperCase()} request at ${url}`,
      { response }
    );
  }
}

// Export the ScrapingError class for use in other modules.
module.exports = {
  ScrapingError,
};
