const { writeExcel, readExcel } = require("../../src/utils/excelUtils");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

describe("writeExcel", () => {
  const outputFile = path.join(__dirname, "outputFile.xlsx");

  const testData = [
    { name: "John", age: 28, date: new Date(2025, 0, 12), score: 88.5 },
    { name: "Jane", age: 22, date: new Date(2025, 0, 13), score: 92.3 },
    { name: "Jane", age: 22, date: new Date(2025, 0, 14), score: -0.8 },
  ];

  afterAll(() => {
    // Remove the output file after tests
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
  });

  it("should write JSON data to an Excel file with correct formatting", () => {
    writeExcel(testData, outputFile);

    // Verify the file was created
    expect(fs.existsSync(outputFile)).toBe(true);

    // Read the Excel file and validate its data
    const workbook = XLSX.readFile(outputFile);
    const sheet = workbook.Sheets["Sheet1"];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    // Check data integrity
    expect(data).toHaveLength(3);
    expect(data[0]).toHaveProperty("name", "John");
    expect(data[1]).toHaveProperty("score", 92.3);

    // Verify the score column formatting (two decimal places)
    expect(sheet["D2"].v).toBe(88.5);
    expect(sheet["D2"].w).toBe("88.50");
    expect(sheet["D4"].v).toBe(-0.8);
    expect(sheet["D4"].w).toBe("-0.80");

    // Vérification du format de la date et de l'heure (DD/MM/YYYY HH:MM:SS)
    const dateRegex = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/; // Regex pour vérifier le format 'DD/MM/YYYY HH:MM:SS'
    expect(sheet["C2"].w).toMatch(dateRegex); // Vérification du format
    expect(sheet["C2"].w).toBe("12/01/2025 00:00:00"); // Vérification de la valeur formattée
  });

  it("should handle errors if the output file cannot be created", () => {
    const invalidOutputPath = "/invalid/path/outputFile.xlsx";
    expect(() => writeExcel(testData, invalidOutputPath)).toThrowError();
  });

  it("should overwrite an existing file without prior confirmation", () => {
    // Create an existing file to test overwriting
    fs.writeFileSync(outputFile, "existing content");
    writeExcel(testData, outputFile);

    const fileContent = fs.readFileSync(outputFile, "utf-8");
    expect(fileContent).not.toBe("existing content"); // Ensure the content was overwritten
  });
});

const testFile = path.join(__dirname, "testFile.xlsx");

describe("readExcel", () => {
  beforeAll(() => {
    // Create a test Excel file with appropriate headers
    const workbook = XLSX.utils.book_new();
    const sheetData = [
      { name: "John", age: 28, date: new Date(2025, 0, 12), score: 88.5 },
      { name: "Jane", age: 22, date: new Date(2025, 0, 13), score: 92.3 },
    ];
    const sheet = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    XLSX.writeFile(workbook, testFile);
  });

  afterAll(() => {
    // Remove the test file after tests
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it("should read an Excel file and return data as a JSON array", () => {
    const data = readExcel(testFile, "Sheet1", 0);
    expect(data).toHaveLength(2); // Verify there are 2 data rows
    expect(data[0]).toHaveProperty("name", "John");
    expect(data[1]).toHaveProperty("age", 22);
    expect(data[1]).toHaveProperty("score", 92.3);
  });

  it("should return an empty array if the sheet does not exist", () => {
    const data = readExcel(testFile, "NonExistentSheet", 0);
    expect(data).toHaveLength(0); // No data returned
  });

  it("should throw an error if the file does not exist", () => {
    expect(() => readExcel("nonexistentfile.xlsx", "Sheet1", 0)).toThrowError();
  });

  //TODO ?
  // it("devrait commencer à lire les données à partir de la ligne spécifiée (1-based index)", () => {
  //   const data = readExcel(testFile, "Sheet1", 0); // Lire à partir de la ligne 2
  //   expect(data).toHaveLength(1); // Il n'y a qu'une seule ligne de données (la ligne 2)
  //   expect(data[0]).toHaveProperty("name", "Jane");
  // });

  // it("devrait gérer les dates dans les données et les convertir correctement en JSON", () => {
  //   const data = readExcel(testFile, "Sheet1", 0);
  //   expect(new Date(data[0].date)).toEqual(new Date(2025, 0, 12)); // Vérifier la conversion des dates
  // });

  it("should handle empty columns correctly", () => {
    const sheetDataWithEmptyCols = [
      { name: "John", age: 28, score: 88.5 },
      { name: "Jane", age: 22, score: 92.3 },
      { name: "", age: 0, score: 0 }, // Row with missing values
    ];
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(sheetDataWithEmptyCols);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const testFileWithEmptyCols = path.join(__dirname, "testFileWithEmptyCols.xlsx");
    XLSX.writeFile(workbook, testFileWithEmptyCols);

    const data = readExcel(testFileWithEmptyCols, "Sheet1", 0);
    expect(data[2]).toHaveProperty("name", ""); // Verify empty 'name'
    fs.unlinkSync(testFileWithEmptyCols);
  });
});
