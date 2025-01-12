// Assurez-vous d'avoir la bibliothèque XLSX chargée (par exemple via CDN ou npm)
const XLSX = require('xlsx');
const DATEHOUR_FORMAT = "DD/MM/YYYY HH:mm:ss";

// Exemple de données JSON
let data = [
  {
    "weatherStationId": "79049004",
    "startDate": "01/08/2024 00:02:00",
    "endDate": "01/08/2024 00:20:00",
    "minTemperature": "22.70",
    "maxTemperature": "23.60",
    "averageTemperature": "23.20",
    "medianTemperature": "23.30"
  }
  // Vous pouvez ajouter plus de données ici
];

// Fonction pour convertir les dates et les nombres
data = data.map(item => {
  return {
    ...item,
    startDate: new Date(item.startDate), // Convertir la date en objet Date
    endDate: new Date(item.endDate), // Convertir la date en objet Date
    minTemperature: parseFloat(item.minTemperature), // Convertir les températures en nombres
    maxTemperature: parseFloat(item.maxTemperature),
    averageTemperature: parseFloat(item.averageTemperature),
    medianTemperature: parseFloat(item.medianTemperature)
  };
});

// Utiliser XLSX.utils.json_to_sheet pour créer une feuille Excel à partir des données
const ws = XLSX.utils.json_to_sheet(data);

// Appliquer ce format à chaque cellule des colonnes contenant des dates
data.forEach((item, index) => {
  // Format de la colonne startDate
  ws[`B${index + 2}`].z = DATEHOUR_FORMAT; // "A" correspond à la colonne startDate (1ère colonne)
  
  // Format de la colonne endDate
  ws[`C${index + 2}`].z = DATEHOUR_FORMAT; // "B" correspond à la colonne endDate (2ème colonne)
});

// Si vous voulez aussi définir un format pour les autres cellules (ex. température)
ws['!cols'] = [
  { wch: 20 },  // largeur de la colonne pour les dates
  { wch: 20 },
  { wch: 20 },
  { wch: 10 },
  { wch: 10 },
  { wch: 10 }
];

// Créer un fichier Excel et le télécharger
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Données météo");
XLSX.writeFile(wb, "assets/données_météo.xlsx");
