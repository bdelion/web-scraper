const { getAverage, findMedian } = require('../src/utils/mathUtils');

describe('mathUtils.js', () => {
  describe('getAverage', () => {
    it('devrait retourner "0" quand aucun argument n\'est passé', () => {
      expect(getAverage()).toBe("0");
    });

    it('devrait calculer correctement la moyenne d\'un ensemble de nombres', () => {
      expect(getAverage(20, 30, 40)).toBe("30.00");
      expect(getAverage(10, 20, 30, 40)).toBe("25.00");
      expect(getAverage(1, 2, 3, 4, 5)).toBe("3.00");
    });

    it('devrait retourner la moyenne correcte même avec un nombre pair d\'éléments', () => {
      expect(getAverage(10, 15)).toBe("12.50");
    });

    it('devrait retourner la moyenne correcte avec des nombres négatifs', () => {
      expect(getAverage(-10, 0, 10)).toBe("0.00");
    });
    
    it('devrait renvoyer 0 si tous les nombres sont à zéro', () => {
      expect(getAverage(0, 0, 0)).toBe("0.00");
    });
  
    it('devrait gérer les nombres négatifs correctement', () => {
      expect(getAverage(-1, -2, -3, -4, -5)).toBe("-3.00");
    });
  
    it('devrait gérer les nombres flottants correctement', () => {
      expect(getAverage(1.5, 2.5, 3.5)).toBe("2.50");
    });

    it('devrait gérer un grand nombre d\'éléments', () => {
      expect(getAverage(...Array(1000).fill(1))).toBe("1.00");
    });
  });

  describe('findMedian', () => {
    it('devrait retourner "0" quand aucun argument n\'est passé', () => {
      expect(findMedian()).toBe("0");
    });

    it('devrait retourner la médiane d\'un tableau de nombres impair', () => {
      expect(findMedian(1, 2, 3)).toBe("2.00");
      expect(findMedian(10, 20, 30, 40, 50)).toBe("30.00");
      expect(findMedian(1, 2, 3, 4, 5)).toBe("3.00");
      expect(findMedian(5, 3, 1, 2, 4)).toBe("3.00");
    });

    it('devrait retourner la médiane correcte d\'un tableau pair', () => {
      expect(findMedian(1, 2, 3, 4)).toBe("2.50");
      expect(findMedian(4, 3, 1, 2)).toBe("2.50");
    });

    it('devrait gérer correctement les nombres négatifs', () => {
      expect(findMedian(-10, 0, 10)).toBe("0.00");
      expect(findMedian(-20, -10, 0, 10)).toBe("-5.00");
      expect(findMedian(-1, -2, -3, -4, -5)).toBe("-3.00");
    });

    it('devrait trier correctement le tableau avant de calculer la médiane', () => {
      expect(findMedian(30, 10, 20)).toBe("20.00");
    });
    
    it('devrait renvoyer 0 si tous les nombres sont à zéro', () => {
      expect(findMedian(0, 0, 0)).toBe("0.00");
    });

    it('devrait gérer les nombres flottants dans la médiane', () => {
      expect(findMedian(1.5, 2.5, 3.5)).toBe("2.50");
    });

    it('devrait gérer un grand nombre d\'éléments', () => {
      const largeArray = Array(1000).fill(5);
      expect(findMedian(...largeArray)).toBe("5.00");
    });
  });
});
