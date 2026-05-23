FROM python:3.12-slim

WORKDIR /app

# Install system dependencies first (better layer caching)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Single pip install with cache disabled for smaller image
RUN pip install --no-cache-dir -r requirements.txt

COPY ./backend/ .

EXPOSE 8000

CMD ["sh", "-c", "python3 manage.py runserver "]