const xlsx = require('xlsx');

const workbook = xlsx.readFile('Transferências.xlsx');

const sheetName = 'Mucambo';
const sheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log(`\n=== DADOS PLANILHA: ${sheetName} ===`);
for (let i = 0; i < 20; i++) {
  console.log(JSON.stringify(jsonData[i]));
}
