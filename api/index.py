from pyModbusTCP.client import ModbusClient
import re, threading
from flask import Flask, request
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

DEFAULT_PORT = 502

# Reg Inputs
level_meter = 0
flow_meter = 1

# Reg Holding
fill_valve = 0
drain_valve = 1

# Variables
fill_rate = 5000
drain_rate = 5000
is_filling = False
is_draining = False

client = ModbusClient(host='127.0.0.1', port=DEFAULT_PORT, unit_id=1)
client.open()

modbus_lock = threading.Lock()

@app.route("/api/set_address", methods=['POST'])
def set_address():
    with modbus_lock:
        newAddress = request.get_json()['address']
        if newAddress != '' and not re.match(r'^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$', newAddress):
            return "Invalid IP address", 400
        else:
            global client

            client = ModbusClient(host=newAddress, port=DEFAULT_PORT, unit_id=1)
            client.open()
            if client.is_open:
                return {
                    'address': newAddress,
                    'is_filling': is_filling,
                    'is_draining': is_draining
                }, 200
            else:
                return "Could not connect to the new address", 500
    
@app.route("/api/disconnect", methods=['POST'])
def disconnect():
    with modbus_lock:
        if client.is_open:
            client.close()
            return "ok", 200
        else:
            return "Client already closed", 200
    
@app.route("/api/set_fill_rate", methods=['POST'])
def set_fill_rate():
    with modbus_lock:
        new_rate = request.get_json()['rate']
        if new_rate > 0:
            global fill_rate
            fill_rate = new_rate

            # If it is currently filling, update the fill rate
            if is_filling and client.is_open:
                client.write_single_register(fill_valve, new_rate)

            return str(new_rate), 200
        else:
            return "Invalid fill rate", 400
    
@app.route("/api/set_drain_rate", methods=['POST'])
def set_drain_rate():
    with modbus_lock:
        new_rate = request.get_json()['rate']
        if new_rate > 0:
            global drain_rate
            drain_rate = new_rate

            # If it is currently draining, update the drain rate
            if is_draining and client.is_open:
                client.write_single_register(drain_valve, new_rate)

            return str(new_rate), 200
        else:
            return "Invalid drain rate", 400

@app.route("/api/fill", methods=['POST'])
def fill():
    with modbus_lock:
        if client.is_open:
            client.write_single_register(drain_valve, 0)
            client.write_single_register(fill_valve, fill_rate)

            global is_draining, is_filling
            is_filling = True
            is_draining = False
            return "ok", 200
        else:
            return "Modbus client is not open", 500

@app.route("/api/drain", methods=['POST'])
def drain():
    with modbus_lock:
        if client.is_open:
            client.write_single_register(fill_valve, 0)
            client.write_single_register(drain_valve, drain_rate)

            global is_draining, is_filling
            is_draining = True
            is_filling = False
            return "ok", 200
        else:
            return "Modbus client is not open", 500
    
@app.route("/api/stop", methods=['POST'])
def stop():
    with modbus_lock:
        if client.is_open:
            client.write_single_register(fill_valve, 0)
            client.write_single_register(drain_valve, 0)

            global is_draining, is_filling
            is_draining = False
            is_filling = False
            return "ok", 200
        else:
            return "Modbus client is not open", 500
    
def send_data():
    previous_level = 0
    previous_flow = 0

    while True:
        with modbus_lock:
            if client.is_open:
                level = client.read_input_registers(level_meter)
                flow = client.read_input_registers(flow_meter)
                if level and flow and (level[0] != previous_level or flow[0] != previous_flow):
                    socketio.emit('data', {'level': level[0], 'flow': flow[0]})
                    previous_level = level[0]
                    previous_flow = flow[0]
            else:
                socketio.emit('data', {'level': 0, 'flow': 0})

        socketio.sleep(0.01)

send_data_thread = threading.Thread(target=send_data, daemon=True)
send_data_thread.start()