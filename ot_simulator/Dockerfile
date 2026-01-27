FROM python:3.9-slim
WORKDIR /app
RUN pip install paho-mqtt==2.0.0
COPY sim_otgw.py .
CMD ["python", "sim_otgw.py"]
