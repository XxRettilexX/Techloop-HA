"""
OpenTherm Boiler Simulator - Advanced Realistic Implementation
Simulates a residential gas boiler with OpenTherm protocol including:
- Realistic thermal dynamics with hysteresis
- Anti-legionella cycles
- Sensor noise and drift
- Component wear simulation
- Multiple operating modes
- Frost protection
"""
import paho.mqtt.client as mqtt
import time
import json
import random
import os
import math
from datetime import datetime, timedelta

# --- Configuration ---
BROKER = os.getenv("MQTT_BROKER", "172.28.0.20")
PORT = 1883
TOPIC_BASE = "otgw"

# --- Physics Constants ---
AMBIENT_TEMP = 20.0  # °C - Room temperature when off
MAX_WATER_TEMP = 80.0  # °C - Maximum water temperature (safety limit)
MIN_WATER_TEMP = 30.0  # °C - Minimum water temperature (technical limit)
FROST_PROTECTION_TEMP = 5.0  # °C - Activate frost protection below this
ANTI_LEGIONELLA_TEMP = 65.0  # °C - Temperature for legionella prevention

# --- Thermal Dynamics ---
BOILER_THERMAL_MASS = 15.0  # kg water equivalent
BOILER_POWER_MAX = 24000.0  # W - Maximum burner output
BOILER_POWER_MIN = 6000.0  # W - Minimum modulation power (25%)
HEAT_LOSS_COEFFICIENT = 50.0  # W/°C - Heat loss to surroundings

# --- PID Controller Parameters ---
KP = 5.0  # Proportional gain
KI = 0.1  # Integral gain  
KD = 1.0  # Derivative gain
INTEGRAL_MAX = 100.0  # Anti-windup limit

# --- Hysteresis and Safety ---
FLAME_ON_HYSTERESIS = 3.0  # °C below setpoint to ignite
FLAME_OFF_HYSTERESIS = 1.0  # °C above setpoint to extinguish
MIN_BURNER_ON_TIME = 30  # seconds - Minimum run time once ignited
MIN_BURNER_OFF_TIME = 180  # seconds - Minimum off time (short-cycle protection)
MAX_IGNITION_ATTEMPTS = 3

# --- Component Wear ---
INITIAL_EFFICIENCY = 0.92  # 92% efficiency when new
EFFICIENCY_DEGRADATION_RATE = 0.00001  # % per hour of operation

# --- Climate Curve Parameters ---
CLIMATE_CURVE_COEFFICIENT = 1.5

# --- State Variables ---
state = {
    # Temperatures
    "boiler_temp": 25.0,  # °C - Current boiler water temperature
    "return_temp": 22.0,  # °C - Return water temperature  
    "exhaust_temp": 80.0,  # °C - Flue gas temperature
    "setpoint": 45.0,  # °C - Water temperature setpoint
    
    # Modulation and flame
    "modulation": 0.0,  # % - Burner modulation (0-100%)
    "flame_on": False,
    "target_modulation": 0.0,
    
    # Pressure and flow
    "pressure": 1.5,  # bar - System water pressure
    "flow_rate": 0.0,  # L/min - Circulation flow
    
    # Operating state
    "enabled": True,
    "mode": "standby",  # standby, heating, anti_legionella, frost_protection, error
    "outdoor_temp": 10.0,
    "indoor_temp": 18.0,
    "heating_demand": 0.0,
    
    # Control
    "integral_error": 0.0,
    "last_error": 0.0,
    
    # Timing
    "burner_on_time": 0,  # seconds since flame on
    "burner_off_time": 300,  # seconds since flame off (start high to allow ignition)
    "last_anti_legionella": None,
    
    # Diagnostics
    "ignition_attempts": 0,
    "total_run_hours": 0.0,
    "efficiency": INITIAL_EFFICIENCY,
    "cycles_today": 0,
    "error_code": None,
    
    # Sensor simulation
    "sensor_noise_temp": 0.0,
    "sensor_drift_pressure": 0.0,
}

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "OT_Simulator_v2")

