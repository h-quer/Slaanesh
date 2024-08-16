FROM python:3.12

WORKDIR /code

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY src/ .

RUN mkdir -p /files/assets
RUN mkdir -p /files/import
RUN mkdir -p /files/export
RUN mkdir -p /files/database
RUN mkdir -p /files/config
RUN mkdir -p /files/downloads

COPY assets/ /files/assets

CMD [ "python", "./Slaanesh.py" ] 
