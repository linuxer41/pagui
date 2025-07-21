// index.js
import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    Browsers,
    DisconnectReason
  } from 'baileys';
  import P from 'pino';
  import QRCode from 'qrcode'
  import NodeCache from 'node-cache';
  const groupCache = new NodeCache({stdTTL: 5 * 60, useClones: false})
  
  async function startBot() {
    // 1. Guardar credenciales en carpeta local
    const { state, saveCreds } = await useMultiFileAuthState('auth');
  
    // 2. Obtener la versión más reciente de WA
    // const { version } = await fetchLatestBaileysVersion();
  
    // 3. Crear el socket
    const sock = makeWASocket({
    //   version,
      auth: state,
      logger: P({ level: 'silent' }),
      browser: Browsers.macOS("Desktop"),
      syncFullHistory: true,
      markOnlineOnConnect: false,
      cachedGroupMetadata: async (jid) => groupCache.get(jid)
    });
  
    // 4. Persistir credenciales cuando cambien
    sock.ev.on('creds.update', saveCreds);
  
    // 5. Manejar eventos de conexión
    sock.ev.on('connection.update', async({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log(await QRCode.toString(qr, {type:'terminal',small:true}))
        }
      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect.error)?.output?.statusCode !==
          DisconnectReason.loggedOut;
        console.log('Conexión cerrada. Reconectando:', shouldReconnect);
        if (shouldReconnect) startBot();
      } else if (connection === 'open') {
        console.log('✅ Conectado a WhatsApp!');
      }
    });
  
    // 6. Escuchar mensajes entrantes
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const msg of messages) {
        if (!msg.key.fromMe && msg.message?.conversation && type === 'notify') {
            const sender = msg.key.remoteJid;
            const text = msg.message.conversation.toLowerCase();
    
            console.log(`📩 ${sender}: ${text}`);
    
            if (text === 'hola') {
            await sock.sendMessage(sender, { text: '¡Hola! ¿En qué te puedo ayudar?' });
            }
    
            if (text === '!time') {
                const time = new Date().toLocaleTimeString();
                await sock.sendMessage(sender, { text: `🕒 Son las ${time}` });
                await sock.sendMessage('1203631234567890@g.us', { text: `🕒 Son las ${time}` });
            }
    
            if (text === '!help') {
            await sock.sendMessage(sender, {
                text: `Comandos disponibles:\n- hola\n- !time\n- !help`
                });
            }
        }
      }
    });

    sock.ev.on('messaging-history.set', ({
        chats: newChats,
        contacts: newContacts,
        messages: newMessages,
        syncType
    }) => {
       console.log({newChats,newContacts,newMessages,syncType})
    })
  }
  
  startBot();