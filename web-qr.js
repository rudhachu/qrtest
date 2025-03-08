const { exec } = require("child_process");
const { upload } = require("./mega");
const express = require("express");
const router = express.Router();
const pino = require("pino");
const { toBuffer } = require("qrcode");
const path = require("path");
const fs = require("fs-extra");
const { Boom } = require("@hapi/boom");


// Clear the existing authentication directory
if (fs.existsSync("./temp")) {
  fs.emptyDirSync(path.join(__dirname, "/temp"));
}

// Main route to handle QR code generation and session management
router.get("/", async (req, res) => {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    delay,
    DisconnectReason,
    makeInMemoryStore,
  } = require("@whiskeysockets/baileys");

  const store = makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" }),
  });

  async function Getqr() {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(__dirname, "/temp")
    );

    try {
      const session = makeWASocket({
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),
        auth: state,
      });

      session.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Send QR code
        if (qr && !res.headersSent) {
          try {
            const qrBuffer = await toBuffer(qr);
            res.setHeader("Content-Type", "image/png");
            res.end(qrBuffer);
          } catch (error) {
            console.error("Error generating QR code:", error);
            res.status(500).send("Failed to generate QR code.");
            return;
          }
        }

        // When connection is established
        if (connection === "open") {
          console.log("Connection established!");

          // Generate unique session ID
          function randomMegaId(length = 6, numberLength = 4) {
            const characters =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let result = "";
            for (let i = 0; i < length; i++) {
              result += characters.charAt(
                Math.floor(Math.random() * characters.length)
              );
            }
            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
            return `${result}${number}`;
          }

          const authPath = "./temp/";
          const megaUrl = await upload(
            fs.createReadStream(path.join(authPath, "creds.json")),
            `${randomMegaId()}.json`
          );

          const sessionId = megaUrl.replace("https://mega.nz/file/", "");
          console.log(`
==================== SESSION ID ==========================                   
SESSION-ID ==> ${sessionId}
------------------- SESSION CLOSED -----------------------
          `);

          // Send session ID to user
          const user = session.user.id;
          const msg = await session.sendMessage(user, { text: `Rudhra~${sessionId}` });
          await session.sendMessage(user, {
              document: fs.readFileSync('./temp/creds.json'),
              fileName: 'creds.json',
              mimetype: 'application/json',
              caption: "Upload Thie File To `RUDHRA BOT SESSION` creds.json Folder"
          });
          const qrMsg = `\n*ᴅᴇᴀʀ ᴜsᴇʀ ᴛʜɪs ɪs ʏᴏᴜʀ sᴇssɪᴏɴ ɪᴅ*\n\n◕ ⚠️ *ᴘʟᴇᴀsᴇ ᴅᴏ ɴᴏᴛ sʜᴀʀᴇ ᴛʜɪs ᴄᴏᴅᴇ ᴡɪᴛʜ ᴀɴʏᴏɴᴇ ᴀs ɪᴛ ᴄᴏɴᴛᴀɪɴs ʀᴇǫᴜɪʀᴇᴅ ᴅᴀᴛᴀ ᴛᴏ ɢᴇᴛ ʏᴏᴜʀ ᴄᴏɴᴛᴀᴄᴛ ᴅᴇᴛᴀɪʟs ᴀɴᴅ ᴀᴄᴄᴇss ʏᴏᴜʀ ᴡʜᴀᴛsᴀᴘᴘ*`;
          await session.sendMessage(user, { text: qrMsg }, { quoted: msg });

          await delay(1000);
          try {
            fs.emptyDirSync(path.join(__dirname, "/temp"));
          } catch (err) {
            console.error("Error clearing auth directory:", err);
          }
        }

        // Reconnection logic
        if (connection === "close") {
          const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
          if (reason === DisconnectReason.restartRequired) {
            console.log("Restart Required, Restarting...");
            Getqr().catch(console.error);
          } else if (reason === DisconnectReason.connectionLost) {
            console.log("Connection Lost from Server!");
          } else {
            console.log("Connection closed with bot. Please run again.");
            console.log(reason);
            exec("pm2 restart rudhra");
            process.exit(0);
          }
        }
      });

      session.ev.on("creds.update", saveCreds);
    } catch (err) {
      console.error("Error in QR:", err);
      exec("pm2 restart rudhra");
      fs.emptyDirSync(path.join(__dirname, "/temp"));
    }
  }

  Getqr().catch((err) => {
    console.error("Error initializing QR:", err);
    fs.emptyDirSync(path.join(__dirname, "/temp"));
    exec("pm2 restart rudhra");
  });
});

module.exports = router;
