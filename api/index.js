const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require('qrcode');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api', async (req, res) => {
    const { number } = req.query;
    const { state, saveCreds } = await useMultiFileAuthState('./session-data');

    try {
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            logger: pino({ level: "silent" }),
            browser: ["ELSA-V.0.3", "Chrome", "1.0.0"]
        });

        if (!number) {
            sock.ev.on('connection.update', async (update) => {
                const { qr } = update;
                if (qr && !res.headersSent) {
                    const qrImage = await QRCode.toDataURL(qr);
                    res.json({ qr: qrImage });
                }
            });
        } else {
            await delay(5000);
            const cleanNumber = number.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(cleanNumber);
            if (!res.headersSent) res.json({ code: code });
        }
        sock.ev.on('creds.update', saveCreds);
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: "Internal Error" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
