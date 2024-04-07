import {Simulator} from "./Simulator";
import {mcsTasksetSimple} from "./tasks_data/samples";
import {Config} from "./types";
import {Logger} from "./Logger";

export const CONFIG: Config = {
  overrunProbabilityPercentage: 0, // probability of actual C to be grater than C(LO)
  exactOverrunTime: 1,
  overrunWatchingMechanism: "per_clock",
  traditional: false, // traditional EDF instead of EDF-VD
  workDonePerClock: 0.1, // indicating amount of work done in each clock -> main purpose: customizing the simulation for floating point values (example: a CPU with speed less than one)
  frequency: 5, // f clock per time unit => (f * wpc) operation done in time unit = CPU Speed
};
// read-only
Object.freeze(CONFIG);

const duration = 40;
const taskSet = mcsTasksetSimple;

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

new Simulator(duration, taskSet).run();
