// Importation des fonctions à tester
const { excelDateToDayjs, JSDateToString, formatHour } = require('../src/utils/dateHourUtils');
const { dayjs, DATEHOUR_FORMAT } = require('../src/config/dayjsConfig');

// Début des tests unitaires
describe('Tests des fonctions utilitaires de gestion de dates', () => {
  describe("Tests de conversion de dates Excel", () => {
  
    //TODO Implémenter cette exception dans excelDateToDayjs
  /*   it("devrait retourner une date invalide si la valeur est incorrecte", () => {
      const excelDate = -1; // Valeur incorrecte
      const result = excelDateToDayjs(excelDate);
      expect(result.isValid()).toBe(false);
    }); */


  });
  

  // Tests pour la fonction excelDateToDayjs
  describe('excelDateToDayjs', () => {
    it('doit convertir une date d\'été Excel valide en un objet Dayjs avec le bon fuseau horaire', () => {
      const excelDate = 45505.33472222222; // Exemple de valeur pour une date Excel, correspond à 01/08/2024 08:02
      const timezone = 'Europe/Paris';
      
      const result = excelDateToDayjs(excelDate, timezone);
      
      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(dayjs.utc("2024-08-01T08:02:00Z").tz(timezone, true).format());
      expect(result.format(DATEHOUR_FORMAT)).toBe("01/08/2024 08:02:00");
    });

    it('doit convertir une date d\'hiver Excel valide en un objet Dayjs avec le bon fuseau horaire', () => {
      const excelDate = 45627.41736111111; // Exemple de valeur pour une date Excel, correspond à 01/12/2024 10:01
      const timezone = 'Europe/Paris';
      
      const result = excelDateToDayjs(excelDate, timezone);
      
      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(dayjs.utc("2024-12-01T10:01:00Z").tz(timezone, true).format());
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

    it('doit renvoyer une date invalide pour des valeurs avant l\'époque Excel', () => {
      const excelDate = -1; // Date avant 1900
      const timezone = 'Europe/Paris';
      
      const result = excelDateToDayjs(excelDate, timezone);
      
      expect(result.isValid()).toBe(false);
    });

    it('doit correctement appliquer un fuseau horaire différent', () => {
      const excelDate = 44204;
      const timezone = 'America/New_York';
      
      const result = excelDateToDayjs(excelDate, timezone);

      console.log(result);
      console.log(result.format());
      
      expect(result.isValid()).toBe(true);
      expect(result.format()).toBe(dayjs.utc("2021-12-12T05:00:00Z").tz(timezone, true).format());
    });
  });

  // Tests pour la fonction JSDateToString
  describe('JSDateToString', () => {
    it('doit convertir une date Excel valide en une chaîne formatée', () => {
      const excelDate = 44204; // Date Excel valide
      const result = JSDateToString(excelDate);
      expect(result).toBe(dayjs.utc("2021-12-24T00:00:00Z").tz('Europe/Paris', true).format(DATEHOUR_FORMAT));
    });

    it('doit lever une erreur si l\'entrée n\'est pas un nombre', () => {
      const excelDate = "invalid"; // Entrée non valide
      expect(() => JSDateToString(excelDate)).toThrowError("La valeur de la colonne \"Date\" n'est pas un nombre, skipped: invalid");
    });

    it('doit lever une erreur si la date Excel est invalide', () => {
      const excelDate = -1; // Date Excel invalide
      expect(() => JSDateToString(excelDate)).toThrowError(`Impossible de parser la date, skipped: -1 -> Invalid Date / Invalid Date`);
    });
  });

  // Tests pour la fonction formatHour
  describe('formatHour', () => {
    it('doit formater une heure valide au format hh:mm', () => {
      const hour = "9h05";
      const result = formatHour(hour);
      expect(result).toBe("09:05");
    });

    it('doit gérer les heures sans deux-points et les formater correctement', () => {
      const hour = "905";
      const result = formatHour(hour);
      expect(result).toBe("09:05");
    });

    it('doit ignorer les espaces et formater correctement', () => {
      const hour = " 9 h 05 ";
      const result = formatHour(hour);
      expect(result).toBe("09:05");
    });

    it('doit retourner 00:00 pour une heure invalide', () => {
      const hour = "25h00"; // Heure invalide
      const result = formatHour(hour);
      expect(result).toBe("00:00");
    });

    it('doit retourner 00:00 pour une entrée vide ou undefined', () => {
      const result = formatHour("");
      expect(result).toBe("00:00");

      const undefinedResult = formatHour(undefined);
      expect(undefinedResult).toBe("00:00");
    });
  });

});
