FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
 
RUN pip install --no-cache-dir -r requirements.txt

COPY ./backend/ .

EXPOSE 8000

CMD ["sh", "-c", "python3 manage.py runserver "]
