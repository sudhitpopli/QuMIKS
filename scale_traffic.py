import xml.etree.ElementTree as ET
import copy

def scale_up_traffic(xml_file):
    tree = ET.parse(xml_file)
    root = tree.getroot()
    

    original_trips = root.findall('trip')
    

    time_offsets = [130, 260, 390, 520] 
    
    for wave_idx, offset in enumerate(time_offsets):
        for trip in original_trips:

            new_trip = copy.deepcopy(trip)
            

            old_id = new_trip.get('id')
            new_trip.set('id', f"{old_id}_wave{wave_idx}")

            old_depart = float(new_trip.get('depart'))
            new_depart = old_depart + offset
            new_trip.set('depart', f"{new_depart:.2f}")

            root.append(new_trip)


    tree.write(xml_file, encoding='UTF-8', xml_declaration=True)
    print(f"Success! Scaled {xml_file} from 200 to {len(root.findall('trip'))} vehicles.")


scale_up_traffic('maps/connaught_place.rou.xml')