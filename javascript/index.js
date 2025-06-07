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
// -----------------------------------------------------------------------------


// Vinyl animation-based functions ---------------------------------------------

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

const loginBtn = document.getElementById("loginButton");
const powerOnButton = document.getElementById("powerButton");
const resetBtn = document.getElementById("resetButton");

loginBtn.addEventListener("click", async () => {
  initiateSpotifyLogin(); // Initite the authorisation flow via Auth.JS code

  loginBtn.disabled = true;
  loginBtn.style.background = "#555";
  loginBtn.style.cursor = "not-allowed";

  loginBtn.classList.remove("is-success");
  loginBtn.classList.add("is-disabled");

  setTimeout(() => {
    loginBtn.textContent = "Logged In";
    enableVinylPowerOnButton();
  }, 1000);
});

function enableVinylPowerOnButton() {
  powerOnButton.disabled = false;
  powerOnButton.classList.remove("is-disabled");
  powerOnButton.classList.add("is-error");
  powerOnButton.style.cursor = "pointer";
}

powerOnButton.addEventListener("click", async () => {
  powerButton.classList.toggle("powerButtonPressed");
  const isPoweredOn = powerButton.classList.contains("powerButtonPressed");

  if (isPoweredOn) {
    const authCode = localStorage.getItem("spotify_auth_code");
    const token = await exchangeToken(authCode);
    accessToken = token;

    if (window.waitForToken) {
      console.log("🔁 Access token ready — initializing Spotify Player...");
      initSpotifyPlayer();
    }

    await waitForDevice;
  }
  else {
    console.log("⚪ Power OFF");
  }
});

resetBtn.addEventListener("click", () => {
  clearSpotifyAuth();
  alert("Auth state cleared. Reload the page and login again.");
});
// -----------------------------------------------------------------------------
