const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const csv = require('csv-parser');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERRO: Variável de ambiente DATABASE_URL não encontrada!');
    process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

const csvFilePath = path.join(__dirname, 'caepi.csv');
const rows = [];

console.log('Iniciando a leitura do arquivo CSV...');

fs.createReadStream(csvFilePath)
  .pipe(csv({ separator: ';' }))
  .on('data', (row) => {
    rows.push(row);
  })
  .on('end', async () => {
    console.log(`Leitura do CSV finalizada. Total de ${rows.length} registros encontrados.`);
    if (rows.length === 0) {
        console.log('Nenhum dado para importar. Encerrando.');
        pool.end();
        return;
    }
    console.log('Iniciando inserção no banco de dados... (isso pode levar vários minutos)');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const columns = Object.keys(rows[0]).map(name => `"${name}"`).join(', ');
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const values = Object.values(row);
        const valuePlaceholders = values.map((_, index) => `$${index + 1}`).join(', ');

        const query = `INSERT INTO ca_data (${columns}) VALUES (${valuePlaceholders})`;
        await client.query(query, values);

        if ((i + 1) % 1000 === 0) {
          console.log(`${i + 1} de ${rows.length} registros inseridos...`);
        }
      }

      await client.query('COMMIT');
      console.log(`✅ Sucesso! Todos os ${rows.length} registros foram inseridos no banco de dados.`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Erro durante a inserção. Nenhuma linha foi salva.', error);
    } finally {
      client.release();
      pool.end();
    }
  });