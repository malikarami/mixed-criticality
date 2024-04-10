import {Simulator} from "./classes/Simulator";
import {Config, HI, LO} from "./types";
import {Logger} from "./classes/Logger";
import generateTaskSet from "./tasks_data/generator";
import {MCSSimpleTaskSet} from "./tasks_data/samples";

export const Log = new Logger({
  utilization: true,
  arrival: true,
  feasibilityTest: true,
  preemption: true,
  overrun: true,
  jobFinish: true,
  deadlineMiss: true,
  dispatch: true,
  failure: true,
  schedule: true,
  readyQ: true,
  clock: true,
}, true);


const duration = 10; // todo: read from CLI
const overrunProbabilityPercentage = 100; // probability of actual C to be grater than C(LO)
const taskSet = generateTaskSet({
  n: 4,
  CP: 0.5,
  CF: 2,
  u: 1,
});


export const CONFIG: Config = {
  exactOverrunTime: 1, // some integer time greater than 0, when this value is greater than 0, the overrunPossibility is ignored
  overrunWatchingMechanism: "per_clock",
  traditional: false, // traditional EDF instead of EDF-VD
  workDonePerClock: 0.1, // indicating amount of work done in each clock -> main purpose: customizing the simulation for floating point values (example: a CPU with speed less than one)
  frequency: 20, // f clock per time unit => (f * wpc) operation done in time unit = CPU Speed
  initialSystemLevel: LO,
};
// read-only
Object.freeze(CONFIG);

// Change in any of the simulation inputs, result into generating new taskset and jobset output files
new Simulator(duration, overrunProbabilityPercentage, taskSet).run();