def on_connect(client, userdata, flags, rc, properties):
    print(f"Connected to MQTT Broker with result code {rc}")
    
    # Subscribe to setpoint commands
    client.subscribe(f"{TOPIC_BASE}/setpoint/set")
    client.subscribe(f"{TOPIC_BASE}/mode/set")
    
    # Subscribe to thermal simulator data
    client.subscribe("home/sensor/outdoor_temp")
    client.subscribe("home/sensor/indoor_temp")
    client.subscribe("home/heating/demand")
    
    print("Subscribed to control and thermal topics")

def on_message(client, userdata, msg):
    """Handle incoming MQTT messages"""
    global state
    
    try:
        # Mode control
        if msg.topic == f"{TOPIC_BASE}/mode/set":
            mode_cmd = msg.payload.decode().lower()
            print(f"🔧 Mode Command: {mode_cmd}")
            
            if mode_cmd in ["off", "0", "false"]:
                state["enabled"] = False
                state["mode"] = "standby"
            else:
                state["enabled"] = True
                state["mode"] = "heating"
            
            client.publish(f"{TOPIC_BASE}/mode/state", "heat" if state["enabled"] else "off", retain=True)
            return
        
        # Setpoint control
        if msg.topic == f"{TOPIC_BASE}/setpoint/set":
            try:
                requested_temp = float(msg.payload.decode())
                state["setpoint"] = max(MIN_WATER_TEMP, min(MAX_WATER_TEMP, requested_temp))
                print(f"🌡️ New Water Setpoint: {state['setpoint']:.1f}°C")
                client.publish(f"{TOPIC_BASE}/setpoint/state", state["setpoint"], retain=True)
            except ValueError:
                print("❌ Invalid setpoint payload")
            return
        
        # Thermal simulator data
        if msg.topic == "home/sensor/outdoor_temp":
            state["outdoor_temp"] = float(msg.payload.decode())
        elif msg.topic == "home/sensor/indoor_temp":
            state["indoor_temp"] = float(msg.payload.decode())
        elif msg.topic == "home/heating/demand":
            state["heating_demand"] = float(msg.payload.decode())
    
    except Exception as e:
        print(f"Error handling message: {e}")

def calculate_climate_curve_setpoint():
    """
    Calculate optimal water temperature based on outdoor temperature.
    Climate compensation curve: colder outside = hotter water needed.
    """
    target_indoor = 20.0  # °C - Standard comfort temperature
    temp_diff = max(0, target_indoor - state["outdoor_temp"])
    water_temp = 35.0 + (CLIMATE_CURVE_COEFFICIENT * temp_diff)
    return max(MIN_WATER_TEMP, min(MAX_WATER_TEMP, water_temp))

def check_anti_legionella():
    """
    Check if anti-legionella cycle is needed.
    Should run weekly to heat DHW to 65°C for legionella prevention.
    """
    now = datetime.now()
    
    if state["last_anti_legionella"] is None:
        state["last_anti_legionella"] = now
        return False
    
    # Run every 7 days at 3 AM
    days_since = (now - state["last_anti_legionella"]).days
    if days_since >= 7 and now.hour == 3 and state["mode"] != "anti_legionella":
        print("🦠 Starting Anti-Legionella cycle...")
        state["mode"] = "anti_legionella"
        state["last_anti_legionella"] = now
        return True
    
    return False

def check_frost_protection():
    """
    Activate frost protection if outdoor temperature is very low.
    Prevents pipes and boiler from freezing.
    """
    if state["outdoor_temp"] < FROST_PROTECTION_TEMP and state["boiler_temp"] < 10:
        if state["mode"] != "frost_protection":
            print("❄️ Activating Frost Protection!")
            state["mode"] = "frost_protection"
        return True
    return False

def simulate_sensor_noise():
    """
    Add realistic sensor noise and drift to measurements.
    Temperature sensors typically have ±0.5°C accuracy.
    Pressure sensors drift over time.
    """
    # Temperature noise (Gaussian, small amplitude)
    state["sensor_noise_temp"] = random.gauss(0, 0.2)
    
    # Pressure drift (slow random walk)
    state["sensor_drift_pressure"] += random.gauss(0, 0.001)
    state["sensor_drift_pressure"] = max(-0.1, min(0.1, state["sensor_drift_pressure"]))

