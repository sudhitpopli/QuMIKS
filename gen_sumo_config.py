
import xml.etree.ElementTree as ET
import random
import os

# --- Configuration ---
NUM_AMBULANCES_MIN = 1
NUM_AMBULANCES_MAX = 4
OUTPUT_DIR = '/content/QuMIKS/maps'
NET_FILE_NAME = 'connaught_place.net.xml'
BASE_ROUTE_FILE_NAME = 'connaught_place.rou.xml' # To extract existing edge IDs
AMBULANCE_ROUTE_FILE_NAME = 'ambulance_routes.rou.xml'
SUMO_CONFIG_FILE_NAME = 'ambulance_simulation.sumocfg'

# --- Paths ---
net_file_path = os.path.join(OUTPUT_DIR, NET_FILE_NAME)
base_route_file_path = os.path.join(OUTPUT_DIR, BASE_ROUTE_FILE_NAME)
ambulance_route_file_path = os.path.join(OUTPUT_DIR, AMBULANCE_ROUTE_FILE_NAME)
sumo_config_file_path = os.path.join(OUTPUT_DIR, SUMO_CONFIG_FILE_NAME)

# Ensure the output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- 1. Extract valid edge IDs from the base route file ---
# This is a pragmatic approach to get valid start/end points
edge_ids = set()
try:
    tree = ET.parse(base_route_file_path)
    root = tree.getroot()
    for trip in root.findall('trip'):
        from_edge = trip.get('from')
        to_edge = trip.get('to')
        if from_edge: edge_ids.add(from_edge)
        if to_edge: edge_ids.add(to_edge)
except FileNotFoundError:
    print(f"Error: Base route file {base_route_file_path} not found. Cannot extract edge IDs.")
    valid_edges = []
except ET.ParseError:
    print(f"Error: Problem parsing base route file {base_route_file_path}. Cannot extract edge IDs.")
    valid_edges = []

valid_edges = list(edge_ids)

if not valid_edges:
    print("Fatal Error: No valid edge IDs found. Cannot generate trips. Please ensure `connaught_place.rou.xml` exists and contains trip definitions.")
    exit()

# --- 2. Generate ambulance routes (.rou.xml) ---
routes_root = ET.Element('routes', {'xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance",
                                    'xsi:noNamespaceSchemaLocation': "http://sumo.dlr.de/xsd/routes_file.xsd"})

# Add ambulance vType definition
ambulance_vtype = ET.SubElement(routes_root, 'vType', {
    'id': 'ambulanceType',
    'vClass': 'emergency',
    'guiShape': 'emergency',
    'color': 'red',
    'maxSpeed': '30.0',
    'speedFactor': '1.5'
})

num_ambulances = random.randint(NUM_AMBULANCES_MIN, NUM_AMBULANCES_MAX)
print(f"Generating {num_ambulances} random ambulance trips.")

for i in range(num_ambulances):
    from_edge = random.choice(valid_edges)
    to_edge = random.choice(valid_edges)
    while from_edge == to_edge and len(valid_edges) > 1:
        to_edge = random.choice(valid_edges)

    ET.SubElement(routes_root, 'trip', {
        'id': f'ambulance_{i}',
        'type': 'ambulanceType',
        'depart': str(random.randint(0, 300)), # Random departure time within first 5 minutes
        'from': from_edge,
        'to': to_edge
    })

# Write the .rou.xml file
tree = ET.ElementTree(routes_root)
ET.indent(tree, space="    ")
tree.write(ambulance_route_file_path, encoding='UTF-8', xml_declaration=True)
print(f"Generated ambulance route file: {ambulance_route_file_path}")

# --- 3. Generate SUMO configuration file (.sumocfg) ---
config_root = ET.Element('configuration', {
    'xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance",
    'xsi:noNamespaceSchemaLocation': "http://sumo.dlr.de/xsd/sumoConfiguration.xsd"
})
input_element = ET.SubElement(config_root, 'input')
ET.SubElement(input_element, 'net-file', {'value': NET_FILE_NAME})
ET.SubElement(input_element, 'route-files', {'value': f"{BASE_ROUTE_FILE_NAME},{AMBULANCE_ROUTE_FILE_NAME}"})

time_element = ET.SubElement(config_root, 'time')
ET.SubElement(time_element, 'begin', {'value': '0'})
ET.SubElement(time_element, 'end', {'value': '3600'})
ET.SubElement(time_element, 'step-length', {'value': '1.0'})

processing_element = ET.SubElement(config_root, 'processing')
ET.SubElement(processing_element, 'ignore-route-errors', {'value': 'true'})
ET.SubElement(processing_element, 'time-to-teleport', {'value': '300'})

report_element = ET.SubElement(config_root, 'report')
ET.SubElement(report_element, 'no-warnings', {'value': 'true'})
ET.SubElement(report_element, 'duration-log.disable', {'value': 'true'})


# Write the .sumocfg file
tree = ET.ElementTree(config_root)
ET.indent(tree, space="    ")
tree.write(sumo_config_file_path, encoding='UTF-8', xml_declaration=True)
print(f"Generated SUMO configuration file: {sumo_config_file_path}")
