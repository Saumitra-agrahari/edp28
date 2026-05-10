#!/usr/bin/env python3
import RPi.GPIO as GPIO
import socket
import time
import serial
import json
import os
import sys
import subprocess
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone
from threading import Thread, Lock, Event
try:
    import requests
except ImportError:
    requests = None
try:
    from flask import Flask, request, jsonify
except ImportError:
    Flask = None
try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

PIN = 17
HOST = '192.168.50.20'
PORT = 60000
DEVICE_ADDRESS = 0xFF
DEVICE_ID = os.environ.get('DEVICE_ID', 'smartbag-device-01').strip()

# MQTT bridge to backend
MQTT_HOST = os.environ.get('MQTT_HOST', '127.0.0.1').strip()
MQTT_HOSTS_RAW = os.environ.get('MQTT_HOSTS', '').strip()
MQTT_PORT = int(os.environ.get('MQTT_PORT', '1883'))
MQTT_USERNAME = os.environ.get('MQTT_USERNAME', '').strip()
MQTT_PASSWORD = os.environ.get('MQTT_PASSWORD', '').strip()
MQTT_KEEPALIVE = 60
EXIT_ON_UNLOCK = os.environ.get('EXIT_ON_UNLOCK', 'false').strip().lower() == 'true'
RESTART_ON_LOCK = os.environ.get('RESTART_ON_LOCK', 'false').strip().lower() == 'true'

# Location accuracy controls
PHONE_LOCATION_FILE = '/home/pi/phone_location.json'
WIFI_MAX_DRIFT_KM = 2.0

# Registry files for item tracking
ITEM_REGISTRY_FILE = '/home/pi/item_registry.json'
BAG_SCAN_FILE = '/home/pi/last_bag_scan.json'

