const xlsx = require('xlsx');
const fs = require('fs');

const workbook = xlsx.readFile('Transferências.xlsx');
const sheet = workbook.Sheets['Base'];
const jsonData = xlsx.utils.sheet_to_json(sheet);

// O formato de jsonData será um array de objetos: { Produto: "1-AGUA", Código: 1, Descrição: "AGUA", Grupo: "AGUAS" }

// Salvando o json para usarmos depois
fs.writeFileSync('./src/productsBase.json', JSON.stringify(jsonData, null, 2));
console.log("Arquivo productsBase.json criado com sucesso com", jsonData.length, "produtos.");
