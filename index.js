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

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: "Number is required!" });

    // 🛠️ പഴയ സെഷൻ ഡാറ്റ ക്ലിയർ ചെയ്യുന്നു (Error ഒഴിവാക്കാൻ)
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
            // 🌐 Browser name Chrome എന്ന് മാറ്റിയത് വഴി Notification പ്രശ്നം പരിഹരിക്കപ്പെടും
            browser: ["Chrome (Linux)", "", ""] 
        });

        // 🚀 Pairing Code Request
        if (number) {
            await delay(3000); // കണക്ഷൻ സ്റ്റേബിൾ ആകാൻ 3 സെക്കൻഡ് വെയിറ്റ് ചെയ്യുന്നു
            try {
                const code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ''));
                if (!res.headersSent) res.json({ code: code });
            } catch (pairErr) {
                if (!res.headersSent) res.status(500).json({ error: "Pairing Request Failed" });
            }
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                await delay(5000);
                const sessionId = Buffer.from(JSON.stringify(sock.authState.creds)).toString('base64');
                const sessionMsg = `*ELSA-V.0.3-SESSION-ID;*${sessionId}`;
                
                // നിങ്ങളുടെ വാട്സാപ്പ് നമ്പരിലേക്ക് (You) ഐഡി അയക്കുന്നു
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

app.listen(PORT, () => console.log(`ELSA HUB RUNNING ON PORT ${PORT}`));