def calculate_pid_modulation(setpoint, current_temp):
    """
    PID controller for modulation with anti-windup.
    """
    error = setpoint - current_temp
    
    # Proportional
    p_term = KP * error
    
    # Integral (with anti-windup)
    state["integral_error"] += error
    state["integral_error"] = max(-INTEGRAL_MAX, min(INTEGRAL_MAX, state["integral_error"]))
    i_term = KI * state["integral_error"]
    
    # Derivative
    d_term = KD * (error - state["last_error"])
    state["last_error"] = error
    
    # Combine
    output = p_term + i_term + d_term
    
    return max(0, min(100, output))

def update_physics():
    """Advanced boiler physics simulation with realistic behavior"""
    
    # Check special modes
    check_anti_legionella()
    check_frost_protection()
    
    # Simulate sensor noise
    simulate_sensor_noise()
    
    # Determine effective setpoint based on mode
    if state["mode"] == "anti_legionella":
        effective_setpoint = ANTI_LEGIONELLA_TEMP
        # Exit anti-legionella when temperature reached and held
        if state["boiler_temp"] >= ANTI_LEGIONELLA_TEMP - 2:
            state["mode"] = "heating" if state["enabled"] else "standby"
    elif state["mode"] == "frost_protection":
        effective_setpoint = 35.0  # Keep warm enough to prevent freezing
        if state["boiler_temp"] > 40 and state["outdoor_temp"] > FROST_PROTECTION_TEMP:
            state["mode"] = "heating" if state["enabled"] else "standby"
    elif not state["enabled"]:
        effective_setpoint = 0
        state["mode"] = "standby"
    else:
        effective_setpoint = state["setpoint"]
        state["mode"] = "heating"
    
    # Calculate target modulation using PID
    if state["mode"] in ["heating", "anti_legionella", "frost_protection"]:
        state["target_modulation"] = calculate_pid_modulation(effective_setpoint, state["boiler_temp"])
    else:
        state["target_modulation"] = 0
        state["integral_error"] = 0  # Reset integral
    
    # Apply heating demand as a boost factor
    if state["heating_demand"] > 50:
        boost = (state["heating_demand"] - 50) * 0.2
        state["target_modulation"] = min(100, state["target_modulation"] + boost)
    
    # Hysteresis logic for flame control
    if not state["flame_on"]:
        # Flame is off - check if we should ignite
        temp_below_setpoint = effective_setpoint - state["boiler_temp"]
        
        if (temp_below_setpoint >= FLAME_ON_HYSTERESIS and 
            state["target_modulation"] > 20 and
            state["burner_off_time"] >= MIN_BURNER_OFF_TIME):
            
            # Try to ignite
            state["ignition_attempts"] += 1
            if state["ignition_attempts"] <= MAX_IGNITION_ATTEMPTS:
                state["flame_on"] = True
                state["burner_on_time"] = 0
                state["cycles_today"] += 1
                print(f"🔥 Ignition successful (attempt {state['ignition_attempts']})")
            else:
                state["error_code"] = "E01"  # Ignition failure
                state["mode"] = "error"
                print("⚠️ ERROR: Too many ignition attempts!")
        else:
            state["burner_off_time"] += 1
            state["ignition_attempts"] = 0  # Reset after cooldown
    else:
        # Flame is on
        state["burner_on_time"] += 1
        state["burner_off_time"] = 0
        
        # Check if we should extinguish (with minimum run time)
        temp_above_setpoint = state["boiler_temp"] - effective_setpoint
        
        if (temp_above_setpoint >= FLAME_OFF_HYSTERESIS and 
            state["burner_on_time"] >= MIN_BURNER_ON_TIME):
            state["flame_on"] = False
            print("⚫ Flame off - setpoint reached")
        elif state["target_modulation"] < 5 and state["burner_on_time"] >= MIN_BURNER_ON_TIME:
            state["flame_on"] = False
            print("⚫ Flame off - no demand")
    
    # Smooth modulation transitions
    mod_rate = 3.0  # % per second max change
    if state["flame_on"]:
        # Ramp up/down to target
        if state["modulation"] < state["target_modulation"]:
            state["modulation"] = min(state["target_modulation"], state["modulation"] + mod_rate)
        else:
            state["modulation"] = max(state["target_modulation"], state["modulation"] - mod_rate)
        # Enforce minimum modulation when burning
        state["modulation"] = max(25, state["modulation"])  # Min 25% when flame on
    else:
        # Ramp down to zero
        state["modulation"] = max(0, state["modulation"] - mod_rate * 2)
    
    # Temperature physics
    dt = 1.0  # 1 second timestep
    
    if state["flame_on"] and state["modulation"] > 0:
        # Heat input (W)
        heat_input = BOILER_POWER_MIN + (BOILER_POWER_MAX - BOILER_POWER_MIN) * (state["modulation"] / 100.0)
        heat_input *= state["efficiency"]  # Apply efficiency
        
        # Track run hours
        state["total_run_hours"] += dt / 3600.0
        
        # Degrade efficiency slowly
        state["efficiency"] = max(0.80, INITIAL_EFFICIENCY - (state["total_run_hours"] * EFFICIENCY_DEGRADATION_RATE))
    else:
        heat_input = 0
    
    # Heat loss (W) - depends on temperature difference to ambient
    heat_loss = HEAT_LOSS_COEFFICIENT * (state["boiler_temp"] - AMBIENT_TEMP)
    
    # Heat extracted by heating circuit (when circulating)
    if state["heating_demand"] > 5:
        # More heat extracted when demand is higher
        circuit_extraction = 1000 + state["heating_demand"] * 50  # W
        state["flow_rate"] = 8 + state["heating_demand"] * 0.12  # L/min
    else:
        circuit_extraction = 200  # Minimal standby losses
        state["flow_rate"] = 0
    
    # Net heat change
    net_heat = heat_input - heat_loss - circuit_extraction
    
    # Temperature change: ΔT = Q * dt / (m * cp)
    # Assuming water: cp = 4186 J/(kg·°C)
    delta_temp = (net_heat * dt) / (BOILER_THERMAL_MASS * 4186)
    state["boiler_temp"] += delta_temp
    
    # Return temperature follows supply with lag and delta-T
    target_delta_t = 10 + (state["modulation"] / 100) * 10  # 10-20°C delta
    target_return = state["boiler_temp"] - target_delta_t
    state["return_temp"] += (target_return - state["return_temp"]) * 0.05  # Slow lag
    
    # Exhaust temperature (higher with more modulation)
    state["exhaust_temp"] = 50 + state["modulation"] * 1.5 + random.gauss(0, 2)
    
    # Pressure variation (increases with temperature, natural noise)
    base_pressure = 1.3 + ((state["boiler_temp"] - 20) * 0.008)
    state["pressure"] = base_pressure + state["sensor_drift_pressure"] + random.gauss(0, 0.02)
    
    # Safety limits
    state["boiler_temp"] = max(10, min(MAX_WATER_TEMP + 5, state["boiler_temp"]))  # Allow slight overshoot for realism
    state["return_temp"] = max(10, min(state["boiler_temp"], state["return_temp"]))
    state["pressure"] = max(0.3, min(3.5, state["pressure"]))
    
    # High limit safety
    if state["boiler_temp"] > MAX_WATER_TEMP:
        state["flame_on"] = False
        state["modulation"] = 0
        if state["boiler_temp"] > MAX_WATER_TEMP + 3:
            state["error_code"] = "E02"  # Overheat
            state["mode"] = "error"
            print("⚠️ SAFETY: Overtemperature lockout!")

