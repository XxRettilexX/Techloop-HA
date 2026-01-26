FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy chatbot service
COPY chatbot_service.py .

# Expose port
EXPOSE 8000

# Run chatbot
CMD ["python", "-m", "uvicorn", "chatbot_service:app", "--host", "0.0.0.0", "--port", "8000"]
