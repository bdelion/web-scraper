// Import the functions to be tested
const {
  excelDateToDayjs,
  dateToExcelValue,
  JSDateToString,
  formatHour,
} = require("../../src/utils/dateHourUtils");
const { dayjs, DATEHOUR_FORMAT } = require("../../src/config/dayjsConfig");

// Start of unit tests
describe("Utility functions for date management", () => {
  // Tests for the excelDateToDayjs function
  describe("excelDateToDayjs", () => {
    it("should correctly convert a valid summer Excel date to a Dayjs object with the correct timezone", () => {
      const excelDate = 45505.33472222222; // Corresponds to 2024-08-01 08:02
      const timezone = "Europe/Paris";

      const result = excelDateToDayjs(excelDate, timezone);

      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(
        dayjs.utc("2024-08-01T08:02:00Z").tz(timezone, true).format()
      );
      expect(result.format(DATEHOUR_FORMAT)).toBe("01/08/2024 08:02:00");
    });

    it("should correctly convert a valid winter Excel date to a Dayjs object with the correct timezone", () => {
      const excelDate = 45627.41736111111; // Corresponds to 2024-12-01 10:01
      const timezone = "Europe/Paris";

      let result = excelDateToDayjs(excelDate, timezone);

      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(
        dayjs.utc("2024-12-01T10:01:00Z").tz(timezone, true).format()
      );
      expect(result.format(DATEHOUR_FORMAT)).toBe("01/12/2024 10:01:00");

      result = excelDateToDayjs(excelDate);

      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(
        dayjs.utc("2024-12-01T10:01:00Z").tz(timezone, true).format()
      );
      expect(result.format(DATEHOUR_FORMAT)).toBe("01/12/2024 10:01:00");
    });

    it("should handle dates before 1900 by applying the 1900 correction", () => {
      const excelDate = 1; // Corresponds to 01/01/1900
      const timezone = "Europe/Paris";

      const result = excelDateToDayjs(excelDate, timezone);

      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(dayjs.utc("1900-01-01T00:00:00Z").tz(timezone, true).format());
      //TODO expect(result.format(DATEHOUR_FORMAT)).toBe("01/01/1900 00:00:00");
    });

    it("should return an invalid date for values before the Excel epoch", () => {
      const excelDate = -1; // Date before 1900
      const timezone = "Europe/Paris";

      const result = excelDateToDayjs(excelDate, timezone);

      expect(result.isValid()).toBe(false);
    });

    it("should throw an error if the Excel date is invalid", () => {
      const excelDate = "InvalidDate";
      const timezone = "Europe/Paris";

      expect(() => excelDateToDayjs(excelDate, timezone)).toThrowError(`Invalid Excel date: ${excelDate}`);
    });

    it("should correctly apply a different timezone", () => {
      const excelDate = 44554; // Corresponds to 2021-12-24
      const timezone = "America/New_York";

      const result = excelDateToDayjs(excelDate, timezone);

      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(
        dayjs.utc("2021-12-24T00:00:00.000Z").tz(timezone, true).format()
      );
    });

    it("should throw an error for dates far in the past (before Excel epoch)", () => {
      const excelDate = -1000; // An impossible value
      const timezone = "Europe/Paris";

      const result = excelDateToDayjs(excelDate, timezone);

      expect(result.isValid()).toBe(false);
    });
  });

  // Tests for the dateToExcelValue function
  describe('dateToExcelValue', () => {
    it('should convert a valid date before 28/02/1900 correctly', () => {
      // Should return 1 for the first day of January 1900
      expect(dateToExcelValue('01/01/1900 00:00:00')).toBe(1);
      // Should return a value close to 58.9999884259 for 27th February 1900
      expect(dateToExcelValue('27/02/1900 23:59:59')).toBeCloseTo(58.9999884259, 10);
    });

    //TODO
    // it('should handle dates outside of Excel limits correctly', () => {
    //   expect(() => dateToExcelValue('31/12/9999 23:59:59')).toThrow('Date exceeds Excel limits.');
    // });

    it('should convert a valid date after 28/02/1900 correctly (Leap year bug adjustment)', () => {
      // Should return 61 for 1st March 1900 (after the leap year bug adjustment)
      expect(dateToExcelValue('01/03/1900 00:00:00')).toBe(61);
      // Should return a value close to 45717,5 for 1st March 2025
      expect(dateToExcelValue('01/03/2025 12:00:00')).toBeCloseTo(45717.5, 10);
    });

    it('should handle precise times correctly', () => {
      // Should return 1.5 for the noon time on 1st January 1900
      expect(dateToExcelValue('01/01/1900 12:00:00')).toBe(1.5);
      // Should return 2.25 for 6 AM on 2nd January 1900
      expect(dateToExcelValue('02/01/1900 06:00:00')).toBe(2.25);
    });

    it('should throw an error for invalid dates', () => {
      // Should throw an error for invalid date strings
      expect(() => dateToExcelValue('InvalidDate')).toThrow('Invalid date provided.');
      // Should throw an error for incorrectly formatted dates (e.g., month 13)
      expect(() => dateToExcelValue('32/13/1900 00:00:00')).toThrow('Invalid date provided.');
      // Should throw an error for empty strings
      expect(() => dateToExcelValue('')).toThrow('Invalid date provided.');
    });

    it('should handle dates exactly at the epoch (01/01/1900)', () => {
      // Should return 1 for the epoch date (1st January 1900)
      expect(dateToExcelValue('01/01/1900 00:00:00')).toBe(1);
    });

    it('should handle dates with different times correctly', () => {
      // Should return a value close to 0.9999884259 for the date 31st December 1899 at 23:59:59
      expect(dateToExcelValue('31/12/1899 23:59:59')).toBeCloseTo(0.9999884259, 10);
      // Should return a value close to 1.25 for 1st January 1900 at 6 AM
      expect(dateToExcelValue('01/01/1900 06:00:00')).toBeCloseTo(1.25, 10);
    });
  });

  // Tests for the JSDateToString function
  describe("JSDateToString", () => {
    it("should convert a valid Excel date to a formatted string", () => {
      const excelDate = 44554; // Corresponds to 2021-12-24
      const result = JSDateToString(excelDate);

      expect(result).toBe(
        dayjs
          .utc("2021-12-24T00:00:00Z")
          .tz("Europe/Paris", true)
          .format(DATEHOUR_FORMAT)
      );
    });

    it("should return a valid formatted date string for a valid Excel serial date", () => {
      const excelDate = 45505.33472222222;
      const result = JSDateToString(excelDate);
      expect(result).toBe("01/08/2024 08:02:00");
    });

    it("should throw an error if the input is not a number", () => {
      const invalidExcelDate = "not-a-number";

      expect(() => JSDateToString(invalidExcelDate)).toThrow(
        `Column "Date" value is not a number, skipped: ${invalidExcelDate}`
      );
    });

    it("should throw an error if the Excel date is invalid", () => {
      const excelDate = -1;

      expect(() => JSDateToString(excelDate)).toThrowError(
        `Unable to parse date, skipped: ${excelDate} -> Invalid Date / Invalid date, skipped: ${excelDate} -> Invalid Date`
      );
    });

    it("should throw an error if the input is null", () => {
      const invalidInput = null;

      expect(() => JSDateToString(invalidInput)).toThrow(
        `Column "Date" value is not a number, skipped: ${invalidInput}`
      );
    });
  });

  // Tests for the formatHour function
  describe("formatHour", () => {
    it("should format a valid time to hh:mm", () => {
      expect(formatHour("9h05")).toBe("09:05");
      expect(formatHour("14h30")).toBe("14:30");
      expect(formatHour("9h15")).toBe("09:15");
    });

    it("should throw an error if the time is not properly formatted", () => {
      const hour = "905";

      expect(() => formatHour(hour)).toThrowError(
        `Hour value format is incorrect, skipped: ${hour}`
      );
    });

    it("should ignore spaces and format correctly", () => {
      const hour = " 9 h 05 ";

      const result = formatHour(hour);

      expect(result).toBe("09:05");
    });

    it("should throw an error if the hour or minute is invalid", () => {
      let hour = "25h00";

      expect(() => formatHour(hour)).toThrowError(
        `Hour or minute values are invalid, skipped: ${hour}`
      );

      hour = "12h60";

      expect(() => formatHour(hour)).toThrowError(
        `Hour or minute values are invalid, skipped: ${hour}`
      );
    });

    it("should throw an error for empty or undefined input", () => {
      expect(() => formatHour(""))
        .toThrowError("Hour value format is incorrect, skipped: ");

      expect(() => formatHour(undefined))
        .toThrowError(`Hour is not defined, skipped: undefined`);
    });

    //TODO
    // Test pour différents séparateurs
    // it("should format hours with alternative separators correctly", () => {
    //   expect(formatHour("9-05")).toBe("09:05");
    //   expect(formatHour("9.05")).toBe("09:05");
    // });
  });
});
