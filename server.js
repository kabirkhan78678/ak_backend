import https from "https";
import http from "http";
import fs from "fs";
import app from "./app.js";
import dotenv from "dotenv";
dotenv.config();

import { initSocket } from "./src/sockets/market.socket.js";

const PORT = process.env.PORT || 8000;

// 🔐 SSL CERT PATHS (CHANGE DOMAIN)
const sslOptions = {
  key: fs.readFileSync("/etc/letsencrypt/live/onetradefx.com/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/onetradefx.com/fullchain.pem"),
};

/* =========================
   HTTPS SERVER
========================= */
const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🔐 HTTPS Server running on https://onetradefx.com:${PORT}`);
});

// 🔥 Attach socket.io to HTTPS
initSocket(httpsServer);

/* =========================
   HTTP → HTTPS REDIRECT
========================= */
const httpServer = http.createServer((req, res) => {
  const host = req.headers["host"];
  res.writeHead(301, {
    Location: `https://${host}${req.url}`,
  });
  res.end();
});

httpServer.listen(8000, () => {
  console.log("➡ HTTP redirect server running on port 80");
});
