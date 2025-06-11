const clientId = document.body.dataset.spotifyClientId;
const redirectUri = "http://127.0.0.1:5500/html/token.html";

const scopes = [
  "streaming",
  "playlist-read-private",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state"
];

function generateCodeVerifier() {
  const array = new Uint8Array(64); // 64 bytes → 86 base64url chars
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}


async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return base64;
}

async function initiateSpotifyLogin() {
  const verifier = generateCodeVerifier();
  localStorage.setItem("verifier", verifier); // must be stored before redirect
  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge
  });

  window.open(`https://accounts.spotify.com/authorize?${params.toString()}`, "_blank");
}

async function exchangeToken(authCode) {
  const verifier = localStorage.getItem("verifier");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code: authCode,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const data = await response.json();
  console.log("🔁 Spotify token response:", data); // add this line

  return data.access_token;
}
