// script.test.js
const { getAverage, findMedian, excelDateToDayjs, formatHour, cleanTemperature, ScrapingError, performIdStationScraping, performObservationScraping, JSDateToString, writeExcel, formatData, getWeatherDataBetween2Dates} = require('../src/meteo-scraping-file-input.js'); // Adjust the path to your script
const dayjs = require('dayjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mockFs = require('mock-fs');
const XLSX = require('xlsx');

jest.mock('axios');

describe("Tests des fonctions utilitaires", () => {
  
  // Tests pour getAverage
  describe("getAverage", () => {
    it("devrait calculer la moyenne d'un ensemble de nombres", () => {
      expect(getAverage(1, 2, 3, 4, 5)).toBe("3.00");
    });

    it("devrait renvoyer 0 si aucun nombre n'est fourni", () => {
      expect(getAverage()).toBe("0");
    });

    it("devrait renvoyer 0 si tous les nombres sont à zéro", () => {
      expect(getAverage(0, 0, 0)).toBe("0.00");
    });

    it("devrait gérer les nombres négatifs correctement", () => {
      expect(getAverage(-1, -2, -3, -4, -5)).toBe("-3.00");
    });

    it("devrait gérer les floats correctement", () => {
      expect(getAverage(1.5, 2.5, 3.5)).toBe("2.50");
    });
  });

  // Tests pour findMedian
  describe("findMedian", () => {
    
    it("devrait calculer la médiane d'un tableau avec un nombre impair d'éléments", () => {
      expect(findMedian(1, 2, 3, 4, 5)).toBe("3.00");
      expect(findMedian(5, 3, 1, 2, 4)).toBe("3.00");
    });

    it("devrait calculer la médiane d'un tableau avec un nombre pair d'éléments", () => {
      expect(findMedian(1, 2, 3, 4)).toBe("2.50");
      expect(findMedian(4, 3, 1, 2)).toBe("2.50");
    });

    it("devrait renvoyer 0 si aucun nombre n'est fourni", () => {
      expect(findMedian()).toBe("0");
    });

    it("devrait renvoyer 0 si tous les nombres sont à zéro", () => {
      expect(findMedian(0, 0, 0)).toBe("0.00");
    });

    it("devrait gérer les nombres négatifs dans la médiane", () => {
      expect(findMedian(-1, -2, -3, -4, -5)).toBe("-3.00");
    });

    it("devrait gérer les nombres flottants dans la médiane", () => {
      expect(findMedian(1.5, 2.5, 3.5)).toBe("2.50");
    });
  });
});

describe("Tests de conversion de dates Excel", () => {
  it("devrait convertir une date Excel d'été en un objet Dayjs valide", () => {
    const excelDate = 45505.33472222222; // Exemple de valeur pour une date Excel, correspond à 01/08/2024 08:02
    const result = excelDateToDayjs(excelDate);
    expect(result.isValid()).toBe(true);
    expect(result.format("DD/MM/YYYY HH:mm")).toBe("01/08/2024 08:02"); // Attendu selon la valeur d'Excel
  });
  it("devrait convertir une date Excel d'hiver en un objet Dayjs valide", () => {
    const excelDate = 45627.41736111111; // Exemple de valeur pour une date Excel, correspond à 01/12/2024 10:01
    const result = excelDateToDayjs(excelDate);
    expect(result.isValid()).toBe(true);
    expect(result.format("DD/MM/YYYY HH:mm")).toBe("01/12/2024 10:01"); // Attendu selon la valeur d'Excel
  });

  //TODO Implémenter cette exception dans excelDateToDayjs
/*   it("devrait retourner une date invalide si la valeur est incorrecte", () => {
    const excelDate = -1; // Valeur incorrecte
    const result = excelDateToDayjs(excelDate);
    expect(result.isValid()).toBe(false);
  }); */
});

//TODO Fix pb date ancienne avant de faire la couverture de TU associés
/* test('excelDateToDayjs - should convert an Excel serial date 1900 to a Day.js object', () => {
  const date = excelDateToDayjs(32, 'Europe/Paris'); // Correspond à 01/02/1900 00:00
  expect(date.isValid()).toBe(true);
  expect(date.format('YYYY-MM-DD')).toBe('1900-02-01');
}); */

// Tests pour formatHour
describe("Tests de formatage des heures", () => {
  it("devrait formater l'heure correctement", () => {
    expect(formatHour("2h5")).toBe("02:05");
    expect(formatHour("14h30")).toBe("14:30");
    expect(formatHour("9h15")).toBe("09:15");
    expect(formatHour('')).toBe('00:00'); // Valeur vide, retourne par défaut
    //TODO Implémenter cette exception dans formatHour
    /* expect(formatHour("25h00")).toBe("00:00"); // Valeur invalide, retourne par défaut */
  });
});

// Tests pour cleanTemperature
describe("Tests de nettoyage des températures", () => {
  it("devrait convertir une chaîne valide en un nombre", () => {
    expect(cleanTemperature("20.5°C")).toBe(20.5);
    expect(cleanTemperature("25.0°C")).toBe(25.0);
  });

  it("devrait renvoyer null pour une température invalide", () => {
    expect(cleanTemperature("abc°C")).toBeNull();
    expect(cleanTemperature("abc")).toBeNull();
    expect(cleanTemperature("")).toBeNull();
    expect(cleanTemperature("N/A")).toBeNull();
    expect(cleanTemperature(null)).toBeNull();
  });
});

// Tests pour performIdStationScraping
describe("Tests de la fonction performIdStationScraping", () => {
  // Cas où le nom de la station météo est invalide
  it("devrait lancer une erreur si weatherStationName n'est pas une chaîne valide", async () => {
    await expect(performIdStationScraping(null)).rejects.toThrow(ScrapingError);
    await expect(performIdStationScraping('')).rejects.toThrow(ScrapingError);
    await expect(performIdStationScraping('   ')).rejects.toThrow(ScrapingError);
  });

  // Cas où la réponse de l'API est invalide
  it("devrait lancer une erreur si la réponse est vide ou mal formée", async () => {
    axios.post.mockResolvedValue({ data: "" }); // Réponse vide

    await expect(performIdStationScraping("StationName")).rejects.toThrow(ScrapingError);
  });

  it("devrait lancer une erreur si la réponse ne contient pas un ID valide", async () => {
    axios.post.mockResolvedValue({ data: "InvalidResponseFormat" });

    await expect(performIdStationScraping("StationName")).rejects.toThrow(ScrapingError);
  });

  it("devrait lancer une erreur si l'ID de la station n'est pas un nombre", async () => {
    axios.post.mockResolvedValue({ data: "NonNumericID|SomeOtherData" });

    await expect(performIdStationScraping("StationName")).rejects.toThrow(ScrapingError);
  });

  // Cas où l'ID de la station est trouvé
  it("devrait retourner l'ID de la station si la réponse est valide", async () => {
    axios.post.mockResolvedValue({ data: "12345|SomeOtherData" });

    const id = await performIdStationScraping("StationName");
    expect(id).toBe("12345");
  });

  // Cas où la requête échoue (problème réseau)
  it("devrait lancer une erreur si la requête échoue", async () => {
    axios.post.mockRejectedValue(new Error("Network error"));

    await expect(performIdStationScraping("StationName")).rejects.toThrow(ScrapingError);
  });

  // Cas où l'ID est correctement récupéré
  it("devrait retourner un ID de station valide pour un autre exemple", async () => {
    axios.post.mockResolvedValue({ data: "67890|MoreData" });

    const id = await performIdStationScraping("AnotherStation");
    expect(id).toBe("67890");
  });

});

require("jest-extended"); // Si vous utilisez jest-extended pour les assertions personnalisées

// Fonction d'extension pour Jest afin de valider les objets Day.js
expect.extend({
  toBeDayjs(received) {
    const pass = dayjs.isDayjs(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Day.js object`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Day.js object`,
        pass: false,
      };
    }
  },
});

