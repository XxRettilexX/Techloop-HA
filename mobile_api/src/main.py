"""
Mobile API Service - MQTT-Based Architecture
Connects directly to MQTT simulators, no Home Assistant dependency
Uses PocketBase for persistence
"""
import os
import logging
import asyncio
import threading
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, WebSocket, HTTPException, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import paho.mqtt.client as mqtt

from .pocketbase import pb_client

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration from environment
MQTT_BROKER = os.getenv("MQTT_BROKER", "172.28.0.20")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
CHATBOT_URL = os.getenv("CHATBOT_URL", "http://172.28.0.90:8003")

# MQTT Topics
TOPICS = {
    # Boiler status (from ot_simulator)
    "boiler_temp": "otgw/status/boiler_temp",
    "return_temp": "otgw/status/return_temp",
    "modulation": "otgw/status/modulation",
    "pressure": "otgw/status/pressure",
    "flame": "otgw/status/flame",
    "mode": "otgw/mode/state",
    "setpoint_state": "otgw/setpoint/state",
    
    # Thermal data (from thermal_simulator)
    "indoor_temp": "home/sensor/indoor_temp",
    "outdoor_temp": "home/sensor/outdoor_temp",
    "heating_demand": "home/heating/demand",
    
    # Control topics (publish)
    "setpoint_set": "otgw/setpoint/set",
    "mode_set": "otgw/mode/set",
}

# In-memory cache for MQTT data
mqtt_cache: Dict[str, Any] = {
    "boiler_temp": 45.0,
    "return_temp": 35.0,
    "modulation": 0,
    "pressure": 1.5,
    "flame": False,
    "mode": "heat",
    "setpoint": 45.0,
    "indoor_temp": 20.0,
    "outdoor_temp": 10.0,
    "heating_demand": 0,
    "last_update": None,
}

# MQTT Client
mqtt_client: Optional[mqtt.Client] = None
mqtt_connected = False

