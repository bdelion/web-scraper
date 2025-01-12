// Calcule la moyenne d'un tableau de températures
function getAverage(...numbers) {
  if (numbers.length === 0) return "0"; // Si aucun argument, renvoyer "0"

  const sum = numbers.reduce((acc, temp) => acc + temp, 0);
  return (sum / numbers.length).toFixed(2);
}

// Calcule la médiane d'un tableau de nombres
function findMedian(...numbers) {
  if (numbers.length === 0) return "0"; // Si aucun argument, renvoyer "0"
  
  // Tri des températures par ordre croissant
  numbers.sort((a, b) => a - b);
  
  const middle = Math.floor(numbers.length / 2);

  // Si le nombre d'éléments est pair, on retourne la moyenne des deux éléments du milieu
  return (numbers.length % 2 === 0
    ? ((numbers[middle - 1] + numbers[middle]) / 2)
    : numbers[middle]
  ).toFixed(2);
}

module.exports = {
  getAverage,
  findMedian,
};
