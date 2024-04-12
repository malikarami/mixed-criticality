import {Simulator} from "./classes/Simulator";
import {Config} from "./types";
import {Logger} from "./classes/Logger";
import generateTaskSet from "./tasks_data/generator";
import configurations from './configurations';
import validate from "./validate";

// validates configuration inputs
validate();

export const Log = new Logger(configurations.log.setting, configurations.log.enabled);

const taskSet = generateTaskSet(configurations.tasks);

// read-only
export const CONFIG: Config = configurations.scheduling;
Object.freeze(CONFIG);

// Change in any of the simulation inputs, result into generating new taskset and jobset output files
if(configurations.duration) {
  new Simulator(configurations.duration, configurations.overrunProbabilityPercentage, taskSet).run();
}