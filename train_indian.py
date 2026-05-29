import sys
import os
import yaml
from types import SimpleNamespace


current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
sys.path.append(src_path)

import benchmark


from ambulance_env import AmbulancePriorityEnv

# The Monkey Patch
sys.modules['core.envs.sumo_env'].SUMOEnv = AmbulancePriorityEnv

if __name__ == "__main__":

    config_path = os.path.join(current_dir, "config", "v4.0.yaml") 
    
    with open(config_path, 'r') as f:
        args = SimpleNamespace(**yaml.safe_load(f))
        

    args.gui = False 
    

    args.task = "eval" 
    

    args.sumocfg = os.path.join(current_dir, "maps", "ambulance_simulation.sumocfg")
    
    print("\n" + "="*60)
    print("🚦 LAUNCHING INDIAN STANDARD (WEBSTER) EVALUATION")
    print("Executing static math cycle...")
    print("="*60 + "\n")
    

    benchmark.run_indian(args, task="eval")
    

    print("\n" + "🏆 HACKATHON PITCH METRICS (WEBSTER BASELINE) 🏆")
    print("-" * 55)
    if hasattr(args, 'last_results'):
        results = args.last_results
        print(f"🚑 Total Ambulance Travel Time:  {results.get('travel_time', 0)} seconds")
        print(f"🚗 Avg Civilian Cars Halted:     {results.get('avg_civilian_halted', 0)} cars/sec")
    else:
        print("❌ Metrics not found! Ensure the episode finished completely.")
    print("-" * 55 + "\n")