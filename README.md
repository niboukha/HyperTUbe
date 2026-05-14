Project Setup

This repository contains a Django backend and a Next.js frontend. The following instructions describe how to set up local development environments for both parts.

## Prerequisites

- Git
- Python 3.10+ and virtual environment tool (`venv` or similar)
- Node.js 16+ and a package manager (`npm`, `yarn`, or `pnpm`)
- (Optional) Docker & Docker Compose if you prefer containers

---

## Backend (Django)

Path: [backend](backend)

1. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Create a `.env` file in `backend/` (example):

```env
# backend/.env
TMDB_KEY="tmdb key"
TMDB_TOKEN="tmdb token"
# Add any other keys your `backend/config/settings.py` expects
```

4. Run migrations and create a superuser:

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
```

5. Start the development server:

```bash
python manage.py runserver 0.0.0.0:8000
```

The backend will be available at http://localhost:8000

If you use Docker Compose, you can also run `docker-compose up` from the repository root (ensure the compose file matches env config).

---

## Frontend (Next.js)

Path: [frontend](frontend)

1. Install node dependencies (from repository root or `frontend`):

```bash
cd frontend
npm install
# or `yarn` or `pnpm install`
```

2. Create an environment file for Next.js. Example: `frontend/.env.local`

```env
# frontend/.env.local
NEXT_PUBLIC_TMDB_KEY="tmdb key"
# Add any NEXT_PUBLIC keys required by the app (API keys, feature flags)
```

3. Run the frontend in development:

```bash
npm run dev
# or `yarn dev` / `pnpm dev`
```

Open http://localhost:3000 in your browser.

---

## Notes & Tips

- The backend in this repo uses SQLite by default (`backend/db.sqlite3`) for local development. If you switch to another database, update `DATABASE_URL` and install the appropriate DB driver.
- Keep secrets out of the repository — never commit real API keys or `SECRET_KEY` values.
- If CORS issues appear, ensure the backend `ALLOWED_HOSTS`/CORS settings allow `localhost:3000`.
- To run both services together, start the backend first (port 8000), then the frontend (port 3000).

---

## Where to look

- Backend Django app: [backend/apps/movies](backend/apps/movies)
- Frontend app entry: [frontend/app](frontend/app)

If you'd like, I can also add a sample `.env` templates file or a simplified docker-compose setup for running both services together.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

