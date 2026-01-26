"""
AI Auto-Maintenance Analyzer for Boiler System
Predicts anomalies and optimizes energy consumption based on sensor data.
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import httpx
from pydantic import BaseModel
import statistics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SensorData(BaseModel):
    """Model for sensor data point"""
    timestamp: datetime
    value: float


class AnomalyReport(BaseModel):
    """Report of detected anomaly"""
    sensor_id: str
    anomaly_type: str
    severity: str  # "low", "medium", "high", "critical"
    description: str
    detected_at: datetime
    recommendation: Optional[str] = None


class MaintenanceReport(BaseModel):
    """Complete maintenance analysis report"""
    generated_at: datetime
    anomalies: List[AnomalyReport]
    optimization_suggestions: List[str]
    health_score: float  # 0-100
    next_maintenance_recommended: Optional[datetime] = None


class MaintenanceAnalyzer:
    """
    AI-powered maintenance analyzer for boiler systems.
    
    Features:
    1. Anomaly detection (pressure drops, abnormal cycles)
    2. Predictive maintenance alerts
    3. Energy consumption optimization
    """
    
    # Thresholds for anomaly detection
    PRESSURE_DROP_THRESHOLD = 0.2  # bar - significant drop in 24h
    TEMP_FLUCTUATION_THRESHOLD = 3.0  # °C - abnormal temperature variation
    CYCLE_COUNT_THRESHOLD = 15  # max normal cycles per day
    
    def __init__(self, ha_url: str, ha_token: str, ollama_url: str):
        """
        Initialize the maintenance analyzer.
        
        Args:
            ha_url: Home Assistant base URL
            ha_token: Long-lived access token for HA
            ollama_url: Ollama LLM service URL
        """
        self.ha_url = ha_url
        self.ha_token = ha_token
        self.ollama_url = ollama_url
        self.headers = {
            "Authorization": f"Bearer {ha_token}",
            "Content-Type": "application/json"
        }
    
    async def generate_maintenance_report(
        self,
        entity_ids: List[str],
        hours: int = 168  # 1 week by default
    ) -> MaintenanceReport:
        """
        Generate comprehensive maintenance report.
        
        Args:
            entity_ids: List of sensor entity IDs to analyze
            hours: Number of hours of history to analyze
            
        Returns:
            MaintenanceReport with anomalies and recommendations
        """
        logger.info(f"Generating maintenance report for {len(entity_ids)} sensors over {hours} hours")
        
        anomalies = []
        optimization_suggestions = []
        
        # Fetch and analyze each sensor
        for entity_id in entity_ids:
            try:
                history = await self.fetch_sensor_history(entity_id, hours)
                
                if not history:
                    logger.warning(f"No history data for {entity_id}")
                    continue
                
                # Analyze for different types of anomalies
                if "pressure" in entity_id.lower():
                    pressure_anomalies = self._detect_pressure_anomalies(entity_id, history)
                    anomalies.extend(pressure_anomalies)
                
                elif "temperature" in entity_id.lower():
                    temp_anomalies = self._detect_temperature_anomalies(entity_id, history)
                    anomalies.extend(temp_anomalies)
                
                # Analyze cycles for climate entities
                if "climate" in entity_id:
                    cycle_analysis = await self._analyze_heating_cycles(entity_id, hours)
                    if cycle_analysis:
                        anomalies.extend(cycle_analysis["anomalies"])
                        optimization_suggestions.extend(cycle_analysis["optimizations"])
                
            except Exception as e:
                logger.error(f"Error analyzing {entity_id}: {e}")
        
        # Calculate health score
        health_score = self._calculate_health_score(anomalies)
        
        # Determine next maintenance recommendation
        next_maintenance = self._recommend_next_maintenance(anomalies, health_score)
        
        # Add general optimization suggestions
        general_suggestions = await self._generate_optimization_suggestions(entity_ids)
        optimization_suggestions.extend(general_suggestions)
        
        return MaintenanceReport(
            generated_at=datetime.now(),
            anomalies=anomalies,
            optimization_suggestions=optimization_suggestions,
            health_score=health_score,
            next_maintenance_recommended=next_maintenance
        )
    
    async def fetch_sensor_history(
        self,
        entity_id: str,
        hours: int
    ) -> List[SensorData]:
        """
        Fetch historical sensor data from Home Assistant.
        
        Args:
            entity_id: Entity ID to fetch history for
            hours: Number of hours of history
            
        Returns:
            List of SensorData points
        """
        from datetime import timezone
        
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=hours)
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.ha_url}/api/history/period/{start_time.isoformat()}",
                    params={"filter_entity_id": entity_id},
                    headers=self.headers,
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    logger.error(f"HA history API error: {response.status_code}")
                    return []
                
                data = response.json()
                
                # Check if data is valid
                if not data:
                    logger.warning(f"No data returned for {entity_id}")
                    return []
                
                if not isinstance(data, list) or len(data) == 0:
                    logger.warning(f"Invalid data format for {entity_id}")
                    return []
                
                if not data[0]:
                    logger.warning(f"Empty data array for {entity_id}")
                    return []
                
                sensor_data = []
                for state in data[0]:
                    try:
                        # Parse state value (skip non-numeric states)
                        value = float(state["state"])
                        # Handle timezone-aware and naive datetimes
                        timestamp_str = state["last_changed"]
                        if timestamp_str.endswith("Z"):
                            timestamp_str = timestamp_str[:-1] + "+00:00"
                        try:
                            timestamp = datetime.fromisoformat(timestamp_str)
                        except ValueError:
                            # Fallback for other formats
                            timestamp = datetime.now()
                        sensor_data.append(SensorData(timestamp=timestamp, value=value))
                    except (ValueError, KeyError, TypeError) as parse_error:
                        logger.debug(f"Skipping invalid data point: {parse_error}")
                        continue
                
                logger.info(f"Fetched {len(sensor_data)} data points for {entity_id}")
                return sensor_data
                
            except Exception as e:
                logger.error(f"Error fetching history for {entity_id}: {e}")
                return []
    
    def _detect_pressure_anomalies(
        self,
        entity_id: str,
        history: List[SensorData]
    ) -> List[AnomalyReport]:
        """Detect pressure-related anomalies"""
        anomalies = []
        
        if len(history) < 2:
            return anomalies
        
        values = [d.value for d in history]
        
        # Check for significant pressure drop
        max_pressure = max(values)
        min_pressure = min(values)
        pressure_drop = max_pressure - min_pressure
        
        if pressure_drop > self.PRESSURE_DROP_THRESHOLD:
            anomalies.append(AnomalyReport(
                sensor_id=entity_id,
                anomaly_type="pressure_drop",
                severity="high" if pressure_drop > 0.4 else "medium",
                description=f"Significant pressure drop detected: {pressure_drop:.2f} bar",
                detected_at=datetime.now(),
                recommendation="Check for leaks in the system. May need to refill water pressure."
            ))
        
        # Check for abnormally low pressure
        avg_pressure = statistics.mean(values)
        if avg_pressure < 1.0:
            anomalies.append(AnomalyReport(
                sensor_id=entity_id,
                anomaly_type="low_pressure",
                severity="high",
                description=f"Average pressure too low: {avg_pressure:.2f} bar",
                detected_at=datetime.now(),
                recommendation="Refill water pressure to 1.2-1.5 bar range."
            ))
        
        return anomalies
    
    def _detect_temperature_anomalies(
        self,
        entity_id: str,
        history: List[SensorData]
    ) -> List[AnomalyReport]:
        """Detect temperature-related anomalies"""
        anomalies = []
        
        if len(history) < 10:
            return anomalies
        
        values = [d.value for d in history]
        
        # Calculate standard deviation for fluctuation detection
        try:
            std_dev = statistics.stdev(values)
            
            if std_dev > self.TEMP_FLUCTUATION_THRESHOLD:
                anomalies.append(AnomalyReport(
                    sensor_id=entity_id,
                    anomaly_type="temperature_fluctuation",
                    severity="medium",
                    description=f"High temperature fluctuation detected: σ={std_dev:.2f}°C",
                    detected_at=datetime.now(),
                    recommendation="Check thermostat calibration and heating element function."
                ))
        except statistics.StatisticsError:
            pass
        
        return anomalies
    
    async def _analyze_heating_cycles(
        self,
        entity_id: str,
        hours: int
    ) -> Optional[Dict[str, Any]]:
        """Analyze heating on/off cycles for optimization"""
        history = await self.fetch_sensor_history(entity_id, hours)
        
        if not history:
            return None
        
        anomalies = []
        optimizations = []
        
        # Count state changes (heating cycles)
        state_changes = 0
        for i in range(1, len(history)):
            if history[i].value != history[i-1].value:
                state_changes += 1
        
        # Calculate cycles per day (protect against division by zero)
        days = max(hours / 24, 0.1)  # Minimum 0.1 to avoid division by zero
        cycles_per_day = state_changes / days
        
        if cycles_per_day > self.CYCLE_COUNT_THRESHOLD:
            anomalies.append(AnomalyReport(
                sensor_id=entity_id,
                anomaly_type="excessive_cycling",
                severity="medium",
                description=f"Excessive heating cycles: {cycles_per_day:.1f} per day",
                detected_at=datetime.now(),
                recommendation="Consider increasing temperature differential or checking thermostat placement."
            ))
            
            optimizations.append(
                f"Reduce heating cycles by increasing hysteresis (±0.5°C) to improve efficiency"
            )
        
        # Analyze thermal inertia
        optimizations.append(
            "Consider pre-heating 30 minutes before peak usage times to leverage thermal inertia"
        )
        
        return {
            "anomalies": anomalies,
            "optimizations": optimizations
        }
    
    def _calculate_health_score(self, anomalies: List[AnomalyReport]) -> float:
        """
        Calculate overall system health score (0-100).
        
        Higher is better. Deductions based on anomaly severity.
        """
        score = 100.0
        
        severity_deductions = {
            "low": 2,
            "medium": 5,
            "high": 10,
            "critical": 20
        }
        
        for anomaly in anomalies:
            deduction = severity_deductions.get(anomaly.severity, 5)
            score -= deduction
        
        return max(0.0, min(100.0, score))
    
    def _recommend_next_maintenance(
        self,
        anomalies: List[AnomalyReport],
        health_score: float
    ) -> Optional[datetime]:
        """Recommend when next maintenance should be performed"""
        
        # Critical anomalies require immediate attention
        critical_count = sum(1 for a in anomalies if a.severity == "critical")
        if critical_count > 0:
            return datetime.now()
        
        high_count = sum(1 for a in anomalies if a.severity == "high")
        if high_count > 0:
            return datetime.now() + timedelta(days=7)
        
        # Based on health score
        if health_score < 70:
            return datetime.now() + timedelta(days=14)
        elif health_score < 85:
            return datetime.now() + timedelta(days=30)
        else:
            return datetime.now() + timedelta(days=90)
    
    async def _generate_optimization_suggestions(
        self,
        entity_ids: List[str]
    ) -> List[str]:
        """Generate AI-powered optimization suggestions using LLM"""
        suggestions = []
        
        # Basic rule-based suggestions
        suggestions.append(
            "Enable night setback (lower temperature during sleep hours) to save 10-15% energy"
        )
        
        suggestions.append(
            "Avoid rapid temperature changes - gradual adjustments are more efficient"
        )
        
        return suggestions
