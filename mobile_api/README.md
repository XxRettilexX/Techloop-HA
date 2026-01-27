# Mobile API Service

REST API service for mobile and web applications to control the smart boiler system.

## Features

- **Boiler Control**: Get status, set temperature, turn on/off
- **Environment Data**: Indoor/outdoor temperatures, window sensors
- **AI Chat**: Natural language control via chatbot integration
- **Maintenance**: AI-powered predictive maintenance reports
- **Real-time**: WebSocket support for live updates

## Endpoints

### Boiler Control
- `GET /api/boiler/status` - Current boiler status
- `POST /api/boiler/set_temperature` - Set target temperature
- `POST /api/boiler/turn_on` - Turn on boiler
- `POST /api/boiler/turn_off` - Turn off boiler

### Environment
- `GET /api/environment` - Temperature sensors and window status

### AI Services
- `POST /api/chat` - Send message to chatbot
- `GET /api/maintenance/report` - Get maintenance report

### Real-time
- `WebSocket /ws/boiler` - Real-time boiler status updates (2s interval)

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn src.main:app --reload --port 8000

# Or with Docker
docker build -t mobile-api .
docker run -p 8004:8000 mobile-api
```

## Environment Variables

- `HA_URL` - Home Assistant URL (default: http://172.28.0.10:8123)
- `HA_TOKEN` - Home Assistant long-lived access token
- `CHATBOT_URL` - Chatbot service URL (default: http://172.28.0.90:8003)
- `AI_SERVICE_URL` - AI service URL (default: http://172.28.0.70:8002)

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8004/docs
- ReDoc: http://localhost:8004/redoc
