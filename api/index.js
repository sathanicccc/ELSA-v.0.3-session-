const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} = require("@whiskeysockets/baileys");
const pino = require("pino");

/**
 * ELSA-V.0.3 Session Generator Engine
 * Optimized for Vercel Serverless Functions
 */
module.exports = async (req, res) => {
    const { number } = req.query;

    // 1. Validating Phone Number
    if (!number) {
        return res.status(400).json({ 
            error: "Phone number is required! Format: ?number=917025xxxxxx" 
        });
    }

    // 2. Setting up Temporary Auth State (Vercel is Read-Only)
    // We use a unique timestamp to avoid session conflicts
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/elsa-session-' + Date.now());

    try {
        // Fetching the latest version of Baileys for stability
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            // Realistic browser string to avoid WhatsApp ban
            browser: ["ELSA-V.0.3", "Chrome", "1.0.0"]
        });

        // 3. Stabilization Delay (CRITICAL for Serverless)
        // Giving the socket 3 seconds to initialize its internal state
        await delay(3000);

        if (!sock.authState.creds.registered) {
            const cleanNumber = number.replace(/[^0-9]/g, '');
            
            // 4. Requesting the 8-digit Pairing Code
            const code = await sock.requestPairingCode(cleanNumber);
            
            // 5. Success Response to Frontend
            return res.status(200).json({ code: code });
        } else {
            // Case where the generated session is already active
            return res.status(200).json({ error: "Device already registered." });
        }

    } catch (err) {
        console.error("ELSA_API_CRITICAL_ERROR:", err);
        return res.status(500).json({ 
            error: "Service Timeout. Please refresh and try again.",
            details: err.message 
        });
    }
};
