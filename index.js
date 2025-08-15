const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { Pool } = require('pg'); // Pacote para conectar ao PostgreSQL

// O bot vai pegar a URL do banco de dados das variáveis de ambiente da Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('[BOT] Sistema iniciado. Conectando ao banco de dados...');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('NOVO QR CODE, FAVOR ESCANEAR...');
});

client.on('ready', () => {
    console.log('BOT PRONTO E CONECTADO!');
});

// A função de formatar a data continua a mesma
function formatDate(dateString) {
    if (!dateString) return "Data inválida";
    // Tenta criar um objeto de data. Se o formato for compatível, funciona.
    const date = new Date(dateString);
    if (isNaN(date)) return dateString; // Se não for uma data válida, retorna o texto original
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

client.on('message', async message => {
    const query = message.body.trim();

    if (/^\d+$/.test(query)) {
        console.log(`[BUSCA] Recebida consulta para o CA: ${query}`);
        
        try {
            // SQL para buscar no banco de dados. $1 é um placeholder seguro para a variável.
            // IMPORTANTE: O nome da tabela é "ca_data". O nome da coluna é "CA".
            // Use aspas duplas se seus nomes de coluna no CSV tiverem espaços ou maiúsculas.
            const sqlQuery = 'SELECT * FROM ca_data WHERE "CA" = $1';
            const { rows } = await pool.query(sqlQuery, [query]);
            
            if (rows.length > 0) {
                const result = rows[0];
                console.log(`[BUSCA] CA ${query} encontrado no banco de dados.`);
                
                // Os nomes (VALIDADE, EQUIPAMENTO) devem ser IDÊNTICOS aos do seu banco de dados
                const validade = result.VALIDADE ? formatDate(result.VALIDADE) : "Não informada";
                
                const response = `*EQUIPAMENTO ENCONTRADO*
*CA:* ${result.CA}
*VALIDADE:* ${validade}
*EQUIPAMENTO:* ${result.EQUIPAMENTO || 'Não informado'}
*FABRICANTE:* ${result.FABRICANTE || 'Não informado'}
*SITUAÇÃO:* APROVADO`;
                
                client.sendMessage(message.from, response);
                console.log(`[RESPOSTA] Resposta enviada para ${message.from}.`);

            } else {
                console.log(`[BUSCA] CA ${query} não encontrado no banco de dados.`);
                client.sendMessage(message.from, `CA ${query} não encontrado ou não é um número válido.`);
            }
        } catch (error) {
            console.error('[DATABASE] Erro ao consultar o banco de dados:', error);
            client.sendMessage(message.from, 'Desculpe, ocorreu um erro ao consultar a base de dados.');
        }
    }
});

client.initialize();