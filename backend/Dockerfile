FROM python:3.11-bullseye

WORKDIR /app

COPY . .

RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

EXPOSE 5000

CMD ["python", "app.py"]

