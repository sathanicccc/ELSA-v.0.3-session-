const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} = require("@whiskeysockets/baileys");
const pino = require("pino");

module.exports = async (req, res) => {
    const { number } = req.query;

    // 1. നമ്പർ ഉണ്ടോ എന്ന് ചെക്ക് ചെയ്യുന്നു
    if (!number) {
        return res.status(400).json({ error: "Phone number is required! Example: ?number=917025xxxxxx" });
    }

    // 2. Vercel-ൽ ഫയലുകൾ താൽക്കാലികമായി സേവ് ചെയ്യാൻ /tmp ഉപയോഗിക്കുന്നു
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/elsa-session-' + Date.now());

    try {
        // ഏറ്റവും പുതിയ ബെയ്‌ലീസ് വേർഷൻ എടുക്കുന്നു
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

        // 3. കണക്ഷൻ ഒന്ന് സെറ്റ് ആകാൻ 3 സെക്കൻഡ് വെയിറ്റ് ചെയ്യുന്നു (Important!)
        await delay(3000);

        if (!sock.authState.creds.registered) {
            const cleanNumber = number.replace(/[^0-9]/g, '');
            
            // 4. വാട്സാപ്പിനോട് പെയറിംഗ് കോഡ് ചോദിക്കുന്നു
            const code = await sock.requestPairingCode(cleanNumber);
            
            // 5. കോഡ് ഫ്രണ്ട്‌എൻഡിലേക്ക് അയക്കുന്നു
            return res.status(200).json({ code: code });
        } else {
            return res.status(400).json({ error: "This number is already registered!" });
        }

    } catch (err) {
        console.error("ELSA API ERROR:", err);
        return res.status(500).json({ 
            error: "Connection Timeout or API Error. Please try again.",
            details: err.message 
        });
    }
};

