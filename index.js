const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { Pool } = require('pg');

// Conexão com o banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('[BOT] Sistema iniciado. Conectando ao banco de dados...');

// INÍCIO DA MUDANÇA IMPORTANTE
// Adicionamos configurações especiais para o Puppeteer (o navegador invisível)
// para que ele funcione corretamente na Render.
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Esta opção pode não funcionar no Windows, mas é crucial para o Linux da Render
            '--disable-gpu'
        ],
    }
});
// FIM DA MUDANÇA IMPORTANTE

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('NOVO QR CODE, FAVOR ESCANEAR...');
});

client.on('ready', () => {
    console.log('BOT PRONTO E CONECTADO!');
});

function formatDate(dateString) {
    if (!dateString) return "Data inválida";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Lógica de mensagem
client.on('message', async message => {
    const query = message.body.trim();

    if (/^\d+$/.test(query)) {
        console.log(`[BUSCA] Recebida consulta para o CA: ${query}`);
        
        try {
            const sqlQuery = 'SELECT * FROM ca_data WHERE "CA" = $1';
            const { rows } = await pool.query(sqlQuery, [query]);
            
            if (rows.length > 0) {
                const result = rows[0];
                console.log(`[BUSCA] CA ${query} encontrado no banco de dados.`);
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
                client.sendMessage(message.from, `O CA número ${query} não foi encontrado em nossa base de dados. Por favor, verifique o número e tente novamente.`);
            }
        } catch (error) {
            console.error('[DATABASE] Erro ao consultar o banco de dados:', error);
            client.sendMessage(message.from, 'Desculpe, ocorreu um erro interno ao consultar a base de dados.');
        }
    } else {
        console.log(`[INFO] Mensagem de texto ignorada: "${query}"`);
        client.sendMessage(message.from, 'Olá! Para consultar, por favor, envie apenas o número do Certificado de Aprovação (CA).');
    }
});

client.initialize();