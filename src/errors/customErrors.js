// === CLASSES ===

class ScrapingError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
  }

  static fromResponseError(url, response) {
    return new ScrapingError(
      `HTTP error: Received ${response.status} (${response.statusText}) at ${url}`,
      { response }
    );
  }
}

module.exports = {
  ScrapingError,
};
