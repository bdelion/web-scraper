// Import the functions to be tested
const {
  excelDateToDayjs,
  JSDateToString,
  formatHour,
} = require("../src/utils/dateHourUtils");
const { dayjs, DATEHOUR_FORMAT } = require("../src/config/dayjsConfig");

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

      const result = excelDateToDayjs(excelDate, timezone);

      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(
        dayjs.utc("2024-12-01T10:01:00Z").tz(timezone, true).format()
      );
      expect(result.format(DATEHOUR_FORMAT)).toBe("01/12/2024 10:01:00");
    });

    //TODO Fix pb date ancienne avant de faire la couverture de TU associés
    /*     it('doit gérer les dates avant 1900 en appliquant la correction de l\'année 1900', () => {
      const excelDate = 31; // Une date qui correspond au 1er janvier 1900
      const timezone = 'Europe/Paris';
      
      const result = excelDateToDayjs(excelDate, timezone);
      
      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(dayjs.utc("1900-01-30T00:00:00Z").tz(timezone, true).format());
      expect(result.format(DATEHOUR_FORMAT)).toBe("30/01/1900 00:00:00");
    }); */

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
        `Column \"Date\" value is not a number, skipped: ${invalidExcelDate}`
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
        `Column \"Date\" value is not a number, skipped: ${invalidInput}`
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

    it("should throw an error if the hour or minutes are invalid", () => {
      const hour = "25h00"; // Invalid hour

      expect(() => formatHour(hour)).toThrowError(
        `Hour or minute values are invalid, skipped: ${hour}`
      );
    });

    it("should throw an error for an empty or undefined input", () => {
      expect(() => formatHour(""))
        .toThrowError("Hour value format is incorrect, skipped: ");

      expect(() => formatHour(undefined))
        .toThrowError(`Hour is not defined, skipped: undefined`);
    });
  });
});
