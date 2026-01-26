"""
AI Chatbot for Boiler Control using Ollama
Natural language interface with safety guardrail integration
"""
import os
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import json
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
HA_URL = os.getenv("HA_URL", "http://172.28.0.10:8123")
HA_TOKEN = os.getenv("HA_TOKEN", "REPLACE_ME")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://172.28.0.40:11434")
BOILER_AI_URL = os.getenv("BOILER_AI_URL", "http://172.28.0.70:8000")

app = FastAPI(title="Boiler Chatbot", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    entity_id: str = "climate.boiler"

class ChatResponse(BaseModel):
    response: str
    action_taken: Optional[str] = None
    validated: bool
    intent: Optional[Dict[str, Any]] = None

class BoilerChatbot:
    """AI Chatbot with Ollama NLU and Safety Guardrail"""
    
    def __init__(self):
        self.ha_url = HA_URL
        self.ha_token = HA_TOKEN
        self.ollama_url = OLLAMA_URL
        self.boiler_ai_url = BOILER_AI_URL
        self.headers = {
            "Authorization": f"Bearer {self.ha_token}",
            "Content-Type": "application/json"
        }
    
    async def extract_intent(self, user_message: str) -> Dict[str, Any]:
        """Use Ollama to extract intent from user message"""
        
        prompt = f"""Sei un assistente per il controllo di una caldaia smart. Analizza il messaggio dell'utente ed estrai l'intento.

Messaggio utente: "{user_message}"

Rispondi SOLO con un JSON valido nel seguente formato:
{{
  "action": "set_temperature" | "get_status" | "turn_on" | "turn_off" | "unknown",
  "value": <numero temperatura se applicabile, altrimenti null>,
  "confidence": <0.0-1.0>
}}

Esempi:
- "Imposta a 22 gradi" → {{"action": "set_temperature", "value": 22.0, "confidence": 0.95}}
- "Alza la temperatura" → {{"action": "set_temperature", "value": null, "confidence": 0.7}}
- "Quale è la temperatura?" → {{"action": "get_status", "value": null, "confidence": 0.9}}
- "Spegni la caldaia" → {{"action": "turn_off", "value": null, "confidence": 0.95}}

Rispondi SOLO con il JSON, nient'altro:"""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": "llama3.2",
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.1,
                            "num_predict": 100
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    llm_output = result.get("response", "").strip()
                    
                    # Extract JSON from response
                    try:
                        # Try to find JSON in the response
                        json_match = re.search(r'\{.*\}', llm_output, re.DOTALL)
                        if json_match:
                            intent = json.loads(json_match.group())
                            logger.info(f"Extracted intent: {intent}")
                            return intent
                        else:
                            logger.error(f"No JSON found in LLM response: {llm_output}")
                            return {"action": "unknown", "value": None, "confidence": 0.0}
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error: {e}, Response: {llm_output}")
                        return {"action": "unknown", "value": None, "confidence": 0.0}
                else:
                    logger.error(f"Ollama API error: {response.status_code}")
                    return {"action": "unknown", "value": None, "confidence": 0.0}
                    
        except Exception as e:
            logger.error(f"Error in intent extraction: {e}")
            return {"action": "unknown", "value": None, "confidence": 0.0}
    
    async def validate_command(self, entity_id: str, action: str, value: Optional[float], user_input: str) -> Dict[str, Any]:
        """Validate command with boiler_ai guardrail"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.boiler_ai_url}/validate_command",
                    json={
                        "entity_id": entity_id,
                        "action": action,
                        "value": value,
                        "user_input": user_input
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Guardrail API error: {response.status_code}")
                    return {
                        "allowed": False,
                        "reason": "Errore di validazione",
                        "severity": "danger"
                    }
        except Exception as e:
            logger.error(f"Error validating command: {e}")
            return {
                "allowed": False,
                "reason": f"Errore di connessione al sistema di sicurezza: {str(e)}",
                "severity": "danger"
            }
    
    async def execute_ha_command(self, entity_id: str, action: str, value: Optional[float]) -> bool:
        """Execute command on Home Assistant"""
        try:
            async with httpx.AsyncClient() as client:
                if action == "set_temperature":
                    response = await client.post(
                        f"{self.ha_url}/api/services/climate/set_temperature",
                        headers=self.headers,
                        json={
                            "entity_id": entity_id,
                            "temperature": value
                        },
                        timeout=10.0
                    )
                elif action == "turn_off":
                    response = await client.post(
                        f"{self.ha_url}/api/services/climate/turn_off",
                        headers=self.headers,
                        json={"entity_id": entity_id},
                        timeout=10.0
                    )
                elif action == "turn_on":
                    response = await client.post(
                        f"{self.ha_url}/api/services/climate/turn_on",
                        headers=self.headers,
                        json={"entity_id": entity_id},
                        timeout=10.0
                    )
                else:
                    return False
                
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Error executing HA command: {e}")
            return False
    
    async def get_current_state(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get current state from Home Assistant"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.ha_url}/api/states/{entity_id}",
                    headers=self.headers,
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception as e:
            logger.error(f"Error getting state: {e}")
            return None
    
    async def process_message(self, user_message: str, entity_id: str) -> ChatResponse:
        """Main processing pipeline"""
        logger.info(f"Processing message: {user_message}")
        
        # Extract intent using Ollama
        intent = await self.extract_intent(user_message)
        
        action = intent.get("action")
        value = intent.get("value")
        confidence = intent.get("confidence", 0.0)
        
        # Low confidence
        if confidence < 0.5:
            return ChatResponse(
                response="Non sono sicuro di aver capito. Puoi riformulare la richiesta?",
                validated=False,
                intent=intent
            )
        
        # Handle get_status
        if action == "get_status":
            state = await self.get_current_state(entity_id)
            if state:
                temp = state.get("attributes", {}).get("temperature", "N/A")
                current_temp = state.get("attributes", {}).get("current_temperature", "N/A")
                return ChatResponse(
                    response=f"🌡️ Temperatura impostata: {temp}°C\n📊 Temperatura attuale: {current_temp}°C",
                    validated=True,
                    intent=intent
                )
            else:
                return ChatResponse(
                    response="Non riesco a ottenere lo stato della caldaia",
                    validated=False,
                    intent=intent
                )
        
        # Handle commands that need validation
        if action in ["set_temperature", "turn_on", "turn_off"]:
            # Validate with guardrail
            validation = await self.validate_command(entity_id, action, value, user_message)
            
            if not validation.get("allowed"):
                reason = validation.get("reason", "Comando non permesso")
                alternative = validation.get("alternative")
                
                response_text = f"❌ {reason}"
                if alternative:
                    response_text += f"\n💡 Suggerimento: {alternative}"
                
                return ChatResponse(
                    response=response_text,
                    validated=False,
                    intent=intent
                )
            
            # Execute on Home Assistant
            success = await self.execute_ha_command(entity_id, action, value)
            
            if success:
                if action == "set_temperature":
                    response_text = f"✅ Temperatura impostata a {value}°C"
                elif action == "turn_off":
                    response_text = "✅ Caldaia spenta"
                elif action == "turn_on":
                    response_text = "✅ Caldaia accesa"
                else:
                    response_text = "✅ Comando eseguito"
                
                return ChatResponse(
                    response=response_text,
                    action_taken=action,
                    validated=True,
                    intent=intent
                )
            else:
                return ChatResponse(
                    response="❌ Errore nell'esecuzione del comando su Home Assistant",
                    validated=True,
                    intent=intent
                )
        
        # Unknown action
        return ChatResponse(
            response="Non ho capito cosa vuoi fare. Prova con 'Imposta temperatura a X gradi' o 'Spegni la caldaia'",
            validated=False,
            intent=intent
        )

# Initialize chatbot
chatbot = BoilerChatbot()

@app.get("/")
async def root():
    return {
        "service": "Boiler Chatbot",
        "status": "running",
        "version": "1.0.0"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint"""
    try:
        response = await chatbot.process_message(request.message, request.entity_id)
        return response
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
