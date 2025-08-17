// Versão de DIAGNÓSTICO do import.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const csvFilePath = path.join(__dirname, 'caepi.csv');

console.log('Lendo o arquivo CSV para descobrir a lista exata de colunas...');

fs.createReadStream(csvFilePath)
  .pipe(csv({ separator: ';' }))
  .on('headers', (headers) => {
    console.log('COLUNAS ENCONTRADAS NO SEU ARQUIVO:');
    console.log(headers);

    // Gerando o comando CREATE TABLE para você
    const createTableCommand = `
CREATE TABLE ca_data (
    ${headers.map(h => `"${h}" TEXT`).join(',\n        ')}
);
    `;

    console.log('\n\n--- COPIE O COMANDO ABAIXO E EXECUTE NO DBEAVER ---');
    console.log(createTableCommand);
    console.log('--- DEPOIS DE CRIAR A TABELA, COLOQUE O SCRIPT import.js ORIGINAL DE VOLTA ---\n\n');

    process.exit(0); // Para o script aqui
  })
  .on('error', (err) => {
      console.error("Erro ao ler o arquivo CSV. Ele está na pasta e com o nome correto?", err);
  });