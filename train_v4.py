import sys
import os
import yaml
from types import SimpleNamespace


current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
sys.path.append(src_path)

import benchmark


from ambulance_env import AmbulancePriorityEnv


sys.modules['core.envs.sumo_env'].SUMOEnv = AmbulancePriorityEnv

if __name__ == "__main__":
    
    config_path = os.path.join(current_dir, "config", "v4.0.yaml") 
    
    with open(config_path, 'r') as f:
        args = SimpleNamespace(**yaml.safe_load(f))
        
   
    args.n_episodes = 3000          
    args.epsilon_decay = 0.999     
    args.gui = False                
    

    args.sumocfg = os.path.join(current_dir, "maps", "ambulance_simulation.sumocfg")
    
    print("\n" + "="*60)
    print("🌌 LAUNCHING V4 OVERNIGHT TRAINING")
    print("Target: The '150-Car Rule' Balanced Priority Model")
    print("JIT XML Generation: ENABLED (1 to 4 Ambulances per Episode)")
    print("="*60 + "\n")
    

    benchmark.run_v4(args, task="train", config_id="ambulance_v4_balanced")