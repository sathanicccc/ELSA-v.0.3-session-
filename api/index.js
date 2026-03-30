const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");

module.exports = async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: "Phone number required!" });

    const { state, saveCreds } = await useMultiFileAuthState('/tmp/elsa-' + Date.now());

    try {
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: "silent" }),
            browser: ["ELSA-V.0.3", "Chrome", "3.0.0"]
        });

        await delay(3000); 
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(cleanNumber);
        
        return res.status(200).json({ code: code });
    } catch (err) {
        return res.status(500).json({ error: "WhatsApp Server Busy. Try again!" });
    }
};
