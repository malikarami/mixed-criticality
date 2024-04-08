import {Simulator} from "./classes/Simulator";
import {Config} from "./types";
import {Logger} from "./classes/Logger";
import generateTaskSet from "./tasks_data/generator";

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
});


const duration = 40; // todo: read from CLI
const overrunProbabilityPercentage = 100; // probability of actual C to be grater than C(LO)
const taskSet = generateTaskSet({
  n: 10,
  CP: 0.5,
  CF: 2,
  u: 1,
});

console.log(taskSet);

export const CONFIG: Config = {
  exactOverrunTime: 1,
  overrunWatchingMechanism: "per_clock",
  traditional: false, // traditional EDF instead of EDF-VD
  workDonePerClock: 0.1, // indicating amount of work done in each clock -> main purpose: customizing the simulation for floating point values (example: a CPU with speed less than one)
  frequency: 5, // f clock per time unit => (f * wpc) operation done in time unit = CPU Speed
};
// read-only
Object.freeze(CONFIG);

// Change in any of the simulation inputs, result into generating new output files
new Simulator(duration, overrunProbabilityPercentage, taskSet).run();