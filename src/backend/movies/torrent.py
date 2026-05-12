import time

import requests
import libtorrent as lt

def _prioritize_best_video_file(handle, info):
    """
    Prioritize the best video file inside the torrent.

    Priority order:
    .mp4 > .mkv > .webm > .avi > .divx

    All other files are ignored.
    """

    files = info.files()

    best_index = None
    best_score = -1

    # Extension priority scores
    EXTENSION_SCORES = {
        '.mp4': 100,
        '.mkv': 90,
        '.webm': 80,
        '.avi': 70,
        '.divx': 60,
        '.mov': 50,
        '.mpeg': 40,
        '.mpg': 40,
    }

    # Find best file
    for i in range(files.num_files()):
        path = files.file_path(i).lower()

        score = -1

        for ext, ext_score in EXTENSION_SCORES.items():
            if path.endswith(ext):
                score = ext_score
                break

        print(f'[TORRENT FILE] {i} -> {path} | score={score}')

        if score > best_score:
            best_score = score
            best_index = i

    # No valid video found
    if best_index is None:
        print('[Torrent] No valid video file found ❌')
        return None

    # Set all files to ignored
    priorities = [0] * files.num_files()

    # Highest priority for best file
    priorities[best_index] = 7

    # Apply priorities
    handle.prioritize_files(priorities)

    selected_file = files.file_path(best_index)

    print(f'[Torrent] Selected file ✅ {selected_file}')
    print(f'[Torrent] Applied priorities ✅')

    return selected_file

def _wait_for_peers(handle, movie, timeout=60):
    print(f'[{movie.title}] Waiting for peers...')
    start = time.time()
    while True:
        s = handle.status()
        print(f'[{movie.title}] peers: {s.num_peers} | seeds: {s.num_seeds}')
        if s.num_peers > 0:
            print(f'[{movie.title}] Peers found ✅')
            return
        if time.time() - start > timeout:
            raise Exception('No peers found after 60s')
        time.sleep(3)

def download_torrent(torrent_url, movie_dir, movie):
    """
    Download torrent using libtorrent
    """
    try:
        # ─────────────────────────────────────────
        # Start torrent download
        # ─────────────────────────────────────────
        movie.status = 'downloading'
        movie.save()

        session = lt.session({'listen_interfaces': '0.0.0.0:6881', 'enable_dht': True ,
                              'enable_lsd': True,      # ← replaces start_lsd()
                            'enable_upnp': True,     # ← replaces start_upnp()
                            'enable_natpmp': True,})
        session.add_dht_router('router.bittorrent.com', 6881)
        session.add_dht_router('router.utorrent.com', 6881)
        session.add_dht_router('dht.transmissionbt.com', 6881)
        session.add_dht_router('dht.aiobt.com', 6881)
        session.add_dht_router('dht.libtorrent.org', 25401)  # ← add this
        session.start_dht()
        session.start_lsd()
        session.start_upnp()

        params = {
            'save_path': movie_dir,
            'storage_mode': lt.storage_mode_t.storage_mode_sparse
        }

        # Add torrent — magnet or .torrent file
        if torrent_url.startswith('magnet:'):
            handle = lt.add_magnet_uri(session, torrent_url, params)
            print(f'[{movie.title}] Waiting for metadata...')
            start = time.time()
            while not handle.has_metadata():
                if time.time() - start > 60:
                    raise Exception('Metadata timeout')
                time.sleep(1)
            info = handle.get_torrent_info()
        else:
            response = requests.get(torrent_url, timeout=10)
            response.raise_for_status()
            info   = lt.torrent_info(lt.bdecode(response.content))
            handle = session.add_torrent({**params, 'ti': info})

        # Sequential download for streaming
        handle.set_sequential_download(True)
        handle.force_reannounce()
        handle.force_dht_announce()

        _prioritize_best_video_file(handle, info)

        total_pieces = info.num_pieces()
        print(f'[{movie.title}] Total pieces: {total_pieces}')
    
        # ─────────────────────────────────────────
        # Wait for peers
        # ─────────────────────────────────────────
        _wait_for_peers(handle, movie)

        return handle
    except Exception as e:
        print(f'Error downloading torrent: {e}')
        movie.status = 'error'
        movie.save()
        return None