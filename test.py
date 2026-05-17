import requests

SEARCH_URL = "https://archive.org/advancedsearch.php"
METADATA_URL = "https://archive.org/metadata/{}"


def search_movie(title):
    params = {
        "q": f'title:("{title}") AND mediatype:(movies)',
        "fl[]": ["identifier", "title"],
        "rows": 5,
        "output": "json",
    }

    response = requests.get(SEARCH_URL, params=params)
    data = response.json()

    docs = data["response"]["docs"]

    if not docs:
        print("No movie found")
        return None

    print("\nMovies found:\n")

    for i, doc in enumerate(docs):
        print(f"{i+1}. {doc.get('title')} ({doc.get('identifier')})")

    return docs[0]["identifier"]


def show_files(identifier):
    url = METADATA_URL.format(identifier)

    response = requests.get(url)
    data = response.json()

    files = data.get("files", [])

    print(f"\nFiles for: {identifier}\n")

    video_exts = (".mp4", ".mkv", ".avi")
    subtitle_exts = (".srt", ".vtt", ".ass", ".ssa")

    videos = []
    subtitles = []

    for file in files:
        name = file.get("name", "")

        if name.lower().endswith(video_exts):
            videos.append(name)

        if name.lower().endswith(subtitle_exts):
            subtitles.append(name)

    print("=== VIDEO FILES ===")
    for v in videos:
        print(v)

    print("\n=== SUBTITLE FILES ===")
    for s in subtitles:
        print(s)


if __name__ == "__main__":
    movie_name = input("Movie name: ")

    identifier = search_movie(movie_name)

    if identifier:
        show_files(identifier)