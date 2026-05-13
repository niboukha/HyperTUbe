const movieId = 1;
const video = document.getElementById('video');

video.controls = true;

let currentHls = null;
let streamReady = false;

// ======================================================
// Sleep helper
// ======================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================================================
// Wait until backend says stream/file is ready
// ======================================================
async function waitForStream(movieId) {
  while (!streamReady) {
    try {
      console.log('Checking stream status...');

      const res = await fetch(
        `http://localhost:8000/api/movies/${movieId}/stream/`
      );

      if (!res.ok) {
        console.error('Backend error:', res.status);
        await sleep(2000);
        continue;
      }

      const data = await res.json();
      console.log('Stream status:', data);

      if (data.status === 'ready' && data.movie_path) {
        streamReady = true;
        return data.movie_path;
      }

    } catch (err) {
      console.error('Fetch error:', err);
    }

    await sleep(2000);
  }
}

// ======================================================
// Clean HLS instance safely
// ======================================================
function destroyHls() {
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }
}

// ======================================================
// Play MP4
// ======================================================
function playMp4(url) {
  console.log('Playing MP4:', url);

  destroyHls();

  if (video.src !== url) {
    video.src = url;
  }

  video.load();
}

// ======================================================
// Play HLS
// ======================================================
function playHls(url) {
  console.log('Playing HLS:', url);

  destroyHls();

  // ==================================================
  // Safari native HLS
  // ==================================================
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.load();
    return;
  }

  // ==================================================
  // hls.js
  // ==================================================
  if (window.Hls && Hls.isSupported()) {

    currentHls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 120,
      maxBufferLength: 60,
    });

    currentHls.loadSource(url);
    currentHls.attachMedia(video);

    currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('HLS ready');

      // IMPORTANT:
      // DO NOT autoplay → avoids DOMException
    });

    currentHls.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS error:', data);

      if (data.fatal) {
        switch (data.type) {

          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log('Network error → retry');
            currentHls.startLoad();
            break;

          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('Media error → recover');
            currentHls.recoverMediaError();
            break;

          default:
            currentHls.destroy();
            break;
        }
      }
    });

    return;
  }

  console.error('HLS not supported');
}

// ======================================================
// Main flow
// ======================================================
async function start() {

  try {

    const moviePath = await waitForStream(movieId);

    console.log('READY:', moviePath);

    const fullUrl = `http://localhost:8000${moviePath}`;

    // ==================================================
    // MP4
    // ==================================================
    if (moviePath.endsWith('.mp4')) {
      playMp4(fullUrl);
      return;
    }

    // ==================================================
    // HLS
    // ==================================================
    if (
      moviePath.endsWith('.m3u8') ||
      moviePath.endsWith('.u3m8')
    ) {
      playHls(fullUrl);
      return;
    }

    console.error('Unsupported format:', moviePath);

  } catch (err) {
    console.error('Start error:', err);
  }
}

// ======================================================
// START
// ======================================================
start();