// Tests pour performObservationScraping
describe("Tests de la fonction performObservationScraping", () => {
  // Cas où le nom de la station météo est invalide
  it("devrait lancer une erreur si weatherStationId est invalide", async () => {
    await expect(performObservationScraping("", dayjs())).rejects.toThrow(ScrapingError);
    await expect(performObservationScraping(null, dayjs())).rejects.toThrow(ScrapingError);
    await expect(performObservationScraping("   ", dayjs())).rejects.toThrow(ScrapingError);
  });

  // Cas où la date est invalide
  it("devrait lancer une erreur si la date est invalide", async () => {
    await expect(performObservationScraping("1234", "invalid_date")).rejects.toThrow(ScrapingError);
    await expect(performObservationScraping("1234", dayjs("invalid_date"))).rejects.toThrow(ScrapingError);
    await expect(performObservationScraping("1234", null)).rejects.toThrow(ScrapingError);
  });

  // Cas où la réponse HTTP réussie avec données météo valides
  it("devrait récupérer et formater les données météo correctement", async () => {
    const mockData = fs.readFileSync(
      path.resolve(__dirname, './mocks/mockWeatherData.html'),
      'utf-8'
    );

    axios.get.mockResolvedValue({ status: 200, data: mockData });
    
    const stationId = "1234";
    const mockDate = dayjs("2024-12-14");
  
    const result = await performObservationScraping(stationId, mockDate);
  
    // Vérifiez les formats et les valeurs
    expect(result).toEqual([
      expect.objectContaining({
        weatherStationId: stationId,
        heure: "23:54",
        temperature: 4.9,
        dayjs: expect.toBeDayjs(),  // Utilisation de l'assertion personnalisée
        dayjsFormated: "14/12/2024 23:54:00",
      }),
      expect.objectContaining({
        weatherStationId: stationId,
        heure: "23:48",
        temperature: 4.8,
        dayjs: expect.toBeDayjs(),  // Utilisation de l'assertion personnalisée
        dayjsFormated: "14/12/2024 23:48:00",
      }),
    ]);
  });

  // Cas erreur de requête HTTP
  it("devrait lancer une erreur si la requête HTTP échoue", async () => {
    axios.get.mockRejectedValue(new Error("Network error"));
  
    await expect(performObservationScraping("1234", dayjs())).rejects.toThrow(ScrapingError);
  });

  // Cas erreur de format de réponse (table non trouvée)
  it("devrait lancer une erreur si la table n'est pas trouvée dans la réponse", async () => {
    const mockData = "<html><body>No data table</body></html>";
    axios.get.mockResolvedValue({ status: 200, data: mockData });
  
    await expect(performObservationScraping("1234", dayjs())).rejects.toThrow(ScrapingError);
  });

  // Cas erreur de données météo manquantes ou mal formatées
  it("devrait lancer une erreur si les données météo sont mal formatées", async () => {
    const mockData = `
      <table width="100%">
        <tbody>
          <tr><td>12:00</td><td>Not a number</td></tr>
        </tbody>
      </table>
    `;
    axios.get.mockResolvedValue({ status: 200, data: mockData });
  
    await expect(performObservationScraping("1234", dayjs())).rejects.toThrow(ScrapingError);
  });

  // Tests de la gestion des erreurs personnalisées (ScrapingError)
  it("devrait lancer une erreur ScrapingError pour une requête invalide", async () => {
    axios.get.mockResolvedValue({ data: "" }); // Réponse vide
  
    await expect(performObservationScraping("1234", dayjs("2025-01-05")))
      .rejects
      .toThrowError(ScrapingError);
  });
});

