FROM python:3.12-alpine

WORKDIR /code

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY src/ .

RUN mkdir -p /files/assets
RUN mkdir -p /files/import
RUN mkdir -p /files/export
RUN mkdir -p /files/database
RUN mkdir -p /files/config

COPY assets/ /files/assets

CMD [ "python", "./Slaanesh.py" ] 
