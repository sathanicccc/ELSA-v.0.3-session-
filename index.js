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
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 8000;

// 1. ഫ്രണ്ട് എൻഡ് ഫയലുകൾ ലോഡ് ചെയ്യാൻ (Empty Screen ഒഴിവാക്കാൻ)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. പെയറിംഗ് കോഡ് API ലോജിക്
app.get('/api', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: "Number is required!" });

    // പഴയ താൽക്കാലിക സെഷനുകൾ ക്ലിയർ ചെയ്യുന്നു
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
            browser: ["Chrome (Linux)", "", ""] // നോട്ടിഫിക്കേഷൻ വരാൻ ഇത് സഹായിക്കും
        });

        if (number) {
            await delay(5000); // സ്റ്റേബിൾ കണക്ഷനായി 5 സെക്കൻഡ് വെയിറ്റ് ചെയ്യുന്നു
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
                const sessionMsg = `*ELSA-V.0.3-SESSION-ID;*${sessionId}`;
                
                // നിങ്ങളുടെ നമ്പരിലേക്ക് സെഷൻ ഐഡി അയക്കുന്നു
                await sock.sendMessage(sock.user.id, { text: sessionMsg });
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

// 3. Koyeb സെർവർ ഓഫ് ആകാതിരിക്കാനുള്ള പക്കാ ലോജിക് (Listen Event)
const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`⚡ ELSA SESSION HUB IS LIVE ON PORT ${PORT}`);
});

// ഹെൽത്ത് ചെക്ക് ടൈംഔട്ട് ഒഴിവാക്കാൻ
server.keepAliveTimeout = 60000;
server.headersTimeout = 65000;