def publish_telemetry():
    """Publish comprehensive boiler telemetry to MQTT"""
    # Core values (with simulated sensor noise)
    reported_temp = round(state["boiler_temp"] + state["sensor_noise_temp"], 1)
    reported_return = round(state["return_temp"] + state["sensor_noise_temp"] * 0.5, 1)
    
    client.publish(f"{TOPIC_BASE}/status/boiler_temp", reported_temp)
    client.publish(f"{TOPIC_BASE}/status/return_temp", reported_return)
    client.publish(f"{TOPIC_BASE}/status/modulation", int(state["modulation"]))
    client.publish(f"{TOPIC_BASE}/status/pressure", round(state["pressure"], 2))
    client.publish(f"{TOPIC_BASE}/status/flame", "ON" if state["flame_on"] else "OFF")
    client.publish(f"{TOPIC_BASE}/mode/state", state["mode"])
    
    # Extended diagnostics
    diagnostics = {
        "boiler_temp": reported_temp,
        "return_temp": reported_return,
        "exhaust_temp": round(state["exhaust_temp"], 1),
        "setpoint": round(state["setpoint"], 1),
        "modulation": int(state["modulation"]),
        "target_modulation": int(state["target_modulation"]),
        "flame": state["flame_on"],
        "mode": state["mode"],
        "pressure": round(state["pressure"], 2),
        "flow_rate": round(state["flow_rate"], 1),
        "outdoor_temp": round(state["outdoor_temp"], 1),
        "heating_demand": round(state["heating_demand"], 1),
        "efficiency": round(state["efficiency"] * 100, 1),
        "run_hours": round(state["total_run_hours"], 1),
        "cycles_today": state["cycles_today"],
        "error_code": state["error_code"]
    }
    client.publish(f"{TOPIC_BASE}/diagnostics", json.dumps(diagnostics))

