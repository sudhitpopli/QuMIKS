import os
import sys
import yaml
import random
import numpy as np
from types import SimpleNamespace
import sumolib
import traci


from core.envs.sumo_env import SUMOEnv

class AmbulancePriorityEnv(SUMOEnv):
    def __init__(self, args):

        if getattr(args, 'gui', False) or getattr(args, 'render', False):
            args.sumo_cmd = sumolib.checkBinary('sumo-gui')
            if hasattr(args, 'env_args'):
                if isinstance(args.env_args, dict):
                    args.env_args['use_gui'] = True
                else:
                    args.env_args.use_gui = True
        else:
            args.sumo_cmd = sumolib.checkBinary('sumo')
            if hasattr(args, 'env_args'):
                if isinstance(args.env_args, dict):
                    args.env_args['use_gui'] = False
                else:
                    args.env_args.use_gui = False

        if hasattr(args, 'sumocfg') and args.sumocfg:
            if not hasattr(args, 'env_args') or args.env_args is None:
                args.env_args = {}
            if isinstance(args.env_args, dict):
                args.env_args['cfg_path'] = args.sumocfg
            else:
                args.env_args.cfg_path = args.sumocfg
            
        super().__init__(args)
        self.args = args

        self.episode_counter = 0

        dummy_state, dummy_obs = super().reset()
        self.obs_size = len(dummy_obs[0]) + 2
        self._new_state_size = len(dummy_state) + 2
        

        self.patient_priority_weight = 15.0 
        self.amb_active_time = 0
        self.amb_spawned_yet = False
        self.amb_finished = False
        self.amb_halt_time = 0  
        self.light_cycle_log = []
        self.active_priorities = {}  

    def get_state_size(self):
        return getattr(self, '_new_state_size', super().get_state_size())

    def spawn_dynamic_ambulance(self, amb_id, start_edge, dest_edge, priority_weight):
        """API Mode: Injects an emergency vehicle instantly into the running grid via TraCI."""
        try:
            route = traci.simulation.findRoute(start_edge, dest_edge, vType="ambulanceType")
            if not route.edges:
                return False

            route_id = f"route_{amb_id}"
            traci.route.add(route_id, route.edges)
            traci.vehicle.add(
                vehID=amb_id,
                routeID=route_id,
                typeID="ambulanceType",
                depart="now",
                departSpeed="max"
            )
            self.active_priorities[amb_id] = float(priority_weight)
            return True
        except traci.exceptions.TraCIException as e:
            print(f"TraCI Injection Failed: {e}")
            return False

    def _process_ambulance_logic(self):
        """Tracks all active ambulances and calculates the '150-Car Rule' exponential penalty."""
        try:
            active_vehicles = traci.vehicle.getIDList()
            emergency_vehicles = [v for v in active_vehicles if traci.vehicle.getVehicleClass(v) == "emergency"]
            

            if len(emergency_vehicles) > 0:
                self.amb_spawned_yet = True
                self.amb_active_time += 1
            elif self.amb_spawned_yet and not self.amb_finished:
                self.amb_finished = True
                print(f"\n [METRIC] All Ambulances Cleared! Total Active Time: {self.amb_active_time} seconds\n")

            if not emergency_vehicles:
                self.amb_halt_time = 0
                return 0.0, 0.0, 0.0

            max_speed = 0.0
            max_halted = 0.0
            total_base_penalty = 0.0

            for veh_id in emergency_vehicles:
                speed = traci.vehicle.getSpeed(veh_id)
                is_halted = 1.0 if speed < 0.1 else 0.0
                
                if speed > max_speed:
                    max_speed = speed
                if is_halted > max_halted:
                    max_halted = is_halted
                

                weight = self.active_priorities.get(veh_id, self.patient_priority_weight)
                total_base_penalty += (is_halted * weight)


            if max_halted > 0:
                self.amb_halt_time += 1
            else:
                self.amb_halt_time = 0

            final_calculated_penalty = total_base_penalty 
            return max_speed, max_halted, final_calculated_penalty

        except traci.exceptions.FatalTraCIError:
            pass 
            
        return 0.0, 0.0, 0.0

    def _augment_obs(self, obs, amb_speed, amb_halted):
        return [list(agent_obs) + [float(amb_speed), float(amb_halted)] for agent_obs in obs]
        
    def _augment_state(self, state, amb_speed, amb_halted):
        return np.append(state, [float(amb_speed), float(amb_halted)])

    def reset(self):
        """Prepares the simulation, injecting config files or API requests Just-In-Time."""
        self.amb_active_time = 0
        self.amb_spawned_yet = False
        self.amb_finished = False
        self.amb_halt_time = 0
        self.light_cycle_log = []
        self.active_priorities = {}
        self.cumulative_civilian_halts = 0

        is_api_dispatch = hasattr(self.args, 'app_dispatch') and self.args.app_dispatch is not None

        if not is_api_dispatch and getattr(self.args, 'task', 'train') == 'train':
            # Check if it's the 0th, 50th, 100th, etc. episode
            if self.episode_counter % 50 == 0:
                os.system("python gen_sumo_config.py")
                self.patient_priority_weight = random.choice([2.0, 5.0, 15.0])
                print(f"\n[INFO] Generated new SUMO config for Episode {self.episode_counter}")
            
            # Increment the counter for the next reset
            self.episode_counter += 1

        state, obs = super().reset()


        if is_api_dispatch:
            dispatch = self.args.app_dispatch
            self.spawn_dynamic_ambulance(
                amb_id=dispatch['id'], 
                start_edge=dispatch['start'], 
                dest_edge=dispatch['dest'], 
                priority_weight=dispatch['priority']
            )

        amb_speed, amb_halted, _ = self._process_ambulance_logic()
        
        aug_state = self._augment_state(state, amb_speed, amb_halted)
        aug_obs = self._augment_obs(obs, amb_speed, amb_halted)
        return aug_state, aug_obs

    def step(self, action):

        if action is not None:
            current_time = traci.simulation.getTime()
            action_list = action.tolist() if hasattr(action, 'tolist') else list(action)
            self.light_cycle_log.append({"time": current_time, "action": action_list})

        next_state, next_obs, original_reward, done, info = super().step(action)
        
        amb_speed, amb_halted, ambulance_penalty = self._process_ambulance_logic()
        
        try:

            if len(self.light_cycle_log) <= 1 or not hasattr(self, 'veh_class_cache'):
                self.veh_class_cache = {}
                
            current_step = int(traci.simulation.getTime())
            

            if current_step % 10 == 0:
                active_vehicles = traci.vehicle.getIDList()
                halts = 0
                
                for v in active_vehicles:

                    if v not in self.veh_class_cache:
                        self.veh_class_cache[v] = traci.vehicle.getVehicleClass(v)
                        

                    if self.veh_class_cache[v] != "emergency" and traci.vehicle.getSpeed(v) < 0.1:
                        halts += 1
                        

                self.cumulative_civilian_halts += (halts * 10)
        except traci.exceptions.TraCIException:
            pass
        
        aug_next_state = self._augment_state(next_state, amb_speed, amb_halted)
        aug_next_obs = self._augment_obs(next_obs, amb_speed, amb_halted)
        
        custom_reward = original_reward - ambulance_penalty


        if done:
            sim_length = max(1, traci.simulation.getTime())
            self.avg_halted_civilians_per_sec = self.cumulative_civilian_halts / sim_length
            
            self.args.last_results = {
                "travel_time": self.amb_active_time,
                "cycles": self.light_cycle_log,
                "avg_civilian_halted": self.avg_halted_civilians_per_sec
            }
            print("DONE!!!!!!!!!!")

        return aug_next_state, aug_next_obs, custom_reward, done, info