"""
FastAPI entry point for AI Boiler Service
Provides REST API for security guardrail and maintenance analysis.
"""
import os
import logging
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.guardrail import SecurityGuardrail, CommandValidationRequest, CommandValidationResponse
from src.maintenance import MaintenanceAnalyzer, MaintenanceReport

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment
HA_URL = os.getenv("HA_URL", "http://172.28.0.10:8123")
HA_TOKEN = os.getenv("HA_TOKEN", "REPLACE_ME")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://172.28.0.40:11434")

# Global instances
guardrail: SecurityGuardrail = None
maintenance_analyzer: MaintenanceAnalyzer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    global guardrail, maintenance_analyzer
    
    logger.info("Initializing AI Boiler Service...")
    logger.info(f"HA URL: {HA_URL}")
    logger.info(f"Ollama URL: {OLLAMA_URL}")
    
    # Initialize services
    guardrail = SecurityGuardrail(
        ha_url=HA_URL,
        ha_token=HA_TOKEN,
        ollama_url=OLLAMA_URL
    )
    
    maintenance_analyzer = MaintenanceAnalyzer(
        ha_url=HA_URL,
        ha_token=HA_TOKEN,
        ollama_url=OLLAMA_URL
    )
    
    logger.info("AI Boiler Service initialized successfully")
    yield
    logger.info("Shutting down AI Boiler Service")


# Create FastAPI app
app = FastAPI(
    title="AI Boiler Security & Maintenance Service",
    description="AI-powered security guardrail and predictive maintenance for smart boiler systems",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AI Boiler Service",
        "status": "running",
        "version": "1.0.0",
        "features": ["security_guardrail", "maintenance_analyzer"]
    }


@app.get("/health")
async def health_check():
    """Health check with service status"""
    return {
        "status": "healthy",
        "guardrail": "ready" if guardrail else "not initialized",
        "maintenance": "ready" if maintenance_analyzer else "not initialized",
        "ha_url": HA_URL,
        "ollama_url": OLLAMA_URL
    }


# ===== SECURITY GUARDRAIL ENDPOINTS =====

@app.post("/validate_command", response_model=CommandValidationResponse)
async def validate_command(request: CommandValidationRequest):
    """
    Validate a command before execution.
    
    This endpoint checks:
    1. Hard-coded safety limits
    2. State consistency with Home Assistant
    3. LLM-based prompt injection detection
    
    Returns validation decision with reasoning.
    """
    if not guardrail:
        raise HTTPException(status_code=503, detail="Guardrail service not initialized")
    
    try:
        result = await guardrail.validate_command(request)
        logger.info(f"Command validation result: {result.allowed} - {result.reason}")
        return result
    except Exception as e:
        logger.error(f"Error validating command: {e}")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")


@app.post("/validate_command/batch")
async def validate_commands_batch(requests: List[CommandValidationRequest]):
    """Validate multiple commands in batch"""
    if not guardrail:
        raise HTTPException(status_code=503, detail="Guardrail service not initialized")
    
    results = []
    for request in requests:
        try:
            result = await guardrail.validate_command(request)
            results.append(result)
        except Exception as e:
            logger.error(f"Error validating command: {e}")
            results.append(CommandValidationResponse(
                allowed=False,
                reason=f"Validation error: {str(e)}",
                severity="danger"
            ))
    
    return results


# ===== MAINTENANCE ANALYZER ENDPOINTS =====

@app.get("/maintenance/report", response_model=MaintenanceReport)
async def get_maintenance_report(
    entity_ids: str,  # Comma-separated list
    hours: int = 168  # Default 1 week
):
    """
    Generate maintenance report for specified entities.
    
    Args:
        entity_ids: Comma-separated list of entity IDs to analyze
        hours: Number of hours of history to analyze (default: 168 = 1 week)
    
    Returns:
        Comprehensive maintenance report with anomalies and recommendations
    """
    if not maintenance_analyzer:
        raise HTTPException(status_code=503, detail="Maintenance analyzer not initialized")
    
    # Parse entity IDs
    entity_list = [e.strip() for e in entity_ids.split(",")]
    
    if not entity_list:
        raise HTTPException(status_code=400, detail="No entity IDs provided")
    
    try:
        report = await maintenance_analyzer.generate_maintenance_report(
            entity_ids=entity_list,
            hours=hours
        )
        logger.info(f"Generated maintenance report with health score: {report.health_score}")
        return report
    except Exception as e:
        logger.error(f"Error generating maintenance report: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")


@app.get("/maintenance/anomalies")
async def get_anomalies_only(entity_ids: str, hours: int = 168):
    """Get only anomalies without full report"""
    report = await get_maintenance_report(entity_ids, hours)
    return {
        "anomalies": report.anomalies,
        "health_score": report.health_score
    }


@app.get("/maintenance/optimizations")
async def get_optimizations(entity_ids: str, hours: int = 168):
    """Get only optimization suggestions"""
    report = await get_maintenance_report(entity_ids, hours)
    return {
        "optimizations": report.optimization_suggestions,
        "health_score": report.health_score
    }


# ===== CONFIGURATION ENDPOINTS =====

@app.get("/config/limits")
async def get_safety_limits():
    """Get current safety limit configuration"""
    if not guardrail:
        raise HTTPException(status_code=503, detail="Guardrail service not initialized")
    
    return {
        "temperature": {
            "max": guardrail.MAX_TEMPERATURE,
            "min": guardrail.MIN_TEMPERATURE
        },
        "pressure": {
            "max": guardrail.MAX_PRESSURE,
            "min": guardrail.MIN_PRESSURE
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
