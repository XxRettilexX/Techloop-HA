FROM python:3.11-slim

WORKDIR /app

# Install paho-mqtt
RUN pip install --no-cache-dir paho-mqtt==2.0.0

# Copy simulator script
COPY sim_thermal.py .

# Run simulator
CMD ["python", "-u", "sim_thermal.py"]
