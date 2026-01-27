"""
PocketBase integration for mobile_api
Handles authentication, user settings, schedules, and historical data
"""
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import httpx

POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://172.28.0.110:8090")

class PocketBaseClient:
    """PocketBase API client"""
    
    def __init__(self, base_url: str = POCKETBASE_URL):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
    
    async def auth_with_password(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and get token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/collections/users/auth-with-password",
                json={"identity": email, "password": password},
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Auth failed: {response.text}")
    
    async def get_user_settings(self, user_id: str, token: str) -> Optional[Dict]:
        """Get user's boiler settings"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/collections/boiler_settings/records",
                params={"filter": f"user='{user_id}'"},
                headers={"Authorization": token},
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                return data["items"][0] if data["items"] else None
            return None
    
    async def get_schedules(self, user_id: str, token: str, day: Optional[str] = None) -> List[Dict]:
        """Get user's temperature schedules"""
        filter_query = f"user='{user_id}' && enabled=true"
        if day:
            filter_query += f" && day_of_week='{day}'"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/collections/temperature_schedules/records",
                params={"filter": filter_query, "sort": "time"},
                headers={"Authorization": token},
                timeout=5.0
            )
            if response.status_code == 200:
                return response.json()["items"]
            return []
    
    async def save_history(self, data: Dict[str, Any]) -> bool:
        """Save boiler status to history (no auth required for system)"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/collections/boiler_history/records",
                json={
                    "timestamp": data.get("timestamp", datetime.utcnow().isoformat()),
                    "water_temp": data["water_temp"],
                    "return_temp": data.get("return_temp"),
                    "pressure": data["pressure"],
                    "modulation": data["modulation"],
                    "flame_on": data["flame_on"],
                    "setpoint": data["setpoint"],
                    "indoor_temp": data.get("indoor_temp"),
                    "outdoor_temp": data.get("outdoor_temp"),
                },
                timeout=5.0
            )
            return response.status_code in [200, 201]
    
    async def get_history(self, hours: int = 24) -> List[Dict]:
        """Get historical data"""
        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/collections/boiler_history/records",
                params={
                    "filter": f"timestamp>='{cutoff}'",
                    "sort": "-timestamp",
                    "perPage": 500
                },
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json()["items"]
            return []
    
    async def log_maintenance(self, log_type: str, severity: str, message: str, details: Optional[Dict] = None) -> bool:
        """Log maintenance event"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/collections/maintenance_logs/records",
                json={
                    "timestamp": datetime.utcnow().isoformat(),
                    "type": log_type,
                    "severity": severity,
                    "message": message,
                    "details": details or {},
                    "resolved": False
                },
                timeout=5.0
            )
            return response.status_code in [200, 201]

# Singleton instance
pb_client = PocketBaseClient()