// Tests pour JSDateToString
describe("JSDateToString", () => {

  it("should return a valid formatted date string for a valid Excel serial date", () => {
    // Exemple de valeur d'Excel pour le 1er janvier 2023 (date : 44927)
    const excelDate = 45505.33472222222;
    const result = JSDateToString(excelDate);
    expect(result).toBe("01/08/2024 08:02:00"); // Remplacez par le format attendu
  });

  it("should throw an error if the input is not a number", () => {
    // Test avec une valeur de date invalide
    const invalidExcelDate = "not-a-number";
    expect(() => JSDateToString(invalidExcelDate)).toThrow("La valeur de la colonne \"Date\" n'est pas un nombre, skipped: not-a-number");
  });

  it("should throw an error if the input is null", () => {
    const invalidInput = null; // ou autre type invalide
    expect(() => JSDateToString(invalidInput)).toThrow("La valeur de la colonne \"Date\" n'est pas un nombre, skipped: null");
  });

  //TODO mais avec une gestion des exceptions dans JSDateToString en amont je pense 
/*   it("should handle a valid Excel date but with invalid date parsing", () => {
    // Cas où la date est valide mais le formatage échoue
    const invalidDateExcel = 43000; // Vous pouvez choisir une valeur de test qui échoue dans votre logique
    expect(() => JSDateToString(invalidDateExcel)).toThrow("Impossible de parser la date");
  }); */
});

