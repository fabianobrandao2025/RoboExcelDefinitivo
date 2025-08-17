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

client.on('message', async message => {
    const userInput = message.body.trim();