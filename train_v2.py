import sys
import os
import yaml
from types import SimpleNamespace

# Setup Paths
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
sys.path.insert(0, src_path)

import benchmark

# Import your custom environment
from ambulance_env import AmbulancePriorityEnv

# THE INTERCEPT: Globally replace SUMOEnv with AmbulancePriorityEnv
# When run_v2 imports SUMOEnv, it will get this instead.
sys.modules['core.envs.sumo_env'].SUMOEnv = AmbulancePriorityEnv

if __name__ == "__main__":
    
    # 1. Point to the v2 configuration
    config_path = os.path.join(current_dir, "config", "v2.0.yaml") 
    
    with open(config_path, 'r') as f:
        args = SimpleNamespace(**yaml.safe_load(f))
        
    # 2. Override configurations for training
    args.n_episodes = 3000          
    args.epsilon_decay = 0.999     
    args.gui = False                
    
    # 3. Point to the correct SUMO map
    args.sumocfg = os.path.join(current_dir, "maps", "ambulance_simulation.sumocfg")
    
    print("\n" + "="*60)
    print("🚀 LAUNCHING V2 (GRU) TRAINING WITH AMBULANCE ENV")
    print("Target: Standard GRU Baseline Comparison Model")
    print("JIT XML Generation: ENABLED")
    print("="*60 + "\n")
    
    # 4. Call run_v2
    # Note: Unlike run_v4, run_v2 in your benchmark.py does not take a 'config_id' argument
    benchmark.run_v2(args, task="train")