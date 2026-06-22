import * as xlsx from 'xlsx';
import * as fs from 'fs';

const workbook = xlsx.readFile('Transferências.xlsx');

console.log("=== PLANILHAS ENCONTRADAS ===");
console.log(workbook.SheetNames.join(', '));
console.log("\n");

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== PLANILHA: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  if (jsonData.length > 0) {
    console.log("CABEÇALHOS (Linha 1):");
    console.log(JSON.stringify(jsonData[0]));
    console.log("DADOS (Primeiras 3 linhas):");
    for (let i = 1; i < Math.min(jsonData.length, 4); i++) {
      console.log(JSON.stringify(jsonData[i]));
    }
  } else {
    console.log("Planilha vazia.");
  }
});
