"""
Thermal Simulator - Advanced Realistic Home Heating Physics
Simulates indoor temperature based on:
- Boiler output and radiator heat transfer
- Outdoor conditions with realistic weather patterns
- Window states affecting heat loss
- Thermal mass of building envelope (walls, floors)
- Solar gain effect
- Humidity and perceived comfort
"""
import paho.mqtt.client as mqtt
import time
import json
import math
import os
import random
from datetime import datetime

# Configuration
BROKER = os.getenv("MQTT_BROKER", "172.28.0.20")
PORT = 1883

# ================== REALISTIC PHYSICAL CONSTANTS ==================

# Building characteristics (typical 100m² Italian apartment)
BUILDING_FLOOR_AREA = 100.0  # m²
BUILDING_VOLUME = 250.0  # m³
BUILDING_ENVELOPE_AREA = 180.0  # m² (walls + ceiling exposed)

# Thermal mass components
THERMAL_MASS_AIR = BUILDING_VOLUME * 1.2 * 1.005  # kJ/°C (air: ρ=1.2 kg/m³, cp=1.005 kJ/kg°C)
THERMAL_MASS_FURNITURE = 5000.0  # kJ/°C (furniture, internal walls)
THERMAL_MASS_WALLS = 30000.0  # kJ/°C (external walls thermal inertia - heavy masonry)
TOTAL_THERMAL_CAPACITY = THERMAL_MASS_AIR + THERMAL_MASS_FURNITURE  # Fast response mass
WALL_THERMAL_CAPACITY = THERMAL_MASS_WALLS  # Slow response mass (walls)

# Heat transfer coefficients
U_VALUE_WALLS = 0.35  # W/(m²·K) - Modern insulated walls
U_VALUE_WINDOWS_CLOSED = 1.4  # W/(m²·K) - Double glazing
U_VALUE_WINDOWS_OPEN = 25.0  # W/(m²·K) - Open window (convective)
WINDOW_AREA = 15.0  # m² total window area
INFILTRATION_RATE = 0.3  # ACH (Air Changes per Hour) when closed

# Radiator characteristics
RADIATOR_NOMINAL_POWER = 8000.0  # W - Total installed radiator power
RADIATOR_EXPONENT = 1.3  # Heat output exponent (typical for radiators)
RADIATOR_DESIGN_DT = 50.0  # °C - Design temperature difference

# Water circuit
WATER_FLOW_RATE = 0.3  # kg/s
SPECIFIC_HEAT_WATER = 4186.0  # J/(kg·K)

# Simulation parameters
DT = 1.0  # seconds - simulation timestep

# ================== WEATHER SIMULATION ==================

# Seasonal base temperatures (month averages for Northern Italy)
MONTHLY_TEMPS = {
    1: 2, 2: 4, 3: 9, 4: 13, 5: 18, 6: 22,
    7: 25, 8: 24, 9: 20, 10: 14, 11: 8, 12: 3
}

# Weather patterns
WEATHER_PATTERNS = ["clear", "cloudy", "overcast", "rainy"]
WEATHER_TEMP_MODIFIERS = {"clear": 2, "cloudy": 0, "overcast": -1, "rainy": -3}
WEATHER_SOLAR_MODIFIERS = {"clear": 1.0, "cloudy": 0.4, "overcast": 0.15, "rainy": 0.1}

# ================== STATE VARIABLES ==================

state = {
    # Temperatures
    "indoor_temp": 18.0,  # °C - Current indoor air temperature
    "wall_temp": 17.0,  # °C - Wall surface temperature (thermal mass)
    "outdoor_temp": 10.0,  # °C - Outdoor temperature
    "target_temp": 20.0,  # °C - Desired indoor temperature
    
    # Boiler interface
    "boiler_water_temp": 45.0,  # °C - Supply water temperature
    "boiler_return_temp": 35.0,  # °C - Return water temperature
    
    # Heating system
    "heating_demand": 0.0,  # % - 0-100 heating demand signal
    "radiator_output": 0.0,  # W - Current radiator heat output
    
    # Windows
    "windows_open_count": 0,
    
    # Weather
    "weather_pattern": "cloudy",
    "solar_gain": 0.0,  # W - Solar heat gain
    "humidity": 50.0,  # % - Relative humidity
    "perceived_temp": 18.0,  # °C - Perceived/comfort temperature
    
    # Energy tracking
    "heat_loss_total": 0.0,  # W
    "heat_gain_total": 0.0,  # W
}

# Window states
windows = {
    "living_room": False,
    "bedroom": False,
    "kitchen": False,
    "bathroom": False
}

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "Thermal_Simulator_v2")

