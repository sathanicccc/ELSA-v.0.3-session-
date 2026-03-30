const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require('qrcode');

module.exports = async (req, res) => {
    const { number } = req.query;
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/elsa-' + Date.now());

    try {
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: "silent" }),
            browser: ["ELSA-V.0.3", "Safari", "3.0.0"]
        });

        // 1. QR Code Logic
        sock.ev.on('connection.update', async (update) => {
            const { qr } = update;
            if (qr) {
                const qrImage = await QRCode.toDataURL(qr);
                // QR image frontend-ilekku ayakkunnu
                return res.status(200).json({ qr: qrImage });
            }
        });

        // 2. Pairing Code Logic (If number exists)
        if (number) {
            await delay(3500); 
            const cleanNumber = number.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(cleanNumber);
            return res.status(200).json({ code: code });
        }

    } catch (err) {
        return res.status(500).json({ error: "API Error" });
    }
};
