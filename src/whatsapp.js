const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const config = require('./config');

const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' });

/**
 * Connects to WhatsApp Web (multi-device) via Baileys, persisting the login
 * session under config.authFolder so a QR scan is only needed once.
 * @param {(sock: import('@whiskeysockets/baileys').WASocket, msg: any) => void} onMessage
 * @param {() => void} [onReady] called once the socket is fully connected
 */
async function connectWhatsApp(onMessage, onReady) {
  fs.mkdirSync(config.authFolder, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(config.authFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\nסרוק את קוד ה-QR הבא עם וואטסאפ בטלפון שלך (מכשירים מקושרים → קישור מכשיר):\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`החיבור לוואטסאפ נסגר (קוד ${statusCode}). מתחבר מחדש: ${shouldReconnect}`);
      if (shouldReconnect) {
        connectWhatsApp(onMessage, onReady);
      } else {
        console.log('התנתקת מהמכשיר. מחק את תיקיית auth/ והרץ שוב כדי להתחבר עם QR חדש.');
      }
    } else if (connection === 'open') {
      console.log('מחובר לוואטסאפ בהצלחה.');
      if (onReady) onReady(sock);
    }
  });

  if (onMessage) {
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        onMessage(sock, msg);
      }
    });
  }

  return sock;
}

/**
 * Extracts plain text from a Baileys message object, covering the common
 * message types (text, captions, replies). Returns null for message types
 * that carry no summarizable text (e.g. bare stickers/media without caption).
 */
function extractMessageText(msg) {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    null
  );
}

module.exports = { connectWhatsApp, extractMessageText };
