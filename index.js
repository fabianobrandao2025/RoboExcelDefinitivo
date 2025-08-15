const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('[BOT] Sistema iniciado. Conectando ao banco de dados...');

// CONFIGURAÇÃO ESSENCIAL PARA FUNCIONAR NA RENDER
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
            '--single-process',
            '--disable-gpu'
        ],
    }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('NOVO QR CODE, FAVOR ESCANEAR...');
});

client.on('ready', () => {
    console.log('BOT PRONTO E CONECTADO!');
});

function formatDate(dateString) {
    if (!dateString) return "Não informada";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

client.on('message', async message => {
    const userInput = message.body.trim();
    const match = userInput.match(/^ca\s+(\d+)$/i);

    if (match) {
        const caNumber = match[1];
        console.log(`[BUSCA] Recebida consulta para o CA: ${caNumber}`);
        
        try {
            const sqlQuery = 'SELECT * FROM ca_data WHERE "NR Registro CA" = $1';
            const { rows } = await pool.query(sqlQuery, [caNumber]);
            
            if (rows.length > 0) {
                const result = rows[0];
                console.log(`[BUSCA] CA ${caNumber} encontrado.`);

                const validade = formatDate(result["DATA DE VALIDADE"]);
                const situacao = result["SITUAÇÃO"] || 'Não informada';
                const processo = result["NR DO PROCESSO"] || 'Não informado';
                const cnpj = result["CNPJ"] || 'Não informado';
                const razaoSocial = result["RA"] || 'Não informada';
                
                const response = `*Certificado de Aprovação Encontrado* ✅
-----------------------------------
*CA:* ${result["NR Registro CA"]}
*Validade:* ${validade}
*Situação:* ${situacao}
*Processo:* ${processo}
*CNPJ:* ${cnpj}
*Fabricante/Importador:* ${razaoSocial}
-----------------------------------`;
                
                client.sendMessage(message.from, response);

            } else {
                console.log(`[BUSCA] CA ${caNumber} não encontrado.`);
                client.sendMessage(message.from, `❌ O CA número ${caNumber} não foi encontrado. Verifique o número e tente novamente.`);
            }
        } catch (error) {
            console.error('[DATABASE] Erro ao consultar:', error);
            client.sendMessage(message.from, 'Desculpe, ocorreu um erro interno ao consultar a base de dados.');
        }
    } else {
        console.log(`[INFO] Mensagem inválida recebida: "${userInput}"`);
        client.sendMessage(message.from, 'Olá! Para consultar um Certificado de Aprovação, envie uma mensagem no formato: CA 12345');
    }
});

client.initialize();