def on_connect(client, userdata, flags, rc, properties):
    print(f"Connected to MQTT Broker with result code {rc}")
    
    # Subscribe to boiler telemetry
    client.subscribe("otgw/status/boiler_temp")
    client.subscribe("otgw/status/return_temp")
    
    # Subscribe to window states from window_simulator
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
    """
    Simulate realistic outdoor temperature with:
    - Seasonal variation based on month
    - Daily cycle (min at 6AM, max at 3PM)
    - Weather pattern influence
    - Random noise
    """
    now = datetime.now()
    month = now.month
    hour = now.hour + now.minute / 60.0
    
    # Base seasonal temperature
    base_temp = MONTHLY_TEMPS.get(month, 12)
    
    # Daily variation: min at 6AM, max at 3PM (shifted sine wave)
    daily_amplitude = 4.0 + random.uniform(-0.5, 0.5)
    daily_variation = daily_amplitude * math.sin((hour - 6) * math.pi / 12)
    
    # Weather pattern effect
    weather_mod = WEATHER_TEMP_MODIFIERS.get(state["weather_pattern"], 0)
    
    # Small random noise
    noise = random.gauss(0, 0.3)
    
    state["outdoor_temp"] = base_temp + daily_variation + weather_mod + noise
    
    # Occasionally change weather pattern
    if random.random() < 0.001:  # ~1 change per 17 minutes
        state["weather_pattern"] = random.choice(WEATHER_PATTERNS)
        print(f"🌤️ Meteo: {state['weather_pattern']}")

def calculate_solar_gain():
    """
    Calculate solar heat gain based on:
    - Time of day (sun angle)
    - Weather conditions
    - Window area and orientation
    """
    now = datetime.now()
    hour = now.hour + now.minute / 60.0
    
    # Solar intensity curve (0 at night, peak at noon)
    if 6 <= hour <= 20:
        # Simplified solar altitude factor
        solar_factor = math.sin((hour - 6) * math.pi / 14)
        solar_factor = max(0, solar_factor)
    else:
        solar_factor = 0
    
    # Base solar irradiance (W/m² on vertical surface, south-facing average)
    base_irradiance = 400.0  # W/m² average for heating season
    
    # Weather modifier
    weather_factor = WEATHER_SOLAR_MODIFIERS.get(state["weather_pattern"], 0.5)
    
    # Solar Heat Gain Coefficient for windows
    SHGC = 0.6  # Typical double glazing
    
    # Calculate total solar gain
    effective_window_area = WINDOW_AREA * 0.5  # Assume 50% south-facing effective
    state["solar_gain"] = base_irradiance * solar_factor * weather_factor * SHGC * effective_window_area
    
    return state["solar_gain"]

def calculate_heat_loss():
    """
    Calculate total heat loss:
    - Transmission through walls
    - Transmission through windows
    - Infiltration/ventilation losses
    - Open window losses
    """
    dt_indoor_outdoor = state["indoor_temp"] - state["outdoor_temp"]
    
    # Wall transmission losses (W)
    wall_area_net = BUILDING_ENVELOPE_AREA - WINDOW_AREA
    q_walls = U_VALUE_WALLS * wall_area_net * dt_indoor_outdoor
    
    # Window transmission losses
    state["windows_open_count"] = sum(1 for is_open in windows.values() if is_open)
    open_window_area = state["windows_open_count"] * (WINDOW_AREA / len(windows))
    closed_window_area = WINDOW_AREA - open_window_area
    
    q_windows_closed = U_VALUE_WINDOWS_CLOSED * closed_window_area * dt_indoor_outdoor
    q_windows_open = U_VALUE_WINDOWS_OPEN * open_window_area * dt_indoor_outdoor
    
    # Infiltration losses (W)
    # Q = V * ACH * ρ * cp * ΔT / 3600
    ach = INFILTRATION_RATE + (state["windows_open_count"] * 2.0)  # More ACH with open windows
    q_infiltration = BUILDING_VOLUME * ach * 1.2 * 1005 * dt_indoor_outdoor / 3600
    
    total_loss = q_walls + q_windows_closed + q_windows_open + q_infiltration
    state["heat_loss_total"] = total_loss
    
    return total_loss

