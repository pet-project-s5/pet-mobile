FROM python:3.12-slim

WORKDIR /app

# Install deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# App + dataset
COPY service ./service
COPY ObservaSampaDadosAbertosIndicadoresCSV.csv ./

ENV OBSERVA_CSV_PATH=/app/ObservaSampaDadosAbertosIndicadoresCSV.csv
ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn service.main:app --host 0.0.0.0 --port ${PORT}"]
