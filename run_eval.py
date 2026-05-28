import sys
import os
import yaml
from types import SimpleNamespace
import sumolib


current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
sys.path.append(src_path)

import benchmark

from custom_train import AmbulancePriorityEnv

sys.modules['core.envs.sumo_env'].SUMOEnv = AmbulancePriorityEnv

if __name__ == "__main__":
  
    config_path = os.path.join(current_dir, "config", "v4.0.yaml")
    
    with open(config_path, 'r') as f:
        args = SimpleNamespace(**yaml.safe_load(f))
        

    args.gui = True 
    args.sumo_cmd = sumolib.checkBinary('sumo-gui')
    
    print("\n" + "="*50)
    print("🚑 LAUNCHING AI EVALUATION MODE")
    print("Loading pre-trained model: ambulance_v1")
    print("Ensure your .pt file is in models/v4/ambulance_v1/")
    print("="*50 + "\n")
    
    benchmark.run_v4(args, task="eval", config_id="ambulance_v1")