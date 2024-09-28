#!/usr/bin/env node

"use strict";

const XLSX = require('xlsx');
const fs = require('fs');

const parseExcelDate1 = (excelDate) => {
  const excelEpoch = new Date(1900, 0, 1);  // 1er janvier 1900
  return new Date(excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);  // Convertir en date
};

const parseExcelDate2 = (excelDate) => {
  // 1. Date de référence Excel (1er janvier 1900, sauf pour le bogue du 29 février 1900)
  const excelEpoch = new Date(1900, 0, 1);
  
  // 2. Calculer le nombre de millisecondes écoulées
  const milliseconds = (excelDate - 1) * 24 * 60 * 60 * 1000; // Multiplier par le nombre de ms par jour
  
  // 3. Ajouter ce temps à la date de référence
  const date = new Date(excelEpoch.getTime() + milliseconds);
  
  return date;
};

const parseExcelDate = (excelDate) => {
  // 1. Calculer la partie entière (jours) et la partie fractionnelle (heure)
  const days = Math.floor(excelDate);  // Partie entière, nombre de jours
  const fractionOfDay = excelDate - days;  // Partie décimale, fraction du jour

  // 2. Créer une date de référence Excel (1er janvier 1900)
  const excelEpoch = new Date(1900, 0, 1);

  // 3. Ajouter le nombre de jours à la date de référence
  excelEpoch.setDate(excelEpoch.getDate() + days - 2); // -1 pour ajuster le décalage Excel

  // 4. Convertir la fraction de jour en heures, minutes, secondes
  const totalSeconds = Math.round(fractionOfDay * 24 * 60 * 60);  // Fractions de jour en secondes
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // 5. Ajouter les heures, minutes et secondes à la date
  excelEpoch.setHours(hours);
  excelEpoch.setMinutes(minutes);
  excelEpoch.setSeconds(seconds);

  return excelEpoch;
};

// Lecture du fichier Excel
const readExcel = (inputFile) => {
  const workbook = XLSX.readFile(inputFile);
  const sheetName = workbook.SheetNames[0]; // Lire la première feuille
  const sheet = workbook.Sheets[sheetName];

  // Convertir les données de la feuille en JSON
  // const data = XLSX.utils.sheet_to_json(sheet, { range: 2, raw: false, dateNF: 'DD/MM/YYYY HH:mm' });
  const data = XLSX.utils.sheet_to_json(sheet, { range: 2, raw: true });
  console.log("Données brutes :", data);
  // Débogage : afficher les lignes
  // console.log("Données lues depuis Excel :", data);

  // Traiter les dates
  data.forEach(row => {
    // console.log("Ligne actuelle :", row); // Afficher chaque ligne pour voir la structure
    if (row.Date) {
      console.log(`Valeur de la date: ${row.Date}, Type: ${typeof row.Date}`);
      console.log("Date avant transformation :", row.Date); // Afficher la date actuelle
      // Transformer les dates si besoin
      // row.Date = new Date(row.Date).toLocaleDateString('fr-FR');
      row.Date = parseExcelDate(row.Date);
      console.log("Date après transformation :", row.Date); // Afficher la date transformée
    }
  });

  return data;
};

// Écriture du fichier Excel avec les dates formatées
const writeExcel = (data, outputFile) => {
  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');

  XLSX.writeFile(newWorkbook, outputFile);
};

// Exemple d'utilisation
const inputFile = 'assets/exemple.xlsx';  // Le fichier Excel à lire
const outputFile = 'assets/resultat.xlsx'; // Le fichier de sortie

const excelData = readExcel(inputFile);
writeExcel(excelData, outputFile);

console.log("Le fichier Excel a été traité et enregistré avec les dates au format correct.");