// Tests pour writeExcel
describe('writeExcel', () => {
  const DATEHOUR_FORMAT = "DD/MM/YYYY HH:mm:ss";
  
  const sampleData = [
    {
      weatherStationId: '79049004',
      startDate: excelDateToDayjs(45638.32013888889).toDate(),
      endDate: excelDateToDayjs(45639.31736111111).toDate(),
      minTemperature: -0.7,
      maxTemperature: 5.5,
      averageTemperature: 1.8,
      medianTemperature: 1.3,
    },
    {
      weatherStationId: '79049004',
      startDate: excelDateToDayjs(45639.31736111111).toDate(),
      endDate: excelDateToDayjs(45640.4375).toDate(),
      maxTemperature: 2.8,
      averageTemperature: 1.72,
      medianTemperature: 2,
    },
    {
      weatherStationId: '79049004',
      startDate: excelDateToDayjs(45640.4375).toDate(),
      endDate: excelDateToDayjs(45641.34861111111).toDate(),
      minTemperature: 1.5,
      maxTemperature: 7.1,
      averageTemperature: 4.51,
      medianTemperature: 4.6,
    },
  ];

  const outputFile = 'test-output.xlsx';

  beforeEach(() => {
    mockFs({});
  });

  afterEach(() => {
    mockFs.restore();
  });

  test('devrait créer un fichier Excel avec les données et formats corrects', () => {    
    writeExcel(sampleData, outputFile);

    // Charger le fichier Excel généré
    const workbook = XLSX.readFile(outputFile);
    const sheet = workbook.Sheets['Sheet1'];

    // Vérifier les valeurs des colonnes pour la première ligne de données
    expect(sheet['A2'].v).toBe('79049004'); // weatherStationId

    // Vérifier les dates et heures complètes
    const startDate1 = dayjs.utc('12/12/2024 07:41:00', DATEHOUR_FORMAT).tz("Europe/Paris", true);
    const endDate1 = dayjs.utc('13/12/2024 07:37:00', DATEHOUR_FORMAT).tz("Europe/Paris", true);

    // Comparaison complète
    expect(excelDateToDayjs(sheet['B2'].v).isSame(startDate1)).toBe(true);
    expect(excelDateToDayjs(sheet['C2'].v).isSame(endDate1)).toBe(true); // endDate

    // Vérification du format de la date et de l'heure (DD/MM/YYYY HH:MM:SS)
    const startDate1Formatted = sheet['B2'].w;
    const endDate1Formatted = sheet['C2'].w;
    const dateRegex = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/; // Regex pour vérifier le format 'DD/MM/YYYY HH:MM:SS'

    expect(startDate1Formatted).toMatch(dateRegex); // Vérification du format startDate
    expect(endDate1Formatted).toMatch(dateRegex);   // Vérification du format endDate

    // Vérification des températures et de leur format
    expect(sheet['D2'].v).toBe(-0.7); // minTemperature
    expect(sheet['D2'].w).toBe('-0.70'); // Valeur formatée
    expect(sheet['E2'].v).toBe(5.5); // maxTemperature
    expect(sheet['E2'].w).toBe('5.50'); // Valeur formatée
    expect(sheet['F2'].v).toBe(1.8); // averageTemperature
    expect(sheet['F2'].w).toBe('1.80'); // Valeur formatée
    expect(sheet['G2'].v).toBe(1.3); // medianTemperature
    expect(sheet['G2'].w).toBe('1.30'); // Valeur formatée

    // Vérifier les autres lignes (par exemple, ligne 3)
    const startDate3 = dayjs.utc('14/12/2024 10:30:00', DATEHOUR_FORMAT).tz("Europe/Paris", true);
    const endDate3 = dayjs.utc('15/12/2024 08:22:00', DATEHOUR_FORMAT).tz("Europe/Paris", true);

    expect(excelDateToDayjs(sheet['B4'].v).isSame(startDate3)).toBe(true);
    expect(excelDateToDayjs(sheet['C4'].v).isSame(endDate3)).toBe(true);
    expect(sheet['D4'].v).toBe(1.5);
    expect(sheet['D4'].w).toBe('1.50'); // Valeur formatée
    expect(sheet['E4'].v).toBe(7.1);
    expect(sheet['E4'].w).toBe('7.10'); // Valeur formatée
    expect(sheet['F4'].v).toBe(4.51);
    expect(sheet['F4'].w).toBe('4.51'); // Valeur formatée
    expect(sheet['G4'].v).toBe(4.6);
    expect(sheet['G4'].w).toBe('4.60'); // Valeur formatée
  });
});

