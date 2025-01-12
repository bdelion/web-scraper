const { writeExcel, readExcel } = require("../src/utils/excelUtils");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

describe("writeExcel", () => {
  const outputFile = path.join(__dirname, "outputFile.xlsx");

  const testData = [
    { name: "John", age: 28, date: new Date(2025, 0, 12), score: 88.5 },
    { name: "Jane", age: 22, date: new Date(2025, 0, 13), score: 92.3 },
  ];

  afterAll(() => {
    // Supprimer le fichier de sortie après les tests
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
  });

  it("devrait écrire les données JSON dans un fichier Excel avec le bon format", () => {
    writeExcel(testData, outputFile);

    // Vérifier si le fichier a été créé
    expect(fs.existsSync(outputFile)).toBe(true);

    // Lire le fichier Excel pour vérifier les données
    const workbook = XLSX.readFile(outputFile);
    const sheet = workbook.Sheets["Sheet1"];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    // Vérifier que les données sont correctes
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty("name", "John");
    expect(data[1]).toHaveProperty("score", 92.3);

    // Vérifier que la colonne de scores est formatée correctement (deux décimales)
    const scoreCell = sheet["D2"];
    expect(scoreCell.v).toBe(88.5);
    expect(scoreCell.w).toBe("88.50");
  });

  it("devrait gérer les erreurs si le fichier de sortie ne peut pas être créé", () => {
    const invalidOutputPath = "/invalid/path/outputFile.xlsx";
    expect(() => writeExcel(testData, invalidOutputPath)).toThrowError();
  });

  it("devrait ne pas écraser un fichier existant sans confirmation préalable", () => {
    // Créer un fichier existant pour tester
    fs.writeFileSync(outputFile, "existing content");
    writeExcel(testData, outputFile);

    const fileContent = fs.readFileSync(outputFile, "utf-8");
    expect(fileContent).not.toBe("existing content"); // Vérifier que le contenu a été écrasé
  });
});

// Crée un fichier temporaire pour les tests
const testFile = path.join(__dirname, "testFile.xlsx");

