# Bug Fixes - 26/01/2026

## 🐛 Bug Risolti

### 1. **Import Relativi Non Funzionanti**
**Problema**: `from guardrail import...` non funzionava in Docker  
**Fix**: Cambiati in `from src.guardrail import...` con PYTHONPATH=/app nel Dockerfile

### 2. **Timezone Issues con Home Assistant API**
**Problema**: datetime.now() creava timestamp naive incompatibili con HA  
**Fix**: Usato `datetime.now(timezone.utc)` per timezone-aware timestamps

### 3. **Parsing Datetime Fragile**
**Problema**: Crash su formati datetime variabili da HA  
**Fix**: Aggiunto fallback con try/except multipli per gestire vari formati

### 4. **Division by Zero in Cycle Analysis**
**Problema**: `days = hours / 24` poteva essere 0  
**Fix**: Usato `days = max(hours / 24, 0.1)` per garantire minimo

### 5. **Empty Data Array Handling**
**Problema**: Crash su risposte vuote/invalide da HA  
**Fix**: Controlli multipli su type e length prima di accedere ai dati

### 6. **Dockerfile PYTHONPATH Missing**
**Problema**: Imports falliscono dentro container  
**Fix**: Aggiunto `ENV PYTHONPATH=/app` al Dockerfile

## ✅ Validazione

- ✅ Dockerfile corretto
- ✅ Import paths corretti
- ✅ Timezone handling robusto
- ✅ Error handling migliorato
- ✅ Division by zero protetto

## 📝 File Modificati

1. `ai_boiler/src/main.py` - Import corretti
2. `ai_boiler/src/maintenance.py` - Timezone + error handling
3. `ai_boiler/Dockerfile` - PYTHONPATH
4. `ai_boiler/test_local.py` - Unit test creato
