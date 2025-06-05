console.log("🎵 Vinyl Spotify Player loaded");

const loginBtn = document.getElementById("login-btn");
const playlistList = document.getElementById("playlist-list");
const vinyl = document.getElementById("vinyl");
const albumArt = document.getElementById("album-art");

let spinning = false;
let accessToken = null;

// 🌀 Start/stop vinyl spin
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

// 📝 Mock playlists and click handlers
function mockPlaylistUI() {
  const playlists = ["Lo-Fi Beats", "Chill Vibes", "Retro Vinyl", "Jazz Classics"];
  playlistList.innerHTML = "";

  playlists.forEach(name => {
    const div = document.createElement("div");
    div.textContent = name;
    div.style.cursor = "pointer";
    div.style.padding = "0.5rem";
    div.style.borderBottom = "1px solid #444";

    div.addEventListener("click", () => {
      alert(`Pretend we're playing "${name}"`);
      updateAlbumArt(name);
      startSpinning();
    });

    playlistList.appendChild(div);
  });
}

// 🎨 Simulate changing album art (random image)
function updateAlbumArt(playlistName) {
  const fakeArt = {
    "Lo-Fi Beats": "https://via.placeholder.com/100x100.png?text=Lo-Fi",
    "Chill Vibes": "https://via.placeholder.com/100x100.png?text=Chill",
    "Retro Vinyl": "https://via.placeholder.com/100x100.png?text=Retro",
    "Jazz Classics": "https://via.placeholder.com/100x100.png?text=Jazz"
  };

  albumArt.src = fakeArt[playlistName] || "https://via.placeholder.com/100x100.png?text=Album";
}

loginBtn.addEventListener("click", async () => {
  const authCode = localStorage.getItem("spotify_auth_code");
  if (!authCode) {
    initiateSpotifyLogin(); // from auth.js
  } else {
    const token = await exchangeToken(authCode);
    accessToken = token;
    console.log("✅ Spotify access token:", token);
    mockPlaylistUI(); // or real fetch coming next
    startSpinning();
  }
});

const resetBtn = document.getElementById("reset-auth");

resetBtn.addEventListener("click", () => {
  localStorage.removeItem("spotify_auth_code");
  localStorage.removeItem("verifier");
  alert("Auth state cleared. Reload the page and login again.");
});
