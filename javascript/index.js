const playlistList = document.getElementById("playlist-list");
const vinyl = document.getElementById("vinyl");
const albumArt = document.getElementById("album-art");

let spinning = false;
let accessToken = null;
let deviceReady = null;
const waitForDevice = new Promise(resolve => deviceReady = resolve);

let player = null;

player.addListener('ready', ({ device_id }) => {
  console.log('✅ Player is ready with device ID', device_id);
  window.playerDeviceId = device_id;
  deviceReady(); // resolve promise
});


function setupSpotifyPlayer() {
  window.onSpotifyWebPlaybackSDKReady = () => {
    player = new Spotify.Player({
      name: 'Vinyl Web Player',
      getOAuthToken: cb => { cb(accessToken); },
      volume: 0.8
    });

    player.addListener('ready', ({ device_id }) => {
      console.log('✅ Player is ready with device ID', device_id);
      window.playerDeviceId = device_id;
    });

    player.addListener('not_ready', ({ device_id }) => {
      console.warn('⚠️ Player went offline', device_id);
    });

    player.addListener('initialization_error', e => console.error('Init error', e));
    player.addListener('authentication_error', e => console.error('Auth error', e));
    player.addListener('account_error', e => console.error('Account error', e));

    player.connect();
  };
}


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

async function loadUserPlaylists() {
  const res = await fetch("https://api.spotify.com/v1/me/playlists", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const data = await res.json();
  console.log("🎵 Your Playlists:", data);

  playlistList.innerHTML = ""; // Clear existing

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
}

function updateAlbumArtFromPlaylist(playlist) {
  const img = playlist.images?.[0]?.url;
  albumArt.src = img || "https://via.placeholder.com/100x100.png?text=No+Art";
}

function playPlaylist(uri) {
  if (!window.playerDeviceId) {
    alert("Player is still loading. Please try again in a moment.");
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


// Behaviour for the authentication-based buttons ------------------------------
const loginBtn = document.getElementById("login-btn");
const resetBtn = document.getElementById("reset-auth");

loginBtn.addEventListener("click", async () => {
  const authCode = localStorage.getItem("spotify_auth_code");
  if (!authCode) {
    initiateSpotifyLogin(); // from auth.js
  } else {
    const token = await exchangeToken(authCode);
    accessToken = token;
    setupSpotifyPlayer();
    await waitForDevice;
    await loadUserPlaylists();
  }
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem("spotify_auth_code");
  localStorage.removeItem("verifier");
  alert("Auth state cleared. Reload the page and login again.");
});
// -----------------------------------------------------------------------------
