"""
Mobile API Service - Unified API for Mobile & Web Apps
Aggregates data from Home Assistant, Chatbot, and AI services
"""
import os
import logging
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, WebSocket, HTTPException, WebSocketDisconnect, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from .pocketbase import pb_client

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration from environment
HA_URL = os.getenv("HA_URL", "http://172.28.0.10:8123")
HA_TOKEN = os.getenv("HA_TOKEN", "")
CHATBOT_URL = os.getenv("CHATBOT_URL", "http://172.28.0.90:8003")
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://172.28.0.70:8002")

# FastAPI app
app = FastAPI(
    title="Boiler Mobile API",
    version="1.0.0",
    description="Unified API for boiler control mobile and web apps"
)

# CORS - Allow all origins for development (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Models ====================

class BoilerStatus(BaseModel):
    """Boiler current status"""
    water_temp: float
    return_temp: float
    pressure: float
    modulation: int
    flame_on: bool
    setpoint: float
    enabled: bool
    timestamp: str

class TemperatureRequest(BaseModel):
    """Request to set temperature"""
    temperature: float

class ChatMessage(BaseModel):
    """Chat message from user"""
    message: str
    entity_id: str = "climate.boiler"

class WindowSensor(BaseModel):
    """Window sensor status"""
    room_name: str
    is_open: bool
    entity_id: str

class EnvironmentData(BaseModel):
    """Environment sensors data"""
    indoor_temp: float
    outdoor_temp: float
    windows: List[WindowSensor]

class LoginRequest(BaseModel):
    """User login request"""
    email: str
    password: str

class RegisterRequest(BaseModel):
    """User registration request"""
    email: str
    password: str
    name: str

class ScheduleCreate(BaseModel):
    """Create temperature schedule"""
    name: str
    day_of_week: str
    time: str
    temperature: float
    enabled: bool = True

# ==================== Helper Functions ====================

def get_ha_headers() -> Dict[str, str]:
    """Get Home Assistant API headers"""
    return {
        "Authorization": f"Bearer {HA_TOKEN}",
        "Content-Type": "application/json"
    }

async def fetch_ha_entity(entity_id: str) -> Optional[Dict]:
    """Fetch single entity from Home Assistant"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{HA_URL}/api/states/{entity_id}",
                headers=get_ha_headers(),
                timeout=5.0
            )
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to fetch {entity_id}: {response.status_code}")
                return None
    except Exception as e:
        logger.error(f"Error fetching {entity_id}: {e}")
        return None

# ==================== Endpoints ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Boiler Mobile API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/boiler/status", response_model=BoilerStatus)
async def get_boiler_status():
    """
    Get current boiler status
    Aggregates data from multiple Home Assistant sensors
    """
    try:
        # Fetch climate entity (main boiler control)
        climate_data = await fetch_ha_entity("climate.boiler")
        
        # Fetch individual sensors
        boiler_temp_data = await fetch_ha_entity("sensor.boiler_temperature")
        return_temp_data = await fetch_ha_entity("sensor.return_temperature")
        pressure_data = await fetch_ha_entity("sensor.boiler_pressure")
        modulation_data = await fetch_ha_entity("sensor.flame_modulation")
        
        if not climate_data:
            raise HTTPException(status_code=503, detail="Cannot connect to boiler system")
        
        # Parse values with defaults
        water_temp = float(boiler_temp_data["state"]) if boiler_temp_data else 0.0
        return_temp = float(return_temp_data["state"]) if return_temp_data else 0.0
        pressure = float(pressure_data["state"]) if pressure_data else 0.0
        modulation = int(modulation_data["state"]) if modulation_data else 0
        
        return BoilerStatus(
            water_temp=water_temp,
            return_temp=return_temp,
            pressure=pressure,
            modulation=modulation,
            flame_on=modulation > 0,
            setpoint=float(climate_data.get("attributes", {}).get("temperature", 0)),
            enabled=climate_data.get("state") != "off",
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        logger.error(f"Error getting boiler status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/boiler/set_temperature")
async def set_temperature(request: TemperatureRequest):
    """Set boiler target temperature"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{HA_URL}/api/services/climate/set_temperature",
                headers=get_ha_headers(),
                json={
                    "entity_id": "climate.boiler",
                    "temperature": request.temperature
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "temperature": request.temperature,
                    "message": f"Temperature set to {request.temperature}°C"
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to set temperature"
                )
    except Exception as e:
        logger.error(f"Error setting temperature: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/boiler/turn_on")
