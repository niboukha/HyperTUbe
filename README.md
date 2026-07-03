# Hypertube

Hypertube is a full-stack movie discovery and streaming platform inspired by modern VOD experiences. It combines a polished Next.js interface with a Django REST backend that aggregates movie metadata, manages authenticated user activity, resolves playable public-domain sources, prepares HLS streams, and serves subtitles.

The project was built as a complete web application: users can browse curated rows, search and filter a movie library, open rich movie detail pages, save titles to a watchlist, resume viewing from history, leave reviews, choose a preferred language, and watch available films through an in-browser HLS player.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Useful Commands](#useful-commands)
- [API Overview](#api-overview)
- [Key Implementation Details](#key-implementation-details)
- [Testing and Quality](#testing-and-quality)

## Features

### Movie Discovery

- Home page with hero content, continue-watching, upcoming movies, and genre-based rows.
- Library page with search, genre filters, rating filters, year range filters, sorting, infinite scrolling, and fallback suggestions.
- Movie detail pages with posters, backdrops, overview, runtime, ratings, trailer support, collection rows, and availability badges.
- Metadata aggregation from TMDB and public-domain providers such as Archive.org.
- Content quality and safety filtering on imported catalog results.

### Streaming Experience

- Watch page with an HTML5 video player powered by `hls.js`.
- Streaming resolver that maps frontend movie references to backend movie records.
- Torrent-backed download pipeline using `libtorrent`.
- FFmpeg-based HLS segmentation for browser playback.
- Stream status tracking: idle, downloading, processing, ready, and error.
- Resume support through watch history progress updates.
- Media cleanup task for stale downloads.

### Subtitles

- Subtitle discovery and preparation pipeline.
- Embedded and external subtitle support.
- Subtitle file serving through backend endpoints.
- Language-aware subtitle preference based on the user-selected app language.
- OpenSubtitles integration hooks for external subtitles.

### Users and Authentication

- Email/password registration and login.
- JWT authentication with cookie support.
- Logout, password reset, password confirmation, and password change flows.
- Social authentication support for Google, GitHub, and 42 Intra via Django Allauth.
- Profile page, public user profile page, avatar handling, and language preference updates.

### Personalization

- Watchlist management with add/remove toggling.
- Watch history grouped by recency.
- Continue-watching row based on user progress.
- Per-user movie progress persistence.
- Multilingual UI support for English, French, and Spanish.

### Community

- Movie comments and reviews.
- Star ratings on comments.
- Comment editing and deletion by owners.
- Like/unlike support for comments.

## Architecture

Hypertube is organized as a Dockerized full-stack application.

```text
Browser
  |
  | Next.js App Router UI
  v
Frontend container :3000
  |
  | REST requests / cookies / language headers
  v
Django REST API :8000
  |
  |---------------- PostgreSQL
  |---------------- Redis
  |---------------- Celery worker / Celery beat
  |---------------- FFmpeg + libtorrent media pipeline
  |
  v
Shared media volume for torrents, HLS segments, and subtitles
```

The frontend focuses on the user experience, routing, UI state, localization, and video playback. The backend owns authentication, provider adapters, movie state, comments, streaming resolution, subtitle preparation, asynchronous jobs, and media file serving.

## Technology Stack

### Frontend

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS
- next-intl for localization
- hls.js for adaptive stream playback
- Framer Motion for interface animation
- Radix UI / shadcn-style primitives
- Lucide, Heroicons, and Hugeicons for icons

### Backend

- Python 3.12
- Django 5
- Django REST Framework
- Simple JWT and dj-rest-auth
- Django Allauth for social login
- PostgreSQL
- Redis
- Celery and Celery Beat
- libtorrent
- FFmpeg / FFprobe
- django-cors-headers
- django-redis

### Infrastructure

- Docker and Docker Compose
- Adminer for database inspection
- Shared Docker volume for generated media

## Project Structure

```text
.
|-- backend/
|   |-- apps/
|   |   |-- comments/      # Reviews, ratings, and likes
|   |   |-- movies/        # Catalog APIs, provider adapters, watchlist, history
|   |   |-- streaming/     # Torrent resolution, HLS streaming, subtitles
|   |   `-- users/         # Auth, profile, language, OAuth providers
|   |-- config/            # Django settings, URLs, ASGI/WSGI, Celery config
|   |-- Dockerfile
|   `-- manage.py
|-- frontend/
|   |-- app/               # Next.js routes and layouts
|   |-- components/        # UI, sections, player/detail/profile components
|   |-- hooks/             # Client-side data and interaction hooks
|   |-- lib/               # API helpers, auth, movie utilities, fonts
|   |-- messages/          # en/fr/es translation dictionaries
|   |-- public/            # Static assets and bundled subtitle examples
|   `-- package.json
|-- docker-compose.yml
|-- Makefile
|-- requirements.txt
`-- README.md
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ for local frontend development
- Python 3.12+ for local backend development
- A TMDB API bearer token
- FFmpeg if running the backend outside Docker

### Recommended: Docker Compose

Create a `.env` file at the repository root:

```env
POSTGRES_DB=hypertube
POSTGRES_USER=hypertube
POSTGRES_PASSWORD=hypertube
POSTGRES_HOST=db
POSTGRES_PORT=5432

TMDB_TOKEN=your_tmdb_bearer_token

NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_INTERNAL_URL=http://backend:8000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
INTRA_CLIENT_ID=
INTRA_CLIENT_SECRET=
INTRA_CALLBACK=

OPENSUBTITLES_API_KEY=
OPENSUBTITLES_USERNAME=
OPENSUBTITLES_PASSWORD=
OPENSUBTITLES_USER_AGENT=Hypertube v1
OPENSUBTITLES_TOKEN=

STREAMING_CLEANUP_AFTER_DAYS=30
```

Start the full stack:

```bash
docker compose up --build
```

Or use the Makefile shortcut:

```bash
make
```

The default make target starts the full stack in detached mode after checking that `.env` exists. Use `make build` when you want to rebuild images first, `make status` to see running services and local URLs, and `make help` to view every shortcut.

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Django admin: http://localhost:8000/admin/
- Adminer: http://localhost:8080
- PostgreSQL: available inside Docker as `db:5432`
- Redis: available inside Docker as `redis:6379`

The backend container runs migrations, configures OAuth applications from environment variables, and starts the Django development server.

### Manual Development

Run infrastructure services first, or provide your own PostgreSQL and Redis instances.

Backend:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd backend
python manage.py migrate
python manage.py setup_oauth
python manage.py runserver 0.0.0.0:8000
```

Celery worker:

```bash
cd backend
celery -A config worker --pool=gevent --concurrency=100 --loglevel=info
```

Celery beat:

```bash
cd backend
celery -A config beat --loglevel=info
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB` | PostgreSQL database name |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_HOST` | PostgreSQL host, usually `db` in Docker |
| `POSTGRES_PORT` | PostgreSQL port, usually `5432` |
| `TMDB_TOKEN` | TMDB bearer token for movie metadata |
| `NEXT_PUBLIC_API_URL` | Public browser-facing backend URL |
| `BACKEND_INTERNAL_URL` | Internal backend URL used by the frontend container |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials |
| `INTRA_CLIENT_ID` / `INTRA_CLIENT_SECRET` | 42 Intra OAuth credentials |
| `INTRA_CALLBACK` | 42 Intra OAuth callback URL |
| `OPENSUBTITLES_*` | Optional OpenSubtitles integration credentials |
| `TORRENT_DOWNLOAD_ROOT` | Optional override for torrent download directory |
| `HLS_ROOT` | Optional override for generated HLS directory |
| `STREAMING_CLEANUP_AFTER_DAYS` | Age threshold for cleaning unused media |

Do not commit real secrets or production credentials.

## Useful Commands

```bash
make                  # Start the Docker Compose stack in detached mode
make build            # Rebuild images and start the stack
make up               # Start existing containers in detached mode
make stop             # Stop containers without removing them
make down             # Stop and remove containers
make restart          # Restart the stack
make ps               # Show running services
make status           # Show running services and local URLs
make urls             # Print local service URLs
make check-env        # Verify that .env exists
make help             # Show all available make shortcuts
```

Logs:

```bash
make logs             # Follow logs for all services
make logs-backend     # Follow backend logs
make logs-frontend    # Follow frontend logs
make logs-celery      # Follow Celery worker and beat logs
make logs-db          # Follow PostgreSQL logs
```

Shells:

```bash
make backend-shell    # Open a shell in the backend container
make frontend-shell   # Open a shell in the frontend container
make db-shell         # Open psql in the PostgreSQL container
make redis-shell      # Open redis-cli in the Redis container
make django-shell     # Open Django's interactive shell
```

Backend:

```bash
make migrate          # Run Django migrations inside the backend container
make makemigrations   # Create Django migrations inside the backend container
make createsuperuser  # Create a Django superuser
make test             # Run Django tests inside the backend container
make manage CMD='check'
make manage CMD='showmigrations'
```

Frontend:

```bash
make install-frontend # Install frontend dependencies inside the container
make lint             # Run frontend linting inside the frontend container
make build-frontend   # Build the Next.js app inside the frontend container
make npm CMD='run lint'
```

Maintenance:

```bash
make clean            # Stop services and remove stack volumes/images
make fclean           # Clean compose resources and prune Docker
make re               # Recreate everything from scratch
```

Manual frontend commands:

```bash
cd frontend
npm run dev
npm run build
npm run start
npm run lint
```

Manual backend commands:

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py test
```

## API Overview

### Movies

- `GET /movies/` - list curated movies by type or genre.
- `GET /movies/runtime/` - batch runtime lookup.
- `GET /movies/<movie_id>/` - movie detail.
- `GET /movies/<movie_id>/trailer/` - movie trailer.
- `GET /movies/collection/<collection_id>/` - related collection movies.
- `GET /search/` - movie search and filtered discovery.
- `GET /proxy-image/` - backend image proxy.

### Watchlist and History

- `GET /watchlist/` - current user's saved movies.
- `POST /watchlist/toggle/` - add or remove a movie from the watchlist.
- `GET /history/` - current user's watch history.
- `DELETE /history/<movie_id>/` - remove a history entry.
- `POST /history/<movie_id>/progress/` - update playback progress.

### Streaming

- `GET /streaming/resolve/<movie_ref>/` - resolve a frontend movie reference to a streamable backend movie.
- `GET /streaming/<movie_id>/stream/` - get stream status and stream URL.
- `GET /streaming/<movie_id>/hls/<filename>` - serve generated HLS files.
- `GET /streaming/<movie_id>/subtitles/` - list subtitles.
- `GET /streaming/<movie_id>/subtitles/<subtitle_id>/file/` - serve subtitle file.

### Auth and Users

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/password-reset`
- `POST /auth/password-confirm`
- `POST /auth/settings/change-password`
- `GET /auth/profile`
- `GET /users/`
- `GET /users/<id>/`
- `POST /users/profile/avatar`
- `POST /users/profile/language`
- `POST /oauth/token`
- `POST /oauth/token/refresh`

### Comments

- `GET /comments/?movie_id=<id>` - comments for a movie.
- `POST /comments/` - create a comment or review.
- `GET /comments/<id>/` - get a single comment.
- `PATCH /comments/<id>/` - edit a comment.
- `DELETE /comments/<id>/` - delete a comment.
- `POST /comments/<id>/like` - toggle like.

## Key Implementation Details

- **Provider abstraction:** movie data is normalized from multiple sources so the frontend can render TMDB and public-domain Archive.org results consistently.
- **Language-aware requests:** the frontend API helper appends the selected language and sends `Accept-Language`, allowing localized metadata and UI updates.
- **Streaming pipeline:** when a stream is requested, the backend creates or reuses a movie/torrent record, downloads with libtorrent, probes media with FFprobe, and uses FFmpeg to generate HLS output.
- **Stream-while-downloading:** the download task can begin segmentation once enough sequential video data is available, reducing wait time before playback.
- **Subtitle pipeline:** subtitles are represented as first-class records with source, status, language, labels, file references, and uniqueness constraints for ready subtitles per movie/language.
- **User state model:** watchlist, watch status, progress, and last watched timestamps are stored per user and movie.
- **Async maintenance:** Celery handles long-running streaming/subtitle work and Celery Beat schedules cleanup of unused downloaded media.

## Testing and Quality

The repository includes Django test modules for backend apps and an ESLint setup for the frontend.

```bash
cd backend
python manage.py test

cd frontend
npm run lint
```

For streaming-related changes, also verify that FFmpeg is installed, Redis and Celery are running, a stream can transition to `ready`, and the generated HLS playlist loads correctly in the watch page.
