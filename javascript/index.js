const playlistList = document.getElementById("playlist-list");
const vinyl = document.getElementById("vinyl");
const albumArt = document.getElementById("album-art");

let spinning = false;
let accessToken = null;

// Spotify Player (Web SKD) initilisation logic --------------------------------
let player;
let deviceReady;
const waitForDevice = new Promise(resolve => deviceReady = resolve);

window.onSpotifyWebPlaybackSDKReady = () => {
  if (!accessToken) {
    console.warn("🟡 SDK loaded before token ready. Waiting...");
    // Wait until accessToken exists, then call initSpotifyPlayer
    window.waitForToken = true;
    return;
  }
  else {
    console.log("Access token is now present, moving to initilise Spotify player...");
    initSpotifyPlayer();
  }
};

function initSpotifyPlayer() {
  player = new Spotify.Player({
    name: 'Vinyl Web Player',
    getOAuthToken: cb => cb(accessToken),
    volume: 0.8
  });

  player.addListener('ready', ({ device_id }) => {
    console.log('✅ Spotify Player Ready, Device ID:', device_id);
    window.playerDeviceId = device_id;
    deviceReady();
  });

  player.addListener('initialization_error', e => console.error('Init error', e));
  player.addListener('authentication_error', e => console.error('Auth error', e));
  player.addListener('account_error', e => console.error('Account error', e));
  player.addListener('not_ready', ({ device_id }) => {
    console.warn('⚠️ Spotify Player went offline:', device_id);
  });

  player.connect();
}

// Load in the user's Playlist data after they've authenticated...
async function loadUserPlaylists() {
  try {
    const res = await fetch("https://api.spotify.com/v1/me/playlists", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await res.json();
    console.log("🎵 Your Playlists:", data);

    playlistList.innerHTML = ""; // Clear existing items

    data.items.forEach(playlist => {
      const div = document.createElement("div");
      div.textContent = playlist.name;
      div.style.cursor = "pointer";
      div.style.padding = "0.5rem";
      div.style.borderBottom = "1px solid #444";

      div.addEventListener("click", () => {
        console.log("🎧 Selected:", playlist.name);
        updateAlbumArtFromPlaylist(playlist);
        playPlaylist(playlist.uri);
      });

      playlistList.appendChild(div);
    });

  } catch (err) {
    console.error("❌ Failed to load playlists:", err);
  }
}

function updateAlbumArtFromPlaylist(playlist) {
  const img = playlist.images?.[0]?.url;
  albumArt.src = img || "https://via.placeholder.com/100x100.png?text=No+Art";
}

function playPlaylist(uri) {
  if (!window.playerDeviceId) {
    alert("Spotify Player not ready yet. Try again in a moment.");
    return;
  }

  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.playerDeviceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      context_uri: uri,
      offset: { position: 0 }
    })
  }).then(() => {
    console.log('▶️ Playback started');
    startSpinning();
  }).catch(err => {
    console.error("Playback failed:", err);
  });
}

// -----------------------------------------------------------------------------


// Vinyl animation-based functions ---------------------------------------------
function startSpinning() {
  if (!spinning) {
    vinyl.classList.add("spinning");
    spinning = true;
  }
}

function stopSpinning() {
  vinyl.classList.remove("spinning");
  spinning = false;
}
// -----------------------------------------------------------------------------

// Behaviour for the authentication-based buttons ------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  // Detect if we've just authenticated, and hence should start loading Spotify data...
  const authCode = localStorage.getItem("spotify_auth_code");

  if (authCode && !accessToken) {
    console.log("🔐 Found stored auth code. Attempting login...");

    try {
      const token = await exchangeToken(authCode);
      accessToken = token;

      if (window.waitForToken) {
        console.log("🔁 Access token ready — initializing Spotify Player...");
        initSpotifyPlayer();
      }

      await waitForDevice;
      await loadUserPlaylists();

    } catch (err) {
      console.error("❌ Auth failed on page load:", err);

      // ✅ Wipe invalid auth state
      clearSpotifyAuth();
      alert("Your Spotify session expired. Please log in again.");
    }
  }
});

function clearSpotifyAuth() {
  localStorage.removeItem("spotify_auth_code");
  localStorage.removeItem("verifier");
}

const loginBtn = document.getElementById("login-btn");
const resetBtn = document.getElementById("reset-auth");

loginBtn.addEventListener("click", async () => {
  const authCode = localStorage.getItem("spotify_auth_code");
  if (!authCode) {
    initiateSpotifyLogin(); // from auth.js
  } else {
    const token = await exchangeToken(authCode);
    accessToken = token;

    if (window.waitForToken) {
      console.log("🔁 Access token ready — initializing Spotify Player...");
      initSpotifyPlayer();
    }

    await waitForDevice;
    loadUserPlaylists();
  }
});

resetBtn.addEventListener("click", () => {
  clearSpotifyAuth();
  alert("Auth state cleared. Reload the page and login again.");
});
// -----------------------------------------------------------------------------
