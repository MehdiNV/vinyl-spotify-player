let spinning = false;
let accessToken = null;

// Spotify Player (Web SKD) initilisation logic --------------------------------
let player;
let deviceReady;
let currentUserId = null;
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
      playButton.textContent = "▶ Play";
      isPlaying = false;
    } else {
      startSpinning();
      playButton.textContent = "⏸ Pause";
      isPlaying = true;
    }

    // Album art update
    const currentTrack = track_window.current_track;
    if (currentTrack?.album?.images?.[0]?.url) {
      albumArt.src = currentTrack.album.images[0].url;
    }
  });

  player.connect();
}
// -----------------------------------------------------------------------------


// Search playlists functionality ---------------------------------------------
const spotifyPanelPlaylists = document.querySelector(".spotifyPanelPlaylists");
const usersPlaylists = document.querySelector(".spotifyPanelPlaylists ul");
let allPlaylists = [];

async function fetchCurrentUserId() {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    console.error("Failed to get user profile.");
    return null;
  }

  const data = await res.json();
  currentUserId = data.id;
  return data.id;
}

async function fetchAllPlaylists() {
  const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    console.error("Failed to fetch playlists.");
    return [];
  }

  const data = await res.json();
  const filteredPlaylists = data.items.filter(p => p.owner.id === currentUserId && p.public);

  console.log("Returning filtered list of playlists...", filteredPlaylists);
  return filteredPlaylists
}

function renderPlaylists(playlists) {
  usersPlaylists.innerHTML = ""; // Clear existing
  if (playlists.length === 0) {
    console.log("No playlists found, returning nothing...");
    usersPlaylists.innerHTML = "<li>No public playlists found.</li>";
    return;
  }

  console.log("Adding existing playlists to li...");
  playlists.forEach(playlist => {
    const li = document.createElement("li");
    li.textContent = playlist.name;
    li.style.cursor = "pointer";

    // Highlight selected playlist
    li.addEventListener("click", () => {
      // Clear selection from all other items
      document.querySelectorAll(".spotifyPanelPlaylists ul li").forEach(el => {
        el.classList.remove("selected-playlist");
      });

      // Mark this one as selected
      li.classList.add("selected-playlist");
      selectedPlaylistUri = playlist.uri;
      console.log(`🎯 Selected playlist: ${playlist.name}`);
    });

    usersPlaylists.appendChild(li);
  });
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
    await fetchCurrentUserId(); // Get the ID of this current user
    const usersPlaylists = await fetchAllPlaylists();
    renderPlaylists(usersPlaylists);
    spotifyPanelPlaylists.style.display = "block";
  }
  else {
    console.log("⚪ Power OFF");
    spotifyPanelPlaylists.style.display = "none";
    usersPlaylists.innerHTML = "";
  }
});

resetBtn.addEventListener("click", () => {
  clearSpotifyAuth();
  alert("Auth state cleared. Reload the page and login again.");
});
// -----------------------------------------------------------------------------

// Playback controls logic -----------------------------------------------------
const shuffleToggle = document.getElementById("shuffleToggle");

shuffleToggle.addEventListener("change", async (e) => {
  const shuffleState = e.target.checked;

  try {
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    console.log(`🔀 Shuffle ${shuffleState ? "enabled" : "disabled"}`);
  } catch (err) {
    console.error("❌ Failed to update shuffle state:", err);
  }
});

const repeatToggle = document.getElementById("repeatToggle");

repeatToggle.addEventListener("change", async (e) => {
  const repeatState = e.target.checked ? "context" : "off"; // or "track" if you prefer

  try {
    await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${repeatState}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    console.log(`🔁 Repeat set to: ${repeatState}`);
  } catch (err) {
    console.error("❌ Failed to update repeat state:", err);
  }
});

const playButton = document.getElementById("playButton");
let isPlaying = false;
let selectedPlaylistUri = null;

playButton.addEventListener("click", async () => {
  if (!window.playerDeviceId) {
    alert("Spotify Player is not ready yet.");
    return;
  }

  try {
    if (isPlaying) {
      // Pause
      await fetch("https://api.spotify.com/v1/me/player/pause", {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      playButton.textContent = "▶ Play";
      isPlaying = false;
      console.log("⏸ Paused playback");
    } else {
      if (!selectedPlaylistUri) {
        alert("Please select a playlist first.");
        return;
      }

      // Play selected playlist
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.playerDeviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          context_uri: selectedPlaylistUri,
          offset: { position: 0 }
        })
      });

      playButton.textContent = "⏸ Pause";
      isPlaying = true;
      console.log(`▶ Now playing playlist: ${selectedPlaylistUri}`);
    }
  } catch (err) {
    console.error("❌ Playback toggle failed:", err);
  }
});

// -----------------------------------------------------------------------------
