"""
OpenTherm Boiler Simulator - Realistic Implementation
Simulates a residential boiler with OpenTherm protocol
Now aligned with AI guardrail limits and realistic physics
"""
import paho.mqtt.client as mqtt
import time
import json
import random
import os

# --- Configuration ---
BROKER = "172.28.0.20"
PORT = 1883
TOPIC_BASE = "otgw"

# --- Physics Constants ---
AMBIENT_TEMP = 20.0  # °C - Room temperature when off
MAX_WATER_TEMP = 80.0  # °C - Maximum water temperature (safety)
MIN_WATER_TEMP = 30.0  # °C - Minimum water temperature (technical limit)
HEATING_RATE = 0.8  # °C/s at max modulation
COOLING_RATE = 0.15  # °C/s natural cooling
RETURN_DELTA_T = 10.0  # °C - Typical delta T between supply and return

# --- Climate Curve Parameters ---
# Water temperature calculation based on outdoor temperature
# Warmer water when it's colder outside
CLIMATE_CURVE_COEFFICIENT = 1.5  # Slope of the curve

# --- State Variables ---
state = {
    "boiler_temp": 30.0,  # °C - Current boiler water temperature
    "return_temp": 25.0,  # °C - Return water temperature  
    "setpoint": 45.0,  # °C - Water temperature setpoint (30-80°C range)
    "modulation": 0.0,  # % - Burner modulation (0-100%)
    "pressure": 1.5,  # bar - Water pressure
    "flame_on": False,  # Boolean - Flame status
    "enabled": True,  # Boolean - Boiler enabled/disabled
    "outdoor_temp": 10.0,  # °C - Outdoor temperature (from thermal sim)
    "indoor_temp": 18.0,  # °C - Indoor temperature (from thermal sim)
    "heating_demand": 0.0,  # % - Heating demand from thermal sim
}

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "OT_Simulator")

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
            
            state["enabled"] = mode_cmd not in ["off", "0", "false"]
            
            # Publish state immediately
            new_mode = "heat" if state["enabled"] else "off"
            client.publish(f"{TOPIC_BASE}/mode/state", new_mode, retain=True)
            return
        
        # Setpoint control (water temperature)
        if msg.topic == f"{TOPIC_BASE}/setpoint/set":
            try:
                requested_temp = float(msg.payload.decode())
                # Clamp to realistic water temperature range
                state["setpoint"] = max(MIN_WATER_TEMP, min(MAX_WATER_TEMP, requested_temp))
                print(f"🌡️  New Water Setpoint: {state['setpoint']:.1f}°C")
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
    Calculate optimal water temperature based on outdoor temperature
    Climate compensation curve: colder outside = hotter water needed
    """
    # Base calculation: T_water = 20 + k * (T_target - T_outdoor)
    # Where k is the curve coefficient (typically 1.0-2.0)
    
    target_indoor = 20.0  # °C - Standard comfort temperature
    
    # Temperature difference to compensate
    temp_diff = max(0, target_indoor - state["outdoor_temp"])
    
    # Calculate water temperature
    water_temp = 35.0 + (CLIMATE_CURVE_COEFFICIENT * temp_diff)
    
    # Clamp to safe range
    return max(MIN_WATER_TEMP, min(MAX_WATER_TEMP, water_temp))

def update_physics():
    """Update boiler physics simulation"""
    
    if not state["enabled"]:
        # Boiler is off - modulation goes to zero
        target_mod = 0.0
    else:
        # Use climate curve to determine optimal setpoint
        # (Only if no manual setpoint override)
        auto_setpoint = calculate_climate_curve_setpoint()
        
        # For now, use manual setpoint if set, otherwise auto
        # In a real system, this would be selectable
        effective_setpoint = state["setpoint"]
        
        # PID-like control for modulation
        # Error between setpoint and current temp
        error = effective_setpoint - state["boiler_temp"]
        
        # Proportional control with softer gain
        kp = 3.0  # Proportional gain (% per °C error)
        target_mod = error * kp
        
        # Add feedback from heating demand
        # If house needs more heat, increase modulation
        demand_contribution = state["heating_demand"] * 0.3
        target_mod += demand_contribution
        
        # Clamp to 0-100%
        target_mod = max(0.0, min(100.0, target_mod))
    
    # Smooth modulation transitions (rate limiting)
    mod_rate = 2.0  # % per second max change
    if target_mod > state["modulation"]:
        state["modulation"] += min(mod_rate, target_mod - state["modulation"])
    elif target_mod < state["modulation"]:
        state["modulation"] -= min(mod_rate, state["modulation"] - target_mod)
    
    # Ensure bounds
    state["modulation"] = max(0.0, min(100.0, state["modulation"]))
    
    # Flame is on if modulation above minimum
    state["flame_on"] = state["modulation"] > 5.0
    
    # Temperature physics
    if state["flame_on"]:
        # Heat added proportional to modulation
        heat_input = (state["modulation"] / 100.0) * HEATING_RATE
        state["boiler_temp"] += heat_input
    
    # Natural cooling (heat loss to environment and circuit)
    cooling = COOLING_RATE
    
    # Increased cooling when circulating (pump on)
    if state["heating_demand"] > 10:
        cooling *= 1.5  # More heat transferred to radiators
    
    state["boiler_temp"] -= cooling
    
    # Return temperature follows boiler with lag
    target_return = state["boiler_temp"] - RETURN_DELTA_T
    state["return_temp"] += (target_return - state["return_temp"]) * 0.1
    
    # Pressure variation (realistic)
    # Pressure increases slightly with temperature
    noise = random.uniform(-0.01, 0.01)
    base_pressure = 1.5 + ((state["boiler_temp"] - 30) * 0.003)
    state["pressure"] = round(base_pressure + noise, 2)
    
    # Safety limits
    state["boiler_temp"] = max(AMBIENT_TEMP, min(MAX_WATER_TEMP, state["boiler_temp"]))
    state["return_temp"] = max(AMBIENT_TEMP, min(MAX_WATER_TEMP, state["return_temp"]))
    state["pressure"] = max(0.5, min(3.0, state["pressure"]))

def publish_telemetry():
    """Publish boiler telemetry to MQTT"""
    client.publish(f"{TOPIC_BASE}/status/boiler_temp", round(state["boiler_temp"], 1))
    client.publish(f"{TOPIC_BASE}/status/return_temp", round(state["return_temp"], 1))
    client.publish(f"{TOPIC_BASE}/status/modulation", int(state["modulation"]))
    client.publish(f"{TOPIC_BASE}/status/pressure", state["pressure"])
    client.publish(f"{TOPIC_BASE}/status/flame", "ON" if state["flame_on"] else "OFF")
    client.publish(f"{TOPIC_BASE}/mode/state", "heat" if state["enabled"] else "off")
    
    # Publish diagnostic info
    diagnostics = {
        "boiler_temp": round(state["boiler_temp"], 1),
        "setpoint": round(state["setpoint"], 1),
        "modulation": int(state["modulation"]),
        "flame": state["flame_on"],
        "outdoor_temp": round(state["outdoor_temp"], 1),
        "heating_demand": round(state["heating_demand"], 1)
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
client.publish(f"{TOPIC_BASE}/mode/state", "heat" if state["enabled"] else "off", retain=True)

print("\n" + "="*60)
print("🔥 OpenTherm Boiler Simulator (Realistic)")
print("="*60)
print(f"Water Temperature: {state['boiler_temp']:.1f}°C")
print(f"Setpoint: {state['setpoint']:.1f}°C")
print(f"Water Temp Range: {MIN_WATER_TEMP}-{MAX_WATER_TEMP}°C")
print(f"Climate Curve Coefficient: {CLIMATE_CURVE_COEFFICIENT}")
print("="*60)
print("\nIntegrated with Thermal Simulator for realistic behavior")
print("="*60 + "\n")

# Main loop
last_print = time.time()

try:
    while True:
        update_physics()
        publish_telemetry()
        
        # Print status every 10 seconds
        if time.time() - last_print > 10:
            flame_icon = "🔥" if state["flame_on"] else "⚫"
            print(f"{flame_icon} Water: {state['boiler_temp']:.1f}°C | " +
                  f"Setpoint: {state['setpoint']:.1f}°C | " +
                  f"Mod: {state['modulation']:.0f}% | " +
                  f"Demand: {state['heating_demand']:.0f}% | " +
                  f"Outdoor: {state['outdoor_temp']:.1f}°C")
            last_print = time.time()
        
        time.sleep(1)

except KeyboardInterrupt:
    print("\n👋 Shutting down OpenTherm Boiler Simulator...")
    client.loop_stop()
    client.disconnect()
