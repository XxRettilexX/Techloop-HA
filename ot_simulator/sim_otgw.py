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
ROOM_TEMP = 20.0
MAX_TEMP = 85.0
MIN_TEMP = 25.0
HEATING_RATE = 0.5  # Deg per tick at max modulation
COOLING_RATE = 0.1  # Deg per tick natural loss

# --- State Variables ---
state = {
    "boiler_temp": 40.0,
    "return_temp": 35.0,
    "setpoint": 50.0,
    "modulation": 0.0,
    "pressure": 1.5,
    "flame_on": False,
    "enabled": True
}

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, "OT_Simulator")

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT Broker with result code {rc}")
    client.subscribe(f"{TOPIC_BASE}/setpoint/set")
    client.subscribe(f"{TOPIC_BASE}/mode/set")

def on_message(client, userdata, msg):
    if msg.topic == f"{TOPIC_BASE}/mode/set":
        mode_cmd = msg.payload.decode()
        print(f"Received Mode Command: {mode_cmd}")
        if mode_cmd == "off":
            state["enabled"] = False
        else:
            state["enabled"] = True
        
        # Publish new state immediately
        new_mode = "heat" if state["enabled"] else "off"
        client.publish(f"{TOPIC_BASE}/mode/state", new_mode, retain=True)
        return

    try:
        payload = float(msg.payload.decode())
        # Clamp setpoint
        state["setpoint"] = max(MIN_TEMP, min(MAX_TEMP, payload))
        print(f"New Setpoint recieved: {state['setpoint']}")
        client.publish(f"{TOPIC_BASE}/setpoint/state", state["setpoint"], retain=True)
    except ValueError:
        print("Invalid setpoint payload")

client.on_connect = on_connect
client.on_message = on_message

print(f"Connecting to broker at {BROKER}...")
while True:
    try:
        client.connect(BROKER, PORT, 60)
        break
    except:
        print("Waiting for broker...")
        time.sleep(5)

client.loop_start()

def update_physics():
    # 1. Error Calculation
    if not state["enabled"]:
        target_mod = 0.0
    else:
        error = state["setpoint"] - state["boiler_temp"]
        
        # 2. P-Control for Modulation
        # Kp = 5.0 -> If error is 20deg, mod is 100%. If error is 10deg, mod is 50%
        target_mod = max(0.0, min(100.0, error * 5.0))
    
    # Smooth modulation transition
    if target_mod > state["modulation"]:
        state["modulation"] += 1.0 # Ramp up
    elif target_mod < state["modulation"]:
        state["modulation"] -= 1.0 # Ramp down
        
    state["modulation"] = max(0.0, min(100.0, state["modulation"]))
    
    state["flame_on"] = state["modulation"] > 5.0

    # 3. Temperature Physics
    if state["flame_on"]:
        # Heat added proportional to modulation
        heat_input = (state["modulation"] / 100.0) * HEATING_RATE
        state["boiler_temp"] += heat_input
    
    # Natural Cooling / Heat Loss to circuit
    state["boiler_temp"] -= COOLING_RATE
    
    # Return Temp follows Boiler temp with lag and delta
    # Delta T depends on modulation (higher mod = higher flow = lower deltaT usually, but simplified here)
    target_return = state["boiler_temp"] - 10.0
    state["return_temp"] += (target_return - state["return_temp"]) * 0.2
    
    # Pressure Fluctuation (Simulate pump noise)
    noise = random.uniform(-0.02, 0.02)
    # Pressure increases slightly with temp
    base_pressure = 1.5 + ((state["boiler_temp"] - 20) * 0.005)
    state["pressure"] = round(base_pressure + noise, 2)

    # Sanity checks
    state["boiler_temp"] = max(ROOM_TEMP, state["boiler_temp"])
    state["return_temp"] = max(ROOM_TEMP, state["return_temp"])

def publish_telemetry():
    client.publish(f"{TOPIC_BASE}/status/boiler_temp", round(state["boiler_temp"], 1))
    client.publish(f"{TOPIC_BASE}/status/return_temp", round(state["return_temp"], 1))
    client.publish(f"{TOPIC_BASE}/status/modulation", int(state["modulation"]))
    client.publish(f"{TOPIC_BASE}/status/pressure", state["pressure"])
    client.publish(f"{TOPIC_BASE}/status/flame", "ON" if state["flame_on"] else "OFF")
    client.publish(f"{TOPIC_BASE}/mode/state", "heat" if state["enabled"] else "off")

# Telemetry Thread
print("Starting Simulation Loop...")

# Initial Publish to ensure HA has state immediately
client.publish(f"{TOPIC_BASE}/setpoint/state", state["setpoint"], retain=True)
client.publish(f"{TOPIC_BASE}/mode/state", "heat" if state["enabled"] else "off", retain=True)

while True:
    update_physics()
    publish_telemetry()
    time.sleep(1)
