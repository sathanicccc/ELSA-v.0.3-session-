const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} = require("@whiskeysockets/baileys");
const pino = require("pino");

/**
 * ELSA-V.0.3 Backend Pairing Logic
 * Optimized for Vercel Serverless environment
 */
module.exports = async (req, res) => {
    const { number } = req.query;

    // 1. Check if number is provided
    if (!number) {
        return res.status(400).json({ error: "Number required! Example: ?number=917025xxxxxx" });
    }

    // 2. Setup Temporary Authentication (Vercel is read-only)
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/elsa-session-' + Date.now());

    try {
        const { version } = await fetchLatestBaileysVersion();
        
        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["ELSA-V.0.3", "Chrome", "1.0.0"]
        });

        // 3. Stabilization Delay (Necessary for Serverless speed)
        await delay(3000);

        if (!sock.authState.creds.registered) {
            const cleanNumber = number.replace(/[^0-9]/g, '');
            
            // 4. Request the Pairing Code from WhatsApp
            const code = await sock.requestPairingCode(cleanNumber);
            
            // 5. Return JSON response to Frontend
            return res.status(200).json({ code: code });
        } else {
            return res.status(200).json({ error: "Device already linked." });
        }

    } catch (err) {
        console.error("API ERROR:", err);
        return res.status(500).json({ error: "API Timeout. Please refresh and try again." });
    }
};
