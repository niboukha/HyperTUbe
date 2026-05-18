FROM python:3.12-slim

WORKDIR /app


COPY requirements.txt .

RUN pip install -r requirements.txt

COPY ./src .


RUN apt-get update && apt-get install -y ffmpeg

RUN  pip install -r requirements.txt

EXPOSE 8001

CMD ["sh", "-c", "python3 manage.py runserver 0.0.0.0:8001"]