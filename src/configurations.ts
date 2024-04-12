import {Config, LO, LogLevelSettings, TaskSetConfig} from "./types";

type Configurations = {
  duration: number;
  overrunProbabilityPercentage: number;
  scheduling: Config,
  tasks: TaskSetConfig,
  log: LogLevelSettings,
}

const configurations : Configurations=  {
  duration: 10.5, // duration for which the simulation would run
  overrunProbabilityPercentage: 50,  // probability of actual C to be grater than C(LO)
  scheduling: {
    exactOverrunTime: 1.5, // some integer time greater than 0, when this value is greater than 0, the overrunPossibility is ignored
    overrunWatchingMechanism: "per_clock", // deprecated -> ignore
    traditional: false, // traditional EDF instead of EDF-VD
    workDonePerClock: 0.1, // indicating amount of work done in each clock -> main purpose: customizing the simulation for floating point values (example: a CPU with speed less than one)
    frequency: 20, // f clock per time unit => (f * wpc) operation done in time unit = CPU Speed
    initialSystemLevel: LO,
  },
  tasks: {
    n: 0, // number of tasks
    u: 1, // total system utilization
    CF: 1.5, // criticality factor, > 1
    CP: 2, // criticality proportion, < 1
    minPeriod: 1,
    maxPeriod: 100,
  },
  log: {
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
  }
}

export default configurations;