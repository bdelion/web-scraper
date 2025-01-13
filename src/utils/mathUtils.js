// This module provides utility functions for calculating statistical properties of an array of numbers.

/**
 * Calculates the average of a list of numbers.
 *
 * @param {...number} numbers - The numbers for which to calculate the average.
 * @returns {string} The average of the numbers rounded to two decimal places, or "0" if no numbers are provided.
 */
function getAverage(...numbers) {
  if (numbers.length === 0) return "0"; // Return "0" if no numbers are provided.

  // Calculate the sum of the numbers.
  const sum = numbers.reduce((acc, temp) => acc + temp, 0);

  // Return the average rounded to two decimal places.
  return (sum / numbers.length).toFixed(2);
}

/**
 * Calculates the median of a list of numbers.
 *
 * @param {...number} numbers - The numbers for which to calculate the median.
 * @returns {string} The median of the numbers rounded to two decimal places, or "0" if no numbers are provided.
 */
function findMedian(...numbers) {
  if (numbers.length === 0) return "0"; // Return "0" if no numbers are provided.

  // Sort the numbers in ascending order.
  numbers.sort((a, b) => a - b);

  const middle = Math.floor(numbers.length / 2);

  // If the number of elements is even, return the average of the two middle elements.
  return (numbers.length % 2 === 0
    ? ((numbers[middle - 1] + numbers[middle]) / 2)
    : numbers[middle]
  ).toFixed(2);
}

// Export the utility functions for external use.
module.exports = {
  getAverage,
  findMedian,
};
