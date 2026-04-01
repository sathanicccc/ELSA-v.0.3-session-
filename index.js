const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.static(path.join(__dirname, 'public')));

// Koyeb Health Check ഹോം പേജിൽ തന്നെ റെസ്പോണ്ട് ചെയ്യാൻ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: "Number is required!" });

    const sessionDir = './temp_session_' + number;
    if (await fs.exists(sessionDir)) await fs.remove(sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    try {
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            logger: pino({ level: "silent" }),
            browser: ["Chrome (Linux)", "", ""] 
        });

        if (number) {
            await delay(5000); // കണക്ഷൻ സ്റ്റേബിൾ ആകാൻ സമയം നൽകുന്നു
            try {
                const code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ''));
                if (!res.headersSent) res.json({ code: code });
            } catch (pairErr) {
                if (!res.headersSent) res.status(500).json({ error: "Pairing Failed. Try Again." });
            }
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                await delay(5000);
                const sessionId = Buffer.from(JSON.stringify(sock.authState.creds)).toString('base64');
                await sock.sendMessage(sock.user.id, { text: `ELSA-V.0.3-SESSION-ID;${sessionId}` });
                console.log("Session ID Sent! ✅");
                await delay(2000);
                await fs.remove(sessionDir);
            }
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (!shouldReconnect) await fs.remove(sessionDir);
            }
        });

    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
    }
});

// 🛠️ Koyeb സെർവർ ഓഫ് ആകാതിരിക്കാൻ Keep-Alive സെറ്റ് ചെയ്യുന്നു
const server = app.listen(PORT, () => {
    console.log(`ELSA SESSION HUB RUNNING ON PORT ${PORT}`);
});

server.keepAliveTimeout = 60000;
server.headersTimeout = 65000;
