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

  player.addListener('player_state_changed', (state) => {
    if (!state) return;

    const { paused, track_window } = state;

    if (paused) {
      stopSpinning();
    } else {
      startSpinning();
    }

    // Update album art from current track (not just playlist art)
    const currentTrack = track_window.current_track;
    if (currentTrack?.album?.images?.[0]?.url) {
      albumArt.src = currentTrack.album.images[0].url;
    }
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
  // Clear any pre-existing authentication data if it exists
  clearSpotifyAuth();
});

function clearSpotifyAuth() {
  localStorage.removeItem("spotify_auth_code");
  localStorage.removeItem("verifier");
}

const loginBtn = document.getElementById("login-btn");
const turnOnVinylPlayerBtn = document.getElementById("turnOnVinyl-btn");
const resetBtn = document.getElementById("reset-auth");

loginBtn.addEventListener("click", async () => {
  initiateSpotifyLogin(); // from auth.js

  loginBtn.disabled = true;
  loginBtn.style.background = "#555";
  loginBtn.style.cursor = "not-allowed";

  setTimeout(() => {
    loginBtn.textContent = "Logged In";
    enableVinylPowerOnButton();
  }, 1000);
});

function enableVinylPowerOnButton() {
  turnOnVinylPlayerBtn.disabled = false;
  turnOnVinylPlayerBtn.style.background = "#e74c3c"; // Restore normal style
  turnOnVinylPlayerBtn.style.cursor = "pointer";
}

turnOnVinylPlayerBtn.addEventListener("click", async () => {
  const authCode = localStorage.getItem("spotify_auth_code");
  const token = await exchangeToken(authCode);
  accessToken = token;

  if (window.waitForToken) {
    console.log("🔁 Access token ready — initializing Spotify Player...");
    initSpotifyPlayer();
  }

  await waitForDevice;
  loadUserPlaylists();
});

resetBtn.addEventListener("click", () => {
  clearSpotifyAuth();
  alert("Auth state cleared. Reload the page and login again.");
});
// -----------------------------------------------------------------------------