# Configure MQTT
client.on_connect = on_connect
client.on_message = on_message

# Connect to broker
print(f"Connecting to broker at {BROKER}:{PORT}...")
while True:
    try:
        client.connect(BROKER, PORT, 60)
        break
    except Exception as e:
        print(f"Waiting for broker... ({e})")
        time.sleep(5)

client.loop_start()

# Initial state publish
client.publish(f"{TOPIC_BASE}/setpoint/state", state["setpoint"], retain=True)
client.publish(f"{TOPIC_BASE}/mode/state", state["mode"], retain=True)

print("\n" + "="*70)
print("🔥 OPENTHERM BOILER SIMULATOR v2.0 - Advanced Realistic Physics")
print("="*70)
print(f"Max Power: {BOILER_POWER_MAX/1000:.0f} kW | Min Modulation: 25%")
print(f"Water Temp Range: {MIN_WATER_TEMP}-{MAX_WATER_TEMP}°C")
print(f"Initial Efficiency: {state['efficiency']*100:.0f}%")
print(f"Short-cycle Protection: {MIN_BURNER_OFF_TIME}s off, {MIN_BURNER_ON_TIME}s on minimum")
print(f"Hysteresis: +{FLAME_OFF_HYSTERESIS}°C off, -{FLAME_ON_HYSTERESIS}°C on")
print("="*70)
print("Features: PID control, anti-legionella, frost protection, wear simulation")
print("="*70 + "\n")

# Main loop
last_print = time.time()
last_daily_reset = datetime.now().date()

try:
    while True:
        # Daily reset of cycle counter
        if datetime.now().date() != last_daily_reset:
            state["cycles_today"] = 0
            last_daily_reset = datetime.now().date()
        
        update_physics()
        publish_telemetry()
        
        # Print status every 10 seconds
        if time.time() - last_print > 10:
            flame_icon = "🔥" if state["flame_on"] else "⚫"
            mode_icon = {"heating": "♨️", "standby": "💤", "anti_legionella": "🦠", 
                        "frost_protection": "❄️", "error": "⚠️"}.get(state["mode"], "❓")
            
            print(f"{flame_icon} {mode_icon} Water: {state['boiler_temp']:.1f}°C | "
                  f"SP: {state['setpoint']:.1f}°C | "
                  f"Mod: {state['modulation']:.0f}% | "
                  f"Pressure: {state['pressure']:.2f}bar | "
                  f"Demand: {state['heating_demand']:.0f}% | "
                  f"η: {state['efficiency']*100:.1f}%")
            last_print = time.time()
        
        time.sleep(1)

except KeyboardInterrupt:
    print("\n👋 Shutting down OpenTherm Boiler Simulator v2.0...")
    print(f"   Total run hours: {state['total_run_hours']:.1f}h")
    print(f"   Final efficiency: {state['efficiency']*100:.1f}%")
    client.loop_stop()
    client.disconnect()
