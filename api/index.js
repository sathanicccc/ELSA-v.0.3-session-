const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");

export default async function handler(req, res) {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: "Number required" });

    // Temporary session storage for Vercel (Note: Vercel is Read-only, so this is for one-time pairing)
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/session');

    try {
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: "silent" }),
            printQRInTerminal: false
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
            const cleanNumber = number.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(cleanNumber);
            return res.status(200).json({ code: code });
        }
    } catch (err) {
        return res.status(500).json({ error: "Pairing Failed" });
    }
}