// Tests pour formatData
describe('Tests unitaires pour la fonction formatData', () => {
  
  // Test 1 : Vérifie que la fonction lève une erreur si l'entrée n'est pas un tableau
  test('devrait lever une erreur si l\'entrée n\'est pas un tableau', () => {
    const input = { Date: 1, Min: 10, Max: 20 };
    expect(() => formatData(input)).toThrowError(
      new ScrapingError("L'entrée doit être un tableau.", { jsonArray: input })
    );
  });

  // Test 2 : Vérifie que la fonction lève une erreur si une entrée manque la propriété "Date"
  test('devrait lever une erreur si une entrée n\'a pas de propriété "Date"', () => {
    const input = [
      { Date: 1, Min: 10, Max: 20 },
      { Min: 15, Max: 25 }, // Manque la propriété "Date"
      { Date: 10, Min: 20, Max: 30 }
    ];

    expect(() => formatData(input)).toThrowError(
      new ScrapingError('Date invalide ou manquante dans l\'entrée à l\'index 1.', { entry: input[1], index: 1 })
    );
  });

  // Test 3 : Vérifie que la fonction lève une erreur si une date est inférieure à la précédente
  test('devrait lever une erreur si une date est inférieure à la précédente', () => {
    const input = [
      { Date: 1, Min: 10, Max: 20 },
      { Date: 5, Min: 15, Max: 25 },
      { Date: 3, Min: 20, Max: 30 } // Date inférieure à 5
    ];

    let dateBegin = JSDateToString(5);
    let dateEnd = JSDateToString(3);

    try {
      formatData(input);
    } catch (error) {
      // Vérification que l'erreur est de type ScrapingError
      expect(error).toBeInstanceOf(ScrapingError);

      // Vérification du message d'erreur
      expect(error.message).toMatch(
        `La valeur de la date en cours (${dateEnd}) à l'index 2 est inférieure à la date précédente (${dateBegin}).`
      );

      // Vérification des détails
      expect(error.details).toEqual({
        entry: input[2],
        previousDate: 5,
        index: 2
      });
    }
  });

  // Test 4 : Vérifie que les plages de dates sont correctement générées quand Min et Max sont indéfinis
  test('devrait créer des plages de dates lorsque Min et Max sont indéfinis', () => {
    const input = [
      { Date: 1, Min: 10, Max: 20 },
      { Date: 5, Min: undefined, Max: undefined },
      { Date: 10, Min: undefined, Max: undefined }
    ];

    const result = formatData(input);
    expect(result).toEqual([
      { begin: 1, end: 5 },
      { begin: 5, end: 10 }
    ]);
  });

  // Test 5 : Vérifie que le tableau retourné est vide si Min et Max sont toujours définis
  test('ne doit pas créer de plages si Min et Max sont définis pour chaque entrée', () => {
    const input = [
      { Date: 1, Min: 10, Max: 20 },
      { Date: 5, Min: 15, Max: 25 },
      { Date: 10, Min: 20, Max: 30 }
    ];

    const result = formatData(input);
    expect(result).toEqual([]); // Aucun range n'est créé si Min et Max sont définis
  });

  // Test 6 : Vérifie que la fonction fonctionne correctement lorsque les données sont valides
  test('devrait renvoyer les bonnes plages de dates lorsque les données sont valides', () => {
    const input = [
      { Date: 1, Min: undefined, Max: undefined },
      { Date: 5, Min: undefined, Max: undefined },
      { Date: 10, Min: undefined, Max: undefined }
    ];

    const result = formatData(input);
    expect(result).toEqual([
      { begin: 1, end: 5 },
      { begin: 5, end: 10 }
    ]);
  });

});

// Tests pour getWeatherDataBetween2Dates
describe("getWeatherDataBetween2Dates", () => {

  it("should return weather data between two valid Excel dates", async () => {
    const weatherStationId = "1234";
    const startDate = 45640.020833333336; // 14/12/24 0:30
    const endDate = 45640.96666666667; // 14/12/24 23:12
  
    // Mock de la réponse réseau
    const mockData = fs.readFileSync(
      path.resolve(__dirname, './mocks/mockWeatherData-2.html'),
      'utf-8'
    );

    axios.get.mockResolvedValue({ status: 200, data: mockData });

    const result = await getWeatherDataBetween2Dates(weatherStationId, startDate, endDate);
  
    expect(result.weatherStationId).toEqual(weatherStationId);
    expect(result.minTemperature).toEqual(1.6);
    expect(result.maxTemperature).toEqual(7.1);
    expect(result.averageTemperature).toEqual(3.73);
    expect(result.medianTemperature).toEqual(2.9);
  });
  
  it("should throw a ScrapingError on network issues", async () => {
    const weatherStationId = "12345";
    const startDate = 44562;
    const endDate = 44563;
  
    jest.spyOn(axios, "get").mockRejectedValueOnce(new Error("Network Error"));
  
    await expect(getWeatherDataBetween2Dates(weatherStationId, startDate, endDate))
      .rejects.toThrow(ScrapingError);
  });
});
