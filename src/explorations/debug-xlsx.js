const XLSX = require("xlsx");
const path = require('path');

// Créer un fichier Excel de test avec des en-têtes corrects
const testFile = path.join(__dirname, 'testFile.xlsx');
const sheetData = [
  { name: 'John', age: 28, date: new Date(2025, 0, 12), score: 88.5 },
  { name: 'Jane', age: 22, date: new Date(2025, 0, 13), score: 92.3 },
];

// Créer un nouveau classeur
const workbook = XLSX.utils.book_new();

// Convertir les données en une feuille Excel avec des en-têtes explicites
const sheet = XLSX.utils.json_to_sheet(sheetData);

// Ajouter la feuille au classeur
XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

// Sauvegarder le fichier Excel
XLSX.writeFile(workbook, testFile);
