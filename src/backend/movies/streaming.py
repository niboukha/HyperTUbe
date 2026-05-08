import os
import subprocess


def file_iterator(filepath, chunk_size=8192, start=0, end=None):
    """Read file in chunks for range requests"""
    try:
        file_size = os.path.getsize(filepath)
    except OSError:
        return

    if end is None:
        end = file_size - 1

    total_bytes = end - start + 1
    bytes_read = 0

    with open(filepath, 'rb') as f:
        f.seek(start)
        while bytes_read < total_bytes:
            chunk_bytes = min(chunk_size, total_bytes - bytes_read)
            chunk = f.read(chunk_bytes)
            if not chunk:
                break
            bytes_read += len(chunk)
            yield chunk


def get_range_from_request(request, file_size):
    """Parse HTTP Range header"""
    range_header = request.META.get('HTTP_RANGE', '').strip()

    if not range_header or not range_header.startswith('bytes='):
        return None, None

    try:
        ranges = range_header.split('=')[1]
        start_str, end_str = ranges.split('-')

        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1

        if start < 0 or end < start or start >= file_size:
            return None, None

        end = min(end, file_size - 1)
        return start, end

    except (ValueError, IndexError):
        return None, None