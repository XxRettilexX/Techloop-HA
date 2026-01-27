"""
Thermal Simulator - Realistic Home Heating Physics
Simulates indoor temperature based on boiler output, outdoor conditions, and window states
"""
import paho.mqtt.client as mqtt
import time
import json
import math
import os

# Configuration
BROKER = os.getenv("MQTT_BROKER", "172.28.0.20")
PORT = 1883

# Physical Constants
THERMAL_CAPACITY = 50000.0  # kJ/°C - Thermal mass of house
U_VALUE_CLOSED = 0.5  # kW/°C - Heat loss coefficient (windows closed)
U_VALUE_OPEN = 2.0    # kW/°C - Heat loss coefficient (windows open)
RADIATOR_POWER = 8.0  # kW - Nominal radiator power
SPECIFIC_HEAT_WATER = 4.186  # kJ/(kg·°C)
WATER_FLOW_RATE = 0.3  # kg/s - Flow rate in heating circuit

# Simulation parameters
DT = 1.0  # seconds - simulation timestep
TAU_HEATING = 1800  # seconds - time constant for heating
TAU_COOLING = 3600  # seconds - time constant for cooling

# State variables
state = {
    "indoor_temp": 18.0,  # °C - Current indoor temperature
    "outdoor_temp": 10.0,  # °C - Outdoor temperature (simulated)
    "target_temp": 20.0,  # °C - Desired indoor temperature
    "boiler_water_temp": 45.0,  # °C - Current boiler water temperature
    "boiler_return_temp": 35.0,  # °C - Return water temperature
    "heating_demand": 0.0,  # % - 0-100 heating demand
    "windows_open_count": 0,  # Number of open windows
}

# Window states
windows = {
    "living_room": False,
    "bedroom": False,
    "kitchen": False,
    "bathroom": False
}

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "Thermal_Simulator")

def on_connect(client, userdata, flags, rc, properties):
    print(f"Connected to MQTT Broker with result code {rc}")
    
    # Subscribe to boiler telemetry
    client.subscribe("otgw/status/boiler_temp")
    client.subscribe("otgw/status/return_temp")
    
    # Subscribe to window states
    for window_id in windows.keys():
        client.subscribe(f"homeassistant/binary_sensor/window_{window_id}/state")
    
    print("Subscribed to boiler and window topics")

def on_message(client, userdata, msg):
    """Handle incoming MQTT messages"""
    try:
        # Boiler temperature
        if msg.topic == "otgw/status/boiler_temp":
            state["boiler_water_temp"] = float(msg.payload.decode())
        
        elif msg.topic == "otgw/status/return_temp":
            state["boiler_return_temp"] = float(msg.payload.decode())
        
        # Window states
        elif "window_" in msg.topic:
            for window_id in windows.keys():
                if f"window_{window_id}" in msg.topic:
                    payload = msg.payload.decode().lower()
                    was_open = windows[window_id]
                    windows[window_id] = payload in ["on", "open", "1"]
                    
                    if windows[window_id] != was_open:
                        window_name = window_id.replace("_", " ").title()
                        status = "APERTA" if windows[window_id] else "CHIUSA"
                        print(f"🪟 Finestra {window_name}: {status}")
                    break
        
    except Exception as e:
        print(f"Error handling message: {e}")

def simulate_outdoor_temp():
    """Simulate realistic outdoor temperature variation (daily cycle)"""
    # Simple sinusoidal variation: 10°C average, ±5°C amplitude, 24h period
    hour_of_day = (time.time() % 86400) / 3600  # 0-24
    base_temp = 10.0
    amplitude = 5.0
    # Minimum at 6 AM, maximum at 2 PM
    state["outdoor_temp"] = base_temp + amplitude * math.sin((hour_of_day - 6) * math.pi / 12)

def calculate_heat_loss():
    """Calculate heat loss based on indoor-outdoor temperature difference and windows"""
    # Count open windows
    state["windows_open_count"] = sum(1 for open_state in windows.values() if open_state)
    
    # Effective U-value depends on window states
    if state["windows_open_count"] > 0:
        # Each open window increases heat loss
        u_effective = U_VALUE_CLOSED + (state["windows_open_count"] * 0.4)
    else:
        u_effective = U_VALUE_CLOSED
    
    # Heat loss proportional to temperature difference
    delta_t = state["indoor_temp"] - state["outdoor_temp"]
    heat_loss_kw = u_effective * delta_t  # kW
    
    return heat_loss_kw * DT  # kJ for this timestep

