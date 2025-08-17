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

function formatLargeNumber(value) {
    if (!value) return 'Não informado';
    try {
        return String(BigInt(Number(value)));
    } catch (e) {
        return value;
    }
}

client.on('message', async message => {
    const userInput = message.body.trim();
    const match = userInput.match(/^ca\s+(\d+)$/i);

    if (match) {
        const caNumber = match[1];
        console.log(`[BUSCA] Recebida consulta para o CA: ${caNumber}`);
        
        try {
            const sqlQuery = 'SELECT * FROM ca_data WHERE TRIM("NR Registro CA") = $1';
            const { rows } = await pool.query(sqlQuery, [caNumber]);
            
            if (rows.length > 0) {
                const result = rows[0];
                console.log(`[BUSCA] CA ${caNumber} encontrado.`);

                // ===== INÍCIO DA LÓGICA DOS EMOJIS =====
                const validade = formatDate(result["DATA DE VALIDADE"]);
                let situacao = (result["SITUACAO"] || 'Não informada').replace('VLIDO', 'VÁLIDO');
                
                // Adiciona o emoji com base no texto da situação
                if (situacao.toUpperCase() === 'VÁLIDO') {
                    situacao += ' ✅';
                } else if (situacao.toUpperCase() === 'VENCIDO') {
                    situacao += ' ❌';
                }

                const equipamento = (result["EQUIPAMENTO"] || 'Não informado').replace('CULOS', 'ÓCULOS');
                const cnpj = formatLargeNumber(result["CNPJ"]);
                const razaoSocial = result["RAZAO SOCIAL"] || 'Não informada';
                
                // Resposta final sem a linha "Processo"
                const response = `*Certificado de Aprovação Encontrado*
-----------------------------------
*CA:* ${result["NR Registro CA"]}
*Validade:* ${validade}
*Situação:* ${situacao}
*Equipamento:* ${equipamento}
*CNPJ:* ${cnpj}
*Fabricante/Importador:* ${razaoSocial}
-----------------------------------`;
                // ===== FIM DA LÓGICA DOS EMOJIS =====
                
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
        client.sendMessage(message.from, 'Olá! Para consultar um Certificado de Aprovação, envie uma mensagem no formato: CA 12345');
    }
});

client.initialize();