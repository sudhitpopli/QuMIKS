import sys
import os
import yaml
import numpy as np
from types import SimpleNamespace
import traci


current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
sys.path.append(src_path)

from core.envs.sumo_env import SUMOEnv
import benchmark


class AmbulancePriorityEnv(SUMOEnv):
    def __init__(self, args):
        super().__init__(args)
        
        dummy_state, dummy_obs = super().reset()
        self.obs_size = len(dummy_obs[0]) + 2
        self._new_state_size = len(dummy_state) + 2
        

        self.patient_priority_weight = 50.0 

        self.amb_active_time = 0
        self.amb_spawned_yet = False
        self.amb_finished = False

    def get_state_size(self):
        """Overrides the global state size for the QMIX Mixer network."""
        return getattr(self, '_new_state_size', super().get_state_size())

    def _get_ambulance_data(self):
        try:
            active_vehicles = traci.vehicle.getIDList()
            
    
            if "amb_1" in active_vehicles:
                self.amb_spawned_yet = True
                self.amb_active_time += 1
            elif self.amb_spawned_yet and not self.amb_finished:
                self.amb_finished = True
                print(f"\n🚑 [METRIC] AMBULANCE ARRIVED! Total Travel Time: {self.amb_active_time} seconds!\n")

            for veh_id in active_vehicles:
                if traci.vehicle.getVehicleClass(veh_id) == "emergency":
                    speed = traci.vehicle.getSpeed(veh_id)
                    is_halted = 1.0 if speed < 0.1 else 0.0
                    return speed, is_halted
                    
        except traci.exceptions.FatalTraCIError:
            pass 
            
        return 0.0, 0.0

    def _augment_obs(self, obs, amb_speed, amb_halted):
        """Appends the ambulance data using pure Python list comprehension."""
        return [list(agent_obs) + [float(amb_speed), float(amb_halted)] for agent_obs in obs]
        
    def _augment_state(self, state, amb_speed, amb_halted):
        """Appends the ambulance data to the global state array."""
        return np.append(state, [float(amb_speed), float(amb_halted)])

    def reset(self):

        self.amb_active_time = 0
        self.amb_spawned_yet = False
        self.amb_finished = False
        

        state, obs = super().reset()
        amb_speed, amb_halted = self._get_ambulance_data()
        
        aug_state = self._augment_state(state, amb_speed, amb_halted)
        aug_obs = self._augment_obs(obs, amb_speed, amb_halted)
        
        return aug_state, aug_obs

    def step(self, action):

        next_state, next_obs, original_reward, done, info = super().step(action)
        
        amb_speed, amb_halted = self._get_ambulance_data()
        
        aug_next_state = self._augment_state(next_state, amb_speed, amb_halted)
        aug_next_obs = self._augment_obs(next_obs, amb_speed, amb_halted)
        

        ambulance_penalty = amb_halted * self.patient_priority_weight
        custom_reward = original_reward - ambulance_penalty

        return aug_next_state, aug_next_obs, custom_reward, done, info



sys.modules['core.envs.sumo_env'].SUMOEnv = AmbulancePriorityEnv

if __name__ == "__main__":
    
    config_path = os.path.join(current_dir, "config", "v4.0.yaml")
    with open(config_path, 'r') as f:
        args = SimpleNamespace(**yaml.safe_load(f))
         
    benchmark.run_v4(args, task="train", config_id="ambulance_v1")
    
