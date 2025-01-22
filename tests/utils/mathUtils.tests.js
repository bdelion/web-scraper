// This test suite verifies the correctness of utility functions for calculating statistical properties.

const { getAverage, findMedian } = require('../../src/utils/mathUtils');

describe('mathUtils.js', () => {
  describe('getAverage', () => {
    /**
     * Test that the function returns "0" when no arguments are passed.
     */
    it('should return "0" when no arguments are passed', () => {
      expect(getAverage()).toBe("0");
    });

    /**
     * Test that the function correctly calculates the average of a set of numbers.
     */
    it('should correctly calculate the average of a set of numbers', () => {
      expect(getAverage(20, 30, 40)).toBe("30.00");
      expect(getAverage(10, 20, 30, 40)).toBe("25.00");
      expect(getAverage(1, 2, 3, 4, 5)).toBe("3.00");
    });

    /**
     * Test that the function returns the correct average for an even number of elements.
     */
    it('should return the correct average for an even number of elements', () => {
      expect(getAverage(10, 15)).toBe("12.50");
    });

    /**
     * Test that the function handles negative numbers correctly.
     */
    it('should handle negative numbers correctly', () => {
      expect(getAverage(-10, 0, 10)).toBe("0.00");
      expect(getAverage(-1, -2, -3, -4, -5)).toBe("-3.00");
    });

    /**
     * Test that the function returns "0.00" when all numbers are zero.
     */
    it('should return "0.00" if all numbers are zero', () => {
      expect(getAverage(0, 0, 0)).toBe("0.00");
    });

    /**
     * Test that the function handles floating-point numbers correctly.
     */
    it('should handle floating-point numbers correctly', () => {
      expect(getAverage(1.5, 2.5, 3.5)).toBe("2.50");
    });

    /**
     * Test that the function handles a large number of elements.
     */
    it('should handle a large number of elements', () => {
      expect(getAverage(...Array(1000).fill(1))).toBe("1.00");
    });
  });

  describe('findMedian', () => {
    /**
     * Test that the function returns "0" when no arguments are passed.
     */
    it('should return "0" when no arguments are passed', () => {
      expect(findMedian()).toBe("0");
    });

    /**
     * Test that the function correctly calculates the median of an odd-sized array of numbers.
     */
    it('should return the median of an odd-sized array of numbers', () => {
      expect(findMedian(1, 2, 3)).toBe("2.00");
      expect(findMedian(10, 20, 30, 40, 50)).toBe("30.00");
      expect(findMedian(1, 2, 3, 4, 5)).toBe("3.00");
      expect(findMedian(5, 3, 1, 2, 4)).toBe("3.00");
    });

    /**
     * Test that the function returns the correct median for an even-sized array.
     */
    it('should return the correct median of an even-sized array', () => {
      expect(findMedian(1, 2, 3, 4)).toBe("2.50");
      expect(findMedian(4, 3, 1, 2)).toBe("2.50");
    });

    /**
     * Test that the function handles negative numbers correctly.
     */
    it('should handle negative numbers correctly', () => {
      expect(findMedian(-10, 0, 10)).toBe("0.00");
      expect(findMedian(-20, -10, 0, 10)).toBe("-5.00");
      expect(findMedian(-1, -2, -3, -4, -5)).toBe("-3.00");
    });

    /**
     * Test that the function sorts the array correctly before calculating the median.
     */
    it('should sort the array correctly before calculating the median', () => {
      expect(findMedian(30, 10, 20)).toBe("20.00");
    });

    /**
     * Test that the function returns "0.00" when all numbers are zero.
     */
    it('should return "0.00" if all numbers are zero', () => {
      expect(findMedian(0, 0, 0)).toBe("0.00");
    });

    /**
     * Test that the function handles floating-point numbers in the median calculation.
     */
    it('should handle floating-point numbers in the median calculation', () => {
      expect(findMedian(1.5, 2.5, 3.5)).toBe("2.50");
    });

    /**
     * Test that the function handles a large number of elements.
     */
    it('should handle a large number of elements', () => {
      const largeArray = Array(1000).fill(5);
      expect(findMedian(...largeArray)).toBe("5.00");
    });
  });
});
