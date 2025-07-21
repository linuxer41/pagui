const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client();

// Mostrar QR en consola
client.on('qr', qr => {
    console.log('Escanea el código QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Confirmar que está listo
client.on('ready', () => {
    console.log('✅ WhatsApp Web está listo!');
});

// Escuchar mensajes
client.on('message', msg => {
    if (msg.body === '!ping') {
        msg.reply('pong');
    }
});

// Iniciar sesión
client.initialize();