def calculate_radiator_output():
    """
    Calculate radiator heat output using logarithmic mean temperature difference.
    Q = Q_nom * (LMTD / LMTD_design)^n
    """
    t_supply = state["boiler_water_temp"]
    t_return = state["boiler_return_temp"]
    t_room = state["indoor_temp"]
    
    # Logarithmic Mean Temperature Difference
    dt1 = t_supply - t_room
    dt2 = t_return - t_room
    
    if dt1 <= 0 or dt2 <= 0 or abs(dt1 - dt2) < 0.1:
        state["radiator_output"] = 0
        return 0
    
    if abs(dt1 - dt2) > 0.1:
        lmtd = (dt1 - dt2) / math.log(dt1 / dt2)
    else:
        lmtd = (dt1 + dt2) / 2
    
    # Design LMTD (e.g., 70/50°C supply/return, 20°C room = 50/30, LMTD ~39°C)
    design_lmtd = RADIATOR_DESIGN_DT * 0.78  # Approximate for 20°C delta-T
    
    # Radiator output (W)
    if lmtd > 0 and design_lmtd > 0:
        output = RADIATOR_NOMINAL_POWER * pow(lmtd / design_lmtd, RADIATOR_EXPONENT)
        output = min(output, RADIATOR_NOMINAL_POWER * 1.2)  # Cap at 120% nominal
    else:
        output = 0
    
    state["radiator_output"] = output
    state["heat_gain_total"] = output + state["solar_gain"]
    
    return output

def update_wall_temperature():
    """
    Update wall temperature (slow thermal mass).
    Walls exchange heat with both indoor and outdoor.
    """
    # Heat flow from room to walls
    h_internal = 8.0  # W/(m²·K) internal convection coefficient
    q_to_walls = h_internal * BUILDING_ENVELOPE_AREA * (state["indoor_temp"] - state["wall_temp"])
    
    # Heat flow from walls to outside
    q_from_walls = (state["wall_temp"] - state["outdoor_temp"]) * U_VALUE_WALLS * BUILDING_ENVELOPE_AREA
    
    # Net heat to walls
    net_heat = q_to_walls - q_from_walls
    
    # Temperature change (very slow due to high thermal mass)
    dt_walls = (net_heat * DT) / (WALL_THERMAL_CAPACITY * 1000)  # Convert kJ to J
    state["wall_temp"] += dt_walls
    
    # Return heat absorbed by walls (removed from room)
    return q_to_walls

def update_indoor_temperature():
    """
    Update indoor temperature based on complete heat balance.
    Considers fast thermal mass (air + furniture) and interaction with walls.
    """
    # Calculate all heat flows
    q_radiator = calculate_radiator_output()
    q_solar = calculate_solar_gain()
    q_loss = calculate_heat_loss()
    q_to_walls = update_wall_temperature()
    
    # Heat flow from walls to room (if walls are warmer)
    h_internal = 8.0
    q_from_walls = h_internal * BUILDING_ENVELOPE_AREA * (state["wall_temp"] - state["indoor_temp"])
    
    # Net heat to room air
    net_heat = q_radiator + q_solar - q_loss + q_from_walls
    
    # Temperature change for fast mass
    # ΔT = Q * dt / (C * 1000) where C is in kJ/°C and Q in W
    dt_room = (net_heat * DT) / (TOTAL_THERMAL_CAPACITY * 1000)
    
    state["indoor_temp"] += dt_room
    
    # Physical limits
    state["indoor_temp"] = max(state["outdoor_temp"] - 2, min(35.0, state["indoor_temp"]))

def calculate_perceived_temperature():
    """
    Calculate perceived/operative temperature considering:
    - Air temperature
    - Mean radiant temperature (wall surfaces)
    - Humidity effect
    """
    # Mean radiant temperature (simplified: average of wall temp)
    t_mrt = state["wall_temp"]
    
    # Operative temperature (simplified)
    t_operative = (state["indoor_temp"] + t_mrt) / 2
    
    # Humidity effect on perceived temperature
    # High humidity makes it feel warmer in summer, colder in winter
    humidity = state["humidity"]
    if state["indoor_temp"] < 20:
        humidity_effect = -(humidity - 50) * 0.01  # High humidity = feels colder
    else:
        humidity_effect = (humidity - 50) * 0.02  # High humidity = feels warmer
    
    state["perceived_temp"] = t_operative + humidity_effect

def calculate_humidity():
    """
    Simple humidity model based on outdoor conditions and ventilation.
    """
    # Base indoor humidity follows outdoor with lag
    outdoor_humidity = 70 - (state["outdoor_temp"] - 5) * 2 + random.gauss(0, 5)
    outdoor_humidity = max(30, min(95, outdoor_humidity))
    
    # Indoor humidity tends toward outdoor with open windows
    if state["windows_open_count"] > 0:
        mix_rate = 0.01 * state["windows_open_count"]
    else:
        mix_rate = 0.001
    
    state["humidity"] += (outdoor_humidity - state["humidity"]) * mix_rate
    state["humidity"] = max(25, min(80, state["humidity"]))

def calculate_heating_demand():
    """Calculate heating demand percentage (0-100%) for boiler control"""
    # PID-like control
    error = state["target_temp"] - state["indoor_temp"]
    
    # Proportional term
    kp = 25.0  # % per °C
    demand = error * kp
    
    # Derivative term (anticipate based on rate of change)
    # If temperature is rising fast, reduce demand
    # Simplified: use heat balance to estimate trend
    if state["heat_gain_total"] > state["heat_loss_total"]:
        demand *= 0.9  # Reduce if already warming
    
    # Integral term approximation (boost if persistently cold)
    if error > 0.5:
        demand *= 1.1
    
    # Clamp to 0-100%
    state["heating_demand"] = max(0.0, min(100.0, demand))

