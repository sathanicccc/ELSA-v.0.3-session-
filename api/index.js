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

// 'public' ഫോൾഡറിലെ ഫയലുകൾ (HTML, CSS) ലോഡ് ചെയ്യാൻ
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api', async (req, res) => {
    const { number } = req.query;
    
    // Koyeb-ൽ സെഷൻ പെർമനന്റ് ആയി സേവ് ചെയ്യാൻ സാധിക്കും
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

        // 1. QR Code Logic
        if (!number) {
            const qrTimeout = setTimeout(() => {
                if (!res.headersSent) res.status(504).json({ error: "QR Timeout" });
            }, 20000);

            sock.ev.on('connection.update', async (update) => {
                const { qr } = update;
                if (qr) {
                    clearTimeout(qrTimeout);
                    const qrImage = await QRCode.toDataURL(qr);
                    if (!res.headersSent) res.json({ qr: qrImage });
                }
            });
        } 
        // 2. Pairing Code Logic
        else {
            await delay(5000);
            const cleanNumber = number.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(cleanNumber);
            if (!res.headersSent) res.json({ code: code });
        }

        sock.ev.on('creds.update', saveCreds);

    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
    }
});

// സർവർ സ്റ്റാർട്ട് ചെയ്യുന്നു
app.listen(PORT, () => {
    console.log(`ELSA-V.0.3 is running on port ${PORT}`);
});