GPIO.setmode(GPIO.BCM)
GPIO.setup(PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

ser = serial.Serial("/dev/serial0", baudrate=9600, timeout=0.2)

# Global socket variable - persistent connection
sock = None
mqtt_client = None
mqtt_connected_host = None
mqtt_hosts = []
scan_lock = Lock()
stop_event = Event()

# Setup logging with rotation (max 5MB per file, keep 7 backups)
logger = logging.getLogger('RFID_GPS')
logger.setLevel(logging.INFO)
handler = RotatingFileHandler('/home/pi/rfid_gps_log.txt', maxBytes=5242880, backupCount=7)
formatter = logging.Formatter('%(asctime)s - %(message)s', datefmt='%Y-%m-%dT%H:%M:%S')
handler.setFormatter(formatter)
logger.addHandler(handler)

def build_mqtt_hosts():
    """Build ordered, deduplicated MQTT host candidates."""
    candidates = []

    if MQTT_HOSTS_RAW:
        candidates.extend([h.strip() for h in MQTT_HOSTS_RAW.split(',') if h.strip()])

    if MQTT_HOST:
        candidates.append(MQTT_HOST)

    if not candidates:
        candidates.append('127.0.0.1')

    deduped = []
    seen = set()
    for host in candidates:
        key = host.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(host)

    return deduped

def rotate_mqtt_hosts_prefer_next():
    """Move current connected host to end so reconnect tries other candidates first."""
    global mqtt_hosts, mqtt_connected_host
    if not mqtt_connected_host or not mqtt_hosts:
        return
    if mqtt_connected_host in mqtt_hosts:
        mqtt_hosts = [h for h in mqtt_hosts if h != mqtt_connected_host] + [mqtt_connected_host]

mqtt_hosts = build_mqtt_hosts()
logger.info(f"MQTT host candidates: {mqtt_hosts}")

def connect_mqtt():
    """Connect to backend MQTT broker for publishing sensor events."""
    global mqtt_client, mqtt_connected_host, mqtt_hosts
    if mqtt is None:
        logger.warning("paho-mqtt not installed - MQTT publishing disabled")
        return False

    # Rebuild candidates each attempt so env updates are picked up after restart.
    mqtt_hosts = build_mqtt_hosts()

    for host in mqtt_hosts:
        try:
            client = mqtt.Client(client_id=f"pi-{DEVICE_ID}")
            client.on_connect = on_mqtt_connect
            client.on_message = on_mqtt_message
            if MQTT_USERNAME:
                client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
            client.connect(host, MQTT_PORT, MQTT_KEEPALIVE)
            client.loop_start()
            mqtt_client = client
            mqtt_connected_host = host
            logger.info(f"MQTT connected to {host}:{MQTT_PORT} as {DEVICE_ID}")
            return True
        except Exception as e:
            logger.warning(f"MQTT connect failed on {host}:{MQTT_PORT}: {e}")

    mqtt_client = None
    mqtt_connected_host = None
    logger.error("MQTT connect failed on all configured hosts")
    return False

def mqtt_topic(path):
    return f"smartbag/{DEVICE_ID}/{path}"

def handle_lock_action(action, initiated_by='app', command_id=None):
    """Execute lock/unlock action and publish hardware status ack for backend."""
    with scan_lock:
        if action == 'LOCK':
            publish_mqtt('lock/status', {
                'state': 'LOCKED',
                'initiated_by': initiated_by,
                'command_id': command_id,
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            })
            print("[SCAN] Starting...", flush=True)
            logger.info("[SCAN] Starting RFID scan (mqtt command)")
            scan_rfid_continuous(duration=6)
            print("[SCAN] Done", flush=True)
            logger.info("[SCAN] Completed (mqtt command)")

            # Lock command should also capture current location in the same cycle.
            print("[GPS] Reading...", flush=True)
            logger.info("[GPS] Reading GPS (mqtt command after lock scan)")
            read_gps()
            print("[GPS] Done", flush=True)

            # Optional: restart process after app lock command.
            # Useful when running under systemd and you want a fresh session each lock.
            if RESTART_ON_LOCK and initiated_by == 'app':
                logger.info("RESTART_ON_LOCK=true, restarting process after LOCK action")
                try:
                    os.execv(sys.executable, [sys.executable, '-u', os.path.abspath(__file__)])
                except Exception as e:
                    logger.error(f"Process restart failed: {e}")
            return

        if action == 'UNLOCK':
            publish_mqtt('lock/status', {
                'state': 'UNLOCKED',
                'initiated_by': initiated_by,
                'command_id': command_id,
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            })
            print("[GPS] Reading...", flush=True)
            logger.info("[GPS] Reading GPS (mqtt command)")
            read_gps()
            print("[GPS] Done", flush=True)

            if EXIT_ON_UNLOCK:
                logger.info("EXIT_ON_UNLOCK=true, stopping process after UNLOCK command")
                stop_event.set()
            return

def on_mqtt_connect(client, _userdata, _flags, rc):
    """Subscribe to backend lock commands once MQTT connection is ready."""
    if rc != 0:
        logger.error(f"MQTT connect callback returned rc={rc}")
        return

    command_topic = mqtt_topic('lock/command')
    try:
        client.subscribe(command_topic, qos=1)
        logger.info(f"MQTT subscribed to command topic: {command_topic}")
    except Exception as e:
        logger.error(f"MQTT command subscribe failed: {e}")

def on_mqtt_message(_client, _userdata, msg):
    """Handle lock/unlock commands sent by backend from app lock screen."""
    topic = msg.topic
    if topic != mqtt_topic('lock/command'):
        return

    try:
        payload = json.loads(msg.payload.decode('utf-8', errors='ignore') or '{}')
    except Exception:
        logger.error(f"Invalid MQTT command payload on topic {topic}")
        return

    action = str(payload.get('action', '')).strip().upper()
    command_id = payload.get('command_id')

    if action not in ('LOCK', 'UNLOCK'):
        logger.warning(f"Ignoring unknown lock command action: {action}")
        return

    logger.info(f"MQTT command received: action={action}, command_id={command_id}")
    logger.info(f"Handling lock action: {action} from {initiated_by}")
    Thread(
        target=handle_lock_action,
        args=(action, 'app', command_id),
        daemon=True,
    ).start()

def publish_mqtt(path, payload):
    """Publish JSON payload to backend MQTT topic."""
    global mqtt_client, mqtt_connected_host
    if mqtt_client is None and not connect_mqtt():
        return

    try:
        mqtt_client.publish(mqtt_topic(path), json.dumps(payload), qos=1)
    except Exception as e:
        logger.error(f"MQTT publish failed on {path} via {mqtt_connected_host}: {e}")
        rotate_mqtt_hosts_prefer_next()
        mqtt_client = None
        mqtt_connected_host = None

def publish_heartbeat_loop():
    """Background heartbeat to keep backend device status online."""
    while not stop_event.is_set():
        try:
            publish_mqtt('heartbeat', {
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'firmware_version': 'pi-final3',
            })
        except Exception as e:
            logger.error(f"Heartbeat publish failed: {e}")
        time.sleep(30)

def connect_rfid():
    """Create or refresh RFID socket connection"""
    global sock
    try:
        if sock:
            try:
                sock.close()
            except:
                pass
            sock = None
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((HOST, PORT))
        time.sleep(0.5)
        logger.info("RFID socket connected")
        return True
    except Exception as e:
        logger.error(f"RFID connection failed: {e}")
        sock = None
        return False

def drain_rfid_socket(max_duration=0.2):
    """Drain stale RFID bytes so next scan reads only fresh response data."""
    global sock
    if sock is None:
        return 0

    drained = 0
    previous_timeout = None
    try:
        previous_timeout = sock.gettimeout()
    except Exception:
        previous_timeout = None

    try:
        sock.settimeout(0.01)
        deadline = time.time() + max_duration
        while time.time() < deadline:
            try:
                chunk = sock.recv(4096)
            except socket.timeout:
                break

            if not chunk:
                break

            drained += len(chunk)
    except Exception as e:
        logger.warning(f"RFID buffer drain failed: {e}")
    finally:
        try:
            sock.settimeout(previous_timeout if previous_timeout is not None else 2)
        except Exception:
            pass

    return drained

# Try to connect at startup
connect_rfid()

def maybe_register_item_from_env():
    """If registration env vars are set, update registry and exit."""
    register_name = os.environ.get('REGISTER_ITEM_NAME', '').strip()
    register_epc = os.environ.get('REGISTER_ITEM_EPC', '').strip()

    if register_name and register_epc:
        registry = register_item(register_epc, register_name)
        print(f"[REGISTRY] Saved item '{register_name}' -> {register_epc}", flush=True)
        print(f"[REGISTRY] Total registered items: {len(registry)}", flush=True)
        logger.info(f"Registered item {register_name} ({register_epc})")
        raise SystemExit(0)

# File paths for persistent storage
LOCATION_FILE = '/home/pi/last_location.json'
TAGS_FILE = '/home/pi/last_tags.json'

# Log startup
logger.info("System started - Persistent storage enabled")

# HTTP API for app-based registration (port 5000)
API_PORT = 5000
last_comparison = None  # Store latest scan comparison for status queries

def load_item_registry():
    """Load permanent item registry from file."""
    if os.path.exists(ITEM_REGISTRY_FILE):
        try:
            with open(ITEM_REGISTRY_FILE, 'r') as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except:
            pass
    return []

def save_item_registry(registry):
    """Save permanent item registry to file."""
    try:
        with open(ITEM_REGISTRY_FILE, 'w') as f:
            json.dump(registry, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving item registry: {e}")

def register_item(epc, name, registry=None):
    """Add or update one item in the registry by EPC."""
    if registry is None:
        registry = load_item_registry()

    normalized_epc = epc.strip().upper()
    name = name.strip()

    updated = False
    for item in registry:
        if item.get('epc', '').strip().upper() == normalized_epc:
            item['name'] = name
            updated = True
            break

    if not updated:
        registry.append({
            'epc': normalized_epc,
            'name': name,
            'registered_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        })

    save_item_registry(registry)
    return registry

def compare_scan_to_registry(scan_tags, registry=None):
    """Compare current scan EPCs against registry."""
    if registry is None:
        registry = load_item_registry()

    scan_map = {tag['epc'].strip().upper(): tag for tag in scan_tags}
    registry_map = {item['epc'].strip().upper(): item for item in registry}

    present = []
    missing = []
    unknown = []

    for epc, item in registry_map.items():
        if epc in scan_map:
            present.append({
                'epc': epc,
                'name': item.get('name', 'Unnamed'),
                'tag_id': scan_map[epc].get('id'),
            })
        else:
            missing.append({
                'epc': epc,
                'name': item.get('name', 'Unnamed'),
            })

    for epc, tag in scan_map.items():
        if epc not in registry_map:
            unknown.append({
                'epc': epc,
                'tag_id': tag.get('id'),
            })

    return {
        'present': present,
        'missing': missing,
        'unknown': unknown,
        'registry_count': len(registry_map),
        'scan_count': len(scan_map),
    }

def save_bag_scan(tags, comparison):
    """Save latest bag scan snapshot and comparison result."""
    payload = {
        'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'tags': tags,
        'comparison': comparison,
    }
    try:
        with open(BAG_SCAN_FILE, 'w') as f:
            json.dump(payload, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving bag scan: {e}")

maybe_register_item_from_env()

def load_last_location():
    """Load last location from file"""
    if os.path.exists(LOCATION_FILE):
        try:
            with open(LOCATION_FILE, 'r') as f:
                data = json.load(f)
                return (data['lat'], data['lon'])
        except:
            pass
    return (0.0, 0.0)

def save_last_location(lat, lon):
    """Save location to file"""
    with open(LOCATION_FILE, 'w') as f:
        json.dump({'lat': lat, 'lon': lon}, f)

def load_last_tags():
    """Load last tags from file"""
    if os.path.exists(TAGS_FILE):
        try:
            with open(TAGS_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return []

def save_last_tags(tags):
    """Save tags to file (keeps only latest scan - OVERWRITES previous)"""
    try:
        with open(TAGS_FILE, 'w') as f:
            json.dump(tags, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving tags: {e}")

# Initialize files on startup
last_location = load_last_location()
last_tags = load_last_tags()

# Clear tags file on startup to prevent accumulation from old tests
try:
    with open(TAGS_FILE, 'w') as f:
        json.dump([], f)
except:
    pass

def is_connected_to_wifi():
    """Check if connected to WiFi (phone hotspot)"""
    try:
        result = subprocess.run(['iwconfig'], capture_output=True, text=True, timeout=2)
        if 'ESSID' in result.stdout and 'off/any' not in result.stdout:
            return True
    except:
        pass
    return False

def get_wifi_geolocation():
    """Get geolocation from IP address when connected to WiFi"""
    if requests is None:
        return None
    try:
        # Use free IP geolocation service
        response = requests.get('http://ip-api.com/json/', timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                lat = data.get('lat', 0.0)
                lon = data.get('lon', 0.0)
                city = data.get('city', 'Unknown')
                return (lat, lon, city)
    except Exception as e:
        pass
    return None

def is_valid_location(lat, lon):
    return lat is not None and lon is not None and not (lat == 0.0 and lon == 0.0)

def haversine_km(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, sqrt, atan2
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * atan2(sqrt(a), sqrt(1 - a))

def get_phone_location():
    """Optional accurate fallback from phone-provided JSON file."""
    if not os.path.exists(PHONE_LOCATION_FILE):
        return None
    try:
        with open(PHONE_LOCATION_FILE, 'r') as f:
            data = json.load(f)
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
        if is_valid_location(lat, lon):
            return (lat, lon, data.get('label', 'Phone'))
    except:
        pass
    return None

def convert(coord, direction):
    try:
        if direction in ['N','S']:
            d = int(coord[:2])
            m = float(coord[2:])
        else:
            d = int(coord[:3])
            m = float(coord[3:])
        
        value = d + (m / 60)
        if direction in ['S','W']:
            value = -value
        return value
    except:
        return None

def read_gps():
    """Read location with priority: GPS > Phone > WiFi(validated) > Cached.
    Keep this non-blocking so reed events are not delayed.
    """
    global last_location
    location = None
    location_source = None
    city = ""
    gps_lines_read = 0
    gps_ggb_found = False
    gps_rmc_found = False
    
    # Priority 1: Try GPS (require valid fix), but do not block too long.
    logger.info("[GPS] Attempting GPS read (2.5s timeout)...")
    try:
        gps_deadline = time.time() + 2.5
        while time.time() < gps_deadline:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue
            gps_lines_read += 1
            if "GGA" in line:
                gps_ggb_found = True
                parts = line.split(",")
                # GGA fix quality: 0 = invalid
                if len(parts) > 6 and parts[2] and parts[4] and parts[6].isdigit() and int(parts[6]) > 0:
                    lat = convert(parts[2], parts[3])
                    lon = convert(parts[4], parts[5])
                    if is_valid_location(lat, lon):
                        location = (lat, lon)
                        location_source = "GPS"
                        logger.info(f"[GPS] Valid GGA fix obtained: {lat}, {lon}")
                        break
                else:
                    logger.debug(f"[GPS] GGA line invalid or no fix: {line[:80]}")
            elif "RMC" in line:
                gps_rmc_found = True
                parts = line.split(",")
                # RMC status A = valid
                if len(parts) > 6 and parts[2] == 'A' and parts[3] and parts[5]:
                    lat = convert(parts[3], parts[4])
                    lon = convert(parts[5], parts[6])
                    if is_valid_location(lat, lon):
                        location = (lat, lon)
                        location_source = "GPS"
                        logger.info(f"[GPS] Valid RMC fix obtained: {lat}, {lon}")
                        break
                else:
                    logger.debug(f"[GPS] RMC status not A or missing coordinates: {line[:80]}")
        logger.info(f"[GPS] Timeout or fix obtained. Lines read: {gps_lines_read}, GGA found: {gps_ggb_found}, RMC found: {gps_rmc_found}")
    except Exception as e:
        logger.error(f"[GPS] Serial read error: {e}")
        pass

    # Priority 2: Optional phone location file
    if location_source is None:
        phone_location = get_phone_location()
        if phone_location:
            lat, lon, phone_label = phone_location
            location = (lat, lon)
            city = phone_label
            location_source = "Phone"
            logger.info(f"[LOCATION] Using phone location: {lat}, {lon}")
        else:
            logger.debug("[GPS] Phone location file not found or invalid")
    
    # Priority 3: Try WiFi if GPS/Phone failed (with drift filter)
    if location_source is None:
        wifi_connected = is_connected_to_wifi()
        logger.info(f"[GPS] WiFi connected: {wifi_connected}")
        if wifi_connected:
            logger.info("[GPS] Attempting WiFi geolocation...")
            wifi_location = get_wifi_geolocation()
            if wifi_location:
                lat, lon, city = wifi_location
                logger.info(f"[GPS] WiFi geolocation obtained: {lat}, {lon} ({city})")
                # Reject WiFi jumps that are too far from last known location.
                if is_valid_location(last_location[0], last_location[1]):
                    drift_km = haversine_km(last_location[0], last_location[1], lat, lon)
                    logger.info(f"[GPS] WiFi drift from cached: {drift_km:.2f} km (max allowed: {WIFI_MAX_DRIFT_KM} km)")
                    if drift_km > WIFI_MAX_DRIFT_KM:
                        location = last_location
                        location_source = "Cached"
                        city = ""
                        logger.warning(f"[GPS] WiFi location drift {drift_km:.2f} km rejected; using cached")
                    else:
                        location = (lat, lon)
                        location_source = "WiFi"
                else:
                    location = (lat, lon)
                    location_source = "WiFi"
                    logger.info(f"[GPS] No cached location, using WiFi: {lat}, {lon}")
            else:
                logger.warning("[GPS] WiFi geolocation request failed")
    
    # Priority 4: Use cached if all failed
    if location_source is None:
        location = last_location
        location_source = "Cached"
        logger.warning("[GPS] All location sources failed, using cached location")
    
    # Store and display ONE final location with source label
    last_location = location
    save_last_location(location[0], location[1])
    
    if city:
        msg = f"LOCATION [{location_source}]: Lat={location[0]:.6f}, Lon={location[1]:.6f} ({city})"
    else:
        msg = f"LOCATION [{location_source}]: Lat={location[0]:.6f}, Lon={location[1]:.6f}"
    
    print(msg, flush=True)
    logger.info(msg)

    publish_mqtt('gps/location', {
        'latitude': location[0],
        'longitude': location[1],
        'source': location_source,
        'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
    })

def scan_rfid_continuous(duration=6):
    """Scan RFID tags - fast single snapshot"""
    global last_tags, sock

    if sock is None and not connect_rfid():
        print("[SCAN] ERROR: Socket not connected", flush=True)
        logger.error("Socket not connected")
        return
    
    try:
        all_tags_raw = []
        print(f"[SCAN] Sending inventory command...", flush=True)
        logger.info(f"[SCAN] Starting tag inventory")

        # Important: clear any stale bytes from previous scan cycles.
        drained = drain_rfid_socket(max_duration=0.2)
        if drained > 0:
            logger.info(f"[SCAN] Drained {drained} stale bytes before inventory command")
        
        # Send RFID inventory command
        cmnd = bytes([0xFF, 0x01, 0x03, 0x00, 0x01, 0x22])
        try:
            sock.sendall(cmnd)
        except socket.error as e:
            logger.warning(f"[SCAN] send failed, reconnecting: {e}")
            sock = None
            if not connect_rfid():
                raise
            sock.sendall(cmnd)

        # Give reader a brief moment to start current-cycle response.
        time.sleep(0.03)
        
        # Receive burst response quickly (stop after short silence)
        data = b''
        sock.settimeout(0.25)
        burst_deadline = time.time() + 1.5
        try:
            while time.time() < burst_deadline:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                data += chunk
        except socket.timeout:
            pass
        finally:
            sock.settimeout(2)
        
        if not data:
            print("[SCAN] No response from reader", flush=True)
            logger.error("No response from reader")
            return
        
        print(f"[SCAN] Got {len(data)} bytes", flush=True)
        
        # Parse tags from response
        tags_in_frame = []
        i = 0
        
        while i < len(data):
            # Look for STX (0x02)
            if data[i] == 0x02:
                i += 1
                # Check for 'E' (0x45)
                if i >= len(data):
                    break
                if data[i] != 0x45:
                    continue
                i += 1
                
                # Extract hex digits until CRLF
                hex_chars = []
                while i < len(data):
                    if data[i] == 0x0D:  # CR
                        if i + 1 < len(data) and data[i+1] == 0x0A:  # LF
                            i += 2
                            break
                    # Keep: 0-9 (48-57), A-F (65-70), a-f (97-102)
                    if (48 <= data[i] <= 57) or (65 <= data[i] <= 70) or (97 <= data[i] <= 102):
                        hex_chars.append(data[i])
                    i += 1
                
                if hex_chars:
                    epc_hex_str = bytes(hex_chars).decode('ascii')
                    
                    # Fix odd length
                    if len(epc_hex_str) % 2 == 1:
                        epc_hex_str = epc_hex_str[:22]
                    
                    # Convert to tag ID
                    if len(epc_hex_str) >= 8:
                        try:
                            epc_bytes = bytes.fromhex(epc_hex_str)
                            tag_id = int.from_bytes(epc_bytes[-4:], byteorder='big') % 10000
                            tags_in_frame.append({'id': tag_id, 'epc': epc_hex_str})
                        except:
                            pass
            else:
                i += 1
        
        all_tags_raw.extend(tags_in_frame)
        
    except socket.error as e:
        print(f"[SCAN] Socket error: {e}", flush=True)
        logger.error(f"Socket error: {e}")
        sock = None
        return
    except Exception as e:
        print(f"[SCAN] Error: {e}", flush=True)
        logger.error(f"Scan error: {e}")
        return
    
    # Deduplicate by EPC (true tag identity)
    seen_epc = set()
    tags = []
    for tag in all_tags_raw:
        epc = tag['epc']
        if epc not in seen_epc:
            tags.append(tag)
            seen_epc.add(epc)
    
    # Save
    last_tags = tags
    save_last_tags(tags)

    registry = load_item_registry()
    comparison = compare_scan_to_registry(tags, registry)
    save_bag_scan(tags, comparison)
    
    # NOTE: Keep socket open (persistent) - reader rejects rapid reconnects
    # Antenna activity continues briefly after scan, but will settle

    # Display - FORCE FLUSH to show immediately
    if tags:
        tag_list = ", ".join([f"Tag {t['id']:04d}({t['epc']})" for t in tags])
        msg = f"RFID SCAN: Found {len(tags)} Unique Tags: {tag_list}"
        print(msg, flush=True)
        logger.info(msg)
    else:
        msg = "RFID SCAN: No tags found"
        print(msg, flush=True)
        logger.info(msg)

    if registry:
        present_names = ", ".join([item['name'] for item in comparison['present']]) if comparison['present'] else 'None'
        missing_names = ", ".join([item['name'] for item in comparison['missing']]) if comparison['missing'] else 'None'
        unknown_count = len(comparison['unknown'])
        summary = (
            f"REGISTRY: {comparison['registry_count']} registered, "
            f"{len(comparison['present'])} present, "
            f"{len(comparison['missing'])} missing, "
            f"{unknown_count} unknown"
        )
        print(summary, flush=True)
        logger.info(summary)
        print(f"PRESENT: {present_names}", flush=True)
        print(f"MISSING: {missing_names}", flush=True)
    
    # Store comparison for API queries
    global last_comparison
    last_comparison = comparison

    publish_mqtt('rfid/tags', {
        'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'source': 'rfid-sensor',
        'tags': [
            {
                'epc': t['epc'],
                'tag_id': t['id'],
                'id': t['id'],
                'rssi': None,
                'antenna_id': None,
            }
            for t in tags
        ]
    })

# ===== HTTP API ENDPOINTS =====
if Flask:
    app = Flask(__name__)
    
    @app.route('/api/register', methods=['POST'])
    def api_register_item():
        """Register a new item: {"epc": "...", "name": "Wallet"}"""
        try:
            data = request.get_json()
            epc = data.get('epc', '').strip().upper()
            name = data.get('name', '').strip()
            
            if not epc or not name:
                return jsonify({'error': 'Missing epc or name'}), 400
            
            registry = register_item(epc, name)
            logger.info(f"[API] Registered item via app: {name} ({epc})")
            print(f"[API] Registered: {name} -> {epc}", flush=True)
            
            return jsonify({
                'success': True,
                'message': f"Item '{name}' registered",
                'total_items': len(registry)
            }), 200
        except Exception as e:
            logger.error(f"[API] Register error: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/status', methods=['GET'])
    def api_get_status():
        """Get current bag status: {present: [...], missing: [...], unknown: [...]}"""
        try:
            registry = load_item_registry()
            status = {
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'registry_count': len(registry),
                'last_scan': last_comparison if last_comparison else None
            }
            return jsonify(status), 200
        except Exception as e:
            logger.error(f"[API] Status error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def run_flask():
        """Run Flask API server in background thread"""
        try:
            logger.info(f"[API] Starting Flask server on port {API_PORT}")
            print(f"[API] Server running on http://0.0.0.0:{API_PORT}", flush=True)
            app.run(host='0.0.0.0', port=API_PORT, debug=False, use_reloader=False)
        except Exception as e:
            logger.error(f"[API] Flask error: {e}")

try:
    logger.info(f"Last location saved to: {LOCATION_FILE}")
    logger.info(f"Last tags saved to: {TAGS_FILE}")
    logger.info(f"Starting GPIO polling on PIN {PIN}")

    # Start MQTT bridge + heartbeat loop
    connect_mqtt()
    heartbeat_thread = Thread(target=publish_heartbeat_loop, daemon=True)
    heartbeat_thread.start()
    
    # Start Flask API in background thread
    if Flask:
        flask_thread = Thread(target=run_flask, daemon=True)
        flask_thread.start()
        print("[API] HTTP server started on port 5000", flush=True)
    else:
        logger.warning("Flask not installed - API disabled. Install with: pip install flask")
        print("[WARNING] Flask not installed. API disabled.", flush=True)
    
    # Force reinitialize GPIO pin
    GPIO.setup(PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    
    last_state = GPIO.input(PIN)
    logger.info(f"Initial state: {last_state} (1=OPEN, 0=CLOSE)")
    print(f"Initial GPIO: {last_state}")
    
    while not stop_event.is_set():
        state = GPIO.input(PIN)
        
        if state != last_state:
            time.sleep(0.3)
            state = GPIO.input(PIN)
            print(f"[CONFIRMED] State changed to: {state}")
            
            if state != last_state:
                last_state = state
                logger.info(f"[CHANGE] State -> {state}")
                
                if state == 0:
                    # CLOSE: Scan RFID
                    handle_lock_action('LOCK', initiated_by='hardware')
                    
                else:
                    # OPEN: GPS
                    handle_lock_action('UNLOCK', initiated_by='hardware')

        time.sleep(0.1)

    logger.info("Stop requested, exiting main loop")

except KeyboardInterrupt:
    logger.info("System stopped")
finally:
    GPIO.cleanup()
    if mqtt_client:
        try:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        except:
            pass
    if sock:
        try:
            sock.close()
        except:
            pass