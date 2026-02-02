"""
PocketBase integration for mobile_api
Handles authentication, user settings, schedules, and historical data
Now with realtime subscription support via SSE
"""
import os
import asyncio
from typing import Optional, List, Dict, Any, Callable
from datetime import datetime, timedelta
import httpx
import json
import logging

logger = logging.getLogger(__name__)

POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://172.28.0.110:8090")

class PocketBaseClient:
    """PocketBase API client with realtime support"""
    
    def __init__(self, base_url: str = POCKETBASE_URL):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self._subscriptions: Dict[str, asyncio.Task] = {}
        self._auth_token: Optional[str] = None
    
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
    
    async def subscribe_realtime(
        self, 
        collection: str, 
        callback: Callable[[str, Dict], None],
        filter_query: Optional[str] = None
    ) -> str:
        """
        Subscribe to realtime changes on a collection via SSE.
        Returns subscription ID for unsubscribing.
        
        PocketBase realtime uses SSE at /api/realtime
        """
        subscription_id = f"{collection}_{datetime.utcnow().timestamp()}"
        
        async def _sse_listener():
            try:
                async with httpx.AsyncClient() as client:
                    # Connect to PocketBase realtime SSE endpoint
                    async with client.stream(
                        "GET",
                        f"{self.base_url}/api/realtime",
                        timeout=None,  # SSE connection should stay open
                        headers={"Accept": "text/event-stream"}
                    ) as response:
                        # First, we need to subscribe to the collection
                        # PocketBase requires sending a subscription message
                        
                        client_id = None
                        
                        async for line in response.aiter_lines():
                            if not line:
                                continue
                            
                            if line.startswith("id:"):
                                client_id = line[3:].strip()
                                # Subscribe to collection
                                if client_id:
                                    await self._send_subscription(client_id, collection)
                                continue
                            
                            if line.startswith("data:"):
                                try:
                                    data = json.loads(line[5:])
                                    action = data.get("action", "")
                                    record = data.get("record", {})
                                    
                                    if data.get("collection") == collection:
                                        await callback(action, record)
                                except json.JSONDecodeError:
                                    continue
                                    
            except asyncio.CancelledError:
                logger.info(f"Realtime subscription {subscription_id} cancelled")
            except Exception as e:
                logger.error(f"Realtime subscription error: {e}")
        
        # Start listener task
        task = asyncio.create_task(_sse_listener())
        self._subscriptions[subscription_id] = task
        
        return subscription_id
    
    async def _send_subscription(self, client_id: str, collection: str):
        """Send subscription request to PocketBase"""
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{self.base_url}/api/realtime",
                    json={
                        "clientId": client_id,
                        "subscriptions": [collection]
                    },
                    timeout=5.0
                )
        except Exception as e:
            logger.error(f"Failed to subscribe to {collection}: {e}")
    
    def unsubscribe(self, subscription_id: str):
        """Cancel a realtime subscription"""
        if subscription_id in self._subscriptions:
            self._subscriptions[subscription_id].cancel()
            del self._subscriptions[subscription_id]
    
    async def create_record(self, collection: str, data: Dict[str, Any]) -> Optional[Dict]:
        """Create a new record in a collection"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/collections/{collection}/records",
                json=data,
                timeout=5.0
            )
            if response.status_code in [200, 201]:
                return response.json()
            return None
    
    async def update_record(self, collection: str, record_id: str, data: Dict[str, Any]) -> Optional[Dict]:
        """Update an existing record"""
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.api_url}/collections/{collection}/records/{record_id}",
                json=data,
                timeout=5.0
            )
            if response.status_code == 200:
                return response.json()
            return None
    
    async def get_latest_sensor_data(self) -> Dict[str, Any]:
        """Get the most recent sensor readings from history"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/collections/boiler_history/records",
                params={
                    "sort": "-timestamp",
                    "perPage": 1
                },
                timeout=5.0
            )
            if response.status_code == 200:
                items = response.json().get("items", [])
                return items[0] if items else {}
            return {}

# Singleton instance
pb_client = PocketBaseClient()