def calculate_heat_provided():
    """Calculate heat provided by radiators based on water temperature"""
    # Heat transfer from water to room via radiators
    # Q = flow_rate * specific_heat * (T_in - T_out)
    
    delta_t_water = state["boiler_water_temp"] - state["boiler_return_temp"]
    
    if delta_t_water > 0:
        heat_provided_kw = WATER_FLOW_RATE * SPECIFIC_HEAT_WATER * delta_t_water
        # Limit to radiator nominal power
        heat_provided_kw = min(heat_provided_kw, RADIATOR_POWER)
    else:
        heat_provided_kw = 0.0
    
    return heat_provided_kw * DT  # kJ for this timestep

def update_indoor_temperature():
    """Update indoor temperature based on heat balance"""
    # Heat balance: heat_provided - heat_loss = change in thermal energy
    heat_provided = calculate_heat_provided()
    heat_loss = calculate_heat_loss()
    
    net_heat = heat_provided - heat_loss  # kJ
    
    # Temperature change: ΔT = Q / C
    delta_temp = net_heat / THERMAL_CAPACITY
    
    state["indoor_temp"] += delta_temp
    
    # Realistic limits
    state["indoor_temp"] = max(state["outdoor_temp"] - 2, min(30.0, state["indoor_temp"]))

def calculate_heating_demand():
    """Calculate heating demand percentage (0-100%) for boiler control"""
    # Simple proportional control based on temperature error
    error = state["target_temp"] - state["indoor_temp"]
    
    # Proportional gain
    kp = 20.0  # % per °C
    demand = error * kp
    
    # Clamp to 0-100%
    state["heating_demand"] = max(0.0, min(100.0, demand))

def publish_telemetry():
    """Publish thermal state to MQTT"""
    # Indoor temperature
    client.publish("home/sensor/indoor_temp", round(state["indoor_temp"], 1), retain=True)
    
    # Outdoor temperature
    client.publish("home/sensor/outdoor_temp", round(state["outdoor_temp"], 1), retain=True)
    
    # Heating demand
    client.publish("home/heating/demand", int(state["heating_demand"]), retain=True)
    
    # Window count
    client.publish("home/sensors/windows_open_count", state["windows_open_count"], retain=True)
    
    # Detailed JSON with all state
    state_json = {
        "indoor_temp": round(state["indoor_temp"], 2),
        "outdoor_temp": round(state["outdoor_temp"], 2),
        "target_temp": state["target_temp"],
        "heating_demand": round(state["heating_demand"], 1),
        "windows_open": state["windows_open_count"],
        "boiler_water": round(state["boiler_water_temp"], 1),
        "boiler_return": round(state["boiler_return_temp"], 1)
    }
    client.publish("home/thermal/state", json.dumps(state_json), retain=True)

# Configure MQTT
client.on_connect = on_connect
client.on_message = on_message

# Connect to broker
print(f"Connecting to MQTT broker at {BROKER}:{PORT}...")
while True:
    try:
        client.connect(BROKER, PORT, 60)
        break
    except Exception as e:
        print(f"Waiting for broker... ({e})")
        time.sleep(5)

client.loop_start()

print("\n" + "="*60)
print("🏠 Thermal Simulator Running")
print("="*60)
print(f"Indoor Temperature: {state['indoor_temp']:.1f}°C")
print(f"Outdoor Temperature: {state['outdoor_temp']:.1f}°C")
print(f"Target Temperature: {state['target_temp']:.1f}°C")
print(f"Thermal Capacity: {THERMAL_CAPACITY} kJ/°C")
print(f"U-value (closed): {U_VALUE_CLOSED} kW/°C")
print(f"U-value (open): {U_VALUE_OPEN} kW/°C")
print("="*60 + "\n")

# Main simulation loop
last_print = time.time()

try:
    while True:
        # Update outdoor temperature (daily cycle)
        simulate_outdoor_temp()
        
        # Calculate heat balance and update indoor temperature
        update_indoor_temperature()
        
        # Calculate heating demand
        calculate_heating_demand()
        
        # Publish telemetry
        publish_telemetry()
        
        # Print status every 10 seconds
        if time.time() - last_print > 10:
            windows_status = f"{state['windows_open_count']} aperte" if state['windows_open_count'] > 0 else "tutte chiuse"
            print(f"🌡️  Indoor: {state['indoor_temp']:.1f}°C | Outdoor: {state['outdoor_temp']:.1f}°C | " +
                  f"Demand: {state['heating_demand']:.0f}% | Windows: {windows_status}")
            last_print = time.time()
        
        time.sleep(DT)

except KeyboardInterrupt:
    print("\n👋 Shutting down Thermal Simulator...")
    client.loop_stop()
    client.disconnect()