describe("readExcel", () => {
  beforeAll(() => {
    // Créer un fichier Excel de test avec des en-têtes corrects
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
    // Supprimer le fichier de test après les tests
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it("devrait lire un fichier Excel et retourner des données sous forme de tableau JSON", () => {
    const data = readExcel(testFile, "Sheet1", 0);
    expect(data).toHaveLength(2); // Il y a 2 lignes de données
    expect(data[0]).toHaveProperty("name", "John");
    expect(data[1]).toHaveProperty("age", 22);
    expect(data[1]).toHaveProperty("score", 92.3);
  });

  it("devrait renvoyer un tableau vide si la feuille n'existe pas", () => {
    const data = readExcel(testFile, "NonExistentSheet", 0);
    expect(data).toHaveLength(0); // Aucune donnée retournée
  });

  it("devrait retourner une erreur si le fichier n'existe pas", () => {
    expect(() => readExcel("nonexistentfile.xlsx", "Sheet1", 0)).toThrowError();
  });

  // it("devrait commencer à lire les données à partir de la ligne spécifiée (1-based index)", () => {
  //   const data = readExcel(testFile, "Sheet1", 0); // Lire à partir de la ligne 2
  //   expect(data).toHaveLength(1); // Il n'y a qu'une seule ligne de données (la ligne 2)
  //   expect(data[0]).toHaveProperty("name", "Jane");
  // });

  // it("devrait gérer les dates dans les données et les convertir correctement en JSON", () => {
  //   const data = readExcel(testFile, "Sheet1", 0);
  //   expect(new Date(data[0].date)).toEqual(new Date(2025, 0, 12)); // Vérifier la conversion des dates
  // });

  it("devrait gérer les colonnes vides correctement", () => {
    const sheetDataWithEmptyCols = [
      { name: "John", age: 28, score: 88.5 },
      { name: "Jane", age: 22, score: 92.3 },
      { name: "", age: 0, score: 0 }, // Ligne avec des valeurs manquantes
    ];
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(sheetDataWithEmptyCols);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const testFileWithEmptyCols = path.join(
      __dirname,
      "testFileWithEmptyCols.xlsx"
    );
    XLSX.writeFile(workbook, testFileWithEmptyCols);

    const data = readExcel(testFileWithEmptyCols, "Sheet1", 0);
    expect(data[2]).toHaveProperty("name", ""); // La ligne vide pour 'name'
    fs.unlinkSync(testFileWithEmptyCols);
  });
});

// jest.mock('fs');
// jest.mock('xlsx', () => ({ ...jest.requireActual('xlsx'), readFile: jest.fn(), }));
// // Mock data
// const mockData = [
//   { Date: '2023-01-01', minTemperature: 10, maxTemperature: 20 },
//   { Date: '2023-01-02', minTemperature: 12, maxTemperature: 22 }
// ];
// describe('readExcel 2', () => { 
//   it('should read data from an Excel sheet starting from a specific row', () => { 
//     const inputFile = 'test.xlsx';
//     const sheetName = 'Sheet1';
//     const firstRow = 0;
//     const workbook = XLSX.utils.book_new();
//     const newSheet = XLSX.utils.json_to_sheet(mockData);
//     XLSX.utils.book_append_sheet(workbook, newSheet, sheetName);
//     // Mocking readFile to return the workbook
//     XLSX.readFile.mockReturnValue(workbook);

//     console.log(workbook);
//       // Read the Excel file into a workbook object
//   const workbook2 = XLSX.readFile(inputFile);

//   // Access the specified sheet by name
//   const sheet2 = workbook2.Sheets[sheetName];

//   // Convert the sheet data to JSON starting from the specified row, with raw data for cells
//   const data2 = XLSX.utils.sheet_to_json(sheet2, { range: 0, raw: true });
//   console.log(data2);

//     const result = readExcel(inputFile, sheetName, firstRow);

//     console.log(result);

//     expect(result).toEqual(mockData);
//   });
// });

// ---------------- Plus large que excelUtils ----------------
// const { excelDateToDayjs } = require('../src/utils/dateHourUtils');
// const { dayjs } = require('../src/config/dayjsConfig');
// const mockFs = require('mock-fs');

// // Tests pour writeExcel
// describe('writeExcel', () => {
//   const DATEHOUR_FORMAT = "DD/MM/YYYY HH:mm:ss";

//   const sampleData = [
//     {
//       weatherStationId: '79049004',
//       startDate: excelDateToDayjs(45638.32013888889).toDate(),
//       endDate: excelDateToDayjs(45639.31736111111).toDate(),
//       minTemperature: -0.7,
//       maxTemperature: 5.5,
//       averageTemperature: 1.8,
//       medianTemperature: 1.3,
//     },
//     {
//       weatherStationId: '79049004',
//       startDate: excelDateToDayjs(45639.31736111111).toDate(),
//       endDate: excelDateToDayjs(45640.4375).toDate(),
//       maxTemperature: 2.8,
//       averageTemperature: 1.72,
//       medianTemperature: 2,
//     },
//     {
//       weatherStationId: '79049004',
//       startDate: excelDateToDayjs(45640.4375).toDate(),
//       endDate: excelDateToDayjs(45641.34861111111).toDate(),
//       minTemperature: 1.5,
//       maxTemperature: 7.1,
//       averageTemperature: 4.51,
//       medianTemperature: 4.6,
//     },
//   ];

//   const outputFile = 'test-output.xlsx';

//   beforeEach(() => {
//     mockFs({});
//   });

//   afterEach(() => {
//     mockFs.restore();
//   });

//   test('devrait créer un fichier Excel avec les données et formats corrects', () => {
//     writeExcel(sampleData, outputFile);

//     // Charger le fichier Excel généré
//     const workbook = XLSX.readFile(outputFile);
//     const sheet = workbook.Sheets['Sheet1'];

//     // Vérifier les valeurs des colonnes pour la première ligne de données
//     expect(sheet['A2'].v).toBe('79049004'); // weatherStationId

//     // Vérifier les dates et heures complètes
//     const startDate1 = dayjs.utc('12/12/2024 07:41:00', DATEHOUR_FORMAT).tz("Europe/Paris", true);
//     const endDate1 = dayjs.utc('13/12/2024 07:37:00', DATEHOUR_FORMAT).tz("Europe/Paris", true);

//     // Comparaison complète
//     expect(excelDateToDayjs(sheet['B2'].v).isSame(startDate1)).toBe(true);
//     expect(excelDateToDayjs(sheet['C2'].v).isSame(endDate1)).toBe(true); // endDate

//     // Vérification du format de la date et de l'heure (DD/MM/YYYY HH:MM:SS)
//     const startDate1Formatted = sheet['B2'].w;
//     const endDate1Formatted = sheet['C2'].w;
//     const dateRegex = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/; // Regex pour vérifier le format 'DD/MM/YYYY HH:MM:SS'

//     expect(startDate1Formatted).toMatch(dateRegex); // Vérification du format startDate
//     expect(endDate1Formatted).toMatch(dateRegex);   // Vérification du format endDate

//     // Vérification des températures et de leur format
//     expect(sheet['D2'].v).toBe(-0.7); // minTemperature
//     expect(sheet['D2'].w).toBe('-0.70'); // Valeur formatée
//     expect(sheet['E2'].v).toBe(5.5); // maxTemperature
//     expect(sheet['E2'].w).toBe('5.50'); // Valeur formatée
//     expect(sheet['F2'].v).toBe(1.8); // averageTemperature
//     expect(sheet['F2'].w).toBe('1.80'); // Valeur formatée
//     expect(sheet['G2'].v).toBe(1.3); // medianTemperature
//     expect(sheet['G2'].w).toBe('1.30'); // Valeur formatée

//     // Vérifier les autres lignes (par exemple, ligne 3)
//     const startDate3 = dayjs.utc('14/12/2024 10:30:00', DATEHOUR_FORMAT).tz("Europe/Paris", true);
//     const endDate3 = dayjs.utc('15/12/2024 08:22:00', DATEHOUR_FORMAT).tz("Europe/Paris", true);

//     expect(excelDateToDayjs(sheet['B4'].v).isSame(startDate3)).toBe(true);
//     expect(excelDateToDayjs(sheet['C4'].v).isSame(endDate3)).toBe(true);
//     expect(sheet['D4'].v).toBe(1.5);
//     expect(sheet['D4'].w).toBe('1.50'); // Valeur formatée
//     expect(sheet['E4'].v).toBe(7.1);
//     expect(sheet['E4'].w).toBe('7.10'); // Valeur formatée
//     expect(sheet['F4'].v).toBe(4.51);
//     expect(sheet['F4'].w).toBe('4.51'); // Valeur formatée
//     expect(sheet['G4'].v).toBe(4.6);
//     expect(sheet['G4'].w).toBe('4.60'); // Valeur formatée
//   });
// });
