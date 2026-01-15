from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# Define the MCP Server
mcp = FastMCP("HomeAssistant-Bridge")

HA_URL = "http://172.28.0.10:8123"
# In a real scenario, we would use a Long-Lived Access Token. 
# For this simulation, we assume anonymous or the user will providing the token via ENV.
HA_TOKEN = "SUPER_SECRET_TOKEN_PLACEHOLDER"

headers = {
    "Authorization": f"Bearer {HA_TOKEN}",
    "Content-Type": "application/json",
}

@mcp.tool()
async def list_devices() -> str:
    """Lists all available devices and entities in Home Assistant."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{HA_URL}/api/states", headers=headers)
        if resp.status_code != 200:
            return f"Error: {resp.status_code}"
        
        data = resp.json()
        # Summarize for LLM
        summary = [f"{e['entity_id']}: {e['state']} ({e['attributes'].get('friendly_name', '')})" for e in data]
        return "\n".join(summary)

@mcp.tool()
async def get_state(entity_id: str) -> str:
    """Gets the full state and attributes of a specific entity."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{HA_URL}/api/states/{entity_id}", headers=headers)
        if resp.status_code == 404:
            return "Entity not found."
        return str(resp.json())

@mcp.tool()
async def set_temperature(entity_id: str, temperature: float) -> str:
    """Sets the target temperature for a climate or water_heater entity."""
    async with httpx.AsyncClient() as client:
        payload = {"entity_id": entity_id, "temperature": temperature}
        resp = await client.post(
            f"{HA_URL}/api/services/climate/set_temperature", 
            headers=headers, 
            json=payload
        )
        return f"Service called. Status: {resp.status_code}"

@mcp.tool()
async def call_service(domain: str, service: str, entity_id: str) -> str:
    """Calls a generic service (e.g., light.turn_on)."""
    async with httpx.AsyncClient() as client:
        payload = {"entity_id": entity_id}
        resp = await client.post(
            f"{HA_URL}/api/services/{domain}/{service}", 
            headers=headers, 
            json=payload
        )
        return f"Service called. Status: {resp.status_code}"

if __name__ == "__main__":
    # In Docker, we can run this as a script that listen on stdio or SSE.
    # FastMCP defaults to SSE if we run it properly, but here we just expose it.
    print("Starting MCP Server...")
    mcp.run()
