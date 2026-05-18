const video = document.getElementById("video");
const statusEl = document.getElementById("status");
let started = false;
let hls = null;
const movieId = 2;

// 1. User clicks native play button → triggers "play" event
video.addEventListener("play", async () => {
    console.log("Play event triggered");
    if (started) return;
    started = true;
    console.log("Starting stream process for movie ID:", movieId);
    try {
        statusEl.textContent = "Starting download...";

        // STEP 1: start backend process (ONCE)
        const response = await fetch(`http://localhost:8001/api/movies/${movieId}/watch/`, {
            method: "POST",
        });
        const data = await response.json();
        console.log("Backend response:", data);

        // STEP 2: wait until ready
        const hlsUrl = await waitForStream(movieId);
        console.log("Stream ready at URL:", hlsUrl);

        // STEP 3: load HLS
        loadHLS(hlsUrl);

    } catch (err) {
        console.error(err);
        statusEl.textContent = "Error starting video";
    }
});

// 2. Poll backend until ready
async function waitForStream(movieId) {
    while (true) {
        const res = await fetch(
            `http://localhost:8001/api/movies/${movieId}/status/`
        );
        const data = await res.json();
        if (data.status === "ready" && data.hls_path) {
            statusEl.textContent = "Ready";
            return `http://localhost/media/hls/${movieId}/output.m3u8`;
        }
        statusEl.textContent = "Downloading / Processing...";
        await sleep(2000);
    }
}

// 3. Load HLS safely
function loadHLS(url) {
    if (hls) hls.destroy();
    if (Hls.isSupported()) {
        hls = new Hls({
            maxBufferLength: 30,
            backBufferLength: 10,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play();
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
            console.error(data);
            statusEl.textContent = "Stream error";
        });
    } else {
        video.src = url;
    }
}

// helper
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}