const video = document.getElementById("video");
const statusEl = document.getElementById("status");
const movieId = 1;
let hls = null;
let ws = null;
let seeking = false;

video.addEventListener("play", () => {
    statusEl.textContent = "Connecting...";
    connectWS(movieId);
}, { once: true });

function connectWS(movieId) {
    if (ws) ws.close();

    ws = new WebSocket(`ws://localhost:8000/ws/movies/${movieId}/status/`);

    ws.onopen = () => {
        console.log('[WS] Connected ✅');
        statusEl.textContent = "Starting...";
        ws.send(JSON.stringify({ action: 'watch' }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[WS] Received:', data);

        if (data.status === 'ready') {
            statusEl.textContent = "Playing";
            if (!seeking) {
                loadHLS(`http://localhost/media/hls/${movieId}/output.m3u8`);
            } else {
                // ✅ Reload HLS from new position
                reloadHLS(`http://localhost/media/hls/${movieId}/output.m3u8`);
                seeking = false;
            }

        } else if (data.status === 'processing') {
            statusEl.textContent = "Buffering...";

        } else if (data.status === 'downloading') {
            statusEl.textContent = "Downloading...";

        } else if (data.status === 'error') {
            statusEl.textContent = "Error";
            ws.close(1000, 'error');
        }
    };

    ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        statusEl.textContent = "Connection error";
    };

    ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code);
    };
}

// ✅ When user seeks — tell backend to re-segment
video.addEventListener("seeked", () => {
    const position = Math.floor(video.currentTime);
    console.log(`[Seek] User seeked to ${position}s`);
    seeking = true;

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: 'seek',
            position: position
        }));
    }
});

function loadHLS(url) {
    if (hls) hls.destroy();

    hls = new Hls({
        maxBufferLength: 30,
        backBufferLength: 10,
        liveSyncDurationCount: 3,
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[HLS] Playing ✅');
        statusEl.textContent = "Playing";
        video.play();
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('[HLS] Error:', data);
        if (data.fatal) {
            statusEl.textContent = "Stream error";
        }
    });
}

function reloadHLS(url) {
    // ✅ Destroy old HLS and load from new position
    if (hls) {
        hls.destroy();
        hls = null;
    }
    loadHLS(url);
}