def publish_telemetry():
    """Publish comprehensive thermal state to MQTT"""
    # Core temperatures
    client.publish("home/sensor/indoor_temp", round(state["indoor_temp"], 2), retain=True)
    client.publish("home/sensor/outdoor_temp", round(state["outdoor_temp"], 2), retain=True)
    client.publish("home/sensor/wall_temp", round(state["wall_temp"], 2), retain=True)
    client.publish("home/sensor/perceived_temp", round(state["perceived_temp"], 2), retain=True)
    
    # Environmental
    client.publish("home/sensor/humidity", round(state["humidity"], 1), retain=True)
    
    # Heating system
    client.publish("home/heating/demand", round(state["heating_demand"], 1), retain=True)
    client.publish("home/heating/radiator_output", round(state["radiator_output"], 1), retain=True)
    client.publish("home/heating/solar_gain", round(state["solar_gain"], 1), retain=True)
    
    # Window count
    client.publish("home/sensors/windows_open_count", state["windows_open_count"], retain=True)
    
    # Weather
    client.publish("home/weather/pattern", state["weather_pattern"], retain=True)
    
    # Detailed JSON with all state
    state_json = {
        "indoor_temp": round(state["indoor_temp"], 2),
        "outdoor_temp": round(state["outdoor_temp"], 2),
        "wall_temp": round(state["wall_temp"], 2),
        "perceived_temp": round(state["perceived_temp"], 2),
        "target_temp": state["target_temp"],
        "humidity": round(state["humidity"], 1),
        "heating_demand": round(state["heating_demand"], 1),
        "windows_open": state["windows_open_count"],
        "weather": state["weather_pattern"],
        "boiler_water": round(state["boiler_water_temp"], 1),
        "boiler_return": round(state["boiler_return_temp"], 1),
        "radiator_output_w": round(state["radiator_output"], 0),
        "solar_gain_w": round(state["solar_gain"], 0),
        "heat_loss_w": round(state["heat_loss_total"], 0),
        "heat_balance_w": round(state["heat_gain_total"] - state["heat_loss_total"], 0)
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

print("\n" + "="*70)
print("🏠 THERMAL SIMULATOR v2.0 - Advanced Building Physics")
print("="*70)
print(f"Building: {BUILDING_FLOOR_AREA}m² floor area, {BUILDING_VOLUME}m³ volume")
print(f"Thermal Mass: {TOTAL_THERMAL_CAPACITY/1000:.0f} kJ/°C (fast) + {WALL_THERMAL_CAPACITY/1000:.0f} kJ/°C (walls)")
print(f"Radiators: {RADIATOR_NOMINAL_POWER/1000:.1f} kW nominal power")
print(f"Windows: {WINDOW_AREA}m² total area, {len(windows)} units")
print("="*70)
print(f"Initial Indoor: {state['indoor_temp']:.1f}°C | Outdoor: {state['outdoor_temp']:.1f}°C")
print("="*70 + "\n")

# Main simulation loop
last_print = time.time()

try:
    while True:
        # Update weather and outdoor temperature
        simulate_outdoor_temp()
        
        # Update humidity
        calculate_humidity()
        
        # Calculate heat balance and update temperatures
        update_indoor_temperature()
        
        # Calculate perceived temperature
        calculate_perceived_temperature()
        
        # Calculate heating demand
        calculate_heating_demand()
        
        # Publish telemetry
        publish_telemetry()
        
        # Print status every 10 seconds
        if time.time() - last_print > 10:
            windows_status = f"{state['windows_open_count']} aperte" if state['windows_open_count'] > 0 else "chiuse"
            heat_balance = state["heat_gain_total"] - state["heat_loss_total"]
            balance_indicator = "⬆️" if heat_balance > 50 else "⬇️" if heat_balance < -50 else "➡️"
            
            print(f"{balance_indicator} Indoor: {state['indoor_temp']:.1f}°C (felt: {state['perceived_temp']:.1f}°C) | "
                  f"Outdoor: {state['outdoor_temp']:.1f}°C | "
                  f"Walls: {state['wall_temp']:.1f}°C | "
                  f"Demand: {state['heating_demand']:.0f}% | "
                  f"🌡️{state['humidity']:.0f}% | "
                  f"🪟 {windows_status}")
            last_print = time.time()
        
        time.sleep(DT)

except KeyboardInterrupt:
    print("\n👋 Shutting down Thermal Simulator v2.0...")
    client.loop_stop()
    client.disconnect()
