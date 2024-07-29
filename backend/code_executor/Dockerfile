FROM python:3.10-slim

# Create a non-root user
RUN useradd -m appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]