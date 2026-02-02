"""
AI Chatbot for Boiler Control using Ollama
Natural language interface with safety guardrail integration
Supports both REST and SSE streaming for faster responses
Includes response caching for faster repeated queries
"""
import os
import logging
import asyncio
import hashlib
import time
from typing import Optional, Dict, Any, AsyncGenerator, Tuple
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
import httpx
import json
import re
from collections import OrderedDict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
HA_URL = os.getenv("HA_URL", "http://172.28.0.10:8123")
HA_TOKEN = os.getenv("HA_TOKEN", "REPLACE_ME")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://172.28.0.40:11434")
BOILER_AI_URL = os.getenv("BOILER_AI_URL", "http://172.28.0.70:8000")

# Cache configuration
CACHE_MAX_SIZE = 500  # Maximum cached responses
CACHE_TTL_SECONDS = 300  # 5 minutes TTL for responses
INTENT_CACHE_TTL = 600  # 10 minutes for intent extraction cache

app = FastAPI(title="Boiler Chatbot", version="2.1.0")

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
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    action_taken: Optional[str] = None
    validated: bool
    intent: Optional[Dict[str, Any]] = None
    cached: bool = False  # Indicates if response was from cache


class ResponseCache:
    """LRU Cache with TTL for AI responses"""
    
    def __init__(self, max_size: int = CACHE_MAX_SIZE, ttl: int = CACHE_TTL_SECONDS):
        self.max_size = max_size
        self.ttl = ttl
        self._cache: OrderedDict[str, Tuple[Any, float]] = OrderedDict()
        self._hits = 0
        self._misses = 0
    
    def _normalize_message(self, message: str) -> str:
        """Normalize message for better cache matching"""
        # Lowercase, remove extra spaces, normalize numbers
        msg = message.lower().strip()
        msg = re.sub(r'\s+', ' ', msg)
        # Normalize temperature variations: "21 gradi", "21°", "21 °C" -> "21 gradi"
        msg = re.sub(r'(\d+)\s*°\s*[cC]?', r'\1 gradi', msg)
        msg = re.sub(r'(\d+)\s*celsius', r'\1 gradi', msg)
        # Remove punctuation
        msg = re.sub(r'[?.!,;:]', '', msg)
        return msg
    
    def _make_key(self, message: str, context_hash: Optional[str] = None) -> str:
        """Create cache key from message and optional context"""
        normalized = self._normalize_message(message)
        key_str = normalized
        if context_hash:
            key_str += f"|{context_hash}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def _context_hash(self, context: Optional[Dict]) -> Optional[str]:
        """Create a hash of context for cache key (only relevant fields)"""
        if not context:
            return None
        # Only include fields that affect the response
        relevant = {
            "mode": context.get("mode"),
            # Round temperatures to avoid cache misses for tiny changes
            "boiler_temp": round(context.get("boiler_temp", 0), 0) if context.get("boiler_temp") else None,
            "indoor_temp": round(context.get("indoor_temp", 0), 0) if context.get("indoor_temp") else None,
        }
        return hashlib.md5(json.dumps(relevant, sort_keys=True).encode()).hexdigest()[:8]
    
    def get(self, message: str, context: Optional[Dict] = None) -> Optional[Any]:
        """Get cached response if exists and not expired"""
        ctx_hash = self._context_hash(context)
        key = self._make_key(message, ctx_hash)
        
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self.ttl:
                # Move to end (LRU)
                self._cache.move_to_end(key)
                self._hits += 1
                logger.info(f"Cache HIT for: {message[:30]}...")
                return value
            else:
                # Expired, remove
                del self._cache[key]
        
        self._misses += 1
        return None
    
    def set(self, message: str, response: Any, context: Optional[Dict] = None):
        """Store response in cache"""
        ctx_hash = self._context_hash(context)
        key = self._make_key(message, ctx_hash)
        
        # Remove oldest if at capacity
        while len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)
        
        self._cache[key] = (response, time.time())
        logger.info(f"Cache SET for: {message[:30]}...")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{hit_rate:.1f}%"
        }
    
    def clear(self):
        """Clear all cached responses"""
        self._cache.clear()
        self._hits = 0
        self._misses = 0


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
        
        # Initialize caches
        self.response_cache = ResponseCache(max_size=CACHE_MAX_SIZE, ttl=CACHE_TTL_SECONDS)
        self.intent_cache = ResponseCache(max_size=200, ttl=INTENT_CACHE_TTL)
    
    async def extract_intent(self, user_message: str) -> Dict[str, Any]:
        """Use Ollama to extract intent from user message (with caching)"""
        
        # Check intent cache first
        cached_intent = self.intent_cache.get(user_message)
        if cached_intent:
            return cached_intent
        
        prompt = f"""Sei un assistente per la domotica. Estrai l'intento dal messaggio dell'utente in formato JSON.
Azioni disponibili: set_temperature, turn_on, turn_off, get_status.
Se il messaggio è un saluto, conversazione generica o non chiaro, usa azione: "unknown".

Esempi:
Msg: "Accendi i riscaldamenti" -> {{"action": "turn_on", "value": null, "confidence": 1.0}}
Msg: "Metti a 21 gradi" -> {{"action": "set_temperature", "value": 21.0, "confidence": 1.0}}
Msg: "Spegni tutto" -> {{"action": "turn_off", "value": null, "confidence": 1.0}}
Msg: "Quanti gradi ci sono?" -> {{"action": "get_status", "value": null, "confidence": 1.0}}
Msg: "Ciao come stai" -> {{"action": "unknown", "value": null, "confidence": 0.0}}
Msg: "Imposta 50 gradi" -> {{"action": "set_temperature", "value": 50.0, "confidence": 1.0}}

Messaggio Utente: "{user_message}"
JSON:"""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": "llama3.2:1b",
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.0,    # Deterministic = faster
                            "num_predict": 64,     # Max tokens limit for speed
                            "top_k": 10,           # Limit search space
                            "top_p": 0.5
                        }
                    },
                    timeout=60.0  # Increased timeout for slower hardware
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
                            # Cache the intent
                            self.intent_cache.set(user_message, intent)
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
    
    async def generate_conversational_response_stream(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        """Stream a conversational response from Ollama for general chat"""
        context_str = ""
        if context:
            context_str = f"""
Contesto attuale del sistema:
- Temperatura caldaia: {context.get('boiler_temp', 'N/D')}°C
- Temperatura interna: {context.get('indoor_temp', 'N/D')}°C
- Temperatura esterna: {context.get('outdoor_temp', 'N/D')}°C
- Setpoint: {context.get('setpoint', 'N/D')}°C
- Pressione: {context.get('pressure', 'N/D')} bar
- Modalità: {context.get('mode', 'N/D')}
"""
        
        prompt = f"""Sei un assistente domotico per il controllo della caldaia. Rispondi in modo conciso e amichevole in italiano.
{context_str}
Utente: {user_message}
Assistente:"""
        
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": "llama3.2:1b",
                        "prompt": prompt,
                        "stream": True,
                        "options": {
                            "temperature": 0.7,
                            "num_predict": 200,
                            "top_k": 40,
                            "top_p": 0.9
                        }
                    },
                    timeout=60.0
                ) as response:
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                if "response" in data:
                                    yield data["response"]
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            logger.error(f"Error in streaming response: {e}")
            yield f"Mi dispiace, si è verificato un errore: {str(e)}"
    
    async def extract_intent_fast(self, user_message: str) -> Dict[str, Any]:
        """Quick intent extraction with pattern matching fallback for speed"""
        # Fast pattern matching for common commands
        msg_lower = user_message.lower().strip()
        
        # Quick patterns (no LLM needed)
        if any(w in msg_lower for w in ["accend", "attiva", "avvia"]):
            return {"action": "turn_on", "value": None, "confidence": 0.95}
        
        if any(w in msg_lower for w in ["spegn", "disattiva", "stop"]):
            return {"action": "turn_off", "value": None, "confidence": 0.95}
        
        if any(w in msg_lower for w in ["stato", "quanti gradi", "temperatura attuale", "com'è"]):
            return {"action": "get_status", "value": None, "confidence": 0.95}
        
        # Temperature setting - try to extract number
        temp_match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:gradi|°|celsius)?', msg_lower)
        if temp_match and any(w in msg_lower for w in ["imposta", "metti", "setta", "porta"]):
            temp = float(temp_match.group(1).replace(',', '.'))
            return {"action": "set_temperature", "value": temp, "confidence": 0.95}
        
        # Fallback to LLM for complex queries
        return await self.extract_intent(user_message)

    async def generate_dynamic_response(self, action: str, value: Optional[float], context: Optional[Dict[str, Any]], validated: bool, reason: Optional[str] = None) -> str:
        """Generate a dynamic, natural response using LLM based on action and context"""
        
        # Create cache key from action parameters
        cache_key = f"{action}:{value}:{validated}:{reason}"
        cached_response = self.response_cache.get(cache_key, context)
        if cached_response:
            return cached_response
        
        context_str = ""
        if context:
            context_str = f"""
Stato attuale sistema:
- Temperatura acqua caldaia: {context.get('boiler_temp', 'N/D')}°C
- Temperatura interna casa: {context.get('indoor_temp', 'N/D')}°C
- Temperatura esterna: {context.get('outdoor_temp', 'N/D')}°C
- Setpoint attuale: {context.get('setpoint', 'N/D')}°C
- Pressione: {context.get('pressure', 'N/D')} bar
- Modalità: {context.get('mode', 'N/D')}
"""
        
        if validated:
            if action == "set_temperature":
                prompt = f"""Sei un assistente domotico. L'utente ha chiesto di impostare la temperatura a {value}°C e il comando è stato approvato.
{context_str}
Genera una risposta breve e naturale (max 2 frasi) confermando l'azione. Usa emoji appropriate. Non dire "certo" o "certamente".
Risposta:"""
            elif action == "turn_on":
                prompt = f"""Sei un assistente domotico. L'utente ha chiesto di accendere la caldaia e il comando è stato approvato.
{context_str}
Genera una risposta breve e naturale (max 2 frasi) confermando l'accensione. Usa emoji appropriate.
Risposta:"""
            elif action == "turn_off":
                prompt = f"""Sei un assistente domotico. L'utente ha chiesto di spegnere la caldaia e il comando è stato approvato.
{context_str}
Genera una risposta breve e naturale (max 2 frasi) confermando lo spegnimento. Usa emoji appropriate.
Risposta:"""
            elif action == "get_status":
                prompt = f"""Sei un assistente domotico. L'utente ha chiesto lo stato della caldaia.
{context_str}
Genera una risposta naturale e informativa con i dati disponibili. Usa emoji appropriate per rendere la risposta leggibile.
Risposta:"""
            else:
                prompt = f"""Sei un assistente domotico. Il comando dell'utente è stato eseguito con successo.
{context_str}
Genera una breve conferma naturale.
Risposta:"""
        else:
            # Command rejected
            prompt = f"""Sei un assistente domotico. Il comando dell'utente è stato rifiutato per motivi di sicurezza.
Motivo del rifiuto: {reason}
{context_str}
Genera una risposta empatica che spiega perché il comando non può essere eseguito e suggerisci un'alternativa se possibile. Usa emoji appropriate.
Risposta:"""
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": "llama3.2:1b",
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "num_predict": 100,
                            "top_k": 40,
                            "top_p": 0.9
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    generated = result.get("response", "").strip()
                    # Cache the successful response
                    self.response_cache.set(cache_key, generated, context)
                    return generated
                else:
                    # Fallback to simple response
                    return self._get_fallback_response(action, value, validated, reason)
        except Exception as e:
            logger.error(f"Error generating dynamic response: {e}")
            return self._get_fallback_response(action, value, validated, reason)
    
    def _get_fallback_response(self, action: str, value: Optional[float], validated: bool, reason: Optional[str]) -> str:
        """Fallback response when LLM is unavailable"""
        if validated:
            if action == "set_temperature":
                return f"✅ Temperatura impostata a {value}°C"
            elif action == "turn_on":
                return "✅ Caldaia accesa"
            elif action == "turn_off":
                return "✅ Caldaia spenta"
            else:
                return "✅ Comando eseguito"
        else:
            return f"❌ {reason or 'Comando non permesso'}"

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
    
    async def process_message(self, user_message: str, entity_id: str, context: Optional[Dict[str, Any]] = None) -> ChatResponse:
        """Main processing pipeline"""
        logger.info(f"Processing message: {user_message}")
        
        # Extract intent using Ollama
        intent = await self.extract_intent(user_message)
        
        action = intent.get("action")
        value = intent.get("value")
        confidence = intent.get("confidence", 0.0)
        
        # Low confidence - generate conversational response
        if confidence < 0.5 or action == "unknown":
            # Use LLM for conversational response
            response_text = ""
            async for token in self.generate_conversational_response_stream(user_message, context):
                response_text += token
            
            return ChatResponse(
                response=response_text,
                validated=False,
                intent=intent
            )
        
        # Handle get_status - generate dynamic response
        if action == "get_status":
            response_text = await self.generate_dynamic_response(action, value, context, True)
            return ChatResponse(
                response=response_text,
                validated=True,
                intent=intent
            )
        
        # Handle commands that need validation
        if action in ["set_temperature", "turn_on", "turn_off"]:
            # Validate with guardrail
            validation = await self.validate_command(entity_id, action, value, user_message)
            
            if not validation.get("allowed"):
                reason = validation.get("reason", "Comando non permesso")
                response_text = await self.generate_dynamic_response(action, value, context, False, reason)
                
                return ChatResponse(
                    response=response_text,
                    validated=False,
                    intent=intent
                )
            
            # Command validated - generate dynamic response
            response_text = await self.generate_dynamic_response(action, value, context, True)
            
            return ChatResponse(
                response=response_text,
                action_taken=action,
                validated=True,
                intent=intent
            )
        
        # Unknown action - conversational fallback
        response_text = ""
        async for token in self.generate_conversational_response_stream(user_message, context):
            response_text += token
        
        return ChatResponse(
            response=response_text,
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
        "version": "2.0.0",
        "features": ["rest", "sse-streaming", "fast-intent"]
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint (REST - full response)"""
    try:
        response = await chatbot.process_message(request.message, request.entity_id, request.context)
        return response
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/fast", response_model=ChatResponse)
async def chat_fast(request: ChatRequest):
    """Fast chat endpoint - uses pattern matching for intent, LLM for response"""
    try:
        # Use fast intent extraction
        intent = await chatbot.extract_intent_fast(request.message)
        
        action = intent.get("action")
        value = intent.get("value")
        confidence = intent.get("confidence", 0.0)
        
        # Low confidence - fallback to full processing
        if confidence < 0.5 or action == "unknown":
            return await chatbot.process_message(request.message, request.entity_id, request.context)
        
        # Handle get_status - generate dynamic response
        if action == "get_status":
            response_text = await chatbot.generate_dynamic_response(action, value, request.context, True)
            return ChatResponse(response=response_text, validated=True, intent=intent)
        
        # For commands, validate with guardrail then generate dynamic response
        if action in ["set_temperature", "turn_on", "turn_off"]:
            validation = await chatbot.validate_command(request.entity_id, action, value, request.message)
            
            if not validation.get("allowed"):
                reason = validation.get("reason", "Comando non permesso")
                response_text = await chatbot.generate_dynamic_response(action, value, request.context, False, reason)
                return ChatResponse(response=response_text, validated=False, intent=intent)
            
            # Command validated - generate dynamic response
            response_text = await chatbot.generate_dynamic_response(action, value, request.context, True)
            return ChatResponse(response=response_text, action_taken=action, validated=True, intent=intent)
        
        # Unknown - use full processing
        return await chatbot.process_message(request.message, request.entity_id, request.context)
        
    except Exception as e:
        logger.error(f"Error in fast chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class StreamChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

@app.post("/chat/stream")
async def chat_stream(request: StreamChatRequest):
    """
    SSE streaming endpoint for real-time chat responses.
    All responses are generated dynamically by the LLM.
    
    Returns Server-Sent Events with format:
    data: {"type": "token", "content": "..."}
    data: {"type": "done", "intent": {...}}
    """
    async def event_generator():
        # First, quickly extract intent
        intent = await chatbot.extract_intent_fast(request.message)
        action = intent.get("action")
        value = intent.get("value")
        
        yield {"event": "message", "data": json.dumps({"type": "start"})}
        
        # For known actions, generate dynamic response
        if action in ["set_temperature", "turn_on", "turn_off", "get_status"]:
            
            # For get_status, generate dynamic response
            if action == "get_status":
                response_text = await chatbot.generate_dynamic_response(action, value, request.context, True)
                yield {"event": "message", "data": json.dumps({"type": "token", "content": response_text})}
                yield {"event": "message", "data": json.dumps({"type": "done", "intent": intent, "validated": True})}
                return
            
            # For control commands, validate first
            if action in ["set_temperature", "turn_on", "turn_off"]:
                validation = await chatbot.validate_command("climate.boiler", action, value, request.message)
                
                if not validation.get("allowed"):
                    reason = validation.get("reason", "Non permesso")
                    response_text = await chatbot.generate_dynamic_response(action, value, request.context, False, reason)
                    yield {"event": "message", "data": json.dumps({"type": "token", "content": response_text})}
                    yield {"event": "message", "data": json.dumps({"type": "done", "intent": intent, "validated": False})}
                    return
                
                # Command allowed - generate dynamic response
                response_text = await chatbot.generate_dynamic_response(action, value, request.context, True)
                yield {"event": "message", "data": json.dumps({"type": "token", "content": response_text})}
                yield {"event": "message", "data": json.dumps({
                    "type": "done", 
                    "intent": intent, 
                    "validated": True,
                    "action_taken": action
                })}
                return
        
        # For conversational queries, stream the response token by token
        full_response = ""
        async for token in chatbot.generate_conversational_response_stream(request.message, request.context):
            full_response += token
            yield {"event": "message", "data": json.dumps({"type": "token", "content": token})}
            await asyncio.sleep(0.01)  # Small delay for smooth streaming
        
        yield {"event": "message", "data": json.dumps({
            "type": "done", 
            "intent": intent,
            "full_response": full_response
        })}
    
    return EventSourceResponse(event_generator())


# ==================== CACHE MANAGEMENT ENDPOINTS ====================

@app.get("/cache/stats")
async def cache_stats():
    """Get cache statistics for monitoring"""
    return {
        "intent_cache": chatbot.intent_cache.get_stats(),
        "response_cache": chatbot.response_cache.get_stats()
    }

@app.post("/cache/clear")
async def clear_cache(cache_type: Optional[str] = None):
    """Clear cache - optionally specify 'intent', 'response', or clear both"""
    if cache_type == "intent":
        chatbot.intent_cache.clear()
        return {"status": "cleared", "cache": "intent"}
    elif cache_type == "response":
        chatbot.response_cache.clear()
        return {"status": "cleared", "cache": "response"}
    else:
        chatbot.intent_cache.clear()
        chatbot.response_cache.clear()
        return {"status": "cleared", "cache": "all"}


@app.get("/health")
async def health():
    return {"status": "healthy", "version": "2.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