# FastAPI app
app = FastAPI(
    title="Boiler Mobile API",
    version="2.0.0",
    description="MQTT-based API for boiler control (no Home Assistant)"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Models ====================

class BoilerStatus(BaseModel):
    water_temp: float
    return_temp: float
    pressure: float
    modulation: int
    flame_on: bool
    setpoint: float
    enabled: bool
    indoor_temp: float
    outdoor_temp: float
    timestamp: str

class TemperatureRequest(BaseModel):
    temperature: float

class ModeRequest(BaseModel):
    mode: str  # "heat" or "off"

class ChatMessage(BaseModel):
    message: str
    entity_id: str = "climate.boiler"

class WindowSensor(BaseModel):
    room_name: str
    is_open: bool
    entity_id: str

class EnvironmentData(BaseModel):
    indoor_temp: float
    outdoor_temp: float
    windows: List[WindowSensor]

class LoginRequest(BaseModel):
    email: str
    password: str

# ==================== MQTT Callbacks ====================

def on_mqtt_connect(client, userdata, flags, rc):
    global mqtt_connected
    if rc == 0:
        logger.info("✅ Connected to MQTT Broker")
        mqtt_connected = True
        
        # Subscribe to all status topics
        topics_to_subscribe = [
            TOPICS["boiler_temp"],
            TOPICS["return_temp"],
            TOPICS["modulation"],
            TOPICS["pressure"],
            TOPICS["flame"],
            TOPICS["mode"],
            TOPICS["setpoint_state"],
            TOPICS["indoor_temp"],
            TOPICS["outdoor_temp"],
            TOPICS["heating_demand"],
        ]
        for topic in topics_to_subscribe:
            client.subscribe(topic)
            logger.info(f"  Subscribed to: {topic}")
    else:
        logger.error(f"❌ MQTT connection failed with code {rc}")
        mqtt_connected = False

def on_mqtt_message(client, userdata, msg):
    global mqtt_cache
    try:
        payload = msg.payload.decode()
        topic = msg.topic
        
        if topic == TOPICS["boiler_temp"]:
            mqtt_cache["boiler_temp"] = float(payload)
        elif topic == TOPICS["return_temp"]:
            mqtt_cache["return_temp"] = float(payload)
        elif topic == TOPICS["modulation"]:
            mqtt_cache["modulation"] = int(float(payload))
        elif topic == TOPICS["pressure"]:
            mqtt_cache["pressure"] = float(payload)
        elif topic == TOPICS["flame"]:
            mqtt_cache["flame"] = payload.upper() == "ON"
        elif topic == TOPICS["mode"]:
            mqtt_cache["mode"] = payload
        elif topic == TOPICS["setpoint_state"]:
            mqtt_cache["setpoint"] = float(payload)
        elif topic == TOPICS["indoor_temp"]:
            mqtt_cache["indoor_temp"] = float(payload)
        elif topic == TOPICS["outdoor_temp"]:
            mqtt_cache["outdoor_temp"] = float(payload)
        elif topic == TOPICS["heating_demand"]:
            mqtt_cache["heating_demand"] = float(payload)
        
        mqtt_cache["last_update"] = datetime.utcnow().isoformat()
        
    except Exception as e:
        logger.error(f"Error processing MQTT message: {e}")

def on_mqtt_disconnect(client, userdata, rc):
    global mqtt_connected
    mqtt_connected = False
    logger.warning(f"⚠️ Disconnected from MQTT (rc={rc})")

def start_mqtt_client():
    global mqtt_client
    try:
        mqtt_client = mqtt.Client("mobile_api")
        mqtt_client.on_connect = on_mqtt_connect
        mqtt_client.on_message = on_mqtt_message
        mqtt_client.on_disconnect = on_mqtt_disconnect
        
        logger.info(f"🔌 Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}...")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
    except Exception as e:
        logger.error(f"❌ Failed to start MQTT client: {e}")

# ==================== Endpoints ====================

@app.get("/")
async def root():
    return {
        "service": "Boiler Mobile API",
        "version": "2.0.0",
        "architecture": "MQTT-direct",
        "mqtt_connected": mqtt_connected,
        "status": "running"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "mqtt_connected": mqtt_connected,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/boiler/status", response_model=BoilerStatus)
async def get_boiler_status():
    """Get current boiler status from MQTT cache"""
    return BoilerStatus(
        water_temp=mqtt_cache["boiler_temp"],
        return_temp=mqtt_cache["return_temp"],
        pressure=mqtt_cache["pressure"],
        modulation=mqtt_cache["modulation"],
        flame_on=mqtt_cache["flame"],
        setpoint=mqtt_cache["setpoint"],
        enabled=mqtt_cache["mode"] != "off",
        indoor_temp=mqtt_cache["indoor_temp"],
        outdoor_temp=mqtt_cache["outdoor_temp"],
        timestamp=mqtt_cache["last_update"] or datetime.utcnow().isoformat()
    )

@app.post("/api/boiler/set_temperature")
async def set_temperature(request: TemperatureRequest):
    """Set boiler water temperature setpoint via MQTT"""
    if not mqtt_connected or not mqtt_client:
        raise HTTPException(status_code=503, detail="MQTT not connected")
    
    # Clamp to valid range (30-80°C for water temp)
    temp = max(30.0, min(80.0, request.temperature))
    
    mqtt_client.publish(TOPICS["setpoint_set"], str(temp))
    logger.info(f"🌡️ Set temperature to {temp}°C")
    
    return {
        "success": True,
        "temperature": temp,
        "message": f"Temperature set to {temp}°C"
    }

@app.post("/api/boiler/set_room_temperature")
async def set_room_temperature(request: TemperatureRequest):
    """Set target room temperature (converts to water temp via climate curve)"""
    if not mqtt_connected or not mqtt_client:
        raise HTTPException(status_code=503, detail="MQTT not connected")
    
    # Clamp room temp to valid range
    room_temp = max(15.0, min(25.0, request.temperature))
    
    # Simple climate curve: water_temp = 35 + 1.5 * (target - outdoor)
    outdoor = mqtt_cache["outdoor_temp"]
    water_temp = 35.0 + 1.5 * (room_temp - outdoor)
    water_temp = max(30.0, min(80.0, water_temp))
    
    mqtt_client.publish(TOPICS["setpoint_set"], str(water_temp))
    logger.info(f"🏠 Room temp {room_temp}°C → Water temp {water_temp:.1f}°C")
    
    return {
        "success": True,
        "room_temperature": room_temp,
        "water_temperature": round(water_temp, 1),
        "message": f"Target room temperature set to {room_temp}°C"
    }

@app.post("/api/boiler/turn_on")
async def turn_on_boiler():
    """Turn on the boiler"""
    if not mqtt_connected or not mqtt_client:
        raise HTTPException(status_code=503, detail="MQTT not connected")
    
    mqtt_client.publish(TOPICS["mode_set"], "heat")
    logger.info("🔥 Boiler turned ON")
    return {"success": True, "mode": "heat"}

@app.post("/api/boiler/turn_off")
async def turn_off_boiler():
    """Turn off the boiler"""
    if not mqtt_connected or not mqtt_client:
        raise HTTPException(status_code=503, detail="MQTT not connected")
    
    mqtt_client.publish(TOPICS["mode_set"], "off")
    logger.info("⚫ Boiler turned OFF")
    return {"success": True, "mode": "off"}

@app.get("/api/environment", response_model=EnvironmentData)
async def get_environment():
    """Get environment data (temperatures and windows)"""
    # Windows are simulated - in production would come from MQTT
    windows = [
        WindowSensor(room_name="Soggiorno", is_open=False, entity_id="window.living"),
        WindowSensor(room_name="Camera da Letto", is_open=False, entity_id="window.bedroom"),
        WindowSensor(room_name="Cucina", is_open=False, entity_id="window.kitchen"),
        WindowSensor(room_name="Bagno", is_open=False, entity_id="window.bathroom"),
    ]
    
    return EnvironmentData(
        indoor_temp=mqtt_cache["indoor_temp"],
        outdoor_temp=mqtt_cache["outdoor_temp"],
        windows=windows
    )

@app.post("/api/chat")
async def chat(message: ChatMessage):
    """Send message to chatbot"""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CHATBOT_URL}/chat",
                json={"message": message.message, "entity_id": message.entity_id},
                timeout=30.0
            )
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="Chatbot error")
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PocketBase Endpoints ====================

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """User login with PocketBase"""
    try:
        result = await pb_client.auth_with_password(request.email, request.password)
        return {"success": True, "token": result["token"], "user": result["record"]}
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/schedules")
async def get_schedules(day: Optional[str] = None):
    """Get temperature schedules from PocketBase"""
    try:
        # Demo mode: return mock schedules
        return {
            "schedules": [
                {"id": "1", "time": "06:00", "temperature": 22, "enabled": True},
                {"id": "2", "time": "09:00", "temperature": 19, "enabled": True},
                {"id": "3", "time": "17:00", "temperature": 21, "enabled": True},
                {"id": "4", "time": "22:00", "temperature": 18, "enabled": True},
            ]
        }
    except Exception as e:
        logger.error(f"Schedules error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(hours: int = 24):
    """Get historical data from PocketBase"""
    try:
        history = await pb_client.get_history(hours)
        return {"history": history, "count": len(history)}
    except Exception as e:
        logger.error(f"History error: {e}")
        return {"history": [], "count": 0}

# ==================== WebSocket ====================

@app.websocket("/ws/boiler")
async def websocket_boiler(websocket: WebSocket):
    """WebSocket for real-time boiler updates"""
    await websocket.accept()
    logger.info("📡 WebSocket client connected")
    
    try:
        while True:
            status = await get_boiler_status()
            await websocket.send_json(status.model_dump())
            
            # Save to history periodically
            try:
                await pb_client.save_history({
                    "water_temp": status.water_temp,
                    "return_temp": status.return_temp,
                    "pressure": status.pressure,
                    "modulation": status.modulation,
                    "flame_on": status.flame_on,
                    "setpoint": status.setpoint,
                    "indoor_temp": status.indoor_temp,
                    "outdoor_temp": status.outdoor_temp,
                })
            except Exception as e:
                logger.debug(f"History save skipped: {e}")
            
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        logger.info("📡 WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

# ==================== Startup/Shutdown ====================

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Mobile API v2.0 starting...")
    logger.info(f"   MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    logger.info(f"   Chatbot: {CHATBOT_URL}")
    start_mqtt_client()
    # Wait for MQTT connection
    await asyncio.sleep(2)
    logger.info("✅ Mobile API ready!")

@app.on_event("shutdown")
async def shutdown_event():
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
    logger.info("👋 Mobile API stopped")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
