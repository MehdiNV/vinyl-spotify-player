const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "../index.html");
let html = fs.readFileSync(htmlPath, "utf-8");

const clientId = process.env.SPOTIFY_CLIENT_ID;

if (!clientId) {
  console.error("❌ SPOTIFY_CLIENT_ID not defined in environment.");
  process.exit(1);
}

html = html.replace(
  /data-spotify-client-id="[^"]*"/,
  `data-spotify-client-id="${clientId}"`
);

fs.writeFileSync(htmlPath, html, "utf-8");

console.log("✅ Injected SPOTIFY_CLIENT_ID into index.html");
