const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "index.html");
let html = fs.readFileSync(htmlPath, "utf-8");

html = html.replace(
  /data-spotify-client-id="[^"]*"/,
  `data-spotify-client-id="${process.env.SPOTIFY_CLIENT_ID}"`
);

fs.writeFileSync(htmlPath, html, "utf-8");