async def turn_on_boiler():
    """Turn on the boiler"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{HA_URL}/api/services/climate/turn_on",
                headers=get_ha_headers(),
                json={"entity_id": "climate.boiler"},
                timeout=10.0
            )
            return {"success": response.status_code == 200}
    except Exception as e:
        logger.error(f"Error turning on boiler: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/boiler/turn_off")
async def turn_off_boiler():
    """Turn off the boiler"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{HA_URL}/api/services/climate/turn_off",
                headers=get_ha_headers(),
                json={"entity_id": "climate.boiler"},
                timeout=10.0
            )
            return {"success": response.status_code == 200}
    except Exception as e:
        logger.error(f"Error turning off boiler: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/environment", response_model=EnvironmentData)
async def get_environment():
    """Get environment data (temperatures and window sensors)"""
    try:
        # Fetch temperature sensors
        indoor_data = await fetch_ha_entity("sensor.indoor_temperature")
        outdoor_data = await fetch_ha_entity("sensor.outdoor_temperature")
        
        # Fetch window sensors
        window_entities = [
            ("binary_sensor.window_living_room", "Soggiorno"),
            ("binary_sensor.window_bedroom", "Camera da Letto"),
            ("binary_sensor.window_kitchen", "Cucina"),
            ("binary_sensor.window_bathroom", "Bagno"),
        ]
        
        windows = []
        for entity_id, room_name in window_entities:
            data = await fetch_ha_entity(entity_id)
            if data:
                windows.append(WindowSensor(
                    room_name=room_name,
                    is_open=data.get("state") == "on",
                    entity_id=entity_id
                ))
        
        return EnvironmentData(
            indoor_temp=float(indoor_data["state"]) if indoor_data else 20.0,
            outdoor_temp=float(outdoor_data["state"]) if outdoor_data else 10.0,
            windows=windows
        )
    except Exception as e:
        logger.error(f"Error getting environment data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(message: ChatMessage):
    """Send message to chatbot"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CHATBOT_URL}/chat",
                json={
                    "message": message.message,
                    "entity_id": message.entity_id
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Chatbot service error"
                )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Chatbot timeout")
    except Exception as e:
        logger.error(f"Error calling chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/maintenance/report")
async def get_maintenance_report(hours: int = 168):
    """Get AI maintenance report"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{AI_SERVICE_URL}/maintenance/report",
                params={
                    "entity_ids": "sensor.boiler_pressure,sensor.boiler_temperature,climate.boiler",
                    "hours": hours
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="AI service error"
                )
    except Exception as e:
        logger.error(f"Error getting maintenance report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Authentication & Database Endpoints ====================

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """User login with PocketBase"""
    try:
        result = await pb_client.auth_with_password(request.email, request.password)
        return {
            "success": True,
            "token": result["token"],
            "user": result["record"]
        }
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/user/settings")
async def get_settings(authorization: str = Header(...)):
    """Get user boiler settings"""
    try:
        # Extract user_id from token (simplified - in production parse JWT properly)
        # For now, expect client to pass user_id in query or extract from token
        user_id = "USER_ID"  # TODO: Extract from JWT token
        
        settings = await pb_client.get_user_settings(user_id, authorization)
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")
        return settings
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/schedules")
async def get_schedules(authorization: str = Header(...), day: Optional[str] = None):
    """Get user's temperature schedules"""
    try:
        user_id = "USER_ID"  # TODO: Extract from JWT
        schedules = await pb_client.get_schedules(user_id, authorization, day)
        return {"schedules": schedules}
    except Exception as e:
        logger.error(f"Error getting schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(hours: int = 24):
    """Get boiler historical data"""
    try:
        history = await pb_client.get_history(hours)
        return {"history": history, "count": len(history)}
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== WebSocket for Real-time Updates ====================

@app.websocket("/ws/boiler")
async def websocket_boiler(websocket: WebSocket):
    """
    WebSocket endpoint for real-time boiler status updates
    Sends status every 2 seconds
    """
    await websocket.accept()
    logger.info("WebSocket client connected")
    
    try:
        while True:
            try:
                # Get current status
                status = await get_boiler_status()
                
                # Save to history database (every update)
                await pb_client.save_history({
                    "water_temp": status.water_temp,
                    "return_temp": status.return_temp,
                    "pressure": status.pressure,
                    "modulation": status.modulation,
                    "flame_on": status.flame_on,
                    "setpoint": status.setpoint,
                })
                
                # Send to client
                await websocket.send_json(status.dict())
                # Wait 2 seconds before next update
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Error in WebSocket loop: {e}")
                break
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

# ==================== Startup ====================

@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    logger.info("🚀 Mobile API Service starting...")
    logger.info(f"   Home Assistant: {HA_URL}")
    logger.info(f"   Chatbot: {CHATBOT_URL}")
    logger.info(f"   AI Service: {AI_SERVICE_URL}")
    logger.info(f"   PocketBase: {os.getenv('POCKETBASE_URL', 'http://172.28.0.110:8090')}")
    logger.info("✅ Mobile API Service ready!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
