const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");

module.exports = async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: "Number required! Example: ?number=917025xxxxxx" });

    // Vercel read-only aayaathukondu /tmp folder upayogikkunnu
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/elsa-session-' + Date.now());

    try {
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["ELSA-V.0.3", "Chrome", "1.0.0"]
        });

        // Registration check and Code request
        if (!sock.authState.creds.registered) {
            await delay(2000); // 2 second wait for stability
            const cleanNumber = number.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(cleanNumber);
            
            return res.status(200).json({ code: code });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Connection error. Please refresh and try again." });
    }
};
