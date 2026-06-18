import time

import requests
# from .tasks import ACTIVE_TORRENTS, SESSION
import libtorrent as lt

SESSION = lt.session({
    'listen_interfaces': '0.0.0.0:6881',
    'enable_dht': True,
    'enable_lsd': True,
    'enable_upnp': True,
    'enable_natpmp': True,
    # 'allow_multiple_connections_per_ip': True,
})

ACTIVE_TORRENTS = {}


def select_and_prioritize_video_download(handle, info):
    """
    Prioritize the best video file + LAST PIECES for moov atom.
    """
    VIDEO_FORMATS = [('.mp4', 100), ('.mkv', 90), ('.webm', 80), 
                     ('.avi', 70), ('.divx', 60), ('.mov', 50)]
    
    files = info.files()
    best_file = None
    best_score = -1
    
    for i in range(files.num_files()):
        path    = files.file_path(i).lower()
        score   = next((s for ext, s in VIDEO_FORMATS if path.endswith(ext)), -1)
        
        if score > -1:
            print(f'[TORRENT FILE] {i} → {path} | score={score}')
            if score > best_score:
                best_score  = score
                best_file   = (i, path)
    
    if not best_file:
        print('[Torrent] No valid video file found ❌')
        return None
    
    idx, path = best_file
    
    # Set file priority
    priorities = [0] * files.num_files()
    priorities[idx] = 7
    handle.prioritize_files(priorities)
    
    try:
        torrent_info = handle.get_torrent_info()
        piece_length = torrent_info.piece_length()
    except:
        print('[Torrent] Selected ✅ (piece-level priority unavailable)')
        return path
    
    # Calculate pieces
    file_offset = files.file_offset(idx)
    file_size   = files.file_size(idx)
    
    first_piece = file_offset // piece_length
    last_piece  = (file_offset + file_size - 1) // piece_length
    
    # ✅ Prioritize moov (last 10% of file)
    moov_start_piece = int(first_piece + (last_piece - first_piece) * 0.80)  # Larger region
    
    for piece in range(moov_start_piece, last_piece + 1):
        handle.piece_priority(piece, 6)
    
    handle.piece_priority(first_piece, 7)
    
    print(f'[Torrent] Selected ✅ {path} ({file_size / (1024**2):.1f}MB)')
    print(f'[Torrent] Prioritized: Start={first_piece} | Moov={moov_start_piece}→{last_piece}')
    
    return path

def _create_session():
    """Create fresh session for each download"""
    session = lt.session({
        'listen_interfaces': '0.0.0.0:6881',
        'enable_dht':    True,
        'enable_lsd':    True,
        'enable_upnp':   True,
        'enable_natpmp': True,
        # 'allow_multiple_connections_per_ip': True,
    })
    session.add_dht_router('router.bittorrent.com',  6881)
    session.add_dht_router('router.utorrent.com',    6881)
    session.add_dht_router('dht.transmissionbt.com', 6881)
    session.add_dht_router('dht.libtorrent.org',     25401)
    return session

def download_torrent(movie_dir, torrent):
    """
    Download torrent using libtorrent
    """
    try:
        # ─────────────────────────────────────────
        # Start torrent download
        # ─────────────────────────────────────────
        torrent.status = 'downloading'
        torrent.save()
        session = _create_session()
        torrent_url = torrent.movie.torrent_url

        print(f'[{torrent.movie.title}] Starting torrent download...')
        print(f'[{torrent.movie.title}] Torrent URL: {torrent_url}')
        
        params = {
            'save_path': movie_dir,
            'storage_mode': lt.storage_mode_t.storage_mode_sparse
        }

        # Add torrent — magnet or .torrent file
        if torrent_url.startswith('magnet:'):
            handle = lt.add_magnet_uri(session, torrent_url, params)

            print(f'[{torrent.movie.title}] Waiting for metadata...')
            
            start = time.time()
            while not handle.has_metadata():
                if time.time() - start > 60:
                    raise Exception('Metadata timeout')
                time.sleep(1)
            info = handle.get_torrent_info()
        else:
            response = requests.get(torrent_url, timeout=30)
            response.raise_for_status()
            info   = lt.torrent_info(lt.bdecode(response.content))
            handle = session.add_torrent({**params, 'ti': info})
        handle.set_sequential_download(True)
        select_and_prioritize_video_download(handle, info)
        ACTIVE_TORRENTS[torrent.movie.id] = {
            'handle': handle,
            'session': session,
        }

        return handle
    except Exception as e:
        print(f'Error downloading torrent: {e}')
        torrent.status = 'error'
        torrent.save()
        return None
    



import shutil
import os
from datetime import timedelta
from django.utils import timezone
from celery import shared_task
import logging

# Make sure to import your Torrent model!
from apps.streaming.models import Torrent
from django.conf import settings

logger = logging.getLogger(__name__)

DOWNLOAD_DIR = settings.TORRENT_DOWNLOAD_ROOT
HLS_DIR      = settings.HLS_ROOT

@shared_task
def cleanup_unused_movies():
    """
    TESTING MODE: Deletes movies that haven't been watched in 5 MINUTES.
    """
    # Calculate the exact time 5 minutes ago
    five_minutes_ago = timezone.now() - timedelta(minutes=5)
    
    # Find all torrents older than 5 minutes
    stale_torrents = Torrent.objects.filter(
        last_accessed_at__lt=five_minutes_ago
    ).exclude(status='idle')

    count = 0
    for torrent in stale_torrents:
        movie_id = str(torrent.movie.id)
        
        movie_dir = os.path.join(DOWNLOAD_DIR, movie_id)
        hls_dir   = os.path.join(HLS_DIR, movie_id)

        if os.path.exists(movie_dir):
            shutil.rmtree(movie_dir)
            logger.info('[Cleanup] Deleted heavy video files | movie_id=%s', movie_id)
            
        if os.path.exists(hls_dir):
            shutil.rmtree(hls_dir)
            logger.info('[Cleanup] Deleted HLS segments | movie_id=%s', movie_id)

        # Reset the database
        torrent.status = 'idle'
        torrent.hls_path = None
        torrent.video_path = None
        torrent.save(update_fields=['status', 'hls_path', 'video_path'])
        
        count += 1

    logger.info('[Cleanup] Routine complete. Deleted %d stale movies.', count)