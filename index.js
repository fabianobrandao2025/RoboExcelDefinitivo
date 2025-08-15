const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const xlsx = require('xlsx');
const path = require('path');

console.log('[BOT] Preparando a base de dados em segundo plano...');

// Carrega o arquivo Excel com o nome corrigido (.xlsx)
console.log('[DADOS] Iniciando carregamento do arquivo Excel caepi.xlsx...');
const excelFile = path.join(__dirname, 'caepi.xlsx'); // <--- NOME DO ARQUIVO CORRIGIDO AQUI
const workbook = xlsx.readFile(excelFile, { cellDates: true });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);
console.log('[DADOS] Base de dados carregada com sucesso!');

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

function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        return "Data inválida";
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

client.on('message', message => {
    const query = message.body.trim();

    // Verifica se a mensagem é um número de CA
    if (/^\d+$/.test(query)) {
        console.log(`[BUSCA] Recebida consulta para o CA: ${query}`);
        const result = data.find(row => String(row.CA) === query);

        if (result) {
            console.log(`[BUSCA] CA ${query} encontrado.`);
            const validade = result.VALIDADE ? formatDate(result.VALIDADE) : "Não informada";
            
            const response = `*EQUIPAMENTO ENCONTRADO*
*CA:* ${result.CA}
*VALIDADE:* ${validade}
*EQUIPAMENTO:* ${result.EQUIPAMENTO || 'Não informado'}
*FABRICANTE:* ${result.FABRICANTE || 'Não informado'}
*SITUAÇÃO:* A